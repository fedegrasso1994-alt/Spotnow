import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,seed,ids} from './helpers/database.js';
const sql=await readFile('supabase/migrations/029_controlled_staging_backfill.sql','utf8');
const v='dbaab572-ad0e-4928-ab68-bb371cef9381',w='29484f62-7716-4d61-9f24-d8e54e04e876';
async function setup(t){
 const db=await database();t.after(()=>db.close());await seed(db);
 await db.exec(`alter table auth.users add column email text,add column raw_user_meta_data jsonb;
 delete from spot_private.venue_codes;delete from public.venues;
 insert into public.venues(id,name,address)values('${v}','TEST Università 1','Synthetic'),('${w}','TEST Università 2','Synthetic');
 insert into spot_private.venue_codes values('${v}','${ids.q}'),('${w}','${ids.r}');`);
 for(const f of ['020_age_eligibility.sql','021_dating_consent.sql','022_location_minimization.sql','023_privacy_retention.sql',
  '024_user_rights.sql','025_moderation.sql','026_tribe_board.sql','027_soma_v2_schema_off.sql','028_ora_spot_quota_schema_off.sql']){
  if(f.startsWith('025'))await db.exec("update spot_private.privacy_environment set environment='staging'");
  await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
 }
 await db.exec(`insert into spot_private.tribe_memberships(user_id,venue_id)values('${ids.a}','${v}'),('${ids.b}','${v}');
 insert into public.checkins values('${ids.a}','${v}',now()-interval '2 hours',now()-interval '30 minutes'),('${ids.b}','${v}',now()-interval '2 hours',now()-interval '30 minutes');
 insert into spot_private.interests(sender_id,recipient_id,venue_id)values('${ids.a}','${ids.b}','${v}'),('${ids.b}','${ids.a}','${v}');
 insert into public.matches(id,user_a,user_b,venue_id)values('ee290000-0000-4000-8000-000000000001','${ids.a}','${ids.b}','${v}');
 insert into public.messages(match_id,sender_id,body)values('ee290000-0000-4000-8000-000000000001','${ids.a}','Synthetic one'),('ee290000-0000-4000-8000-000000000001','${ids.b}','Synthetic two');`);
 return db;
}
const changes=results=>results.flatMap(x=>x.rows??[]).find(x=>x.backfill_changes)?.backfill_changes;
async function snapshot(db){return(await db.query(`select
 (select jsonb_agg(to_jsonb(x)order by id)from public.venues x)venues,
 (select jsonb_agg(to_jsonb(x)order by user_id)from public.checkins x)checkins,
 (select jsonb_agg(to_jsonb(x)order by user_id,venue_id)from spot_private.tribe_memberships x)memberships,
 (select jsonb_agg(to_jsonb(x)order by sender_id,recipient_id,venue_id)from spot_private.interests x)interests,
 (select jsonb_agg(to_jsonb(x)order by id)from public.matches x)matches,
 (select jsonb_agg(to_jsonb(x)order by id)from public.messages x)messages,
 (select jsonb_agg(to_jsonb(x)order by id)from spot_private.tribe_catalog x)catalog,
 (select jsonb_agg(to_jsonb(x)order by user_id)from spot_private.tribe_account_state x)states`)).rows[0];}
async function security(db){return(await db.query(`select
 (select jsonb_agg(jsonb_build_array(p.oid,pg_get_functiondef(p.oid))order by p.oid)from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','spot_private')and p.prokind='f')functions,
 (select jsonb_agg(to_jsonb(p)order by schemaname,tablename,policyname)from pg_policies p where schemaname in('public','spot_private','storage'))policies,
 (select jsonb_agg(jsonb_build_array(c.oid,c.relacl,c.relrowsecurity)order by c.oid)from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','spot_private')and c.relkind='r')grants
 `)).rows[0];}

test('BACKFILL 029: exact snapshot, deterministic IDs, no historical inference, no runtime activation',async t=>{
 const db=await setup(t),before=await snapshot(db),sec=await security(db);
 assert.deepEqual(changes(await db.exec(sql)),{catalog_inserted:2,venues_updated:2,memberships_updated:2,account_states_inserted:2,presences_updated:2,interests_updated:2});
 await t.test('catalog/mapping, legacy IDs/states and preserved absence of start dates pass the phase-aware check',async()=>{
  await db.exec(await readFile('tests/staging/soma-v2-backfill-check.sql','utf8'));
  assert.equal((await db.query('select count(*)n from spot_private.tribe_account_state where user_id=$1',[ids.c])).rows[0].n,0);
 });
 await t.test('old associations, timestamps, match and messages remain byte-for-byte unchanged',async()=>{
  const after=await snapshot(db);
  assert.deepEqual(after.matches,before.matches);assert.deepEqual(after.messages,before.messages);
  assert.deepEqual(after.checkins.map(({presence_id,presence_source,...x})=>x),before.checkins.map(({presence_id,presence_source,...x})=>x));
  assert.deepEqual(after.memberships.map(({membership_id,membership_source,...x})=>x),before.memberships.map(({membership_id,membership_source,...x})=>x));
  assert.deepEqual(after.interests.map(({interest_id,origin_kind,logical_status,...x})=>x),before.interests.map(({interest_id,origin_kind,logical_status,...x})=>x));
 });
 await t.test('second controlled pass is a true NO-OP: zero writes, same IDs and timestamps',async()=>{
  const before=await snapshot(db);const replay=sql.replace(/commit;\s*$/,'rollback;');
  const result=changes(await db.exec(replay));assert.equal(Object.values(result).reduce((a,b)=>a+b,0),0);
  assert.deepEqual(await snapshot(db),before);
 });
 await t.test('security/function contracts, 028 and feature-OFF data remain unchanged',async()=>{
  assert.deepEqual(await security(db),sec);
  await db.exec(await readFile('tests/staging/ora-spot-quota-schema-check.sql','utf8'));
 });
 await t.test('legacy SQL rehearsal remains valid and rolls back all synthetic additions',async()=>{
  await db.exec("update spot_private.photo_cutover_control set phase='PAUSED',execute_enabled=false,scheduler_enabled=false");
  const before=await snapshot(db);await db.exec(await readFile('tests/staging/soma-v2-legacy-smoke.sql','utf8'));
  assert.deepEqual(await snapshot(db),before);
  await db.exec(await readFile('tests/staging/soma-v2-backfill-check.sql','utf8'));
 });
});

test('BACKFILL 029: snapshot count or association drift rejects before any write',async t=>{
 const db=await setup(t);await db.query('delete from public.messages where body=$1',['Synthetic two']);const before=await snapshot(db);
 await assert.rejects(db.exec(sql),/BACKFILL_SNAPSHOT_DRIFT/);await db.exec('rollback');assert.deepEqual(await snapshot(db),before);
});
test('BACKFILL 029: conflicting technical identity is not silently overwritten',async t=>{
 const db=await setup(t);await db.query("update spot_private.tribe_memberships set membership_id='ee290000-0000-4000-8000-000000000009'where user_id=$1",[ids.a]);
 const before=await snapshot(db);await assert.rejects(db.exec(sql),/BACKFILL_VALUE_CONFLICT/);await db.exec('rollback');assert.deepEqual(await snapshot(db),before);
});
test('BACKFILL 029: intermediate failure rolls back catalog, mapping and membership writes',async t=>{
 const db=await setup(t);const before=await snapshot(db);
 await db.exec("create function public.fixture_backfill_failure()returns trigger language plpgsql as $$begin raise exception 'SYNTHETIC_BACKFILL_FAILURE';end$$;create trigger fixture_backfill_failure before update on public.checkins for each row execute function public.fixture_backfill_failure()");
 await assert.rejects(db.exec(sql),/SYNTHETIC_BACKFILL_FAILURE/);await db.exec('rollback');assert.deepEqual(await snapshot(db),before);
});
test('BACKFILL 029: refuses non-staging and explicit wrong project without mutation',async t=>{
 const db=await setup(t);const before=await snapshot(db);
 await db.exec("update spot_private.privacy_environment set environment='production'");await assert.rejects(db.exec(sql),/BACKFILL_STAGING_ONLY/);await db.exec('rollback');
 await db.exec("update spot_private.privacy_environment set environment='staging';set supabase.project_ref='wrong-project'");await assert.rejects(db.exec(sql),/BACKFILL_PROJECT_MISMATCH/);await db.exec('rollback');
 assert.deepEqual(await snapshot(db),before);
});
