/** Explicitly approved elevated reader. Never accepts writes or prints query results. */
import {sourceEnvironment,sourceProcess} from './source-connection.mjs';
import {SECURITY_SNAPSHOT_SQL} from './security-replay.mjs';
export async function readSourceMetadata(kind){
 const select={security:SECURITY_SNAPSHOT_SQL,extensions:"select jsonb_agg(jsonb_build_object('extension',e.extname,'schema',n.nspname))from pg_extension e join pg_namespace n on n.oid=e.extnamespace;"}[kind];
 if(!select)throw Error('RECOVERY_READ_SCOPE');
 const env=await sourceEnvironment(),p=sourceProcess(env,'psql',['-XAtq','-v','ON_ERROR_STOP=1']);
 let out='';p.stdout.on('data',x=>out+=x);p.stderr.resume();
 const done=new Promise((resolve,reject)=>{p.on('error',()=>reject(Error('RECOVERY_SOURCE_READER')));p.on('close',code=>{if(code)return reject(Error('RECOVERY_SOURCE_READER'));try{resolve(JSON.parse(out))}catch{reject(Error('RECOVERY_SOURCE_RESULT'))}})});
 p.stdin.end('set role postgres;begin isolation level repeatable read read only;'+select+'\nrollback;');
 return done;
}
