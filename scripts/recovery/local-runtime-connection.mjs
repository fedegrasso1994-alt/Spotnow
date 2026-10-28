/** Actual service credentials over TCP. Values travel on stdin, never argv/logs. */
import {spawn} from 'node:child_process';
import {DOCKER,TARGET,targetEnvironment} from './local-target.mjs';
import {RETRY_DATABASE} from './restore-bootstrap.mjs';
const sources={supabase_auth_admin:['auth','GOTRUE_DB_DATABASE_URL'],supabase_storage_admin:['storage','DATABASE_URL'],authenticator:['rest','PGRST_DB_URI']};
export function runtimeConnection(role,env){
 const source=sources[role];if(!source)throw Error('RECOVERY_RUNTIME_ROLE');
 const u=new URL(env[source[1]]);
 const password=decodeURIComponent(u.password);
 if(u.username!==role||u.hostname!==TARGET.db||!password||/[\r\n]/.test(password))throw Error('RECOVERY_RUNTIME_SCOPE');
 return {role,password,database:RETRY_DATABASE};
}
export async function runtimeSql(sql,role){
 if(!sources[role])throw Error('RECOVERY_RUNTIME_ROLE');
 const env=await targetEnvironment(TARGET[sources[role][0]]),config=runtimeConnection(role,env);
 return new Promise((resolve,reject)=>{
  const script='IFS= read -r PGPASSWORD; export PGPASSWORD; exec psql -h 127.0.0.1 -U "$1" -d "$2" -XAtq -v ON_ERROR_STOP=1';
  const p=spawn(DOCKER,['exec','-i',TARGET.db,'sh','-c',script,'--',role,config.database],{stdio:['pipe','pipe','pipe']});let out='',err='';
  p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('error',()=>reject(Error('RECOVERY_RUNTIME_PROCESS')));
  p.on('close',code=>{if(!code)return resolve(out);const e=Error('RECOVERY_RUNTIME_SQL');e.sqlstate=/(?:ERROR|FATAL):\s+([A-Z0-9]{5}):?/.exec(err)?.[1]||null;reject(e)});
  p.stdin.end(config.password+'\n\\set VERBOSITY verbose\n'+sql);
 });
}
