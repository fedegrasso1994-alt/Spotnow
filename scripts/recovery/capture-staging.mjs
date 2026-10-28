import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile, readFile, open, rm } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { pipeline } from 'node:stream/promises';
import { randomBytes } from 'node:crypto';
import { join, resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sourceEnvironment, sourceProcess, DOCKER } from './source-connection.mjs';
import { SOURCE, makeManifest, sealCheckpoint, fileDigest } from './checkpoint-artifact.mjs';
import { EXCLUDED_DATA, makeContract } from './session-contract.mjs';
import {AUTH_EMPTY_REQUIRED,AUTH_PROJECTED,projectionSelect,validateAuthColumns}from'./auth-durable.mjs';
import {SECURITY_SNAPSHOT_SQL}from'./security-replay.mjs';

const fail = code => { throw new Error(code); };
export function projectionSnapshotSql(table,snapshotId){
 if(!/^[A-Fa-f0-9-]+$/.test(snapshotId))fail('RECOVERY_SNAPSHOT_UNAVAILABLE');
 return `set role postgres;begin isolation level repeatable read read only;set transaction snapshot '${snapshotId}';copy (${projectionSelect(table)})to stdout with(format csv);commit;`;
}
export function storageDownloadArgs(object,target){
 if(object.bucket!=='profile-photos'||!isAbsolute(target)||!object.storage_key?.match(/^[a-zA-Z0-9_/-]+(?:\.[a-zA-Z0-9_-]+)+$/)||object.storage_key.includes('..'))fail('RECOVERY_DOWNLOAD_SCOPE');
 return ['storage','cp','--experimental','--project-ref',SOURCE,'ss:///'+object.bucket+'/'+object.storage_key,target];
}
async function run(command,args,{env,output,log}={}) {
 const p=spawn(command,args,{env:env??process.env,stdio:['ignore','pipe','pipe']});
 const timeout=setTimeout(()=>p.kill('SIGKILL'),120000);timeout.unref();
 const completed=once(p,'close');
 const tasks=[];
 if(output)tasks.push(pipeline(p.stdout,createWriteStream(output,{flags:'wx',mode:0o600})));
 else p.stdout.resume();
 let errorText='';p.stderr.on('data',chunk=>{if(errorText.length<8192)errorText+=chunk.toString();});
 if(log)tasks.push(pipeline(p.stderr,createWriteStream(log,{flags:'a',mode:0o600})));
 else p.stderr.resume();
 try{await Promise.all(tasks);const [code]=await completed;if(code!==0)fail(/experimental/i.test(errorText)?'RECOVERY_CLI_EXPERIMENTAL_REQUIRED':'RECOVERY_CHILD_FAILED');}
 finally{clearTimeout(timeout);}
}

export function checkInventory(meta) {
 if(meta.other_bucket_objects!==0 || !Array.isArray(meta.objects) || !Array.isArray(meta.current_required))fail('RECOVERY_INVENTORY_SCOPE');
 const keys=new Set();
 for(const o of meta.objects){
  if(o.bucket!=='profile-photos'||!o.referenced||!o.storage_key?.match(/^[a-zA-Z0-9_/-]+(?:\.[a-zA-Z0-9_-]+)+$/)||o.storage_key.includes('..')||o.storage_key.startsWith('/')||keys.has(o.storage_key)||o.mime!=='image/jpeg'||!Number.isSafeInteger(o.size)||o.size<1)fail('RECOVERY_OBJECT_CLASSIFICATION');
  keys.add(o.storage_key);
 }
 if(meta.current_required.some(k=>!keys.has(k)))fail('RECOVERY_CURRENT_OBJECT_MISSING');
 return meta;
}

/** Operator-only: one read-only source snapshot, explicit byte copies, no destination mutation. */
export async function captureStaging(root) {
 process.umask(0o077);root=resolve(root);await mkdir(root,{recursive:false,mode:0o700});
 let phase='source-auth',session,keyPath;
 try {
  const env=await sourceEnvironment();
  phase='export-snapshot';
  session=sourceProcess(env,'psql',['-XAtq','-v','ON_ERROR_STOP=1']);
  session.stderr.pipe(createWriteStream(join(root,'source.private.log'),{flags:'a',mode:0o600}));
  const lines=createInterface({input:session.stdout})[Symbol.asyncIterator]();
  session.stdin.write("set role postgres;begin isolation level repeatable read read only;set local statement_timeout='60s';set local idle_in_transaction_session_timeout='15min';select pg_export_snapshot();\n");
  const first=await lines.next();const snapshotId=first.value;
  if(first.done||!snapshotId?.match(/^[A-Fa-f0-9-]+$/))fail('RECOVERY_SNAPSHOT_UNAVAILABLE');
  phase='inventory';
  session.stdin.write(await readFile(new URL('./snapshot-inventory.sql',import.meta.url),'utf8')+'\n');
  const inventoryLine=await lines.next();if(inventoryLine.done)fail('RECOVERY_INVENTORY_UNAVAILABLE');
  const meta=checkInventory(JSON.parse(inventoryLine.value));
  const contract=makeContract(meta.checkpoint_tables,meta.foreign_keys);
  session.stdin.write(`select jsonb_build_object('columns',(select jsonb_object_agg(t.name,t.cols)from(select table_schema||'.'||table_name name,jsonb_agg(column_name order by ordinal_position)cols from information_schema.columns where table_schema='auth'and table_name in('users','identities')group by table_schema,table_name)t),'external_rows',(${AUTH_EMPTY_REQUIRED.map(t=>`(select count(*)from ${t})`).join('+')}),'unsupported_users',(select count(*)from auth.users where is_super_admin is true or is_sso_user or instance_id is distinct from'00000000-0000-0000-0000-000000000000'::uuid))::text;\n`);
  const auditLine=await lines.next();if(auditLine.done)fail('RECOVERY_AUTH_AUDIT');const audit=JSON.parse(auditLine.value);validateAuthColumns(audit.columns);
  if(audit.external_rows!==0||audit.unsupported_users!==0)fail('RECOVERY_AUTH_EXTERNAL_CONFIGURATION_REQUIRED');
  meta.auth_projection_audit={field_catalog_verified:true,external_rows:0,unsupported_users:0};
  session.stdin.write(SECURITY_SNAPSHOT_SQL+'\n');const securityLine=await lines.next();if(securityLine.done)fail('RECOVERY_SECURITY_SNAPSHOT');meta.security_snapshot=JSON.parse(securityLine.value);
  meta.source_ref=SOURCE;meta.exported_snapshot_id=snapshotId;
  await writeFile(join(root,'inventory.private.json'),JSON.stringify(meta),{flag:'wx',mode:0o600});
  phase='database-dump';
  const p=sourceProcess(env,'pg_dump',['--format=custom','--role=postgres','--snapshot='+snapshotId,
   '--schema=public','--schema=spot_private','--schema=auth','--schema=storage','--schema=extensions','--schema=supabase_migrations',
   ...EXCLUDED_DATA.map(t=>'--exclude-table-data='+t)]);
  p.stdin.end();const dumpEnd=once(p,'close');
  p.stderr.pipe(createWriteStream(join(root,'dump.private.log'),{flags:'a',mode:0o600}));
  await pipeline(p.stdout,createWriteStream(join(root,'database.dump'),{flags:'wx',mode:0o600}));
  if((await dumpEnd)[0]!==0)fail('RECOVERY_DATABASE_DUMP');
  phase='dump-parse';
  await run(DOCKER,['run','--rm','--network','none','--mount','type=bind,source='+root+',target=/backup,readonly',
   'ghcr.io/supabase/postgres:17.11.0.004','pg_restore','--list','/backup/database.dump'],{output:join(root,'dump-toc.private.txt'),log:join(root,'parse.private.log')});
  phase='storage-copy';
  await mkdir(join(root,'photos'),{mode:0o700});
  const files=[{input:join(root,'database.dump'),name:'database.dump',kind:'database'},
   {input:join(root,'inventory.private.json'),name:'inventory.json',kind:'metadata'}];
  phase='auth-projection';await mkdir(join(root,'auth-projection'),{mode:0o700});
  for(const table of AUTH_PROJECTED){
   const name='auth-projection/'+table.slice(5)+'.csv',input=join(root,name);
   const ap=sourceProcess(env,'psql',['-XAtq','-v','ON_ERROR_STOP=1']);const end=once(ap,'close');
   ap.stderr.pipe(createWriteStream(join(root,'projection.private.log'),{flags:'a',mode:0o600}));
   ap.stdin.end(projectionSnapshotSql(table,snapshotId));
   await pipeline(ap.stdout,createWriteStream(input,{flags:'wx',mode:0o600}));if((await end)[0]!==0)fail('RECOVERY_AUTH_PROJECTION');
   files.push({input,name,kind:'auth_projection',auth_table:table});
  }
  phase='storage-copy';
  // Individual immutable keys from the snapshot, never a recursive live listing/refill.
  for(let i=0;i<meta.objects.length;i++){
   const o=meta.objects[i],name='photos/'+String(i).padStart(6,'0')+'.jpg',input=join(root,name);
   await run('supabase',storageDownloadArgs(o,input),{log:join(root,'storage.private.log')});
   const actual=await fileDigest(input);
   if(actual.size!==o.size || o.expected_sha && actual.sha256!==o.expected_sha)fail('RECOVERY_SOURCE_BYTES_MISMATCH');
   files.push({input,name,kind:'photo',bucket:o.bucket,storage_key:o.storage_key});
  }
  phase='close-snapshot';
  const end=once(session,'close');session.stdin.end('commit;\n');
  if((await end)[0]!==0)fail('RECOVERY_SOURCE_SNAPSHOT_LOST');session=null;
  phase='seal';
  const keyDir=resolve('.local/recovery-keys');await mkdir(keyDir,{recursive:true,mode:0o700});
  const manifest=await makeManifest({snapshotAt:meta.snapshot_at,files,contract});
  keyPath=join(keyDir,manifest.checkpoint_id+'.key');const key=randomBytes(32);
  const k=await open(keyPath,'wx',0o600);await k.writeFile(key);await k.sync();await k.close();
  const output=join(root,manifest.checkpoint_id+'.soma.enc');
  const sealed=await sealCheckpoint({manifest,files,key,output});key.fill(0);
  await writeFile(join(root,'sealed-summary.json'),JSON.stringify({...sealed,snapshot_at:meta.snapshot_at,objects:meta.objects.length,source_ref:SOURCE,cloud_uploaded:false}),{flag:'wx',mode:0o600});
  // Restore proof must use the sealed archive, not accidentally reuse the capture plaintext.
  await rm(join(root,'photos'),{recursive:true});
  await rm(join(root,'auth-projection'),{recursive:true});
  for(const name of ['database.dump','inventory.private.json','dump-toc.private.txt','source.private.log','dump.private.log','parse.private.log','projection.private.log','storage.private.log'])await rm(join(root,name),{force:true});
  return {...sealed,snapshot_at:meta.snapshot_at,objects:meta.objects.length,cloud_uploaded:false};
 } catch(error){
  if(session){session.stdin.end('rollback;\n');session.kill();}
  if(keyPath)await rm(keyPath,{force:true});
  await rm(root,{recursive:true,force:true});await mkdir(root,{mode:0o700});
  const code=/^RECOVERY_[A-Z_]+$/.test(error.message)?error.message:'RECOVERY_CAPTURE_INTERRUPTED';
  await writeFile(join(root,'failure.json'),JSON.stringify({phase,code,completed:false}),{mode:0o600});
  // This directory is deliberately private. No failed artifact counts toward recovery or RPO.
  throw new Error('RECOVERY_CAPTURE_FAILED:'+phase);
 }
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv[2]!=='--execute-staging-checkpoint'||!process.argv[3])throw new Error('RECOVERY_EXPLICIT_OPERATOR_INVOCATION_REQUIRED');
 try{console.log(JSON.stringify(await captureStaging(process.argv[3])));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
