/** One explicitly authorized bootstrap retry. All writers remain quarantined. */
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,rm,open} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {openCheckpoint,fileDigest} from './checkpoint-artifact.mjs';
import {PROJECTIONS} from './auth-durable.mjs';
import {authTransientSql} from './auth-transient-reconstruction.mjs';
import {SESSION_BARRIER_SQL} from './session-contract.mjs';
import {DOCKER,TARGET,targetSql,targetEnvironment} from './local-target.mjs';
import {IMPORT_ROLE,DATABASE_OWNER,RETRY_DATABASE,assertPreflight,schemaSecurity,assertDumpContract,assertSecurityEquivalent,createRetryDatabaseSql} from './restore-bootstrap.mjs';
const exec=promisify(execFile);
const CHECKPOINT='28ec939f-9e37-4b91-9fe2-2cc1c9e252dc';
const SHA='b4ab1cbac728c82a031e2328eb6f75ce76d091b924fbce465726c65e4645b6ae';
async function docker(args,input){
 const p=spawn(DOCKER,args,{stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);
 const done=new Promise((ok,bad)=>{p.on('error',()=>bad(Error('RECOVERY_LOCAL_PROCESS')));p.on('close',code=>ok({code,out,err}))});p.stdin.end(input);return done;
}
const pgargs=db=>['exec','-i',TARGET.db,'psql','-U',IMPORT_ROLE,'-d',db,'-Xq','-v','ON_ERROR_STOP=1'];
async function dumpSql(db){const r=await docker(['exec',TARGET.db,'pg_dump','-U',IMPORT_ROLE,'-d',db,'--schema-only',...['public','spot_private','auth','storage','extensions','supabase_migrations'].map(s=>'--schema='+s)]);if(r.code)throw Error('RECOVERY_POST_DUMP');return r.out;}
if(process.argv[2]!=='--authorized-bootstrap-retry-once'||!process.argv[3])throw Error('RECOVERY_EXPLICIT_ACTION');
process.umask(0o077);const root=resolve(process.argv[3]),plain=join(root,'decrypted-bootstrap-retry'),remote='/tmp/soma-bootstrap-retry-20261028';
const evidence={checkpoint_id:CHECKPOINT,archive_sha256:SHA,database:RETRY_DATABASE,import_role:IMPORT_ROLE,database_owner:DATABASE_OWNER,attempts:0,quarantined:true};let phase='archive-open',created=false;
try{
 const summary=JSON.parse(await readFile(join(root,'sealed-summary.json'),'utf8')),witness=JSON.parse(await readFile(resolve('.local/recovery-v3/database-owner-witness.json'),'utf8'));
 if(summary.checkpoint_id!==CHECKPOINT||summary.sha256!==SHA||witness.archive_sha256!==SHA||witness.source_ref!=='zjinjtkekmaqtxsuyvho')throw Error('RECOVERY_ARCHIVE_BINDING');
 const input=join(root,CHECKPOINT+'.soma.enc');if((await fileDigest(input)).sha256!==SHA)throw Error('RECOVERY_ARCHIVE_HASH');
 const key=await readFile(resolve('.local/recovery-keys',CHECKPOINT+'.key'));let manifest;try{manifest=await openCheckpoint({input,key,outputDir:plain})}finally{key.fill(0)}
 const dump=await readFile(join(plain,'database.dump'));let r=await docker(['exec','-i',TARGET.db,'pg_restore','--schema-only','--file=-'],dump);if(r.code)throw Error('RECOVERY_DUMP_METADATA');
 const expected=schemaSecurity(r.out);evidence.dump=assertDumpContract(expected);
 phase='preflight';const inspect=JSON.parse((await exec(DOCKER,['inspect',TARGET.db])).stdout)[0];
 const catalog=JSON.parse(await targetSql("begin read only;select jsonb_build_object('version',current_setting('server_version'),'roles',(select jsonb_agg(jsonb_build_object('role',rolname,'superuser',rolsuper,'bypassrls',rolbypassrls,'login',rolcanlogin,'inherit',rolinherit,'createrole',rolcreaterole,'createdb',rolcreatedb,'replication',rolreplication))from pg_roles),'membership',(select jsonb_agg(jsonb_build_object('member',m.rolname,'role',r.rolname,'admin',a.admin_option,'inherit',a.inherit_option,'set',a.set_option))from pg_auth_members a join pg_roles m on m.oid=a.member join pg_roles r on r.oid=a.roleid));rollback;"));
 const local=JSON.parse(await targetSql("begin read only;select jsonb_build_object('owner',(select pg_get_userbyid(datdba)from pg_database where datname=current_database()),'public_owner',(select pg_get_userbyid(nspowner)from pg_namespace where nspname='public'));rollback;",{database:'soma_recovery_v3_20261028'}));
 const services=[];for(const [name,variable]of[['auth','GOTRUE_DB_DATABASE_URL'],['rest','PGRST_DB_URI'],['storage','DATABASE_URL']]){const env=await targetEnvironment(TARGET[name]),url=new URL(env[variable]);services.push({service:name,role:url.username,database:url.pathname.slice(1)});}
 evidence.preflight=assertPreflight({...catalog,image:inspect.Image,services,sourceDatabaseOwner:witness.database_owner,sourcePublicOwner:witness.public_schema_owner,localDatabaseOwner:local.owner,localPublicOwner:local.public_owner});
 // This is an existing image bootstrap identity, not a new grant or a runtime login.
 if((await targetSql("begin read only;select current_user;rollback;",{role:IMPORT_ROLE})).trim()!==IMPORT_ROLE)throw Error('RECOVERY_IMPORT_LOGIN');
 const sentinel=await open(join(root,'bootstrap-retry-attempt.json'),'wx',0o600);await sentinel.writeFile(JSON.stringify({checkpoint:CHECKPOINT,database:RETRY_DATABASE,started_at:new Date().toISOString(),maximum_attempts:1}));await sentinel.close();
 phase='prepare-new-quarantined-database';await targetSql(createRetryDatabaseSql(),{role:IMPORT_ROLE});created=true;
 // Match source ownership: ordinary extensions owned by postgres, vault by provider admin.
 await targetSql('create schema extensions authorization postgres;set role postgres;create extension pgcrypto with schema extensions;create extension "uuid-ossp" with schema extensions;create extension pg_stat_statements with schema extensions;reset role;create extension supabase_vault;',{database:RETRY_DATABASE,role:IMPORT_ROLE});
 r=await docker(['exec',TARGET.db,'mkdir','-m','700',remote]);if(r.code)throw Error('RECOVERY_LOCAL_STAGE');
 r=await docker(['cp',plain+'/.',TARGET.db+':'+remote]);if(r.code)throw Error('RECOVERY_LOCAL_STAGE');
 r=await docker(['exec',TARGET.db,'pg_restore','--list',remote+'/database.dump']);if(r.code)throw Error('RECOVERY_DUMP_CATALOG');
 // Same two pre-created schema prerequisites as v3; no ownership/ACL statement removed.
 const toc=r.out.split('\n').filter(x=>!/^\d+; \d+ \d+ SCHEMA - (public|extensions) /.test(x)).join('\n');await writeFile(join(plain,'restore.list'),toc,{flag:'wx',mode:0o600});
 r=await docker(['cp',join(plain,'restore.list'),TARGET.db+':'+remote+'/restore.list']);if(r.code)throw Error('RECOVERY_LOCAL_STAGE');
 const sections=[];for(const section of ['pre-data','data','post-data']){r=await docker(['exec',TARGET.db,'pg_restore','--exit-on-error','--section='+section,'--use-list='+remote+'/restore.list','--file=-',remote+'/database.dump']);if(r.code)throw Error('RECOVERY_DUMP_SQL');sections.push(r.out);}
 const projections=['auth.users','auth.identities'].map(t=>`\\copy ${t}(${PROJECTIONS[t].map(x=>'"'+x.column+'"').join(',')}) from '${remote}/auth-projection/${t.slice(5)}.csv' with(format csv)`).join('\n');
 const inventory=JSON.parse(await readFile(join(plain,manifest.files.find(f=>f.kind==='metadata').name),'utf8'));
 const inert=authTransientSql(manifest.contract,inventory.security_snapshot.users.map(x=>x.id));
 phase='single-restore-transaction';evidence.attempts=1;
 r=await docker(pgargs(RETRY_DATABASE),'\\set ON_ERROR_STOP on\n\\set VERBOSITY verbose\nbegin;\n'+sections[0]+'\n'+projections+'\n'+sections[1]+'\n'+sections[2]+'\n'+inert+'\n'+SESSION_BARRIER_SQL+'\ncommit;\n');
 if(r.code){evidence.error={sqlstate:/ERROR:\s+([A-Z0-9]{5}):/.exec(r.err)?.[1]||null,constraint:/constraint "([a-zA-Z0-9_]+)"/.exec(r.err)?.[1]||null};throw Error('RECOVERY_NEW_BLOCKER_STOP');}
 evidence.database_restore='PASS';phase='ownership-acl-rls-proof';
 evidence.security=assertSecurityEquivalent(expected,schemaSecurity(await dumpSql(RETRY_DATABASE)));
 await targetSql(SESSION_BARRIER_SQL,{database:RETRY_DATABASE,role:IMPORT_ROLE});evidence.session_barrier='PASS';
 const dbOwner=JSON.parse(await targetSql("begin read only;select jsonb_build_object('database_owner',(select pg_get_userbyid(datdba)from pg_database where datname=current_database()),'public_owner',(select pg_get_userbyid(nspowner)from pg_namespace where nspname='public'));rollback;",{database:RETRY_DATABASE,role:IMPORT_ROLE}));
 if(dbOwner.database_owner!==DATABASE_OWNER||dbOwner.public_owner!=='pg_database_owner')throw Error('RECOVERY_POST_OWNER');evidence.owner_equivalence=dbOwner;
 evidence.pass=true;console.log(JSON.stringify({pass:true,database:RETRY_DATABASE,attempts:1,security:evidence.dump,quarantined:true}));
}catch(error){evidence.pass=false;evidence.phase=phase;evidence.code=/^[A-Z_]+$/.test(error.message)?error.message:'RECOVERY_LOCAL_RESTORE_FAILED';if(error.changed)evidence.changed_security_objects=error.changed;
 if(created)evidence.table_counts=JSON.parse(await targetSql("begin read only;select jsonb_build_object('auth',(select count(*)from pg_tables where schemaname='auth'),'application',(select count(*)from pg_tables where schemaname='spot_private'));rollback;",{database:RETRY_DATABASE,role:IMPORT_ROLE}).catch(()=>'{"verification":"unavailable"}'));
 console.error(JSON.stringify({pass:false,phase,code:evidence.code,error:evidence.error}));process.exitCode=1;
}finally{
 await docker(['exec',TARGET.db,'rm','-rf',remote]);await rm(plain,{recursive:true,force:true});
 await writeFile(join(root,'bootstrap-retry-result.json'),JSON.stringify(evidence,null,2),{mode:0o600});
}
