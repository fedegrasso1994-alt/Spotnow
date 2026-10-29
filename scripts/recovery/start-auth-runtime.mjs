/** Start quarantined services only; publishes no ports and never restores the DB. */
import{execFile}from'node:child_process';import{promisify}from'node:util';import{writeFile}from'node:fs/promises';
import{DOCKER,TARGET,targetEnvironment,targetSql}from'./local-target.mjs';import{recoveredEnvironment}from'./auth-runtime-contract.mjs';import{RETRY_DATABASE}from'./restore-bootstrap.mjs';
if(process.argv[2]!=='--start-quarantined-auth')throw Error('RECOVERY_EXPLICIT_ACTION');
const exec=promisify(execFile);process.umask(0o077);
try{
 const empty=JSON.parse(await targetSql("begin read only;select jsonb_build_object('sessions',(select count(*)from auth.sessions),'refresh',(select count(*)from auth.refresh_tokens),'factors',(select count(*)from auth.mfa_factors));rollback;",{database:RETRY_DATABASE}));if(Object.values(empty).some(x=>x!==0))throw Error('RECOVERY_RUNTIME_NOT_EMPTY');
 for(const service of['auth','rest']){
  const env=recoveredEnvironment(service,await targetEnvironment(TARGET[service])),path='.local/recovery-v3/containers/'+service+'.env';await writeFile(path,Object.entries(env).map(([k,v])=>k+'='+v).join('\n')+'\n',{mode:0o600});
  const image=service==='auth'?'ghcr.io/supabase/gotrue:v2.197.0':'ghcr.io/supabase/postgrest:v16.4';
  await exec(DOCKER,['run','-d','--name','supabase_'+service+'_soma-recovery-v3','--network',TARGET.network,'--env-file',path,image],{maxBuffer:100000});
 }
 console.log(JSON.stringify({pass:true,auth:true,rest:true,quarantined:true,ports_published:false,source_unchanged:true}));
}catch(e){console.error(JSON.stringify({pass:false,code:/^[A-Z_]+$/.test(e.message)?e.message:'RECOVERY_RUNTIME_START_FAILED'}));process.exitCode=1;}
