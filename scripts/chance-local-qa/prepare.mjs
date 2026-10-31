import {PGlite}from'@electric-sql/pglite';
import {readFile,writeFile,access}from'node:fs/promises';import{resolve}from'node:path';
import {docker,container,network,root,run,prepareConfig,privateConfig,sql,quote,receipt}from'./environment.mjs';
const rebuild=process.argv[2]==='--rebuild-disposable-bootstrap';
if(!rebuild&&process.argv[2]!=='--create-disposable-local')throw Error('EXPLICIT_LOCAL_ACTION_REQUIRED');
if(!rebuild)try{await access(root+'/private.json');throw Error('LOCAL_QA_ALREADY_PREPARED');}catch(e){if(e.code!=='ENOENT')throw e;}
const cfg=rebuild?await privateConfig():await prepareConfig(),captured=[];
const oldExec=PGlite.prototype.exec,oldQuery=PGlite.prototype.query;
PGlite.prototype.exec=function(s,...args){captured.push(s);return oldExec.call(this,s,...args);};
PGlite.prototype.query=function(s,args=[],...rest){captured.push(s.replace(/\$(\d+)/g,(_,n)=>quote(args[Number(n)-1]))+';');return oldQuery.call(this,s,args,...rest);};
const {chanceFullDatabase,admin,ids}=await import('../../tests/helpers/chance-full-database.js');
const d=await chanceFullDatabase({after(){}});await admin(d);await d.close();
PGlite.prototype.exec=oldExec;PGlite.prototype.query=oldQuery;
let schema=captured.filter(s=>!s.includes("set_config('soma.test_clock'")&&!s.includes('create or replace function pg_catalog.clock_timestamp()')).join(';\n');
schema=schema.replace(/create role (anon|authenticated|service_role);/g,(_,r)=>`do $$begin if not exists(select 1 from pg_roles where rolname='${r}')then create role ${r};end if;end$$;`);
// Provider PostgREST sets the claims JSON. The test Auth scaffold also supports its original per-claim GUC.
schema+='\nreset role;create or replace function auth.uid()returns uuid language sql stable as $$select coalesce(nullif(current_setting(\'request.jwt.claim.sub\',true),\'\'),nullif(current_setting(\'request.jwt.claims\',true),\'\')::jsonb->>\'sub\')::uuid$$;\n';
await writeFile(root+'/seed.sql',schema,{mode:0o600});
if(!rebuild){await run(docker,['network','create','--internal',network]);
await run(docker,['run','-d','--name',container,'--network',network,'--env-file',resolve(root+'/postgres.env'),'ghcr.io/supabase/postgres:17.11.0.004','postgres','-D','/etc/postgresql','-c','shared_preload_libraries=pg_cron','-c','cron.database_name=chance_qa','-c','cron.use_background_workers=on']);}
// Bounded readiness polling only; no canary or upload retry.
let ready=false;for(let i=0;i<30;i++){try{await run(docker,['exec',container,'pg_isready','-h','127.0.0.1','-U','supabase_admin']);ready=true;break;}catch{await new Promise(r=>setTimeout(r,1000));}}if(!ready)throw Error('LOCAL_DB_START_FAILED');
if(rebuild){if((await sql("select count(*)from pg_extension where extname='pg_cron'"))!=='0')throw Error('CANARY_BOOTSTRAP_ALREADY_FINISHED');await run(docker,['exec',container,'dropdb','--force','-U','supabase_admin','chance_qa']);}
await run(docker,['exec',container,'createdb','-U','supabase_admin','chance_qa']);
await sql(schema);
await sql(`reset role;create extension pg_cron;alter role authenticator password ${quote(cfg.password)};grant anon,authenticated,service_role to authenticator;
delete from auth.users where id::text>'10000000-0000-0000-0000-000000000006';
delete from public.checkins;
update public.venues set name=case when id='${ids.v}'then 'QA IULM locale'else 'QA Campus locale'end;
update public.profiles set name='SYNTHETIC CHANCE '||right(id::text,2),occupation='Fixture locale isolata';
update spot_private.account_onboarding set completed_at=clock_timestamp();`);
const state=JSON.parse(await sql("select json_build_object('postgres',version(),'cron',(select extversion from pg_extension where extname='pg_cron'),'users',(select count(*)from auth.users),'profiles',(select count(*)from public.profiles),'eligible',(select count(*)from public.profiles where spot_private.ora_eligible(id)));"));
if(state.users!==6||state.eligible!==6)throw Error('LOCAL_SEED_ELIGIBILITY');
await receipt('preflight',{...state,local_only:true,source_data:false,recovery_reused:false,seed_source:'tests/helpers/chance-full-database.js',auth_scaffold:'existing local QA, not an Auth acceptance test'});
console.log('Local isolated PostgreSQL/pg_cron fixture seed PASS');
