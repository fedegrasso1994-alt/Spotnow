/** Replay only the source-deleted, empty synthetic identity through existing deletion orchestration. */
import{readFile,writeFile}from'node:fs/promises';import{createClient}from'@supabase/supabase-js';
import{cleanupPhotoAccount}from'../../supabase/functions/_shared/photo-lifecycle.js';
import{targetEnvironment,TARGET,targetSql}from'./local-target.mjs';import{RETRY_DATABASE}from'./restore-bootstrap.mjs';import{recoveredHttp}from'./recovered-http.mjs';
if(process.argv[2]!=='--replay-source-deleted-empty-fixture')throw Error('RECOVERY_EXPLICIT_ACTION');
try{
 const plan=JSON.parse(await readFile('.local/recovery-v3/security-replay-plan.json'));
 if(plan.version!==3||plan.checkpoint_id!=='28ec939f-9e37-4b91-9fe2-2cc1c9e252dc'||Date.now()-Date.parse(plan.checked_at)>3600000||plan.actions.length!==1||plan.actions[0].action!=='account.delete')throw Error('RECOVERY_REPLAY_SCOPE');
 const id=plan.actions[0].id;if(!/^[a-f0-9-]{36}$/.test(id))throw Error('RECOVERY_REPLAY_SCOPE');
 const unaffected=()=>targetSql(`begin read only;select md5(jsonb_build_array((select jsonb_agg(to_jsonb(u)order by id)from auth.users u where id<>'${id}'),(select jsonb_agg(to_jsonb(i)order by id)from auth.identities i where user_id<>'${id}'),(select jsonb_agg(to_jsonb(r)order by user_id)from spot_private.moderation_roles r))::text);rollback;`,{database:RETRY_DATABASE}).then(x=>x.trim());
 const present=Number(await targetSql(`begin read only;select count(*)from auth.users where id='${id}';rollback;`,{database:RETRY_DATABASE}));
 if(present===0){const prior=JSON.parse(await readFile('.local/recovery-v3/security-replay-result.json'));if(!prior.pass||prior.checkpoint_id!==plan.checkpoint_id||await unaffected()!==prior.unrelated_auth_digest)throw Error('RECOVERY_REPLAY_IDEMPOTENCY');console.log(JSON.stringify({pass:true,idempotent:true,engine_calls:0,unrelated_auth_unchanged:true}));process.exit(0);}
 const unrelatedBefore=await unaffected();
 const scope=JSON.parse(await targetSql(`begin read only;select jsonb_build_object('synthetic',(select email ~ '^soma-recovery-v3-[a-f0-9-]{36}@example[.]invalid$'from auth.users where id='${id}'),'profiles',(select count(*)from public.profiles where id='${id}'),'objects',(select count(*)from storage.objects where owner_id='${id}'),'roles',(select count(*)from spot_private.moderation_roles where user_id='${id}'));rollback;`,{database:RETRY_DATABASE}));
 if(scope.synthetic!==true||scope.profiles!==0||scope.objects!==0||scope.roles!==0)throw Error('RECOVERY_REPLAY_NOT_EMPTY_SYNTHETIC');
 const env=await targetEnvironment(TARGET.storage);
 const client=createClient('http://recovered.invalid',env.SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
  const u=new URL(typeof input==='string'?input:input.url);if(u.hostname!=='recovered.invalid')throw Error('RECOVERY_REPLAY_HTTP_SCOPE');
  const route=[['/rest/v1','rest'],['/auth/v1','auth'],['/storage/v1','storage']].find(([prefix])=>u.pathname.startsWith(prefix+'/'));if(!route)throw Error('RECOVERY_REPLAY_HTTP_SCOPE');
  const r=await recoveredHttp(route[1],u.pathname.slice(route[0].length)+u.search,{method:init?.method||'GET',headers:Object.fromEntries(new Headers(init?.headers)),body:init?.body});
  return new Response(r.status===204?null:r.bytes,{status:r.status,headers:{'content-type':r.contentType||'application/json'}});
 }}});
 for(const name of['photo02_begin_account_deletion','photo_deletion_barrier']){const r=await client.rpc(name,{target_user:id});if(r.error){const e=Error('RECOVERY_REPLAY_ENGINE_DENIED');e.providerCode=r.error.code;throw e}if(name==='photo_deletion_barrier'&&r.data===true)throw Error('RECOVERY_REPLAY_LEASE_ACTIVE');}
 if(!await cleanupPhotoAccount(client,id))throw Error('RECOVERY_REPLAY_ENGINE_PENDING');
 const count=Number(await targetSql(`begin read only;select count(*)from auth.users where id='${id}';rollback;`,{database:RETRY_DATABASE}));if(count!==0)throw Error('RECOVERY_REPLAY_IDENTITY_REMAINS');
 const unrelatedAfter=await unaffected();if(unrelatedBefore!==unrelatedAfter)throw Error('RECOVERY_REPLAY_UNRELATED_CHANGED');
 const result={pass:true,checkpoint_id:plan.checkpoint_id,actions:1,engine:'existing PHOTO-02 account deletion orchestration',source_writes:0,auth_identity_absent:true,unrelated_auth_digest:unrelatedAfter,unrelated_auth_unchanged:true,completed_at:new Date().toISOString()};await writeFile('.local/recovery-v3/security-replay-result.json',JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify(result));
}catch(e){console.error(JSON.stringify({pass:false,code:/^[A-Z_]+$/.test(e.message)?e.message:'RECOVERY_REPLAY_FAILED',providerCode:/^[A-Z0-9_]+$/.test(e.providerCode||'')?e.providerCode:null}));process.exitCode=1;}
