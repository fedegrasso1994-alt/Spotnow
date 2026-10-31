import assert from'node:assert/strict';import{access,writeFile}from'node:fs/promises';
import{sql,root,receipt}from'./environment.mjs';
if(process.argv[2]!=='--one-native-scheduler-run')throw Error('EXPLICIT_CANARY_ACTION');
try{await access(root+'/canary-started');throw Error('NO_AUTOMATIC_CANARY_RETRY');}catch(e){if(e.code!=='ENOENT')throw e;}
const pre=JSON.parse(await sql("select json_build_object('jobs',(select count(*)from cron.job),'exposures',(select count(*)from spot_private.discovery_exposures),'eligible',(select count(*)from profiles where spot_private.ora_eligible(id)),'clock_native',(select prosrc='clock_timestamp'from pg_proc where oid='pg_catalog.clock_timestamp()'::regprocedure));"));
assert.deepEqual(pre,{jobs:0,exposures:0,eligible:6,clock_native:true});
await writeFile(root+'/canary-started',new Date().toISOString(),{mode:0o600});
// Four close QA slots, last one just in the future. Earlier slots exercise backlog catch-up.
// Real wall-clock, real pg_cron background worker, unchanged application tick/build functions.
const config=JSON.parse(await sql(`update spot_private.soma_v2_control set discovery_enabled=true,dd_controlled_admission=true;
insert into spot_private.dd_admission_accounts(user_id,reason)select id,'LOCAL_SYNTHETIC_CHANCE_QA'from auth.users;
update spot_private.discovery_policy set enabled=true,paused=false where version=3;
update spot_private.chance_control set release_times=array[(clock_timestamp()at time zone 'Europe/Rome')::time-interval '3 minutes',(clock_timestamp()at time zone 'Europe/Rome')::time-interval '2 minutes',(clock_timestamp()at time zone 'Europe/Rome')::time-interval '1 minute',(clock_timestamp()at time zone 'Europe/Rome')::time+interval '5 seconds']::time[];
update spot_private.chance_control set enabled=true,scheduler_enabled=true;
update spot_private.chance_control set activated_at=clock_timestamp()-interval '4 minutes';
create table public.local_chance_canary_receipt(at timestamptz,first_count integer,second_count integer,stable boolean);
revoke all on public.local_chance_canary_receipt from public,anon,authenticated,service_role;
select json_build_object('local_server_now',clock_timestamp(),'slots',release_times)from spot_private.chance_control;`));
await sql(`select cron.schedule('local-chance-one-shot','10 seconds',$job$
do $payload$declare a text;b text;n integer;m integer;begin
perform cron.alter_job((select jobid from cron.job where jobname='local-chance-one-shot'),schedule:='0 0 31 2 *');
n:=spot_private.chance_tick();
select md5(coalesce(jsonb_agg(to_jsonb(e)order by e.id)::text,''))into a from spot_private.discovery_exposures e;
m:=spot_private.chance_tick();
select md5(coalesce(jsonb_agg(to_jsonb(e)order by e.id)::text,''))into b from spot_private.discovery_exposures e;
if a is distinct from b then raise exception 'LOCAL_CANARY_DUPLICATE';end if;
insert into public.local_chance_canary_receipt values(clock_timestamp(),n,m,a=b);
update spot_private.chance_control set scheduler_enabled=false;
end$payload$;
$job$);`);
// One bounded observation period. No rescheduling and no retry on a failed native run.
let runs=[];for(let i=0;i<25;i++){runs=JSON.parse(await sql("select coalesce(json_agg(r),'[]')from(select status,return_message from cron.job_run_details where jobid=(select jobid from cron.job where jobname='local-chance-one-shot')order by runid)r;"));if(runs.some(x=>['succeeded','failed'].includes(x.status)))break;await new Promise(r=>setTimeout(r,1000));}
assert.equal(runs.length,1,'Exactly one scheduler execution');assert.equal(runs[0].status,'succeeded');
const proof=JSON.parse(await sql(`select json_build_object('receipt',(select row_to_json(r)from public.local_chance_canary_receipt r),'windows',(select count(*)from spot_private.discovery_windows where policy_version=3),'pairs',(select count(*)from spot_private.discovery_exposures),'reciprocal_owner_rows',(select count(*)from spot_private.chance_state),'max_global_day',(select max(n)from(select user_id,sum(exposure_count)n from spot_private.discovery_allocations group by user_id)x),'min_global_day',(select min(n)from(select user_id,sum(exposure_count)n from spot_private.discovery_allocations group by user_id)x),'all_24h',(select bool_and(ends_at-starts_at=interval '24 hours')from spot_private.discovery_windows where policy_version=3),'same_slot',(select bool_and((select count(*)from spot_private.chance_state s where s.exposure_id=e.id)=2)from spot_private.discovery_exposures e),'degree_one',(select max(exposure_count)<=1 from spot_private.discovery_allocations),'duplicate_pairs',(select count(*)from(select window_id,user_a,user_b,count(*)from spot_private.discovery_exposures group by 1,2,3 having count(*)>1)x));`));
assert.equal(proof.windows,1);assert.equal(proof.receipt.stable,true);assert.equal(proof.same_slot,true);assert.equal(proof.all_24h,true);assert.equal(proof.degree_one,true);assert.equal(proof.duplicate_pairs,0);assert.ok(proof.max_global_day<=4);assert.equal(proof.reciprocal_owner_rows,proof.pairs*2);
await sql("select cron.unschedule('local-chance-one-shot');");
assert.equal(await sql('select count(*)from cron.job'),'0');
await receipt('scheduler',{scope:'disposable local only',native_pg_cron:true,native_wall_clock:true,config,runs,proof,remaining_jobs:0,catchup:'Three past QA slots plus one future slot; one automatic invocation, second tick in same invocation'});
console.log('Native local scheduler canary PASS; zero remaining jobs');
