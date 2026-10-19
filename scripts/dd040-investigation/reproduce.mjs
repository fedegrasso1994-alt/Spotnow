/** Disposable local PostgreSQL/PGlite investigation. Never connects to a provider. */
import {mkdir,writeFile} from 'node:fs/promises';
import {wrapperDatabase,current,snapshot,admin,asUser,ids} from '../../tests/helpers/dd-wrapper-database.js';
const output='docs/evidence/dd040-investigation';await mkdir(output,{recursive:true});
const mode=process.argv[2]||'original',count=Number(process.argv[3]||20),forcedSeed=process.argv[4]||null;
if(!['original','four-candidates'].includes(mode)||!Number.isInteger(count)||count<1||count>100)throw Error('INVALID_INVESTIGATION_ARGS');
const results=[];
for(let run=1;run<=count;run++){
 let close;const d=await wrapperDatabase({after:f=>{close=f;}},mode==='original'?6:5);
 try{
  await admin(d);
  // Audit-only AFTER trigger; no allocator code or clock/eligibility changes.
  await d.exec(`create table spot_private.fixture_dd_trace(step integer generated always as identity,user_a uuid,user_b uuid,degrees jsonb);
  create function spot_private.fixture_dd_trace()returns trigger language plpgsql set search_path=''as $$begin
  insert into spot_private.fixture_dd_trace(user_a,user_b,degrees)select new.user_a,new.user_b,jsonb_object_agg(user_id::text,exposure_count)from spot_private.discovery_allocations where window_id=new.window_id;return new;end$$;
  create trigger zz_fixture_dd_trace after insert on spot_private.discovery_exposures for each row execute function spot_private.fixture_dd_trace();`);
  const pre=(await d.query(`select jsonb_build_object(
  'clock',(select to_jsonb(c)from spot_private.fixture_dd_clock c),
  'memberships',(select jsonb_agg(to_jsonb(m)order by user_id,venue_id)from spot_private.tribe_memberships m),
  'accounts',(select jsonb_agg(jsonb_build_object('id',p.id,'gender',p.gender,'preference',p.preference,'eligible',spot_private.ora_eligible(p.id)))from profiles p where exists(select 1 from spot_private.tribe_memberships m where m.user_id=p.id)),
  'compatibility',(select jsonb_agg(jsonb_build_object('a',a.user_id,'b',b.user_id,'tribe',a.venue_id,'a_to_b',spot_private.dd_pair_eligible(a.user_id,b.user_id,a.venue_id),'b_to_a',spot_private.dd_pair_eligible(b.user_id,a.user_id,a.venue_id))order by a.user_id,b.user_id)from spot_private.tribe_memberships a join spot_private.tribe_memberships b on b.venue_id=a.venue_id and a.user_id<b.user_id),
  'prior_windows',(select count(*)from spot_private.discovery_windows),
  'prior_allocations',(select count(*)from spot_private.discovery_allocations),
  'prior_exposures',(select count(*)from spot_private.discovery_exposures),
  'prior_memory',(select count(*)from spot_private.discovery_pair_memory),
  'prior_fairness',(select count(*)from spot_private.discovery_fairness_buckets),
  'policy',(select to_jsonb(p)from spot_private.discovery_policy p where version=2))v`)).rows[0].v;
  if(forcedSeed)await d.query(`insert into spot_private.discovery_windows(local_date,slot,policy_version,starts_at,ends_at,generation_id)select local_date,slot,2,starts_at,ends_at,$1 from spot_private.fixture_dd_clock`,[forcedSeed]);
  await asUser(d,ids.a);const first=await current(d),before=await snapshot(d);
  let stable=true;for(let i=0;i<5;i++){const next=await current(d);if(JSON.stringify(next.profiles)!==JSON.stringify(first.profiles)||next.window_id!==first.window_id)stable=false;}
  const after=await snapshot(d);const noMutation=JSON.stringify(before)===JSON.stringify(after);await admin(d);
  const post=(await d.query(`select jsonb_build_object(
   'window',(select to_jsonb(w)from spot_private.discovery_windows w),
   'allocations',(select jsonb_agg(to_jsonb(a)order by user_id)from spot_private.discovery_allocations a),
   'exposures',(select jsonb_agg(to_jsonb(e)order by user_a,user_b)from spot_private.discovery_exposures e),
   'trace',(select jsonb_agg(to_jsonb(t)order by step)from spot_private.fixture_dd_trace t),
   'fairness',(select jsonb_agg(to_jsonb(f)order by user_id)from spot_private.discovery_fairness_buckets f),
   'pair_memory',(select jsonb_agg(to_jsonb(m)order by user_a,user_b)from spot_private.discovery_pair_memory m),
   'observer_candidates',(select jsonb_agg(jsonb_build_object('id',m.user_id,
     'compatible',spot_private.dd_pair_eligible($1,m.user_id,m.venue_id),
     'member',true,'assigned_to_observer',exists(select 1 from spot_private.discovery_exposures e where e.user_a=least($1::uuid,m.user_id)and e.user_b=greatest($1::uuid,m.user_id)),
     'window_allocated',a.exposure_count,'day_used',(select coalesce(sum(x.exposure_count),0)from spot_private.discovery_allocations x join spot_private.discovery_windows w on w.id=x.window_id where x.user_id=m.user_id and w.local_date=(select local_date from spot_private.fixture_dd_clock)),
     'legal_new_pair_now',a.exposure_count<4 and not exists(select 1 from spot_private.discovery_exposures e where e.user_a=least($1::uuid,m.user_id)and e.user_b=greatest($1::uuid,m.user_id)))order by m.user_id)
     from spot_private.tribe_memberships m join spot_private.discovery_allocations a on a.user_id=m.user_id where m.user_id<>$1 and m.venue_id=$2),
   'initial_person_order',(select jsonb_agg(jsonb_build_object('id',a.user_id,'tie',md5(w.generation_id::text||a.user_id::text))order by md5(w.generation_id::text||a.user_id::text))from spot_private.discovery_allocations a cross join spot_private.discovery_windows w)
  )v`,[ids.a,ids.v])).rows[0].v;
  const row={run,mode,profile_count:first.profiles.length,hard_four_assertion:first.profiles.length===4?'PASS':'FAIL',stable_repeated_profiles:stable,no_persistent_read_mutation:noMutation,seed:post.window.generation_id,pre,post,first};
  if(pre.prior_windows||pre.prior_allocations||pre.prior_exposures||pre.prior_memory||pre.prior_fairness)throw Error('STATE_LEAK_BEFORE_ORIGINAL_READ');
  if(!stable||!noMutation)throw Error('IDEMPOTENCY_DEFECT');
  results.push(row);console.log(JSON.stringify({run,mode,profiles:row.profile_count,seed:row.seed,stable,noMutation}));
 }finally{await close();}
}
await writeFile(`${output}/${mode}${forcedSeed?'-replay':''}.json`,JSON.stringify({engine:'PostgreSQL via PGlite; fresh database per run',runtime_changed:false,results,summary:{runs:results.length,hard_four_pass:results.filter(r=>r.profile_count===4).length,hard_four_fail:results.filter(r=>r.profile_count!==4).length,idempotent:results.every(r=>r.stable_repeated_profiles&&r.no_persistent_read_mutation)}},null,2)+'\n');
