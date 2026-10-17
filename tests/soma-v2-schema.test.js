import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {database,seed,ids,asUser,admin} from './helpers/database.js';

const migration=await readFile('supabase/migrations/027_soma_v2_schema_off.sql','utf8');
const tables=['soma_v2_control','tribe_catalog','tribe_account_state','tribe_rejoin_guards',
 'discovery_policy','discovery_windows','discovery_allocations','discovery_exposures',
 'discovery_fairness_buckets','discovery_pair_memory','board_comments','board_preferences',
 'board_request_attempts','board_request_quota','board_comment_quota','board_romantic_requests',
 'board_request_pair_guards'];
async function setup(t){
 const db=await database();t.after(()=>db.close());await seed(db);
 await db.exec('alter table auth.users add column email text,add column raw_user_meta_data jsonb');
 for(const f of ['020_age_eligibility.sql','021_dating_consent.sql','022_location_minimization.sql',
  '023_privacy_retention.sql','024_user_rights.sql','025_moderation.sql','026_tribe_board.sql']){
  if(f.startsWith('025'))await db.exec("update spot_private.privacy_environment set environment='staging'");
  await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
 }
 await db.exec(`update spot_private.account_eligibility a set status='eligible',declared_age=p.age from public.profiles p where p.id=a.user_id;
 insert into spot_private.consent_state(user_id,status,version) select id,'active','dating-staging-v1'from auth.users;
 update public.profiles set preference='ALL';
 insert into spot_private.tribe_memberships(user_id,venue_id)values('${ids.a}','${ids.v}'),('${ids.b}','${ids.v}');`);
 return db;
}
async function catalog(db){return(await db.query(`select
 (select jsonb_object_agg(n.nspname||'.'||p.oid::regprocedure::text,md5(pg_get_functiondef(p.oid)))
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','spot_private')and p.prokind='f')functions,
 (select jsonb_agg(to_jsonb(x)order by schemaname,tablename,policyname)from pg_policies x where schemaname in('public','spot_private','storage'))policies,
 (select jsonb_agg(jsonb_build_array(tgname,pg_get_triggerdef(oid))order by tgname)from pg_trigger where not tgisinternal)triggers
 `)).rows[0];}
async function createPost(db){const op=(await db.query('select board_operation($1)id',[ids.v])).rows[0].id;
 return(await db.query('select board_create($1,$2,$3)id',[ids.v,'Synthetic schema compatibility',op])).rows[0].id;}

test('SCHEMA V2 additive rehearsal: unchanged legacy contract, private empty tables and OFF controls',async t=>{
 const db=await setup(t);
 await asUser(db,ids.a);await db.query('select check_in($1)',[ids.q]);await db.query('select send_spot($1,$2)',[ids.b,ids.v]);
 const post=await createPost(db);await asUser(db,ids.b);const match=(await db.query('select send_spot($1,$2)id',[ids.a,ids.v])).rows[0].id;
 await db.query('select board_react($1,$2,$3)',[post,'😂',randomUUID()]);
 await admin(db);await db.query('insert into public.messages(match_id,sender_id,body)values($1,$2,$3)',[match,ids.a,'Synthetic message']);
 const before=await catalog(db);
 const legacyRows=(await db.query(`select
  (select jsonb_agg(to_jsonb(x)order by user_id)from public.checkins x)checkins,
  (select jsonb_agg(to_jsonb(x)order by sender_id,recipient_id,venue_id)from spot_private.interests x)interests,
  (select jsonb_agg(to_jsonb(x)order by user_id,venue_id)from spot_private.tribe_memberships x)memberships,
  (select jsonb_agg(to_jsonb(x)order by id)from public.matches x)matches,
  (select jsonb_agg(to_jsonb(x)order by id)from public.messages x)messages`)).rows[0];
 await asUser(db,ids.a);const feedBefore=(await db.query('select board_feed($1)j',[ids.v])).rows[0].j;
 const rightsBefore=(await db.query("select my_rights_page('board_reactions')j")).rows[0].j;
 await admin(db);await db.exec(migration);

 await t.test('no replacement/addition of functions, RLS policies or application triggers',async()=>{
  assert.deepEqual(await catalog(db),before);
 });
 await t.test('legacy records unchanged and newly appended semantic columns NULL',async()=>{
  const after=(await db.query(`select
   (select jsonb_agg(to_jsonb(x)-'presence_id'-'presence_source'order by user_id)from public.checkins x)checkins,
   (select jsonb_agg(to_jsonb(x)-array['interest_id','origin_kind','origin_membership_id','origin_presence_id','origin_window_id','logical_status','invalidated_at','invalidation_reason','operation_id']order by sender_id,recipient_id,venue_id)from spot_private.interests x)interests,
   (select jsonb_agg(to_jsonb(x)-'membership_id'-'membership_source'order by user_id,venue_id)from spot_private.tribe_memberships x)memberships,
   (select jsonb_agg(to_jsonb(x)order by id)from public.matches x)matches,
   (select jsonb_agg(to_jsonb(x)order by id)from public.messages x)messages`)).rows[0];
  assert.deepEqual(after,legacyRows);
  assert.equal((await db.query('select count(*)n from spot_private.interests where interest_id is not null or logical_status is not null')).rows[0].n,0);
  assert.equal((await db.query('select count(*)n from public.venues where ora_enabled is not null or linked_tribe_id is not null')).rows[0].n,0);
 });
 await t.test('all 17 new tables have RLS, zero policies and no client/service privileges',async()=>{
  for(const table of tables){
   const r=(await db.query(`select c.relrowsecurity rls,
    exists(select 1 from pg_policy p where p.polrelid=c.oid)policies,
    has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')anon,
    has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')authenticated,
    has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')service
    from pg_class c where c.oid=$1::regclass`,['spot_private.'+table])).rows[0];
   assert.deepEqual(r,{rls:true,policies:false,anon:false,authenticated:false,service:false},table);
  }
  for(const role of ['anon','authenticated','service_role']){
   await db.exec('set role '+role);
   for(const table of tables){await assert.rejects(db.query('select * from spot_private.'+table),/permission denied/);await assert.rejects(db.query('delete from spot_private.'+table),/permission denied/);}
   await admin(db);
  }
 });
 await t.test('no operational rows, workers or unapproved schedule/retention defaults',async()=>{
  const control=(await db.query('select *from spot_private.soma_v2_control')).rows[0];
  assert.equal(control.jobs_paused,true);
  for(const [k,v]of Object.entries(control))if(k.endsWith('_enabled'))assert.equal(v,false,k);
  const p=(await db.query('select *from spot_private.discovery_policy')).rows[0];
  assert.equal(p.enabled,false);assert.equal(p.paused,true);
  for(const k of ['morning_start','afternoon_start','nightly_end','exposure_retention','fairness_retention','pair_memory_retention'])assert.equal(p[k],null);
  for(const table of tables.filter(x=>!['soma_v2_control','discovery_policy'].includes(x)))assert.equal((await db.query('select count(*)n from spot_private.'+table)).rows[0].n,0,table);
 });
 await t.test('legacy post projection, reactions and RIGHTS output unchanged',async()=>{
  await asUser(db,ids.a);assert.deepEqual((await db.query('select board_feed($1)j',[ids.v])).rows[0].j,feedBefore);
  assert.deepEqual((await db.query("select my_rights_page('board_reactions')j")).rows[0].j,rightsBefore);
  // Legacy RPC uses INSERT ... VALUES without column names: trailing NULL must remain safe.
  await db.query('select board_react($1,$2,$3)',[post,'🔥',randomUUID()]);
  await db.query('select board_report($1,$2,$3)',[post,'other',randomUUID()]);
  assert.equal((await db.query('select board_feed($1)j',[ids.v])).rows[0].j.items[0].my_reaction,'🔥');
  await createPost(db);await admin(db);
 });
 await t.test('legacy QR, membership count and venue-context Spot PK remain operative',async()=>{
  await asUser(db,ids.a);const own=(await db.query('select to_jsonb(check_in($1))c',[ids.r])).rows[0].c;
  assert.equal(own.presence_id,null);assert.equal(own.presence_source,null);
  await admin(db);
  const check=(await db.query('select *from public.checkins where user_id=$1',[ids.a])).rows[0];
  assert.equal(new Date(check.expires_at)-new Date(check.checked_in_at),90*60000);
  await assert.rejects(db.query("update public.checkins set expires_at=checked_in_at+interval '4 hours'where user_id=$1",[ids.a]),/checkins_check/);
  await db.query('insert into spot_private.interests(sender_id,recipient_id,venue_id)values($1,$2,$3)',[ids.a,ids.b,ids.w]);
  assert.equal((await db.query('select count(*)n from spot_private.interests where sender_id=$1',[ids.a])).rows[0].n,2);
  for(let n=0;n<3;n++){const v=randomUUID();await db.query("insert into public.venues(id,name,address)values($1,'Synthetic','Test')",[v]);await db.query('insert into spot_private.tribe_memberships(user_id,venue_id)values($1,$2)',[ids.a,v]);}
  assert.equal((await db.query('select count(*)n from spot_private.tribe_memberships where user_id=$1',[ids.a])).rows[0].n,5);
 });
 await t.test('new structural FK/identity constraints reject malformed data without enabling features',async()=>{
  await admin(db);
  await assert.rejects(db.query('insert into spot_private.tribe_catalog(id)values($1)',[randomUUID()]),/foreign key/);
  await assert.rejects(db.query("insert into spot_private.tribe_account_state(user_id,configuration_state,configuration_started_at)values($1,'legacy_closed',now())",[ids.a]),/check constraint/);
  await db.query("insert into spot_private.tribe_account_state(user_id,configuration_state)values($1,'legacy_closed')",[ids.a]);
  await db.query('delete from spot_private.tribe_account_state where user_id=$1',[ids.a]);
  await assert.rejects(db.query("insert into spot_private.discovery_windows(local_date,slot,policy_version,starts_at,ends_at)values(current_date,'morning',1,now(),now()-interval '1 hour')"),/check constraint/);
  await db.exec("begin;insert into spot_private.discovery_windows(local_date,slot,policy_version,starts_at,ends_at)values(current_date,'morning',1,now(),now()+interval '1 hour');");
  await assert.rejects(db.exec("insert into spot_private.discovery_windows(local_date,slot,policy_version,starts_at,ends_at)values(current_date,'morning',1,now(),now()+interval '1 hour')"),/unique constraint/);await db.exec('rollback');
 });
 await t.test('integrated AGE/CONSENT/PHOTO/social/RIGHTS/MODERATION regression rehearsal passes after 027',async()=>{
  await admin(db);
  await db.exec("update spot_private.photo_cutover_control set phase='PAUSED',execute_enabled=false,scheduler_enabled=false");
  await db.exec(await readFile('tests/staging/phase-a-integrated.sql','utf8'));
 });
 await t.test('the exact staging post-check runs read-only and leaves all new features unused',async()=>{
  await admin(db);await db.exec(await readFile('tests/staging/soma-v2-schema-check.sql','utf8'));
 });
});

test('SCHEMA V2 staging SQL smoke rolls back core/Board/moderation fixtures and photo controls',async t=>{
 const db=await setup(t);await db.exec(migration);
 await db.exec("update spot_private.photo_cutover_control set phase='PAUSED',execute_enabled=false,scheduler_enabled=false");
 const before=(await db.query('select to_jsonb(c)j from spot_private.photo_cutover_control c')).rows[0].j;
 await db.exec(await readFile('tests/staging/soma-v2-legacy-smoke.sql','utf8'));
 assert.deepEqual((await db.query('select to_jsonb(c)j from spot_private.photo_cutover_control c')).rows[0].j,before);
 assert.equal((await db.query("select count(*)n from auth.users where id::text like 'ff470000-%'")).rows[0].n,0);
});

test('SCHEMA V2 refuses non-staging environment before any DDL, transaction rolls back',async t=>{
 const db=await setup(t);await db.exec("update spot_private.privacy_environment set environment='production'");
 await assert.rejects(db.exec(migration),/SOMA_V2_STAGING_ONLY/);await db.exec('rollback');
 assert.equal((await db.query("select to_regclass('spot_private.soma_v2_control')t")).rows[0].t,null);
});

test('SCHEMA V2 refuses an explicit wrong hosted project ref even when environment says staging',async t=>{
 const db=await setup(t);await db.exec("set supabase.project_ref='wrong-project'");
 await assert.rejects(db.exec(migration),/SOMA_V2_PROJECT_MISMATCH/);await db.exec('rollback');
 assert.equal((await db.query("select to_regclass('spot_private.soma_v2_control')t")).rows[0].t,null);
});
