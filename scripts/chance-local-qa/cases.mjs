// Deterministic local test-clock cases AFTER the one native scheduler run.
import assert from'node:assert/strict';import{sql,receipt}from'./environment.mjs';
const mode=process.argv[2];if(!['backlog','expired','small-pool'].includes(mode))throw Error('LOCAL_CASE_REQUIRED');
assert.equal(await sql('select count(*)from cron.job'),'0');
await sql(`create table if not exists spot_private.local_qa_clock(singleton boolean primary key default true,offset_time interval not null,fixed_at timestamptz);alter table spot_private.local_qa_clock add column if not exists fixed_at timestamptz;revoke all on spot_private.local_qa_clock from public,anon,authenticated,service_role;
insert into spot_private.local_qa_clock(singleton,offset_time)values(true,interval '0')on conflict do nothing;
create schema if not exists local_qa;revoke all on schema local_qa from public,anon,authenticated,service_role;
create or replace function local_qa.clock_timestamp()returns timestamptz language sql volatile security definer set search_path='' as $$select coalesce(fixed_at,pg_catalog.statement_timestamp()+offset_time)from spot_private.local_qa_clock where singleton$$;`);
// Native PostgreSQL fast-paths the built-in clock OID, unlike PGlite. Adapt only
// Chance/DD clock dependencies in this disposable QA DB; no PHOTO function changes.
const definitions=JSON.parse(await sql("select coalesce(json_agg(pg_get_functiondef(p.oid)),'[]')from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','spot_private')and p.prokind='f'and(p.proname like 'chance%'or p.proname like 'dd_%'or p.proname in('my_chances','reveal_chance','send_chance_spot','send_spot_v2'))and position('clock_timestamp()'in pg_get_functiondef(p.oid))>0;"));
for(const definition of definitions){const body=definition.replace(/(?<![.\w])clock_timestamp\(\)/g,'local_qa.clock_timestamp()');if(body!==definition)await sql(body);}
if(mode==='backlog'){
 await sql(`update spot_private.local_qa_clock set fixed_at=((statement_timestamp()at time zone 'Europe/Rome')::date+1+time '22:30')at time zone 'Europe/Rome';
insert into public.venues(id,name,address)values('20000000-0000-0000-0000-000000000003','QA Tribe tre','Solo locale')on conflict do nothing;insert into spot_private.tribe_catalog(id,active,joinable)values('20000000-0000-0000-0000-000000000003',true,true)on conflict do nothing;`);
 const users=JSON.parse(await sql('select json_agg(id)from profiles;'));
 for(const id of users)await sql(`set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);select join_tribe('20000000-0000-0000-0000-000000000002');select join_tribe('20000000-0000-0000-0000-000000000003');`);
 await sql('update spot_private.chance_control set scheduler_enabled=true;select spot_private.chance_tick();select spot_private.chance_tick();update spot_private.chance_control set scheduler_enabled=false;');
 const proof=JSON.parse(await sql(`select json_build_object('clock','local QA offset after native scheduler','memberships_per_user',(select min(n)from(select count(*)n from spot_private.tribe_memberships group by user_id)x),'max_day',(select max(n)from(select sum(a.exposure_count)n from spot_private.discovery_allocations a join spot_private.discovery_windows w on w.id=a.window_id where w.local_date=(local_qa.clock_timestamp()at time zone 'Europe/Rome')::date group by user_id)x),'min_day',(select min(n)from(select sum(a.exposure_count)n from spot_private.discovery_allocations a join spot_private.discovery_windows w on w.id=a.window_id where w.local_date=(local_qa.clock_timestamp()at time zone 'Europe/Rome')::date group by user_id)x),'pairs',(select count(*)from spot_private.discovery_exposures e join spot_private.discovery_windows w on w.id=e.window_id where w.local_date=(local_qa.clock_timestamp()at time zone 'Europe/Rome')::date));`));
 assert.equal(proof.memberships_per_user,3);assert.ok(proof.max_day<=4);assert.ok(proof.max_day>1);assert.ok(proof.min_day>=0);assert.ok(proof.pairs>0);await receipt('global-cap-backlog',proof);
}else if(mode==='expired'){
 await sql("update spot_private.local_qa_clock set fixed_at=(select max(ends_at)+interval '1 second'from spot_private.discovery_windows);");
 await receipt('expiry-case',{local_clock_advance:true,old_windows_expired:await sql('select bool_and(ends_at<local_qa.clock_timestamp())from spot_private.discovery_windows')});
}else{
 await sql("update spot_private.local_qa_clock set fixed_at=((local_qa.clock_timestamp()at time zone 'Europe/Rome')::date+5+time '23:00')at time zone 'Europe/Rome';delete from spot_private.dd_admission_accounts where user_id::text>'10000000-0000-0000-0000-000000000002';update spot_private.chance_control set scheduler_enabled=true;select spot_private.chance_tick();update spot_private.chance_control set scheduler_enabled=false;");
 const n=Number(await sql("select count(*)from spot_private.discovery_exposures e join spot_private.discovery_windows w on w.id=e.window_id where w.local_date=(local_qa.clock_timestamp()at time zone 'Europe/Rome')::date;"));assert.equal(n,1);await receipt('small-pool',{allowlisted:2,actual_pairs:n,other_slots_empty:true,no_duplicate_pair:true});
}
console.log('Local QA case '+mode+' PASS');
