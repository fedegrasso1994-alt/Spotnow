/** Explicit operator action: staging 056 + Vault provisioning, atomic; never prints credentials. */
import{readFile}from'node:fs/promises';import{spawn}from'node:child_process';import{sourceEnvironment,DOCKER,POSTGRES_IMAGE}from'./recovery/source-connection.mjs';
if(process.argv[2]!=='--apply-staging-056')throw Error('EXPLICIT_STAGING_056_REQUIRED');
try{
 const c=JSON.parse(await readFile('.local/legacy-key-migration/config.json','utf8'));
 if(c.url!=='https://zjinjtkekmaqtxsuyvho.supabase.co'||!/^sb_secret_[A-Za-z0-9_-]+$/.test(c.serverKey))throw Error();
 const env=await sourceEnvironment();
 const migration=(await readFile('supabase/migrations/056_staging_server_key_transport.sql','utf8')).replace(/^begin;$/m,'').replace(/^commit;$/m,'');
 const sql=`set role postgres;begin;
 do $$begin if exists(select 1 from supabase_migrations.schema_migrations where version='056')then raise exception '056_ALREADY_APPLIED';end if;if exists(select 1 from cron.job where active and jobname<>'soma-retention-phase-a-staging')then raise exception 'UNEXPECTED_ACTIVE_JOB';end if;end$$;
 ${migration}
 create temp table soma_vault_input(value text)on commit drop;
 copy soma_vault_input(value)from stdin;
${c.serverKey}
\\.
 do $$declare existing uuid;begin select id into existing from vault.secrets where name='soma-modern-server-staging';if existing is not null then raise exception 'VAULT_NAME_ALREADY_EXISTS';end if;perform vault.create_secret((select value from soma_vault_input),'soma-modern-server-staging','Modern staging server credential; owner provisioned');end$$;
 insert into supabase_migrations.schema_migrations(version,name,statements)values('056','staging_server_key_transport',array['Owner-approved staging server key transport; versioned source 056']);
 commit;`;
 const args=['run','--rm','-i','--network','bridge',...Object.keys(env).flatMap(k=>['--env',k]),POSTGRES_IMAGE,'psql','-XAtq','-v','ON_ERROR_STOP=1'];
 const p=spawn(DOCKER,args,{env:{...process.env,...env},stdio:['pipe','pipe','pipe']});p.stdout.resume();p.stderr.resume();p.stdin.end(sql);
 const exit=await new Promise(resolve=>p.on('close',resolve));if(exit!==0)throw Error();console.log('056 and modern Vault credential installed atomically in staging; no credential output.');
}catch{console.error('056_INSTALL_FAILED — inspect safely, no credential output; do not retry automatically');process.exitCode=1;}
