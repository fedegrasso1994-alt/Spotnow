import{readFile,writeFile,access}from'node:fs/promises';import{randomUUID}from'node:crypto';import{createClient}from'@supabase/supabase-js';
import{stagingAdminClient}from'../../supabase/functions/_shared/server-key.js';
import{savePrivate}from'./private-state.mjs';import{targetHttp,targetEnvironment,TARGET}from'./local-target.mjs';
if(process.argv[2]!=='--source-user-capability-check')throw Error('RECOVERY_EXPLICIT_ACTION');
let actor;
try{
 let existing=false;try{await access('.local/recovery-v3/fixture.enc');existing=true}catch(error){if(error.code!=='ENOENT')throw error;}if(existing)throw Error('RECOVERY_EXISTING_FIXTURE_STATE');
 const c=JSON.parse(await readFile('.local/legacy-key-migration/config.json','utf8'));if(c.url!=='https://zjinjtkekmaqtxsuyvho.supabase.co')throw Error('SOURCE_SCOPE');
 const admin=stagingAdminClient(createClient,c.url,c.serverKey,{auth:{persistSession:false,autoRefreshToken:false}}),email='soma-recovery-v3-'+randomUUID()+'@example.invalid',password=randomUUID()+'Aa1!';
 const u=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{synthetic:true,recovery_v3:true}});if(u.error)throw Error('SOURCE_FIXTURE_CREATE');
 actor={role:'USER',id:u.data.user.id,email,password};await savePrivate({actors:[actor],phase:'created'});
 const client=createClient(c.url,c.publicKey,{auth:{persistSession:false,autoRefreshToken:false}}),s=await client.auth.signInWithPassword({email,password});if(s.error)throw Error('SOURCE_FIXTURE_LOGIN');
 actor.access=s.data.session.access_token;actor.refresh=s.data.session.refresh_token;await savePrivate({actors:[actor],phase:'source-token-captured'});
 const rows=[];
 for(const [service,path]of[['auth','/user'],['rest','/'],['storage','/bucket']]){const r=await targetHttp(service,path,{headers:{Authorization:'Bearer '+actor.access}});rows.push({service,status:r.status,code:r.data?.code||r.data?.error_code||r.data?.error||null});if(r.status<400)throw Error('LOCAL_TARGET_ACCEPTED_SOURCE');}
 const env=await targetEnvironment(TARGET.auth);if(env.GOTRUE_JWT_ISSUER?.startsWith(c.url))throw Error('SOURCE_ISSUER_IN_TARGET');
 await savePrivate({actors:[actor],phase:'target-negative-capability-pass'});
 await writeFile('.local/recovery-v3/capability.json',JSON.stringify({source_ref:'zjinjtkekmaqtxsuyvho',rows,pass:true},null,2));console.log(JSON.stringify({fixture_created:true,source_tokens_private:true,target_checks:rows,pass:true}));
}catch(error){console.error(JSON.stringify({pass:false,code:/^[A-Z_]+$/.test(error.message)?error.message:'RECOVERY_PREPARE_FAILED',fixture_created:!!actor}));process.exitCode=1;}
