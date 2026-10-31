// Visual review only: existing real local SQL/RPCs. No cron activation or source data.
import assert from'node:assert/strict';import{sql,receipt}from'./environment.mjs';
if(!['1','experience','freeze'].includes(process.env.SOMA_CHANCE_VISUAL_QA))throw Error('EXPLICIT_VISUAL_SCOPE_REQUIRED');
const mode=process.argv[2],me='10000000-0000-0000-0000-000000000001';if(!['waiting','single','backlog','expired','shortage'].includes(mode))throw Error('VISUAL_CASE');
assert.equal(await sql('select count(*)from cron.job'),'0');
if(mode==='waiting'){
 await sql(`create table spot_private.local_qa_clock(singleton boolean primary key default true,offset_time interval not null,fixed_at timestamptz);revoke all on spot_private.local_qa_clock from public,anon,authenticated,service_role;insert into spot_private.local_qa_clock values(true,interval '0','2030-06-10T09:30:00+02:00');create schema local_qa;revoke all on schema local_qa from public,anon,authenticated,service_role;create function local_qa.clock_timestamp()returns timestamptz language sql volatile security definer set search_path=''as $$select fixed_at from spot_private.local_qa_clock where singleton$$;`);
 const defs=JSON.parse(await sql("select coalesce(json_agg(pg_get_functiondef(p.oid)),'[]')from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','spot_private')and p.prokind='f'and(p.proname like 'chance%'or p.proname like 'dd_%'or p.proname in('my_chances','reveal_chance','send_chance_spot','send_spot_v2'))and position('clock_timestamp()'in pg_get_functiondef(p.oid))>0;"));for(const def of defs)await sql(def.replace(/(?<![.\w])clock_timestamp\(\)/g,'local_qa.clock_timestamp()'));
 await sql("update spot_private.soma_v2_control set discovery_enabled=true,dd_controlled_admission=true;insert into spot_private.dd_admission_accounts(user_id,reason)select id,'LOCAL_VISUAL_SYNTHETIC_ONLY'from auth.users;update spot_private.discovery_policy set enabled=true,paused=false where version=3;update spot_private.chance_control set enabled=true,scheduler_enabled=false,activated_at='2030-06-10T09:00:00+02:00';");
}else if(mode==='single')await sql("update spot_private.local_qa_clock set fixed_at='2030-06-10T10:01:00+02:00';");
else if(mode==='backlog')await sql("update spot_private.local_qa_clock set fixed_at='2030-06-10T21:31:00+02:00';");
else if(mode==='expired'){
 await sql(`delete from spot_private.dd_admission_accounts where user_id<>'${me}';update spot_private.local_qa_clock set fixed_at='2030-06-12T09:30:00+02:00';`);
}else await sql("update spot_private.local_qa_clock set fixed_at='2030-06-12T21:31:00+02:00';");
const state=JSON.parse(await sql(`set role authenticated;select set_config('request.jwt.claim.sub','${me}',false);select my_chances();`).then(s=>s.split('\n').at(-1)));
if(['waiting','expired','shortage'].includes(mode))assert.equal(state.chances.length,0);if(mode==='single')assert.equal(state.chances.length,1);if(mode==='backlog')assert.ok(state.chances.length>1&&state.chances.length<=4);
assert.equal(await sql('select count(*)from cron.job'),'0');assert.equal(await sql('select scheduler_enabled from spot_private.chance_control'),'f');
await receipt('visual-'+mode,{scope:'disposable local visual QA; server clock adapted only here',status:state.status,chances:state.chances.length,unrevealed:state.unrevealed_count,server_now:state.server_now,next_release_at:state.next_release_at,jobs:0,scheduler:false});console.log('Visual case '+mode+' PASS');
