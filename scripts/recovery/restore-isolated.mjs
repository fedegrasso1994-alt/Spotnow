/** One new quarantined database. No Auth/API writer connects during import. */
import {spawn} from 'node:child_process';
import {readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {openCheckpoint} from './checkpoint-artifact.mjs';
import {PROJECTIONS} from './auth-durable.mjs';
import {SESSION_BARRIER_SQL} from './session-contract.mjs';
import {DOCKER,TARGET,targetSql} from './local-target.mjs';
const DATABASE='soma_recovery_v3_20261028';
async function docker(args,{input,output}={}){
 const p=spawn(DOCKER,args,{stdio:['pipe','pipe','pipe']});let out='',err='';
 p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);
 const done=new Promise((ok,bad)=>{p.on('error',()=>bad(Error('RECOVERY_LOCAL_PROCESS')));p.on('close',code=>ok({code,out,err}))});p.stdin.end(input);
 const r=await done;if(output)await writeFile(output,r.out,{flag:'wx',mode:0o600});return r;
}
if(process.argv[2]!=='--one-clean-isolated-restore'||!process.argv[3])throw Error('RECOVERY_EXPLICIT_ACTION');
process.umask(0o077);const root=resolve(process.argv[3]),plain=join(root,'decrypted');let phase='archive-open';
try{
 const summary=JSON.parse(await readFile(join(root,'sealed-summary.json'),'utf8'));
 const key=await readFile(resolve('.local/recovery-keys',summary.checkpoint_id+'.key'));
 const manifest=await openCheckpoint({input:join(root,summary.checkpoint_id+'.soma.enc'),key,outputDir:plain});key.fill(0);
 phase='prepare-new-quarantined-database';
 // Existing names are refused. Never DROP or overwrite a previous target.
 await targetSql('create database '+DATABASE+' template template0;');
 await targetSql('create schema extensions;create extension pgcrypto with schema extensions;create extension "uuid-ossp" with schema extensions;create extension pg_stat_statements with schema extensions;create extension supabase_vault;',{database:DATABASE});
 const remote='/tmp/soma-recovery-v3-20261028';
 let r=await docker(['exec',TARGET.db,'mkdir','-m','700',remote]);if(r.code)throw Error('RECOVERY_LOCAL_STAGE');
 r=await docker(['cp',plain+'/.',TARGET.db+':'+remote]);if(r.code)throw Error('RECOVERY_LOCAL_STAGE');
 phase='prepare-restore-catalog';
 r=await docker(['exec',TARGET.db,'pg_restore','--list',remote+'/database.dump']);if(r.code)throw Error('RECOVERY_DUMP_CATALOG');
 // Only schemas initialized as extension prerequisites are already present.
 const toc=r.out.split('\n').filter(x=>!/^\d+; \d+ \d+ SCHEMA - (public|extensions) /.test(x)).join('\n');
 await writeFile(join(plain,'restore.list'),toc,{flag:'wx',mode:0o600});
 r=await docker(['cp',join(plain,'restore.list'),TARGET.db+':'+remote+'/restore.list']);if(r.code)throw Error('RECOVERY_LOCAL_STAGE');
 const sections=[];
 for(const section of ['pre-data','data','post-data']){
  r=await docker(['exec',TARGET.db,'pg_restore','--exit-on-error','--section='+section,'--use-list='+remote+'/restore.list','--file=-',remote+'/database.dump']);
  if(r.code)throw Error('RECOVERY_DUMP_SQL');sections.push(r.out);
 }
 const projections=['auth.users','auth.identities'].map(t=>`\\copy ${t}(${PROJECTIONS[t].map(x=>'"'+x.column+'"').join(',')}) from '${remote}/auth-projection/${t.slice(5)}.csv' with(format csv)`).join('\n');
 const sql='\\set ON_ERROR_STOP on\n\\set VERBOSITY verbose\nbegin;\n'+sections[0]+'\n'+projections+'\n'+sections[1]+'\n'+sections[2]+'\n'+SESSION_BARRIER_SQL+'\ncommit;\n';
 phase='single-restore-transaction';
 r=await docker(['exec','-i',TARGET.db,'psql','-U','postgres','-d',DATABASE,'-Xq','-v','ON_ERROR_STOP=1'],{input:sql});
 if(r.code){
  // Never persist PostgreSQL DETAIL/CONTEXT: they can include restored row values.
  const fk=/constraint "([a-zA-Z0-9_]+)"/.exec(r.err)?.[1]||null;
  const sqlstate=/ERROR:\s+([A-Z0-9]{5}):/.exec(r.err)?.[1]||null;
  const object=/relation "([a-zA-Z0-9_.]+)"/.exec(r.err)?.[1]||null;
  await writeFile(join(root,'restore-result.json'),JSON.stringify({pass:false,phase,transaction_rolled_back:true,fk,sqlstate,object,attempts:1,database:DATABASE},null,2),{mode:0o600});
  await docker(['exec',TARGET.db,'rm','-rf',remote]);await rm(plain,{recursive:true,force:true});
  throw Error(fk?'RECOVERY_NEW_DEPENDENCY_STOP':'RECOVERY_RESTORE_TRANSACTION_STOP');
 }
 await targetSql(SESSION_BARRIER_SQL,{database:DATABASE});
 await writeFile(join(root,'restore-result.json'),JSON.stringify({pass:true,contract_version:manifest.version,database:DATABASE,quarantined:true,auth_writers_connected:false,attempts:1},null,2),{mode:0o600});
 console.log(JSON.stringify({pass:true,database:DATABASE,quarantined:true,attempts:1}));
}catch(error){console.error(JSON.stringify({pass:false,phase,code:/^[A-Z_]+$/.test(error.message)?error.message:'RECOVERY_LOCAL_RESTORE_FAILED'}));process.exitCode=1;}
