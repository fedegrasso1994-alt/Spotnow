/** Controlled recovery startup: REST -> Auth -> Storage, verify before each next step. */
import{execFile}from'node:child_process';import{promisify}from'node:util';import{writeFile}from'node:fs/promises';
import{DOCKER,TARGET,targetEnvironment,targetSql}from'./local-target.mjs';import{RETRY_DATABASE}from'./restore-bootstrap.mjs';import{recoveredEnvironment}from'./auth-runtime-contract.mjs';import{recoveredHttp}from'./recovered-http.mjs';import{verifyBootstrap}from'./verify-provider-bootstrap.mjs';
if(process.argv[2]!=='--apply-approved-bootstrap')throw Error('RECOVERY_EXPLICIT_ACTION');
const exec=promisify(execFile),started=[],result={started_at:new Date().toISOString(),source_writes:0,restore_attempts:0,stages:[]};let stage='preflight';
async function health(service,path){for(let i=0;i<10;i++){try{const r=await recoveredHttp(service,path);if(r.status===200)return r;}catch{}await new Promise(r=>setTimeout(r,300));}throw Error('RECOVERY_SERVICE_HEALTH');}
try{
 await verifyBootstrap();const env=await targetEnvironment(TARGET.storage);
 for(const service of['rest','auth','storage']){
  stage=service;const name='supabase_'+service+'_soma-recovery-v3',old=JSON.parse((await exec(DOCKER,['inspect',name])).stdout)[0];
  if(old.State.Running||!old.NetworkSettings.Networks[TARGET.network]||Object.keys(old.HostConfig.PortBindings||{}).length)throw Error('RECOVERY_SERVICE_SCOPE');
  if(service==='rest'){
   const config=recoveredEnvironment('rest',await targetEnvironment(TARGET.rest)),path='.local/recovery-v3/containers/rest.env';await writeFile(path,Object.entries(config).map(([k,v])=>k+'='+v).join('\n')+'\n',{mode:0o600});
   await exec(DOCKER,['rm',name]);await exec(DOCKER,['run','-d','--name',name,'--network',TARGET.network,'--env-file',path,'ghcr.io/supabase/postgrest:v16.4']);
  }else await exec(DOCKER,['start',name]);
  started.push(name);
  if(service==='rest'){
   const root=await health('rest','/');if(root.data?.code==='PGRST002')throw Error('RECOVERY_REST_CACHE');
   const other=await recoveredHttp('rest','/profiles?select=id&limit=1',{headers:{'Accept-Profile':'graphql_public'}});if(other.status!==406||other.data?.code!=='PGRST106')throw Error('RECOVERY_REST_SCHEMA_EXPOSURE');
   const anon=await recoveredHttp('rest','/profiles?select=id&limit=1');if(![401,403].includes(anon.status))throw Error('RECOVERY_REST_ANON_ACCESS');
   const server=await recoveredHttp('rest','/',{headers:{Authorization:'Bearer '+env.SERVICE_KEY}});if(server.status!==200)throw Error('RECOVERY_REST_SERVER');
   result.stages.push({service,health:200,schemas:'public',other_schema_status:406,anonymous_profiles_status:anon.status,server_status:200});
  }else{await health(service,service==='auth'?'/health':'/status');result.stages.push({service,health:200});}
  await verifyBootstrap();
 }
 const counts=JSON.parse(await targetSql("begin read only;select jsonb_build_object('sessions',(select count(*)from auth.sessions),'refresh',(select count(*)from auth.refresh_tokens),'flow_state',(select count(*)from auth.flow_state),'factors',(select count(*)from auth.mfa_factors));rollback;",{database:RETRY_DATABASE}));if(Object.values(counts).some(x=>x!==0))throw Error('RECOVERY_TRANSIENT_NOT_EMPTY');
 result.transient=counts;result.pass=true;console.log(JSON.stringify(result));
}catch(e){result.pass=false;result.stage=stage;result.code=/^[A-Z_]+$/.test(e.message)?e.message:'RECOVERY_STARTUP_FAILED';for(const name of started.reverse())await exec(DOCKER,['stop',name]).catch(()=>{});console.error(JSON.stringify(result));process.exitCode=1;
}finally{await writeFile('.local/recovery-v3/controlled-bootstrap-result.json',JSON.stringify(result,null,2),{mode:0o600});}
