import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {database,seed,ids,asUser,admin} from './helpers/database.js';

const sql=await readFile('supabase/migrations/028_ora_spot_quota_schema_off.sql','utf8');
const tables=['ora_spot_policy','ora_spot_daily_quota','ora_spot_place_quota'];
async function setup(t){
 const db=await database();t.after(()=>db.close());await seed(db);
 await db.exec('alter table auth.users add column email text,add column raw_user_meta_data jsonb');
 for(const f of ['020_age_eligibility.sql','021_dating_consent.sql','022_location_minimization.sql',
  '023_privacy_retention.sql','024_user_rights.sql','025_moderation.sql','026_tribe_board.sql','027_soma_v2_schema_off.sql']){
  if(f.startsWith('025'))await db.exec("update spot_private.privacy_environment set environment='staging'");
  await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
 }
 await db.exec(`update spot_private.account_eligibility a set status='eligible',declared_age=p.age from public.profiles p where p.id=a.user_id;
 insert into spot_private.consent_state(user_id,status,version)select id,'active','dating-staging-v1'from auth.users;
 update public.profiles set preference='ALL';
 insert into spot_private.tribe_memberships(user_id,venue_id)values('${ids.a}','${ids.v}'),('${ids.b}','${ids.v}');`);
 return db;
}
async function definitions(db){return(await db.query(`select
 (select jsonb_object_agg(p.oid::text,pg_get_functiondef(p.oid))from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','spot_private')and p.prokind='f')functions,
 (select jsonb_agg(to_jsonb(p)order by schemaname,tablename,policyname)from pg_policies p where schemaname in('public','spot_private','storage'))policies,
 (select jsonb_agg(pg_get_triggerdef(oid)order by oid)from pg_trigger where not tgisinternal)triggers
 `)).rows[0];}
async function data(db){return(await db.query(`select
 (select jsonb_agg(to_jsonb(x)order by id)from public.profiles x)profiles,
 (select jsonb_agg(to_jsonb(x)order by user_id)from public.checkins x)checkins,
 (select jsonb_agg(to_jsonb(x)order by user_id,venue_id)from spot_private.tribe_memberships x)memberships,
 (select jsonb_agg(to_jsonb(x)order by sender_id,recipient_id,venue_id)from spot_private.interests x)interests,
 (select jsonb_agg(to_jsonb(x)order by id)from public.matches x)matches,
 (select to_jsonb(x)from spot_private.soma_v2_control x)flags,
 (select to_jsonb(x)from spot_private.discovery_policy x)discovery,
 (select to_jsonb(x)from spot_private.photo_cutover_control x)photo
 `)).rows[0];}

test('ORA QUOTA 028: additive private schema, policy OFF and unchanged legacy',async t=>{
 const db=await setup(t);await asUser(db,ids.a);await db.query('select check_in($1)',[ids.q]);
 await db.query('select send_spot($1,$2)',[ids.b,ids.v]);await asUser(db,ids.b);
 await db.query('select send_spot($1,$2)',[ids.a,ids.v]);await admin(db);
 const beforeDefinitions=await definitions(db),beforeData=await data(db);await db.exec(sql);

 await t.test('only three new tables, correct policy and zero per-user counters',async()=>{
  assert.deepEqual((await db.query('select *from spot_private.ora_spot_policy')).rows,
   [{singleton:true,enabled:false,timezone:'Europe/Rome',daily_limit:5,place_daily_limit:3,quota_retention:null}]);
  for(const table of tables.slice(1))assert.equal((await db.query('select count(*)n from spot_private.'+table)).rows[0].n,0);
 });
 await t.test('new PKs identify global account/day and account/Place/day; FK uses global parent',async()=>{
  const keys=(await db.query(`select conrelid::regclass::text t,pg_get_constraintdef(oid)d from pg_constraint
   where contype='p'and conrelid in('spot_private.ora_spot_daily_quota'::regclass,'spot_private.ora_spot_place_quota'::regclass)order by t`)).rows;
  assert.deepEqual(keys.map(r=>r.d),['PRIMARY KEY (user_id, local_date)','PRIMARY KEY (user_id, place_id, local_date)']);
  const fks=(await db.query("select pg_get_constraintdef(oid)d from pg_constraint where contype='f'and conrelid='spot_private.ora_spot_place_quota'::regclass")).rows.map(r=>r.d);
  assert.ok(fks.some(x=>x.includes('FOREIGN KEY (user_id, local_date)')&&x.includes('ON DELETE CASCADE')));
  assert.ok(fks.some(x=>x.includes('REFERENCES venues(id)')));
  assert.equal((await db.query("select count(*)n from pg_indexes where indexname='ora_spot_place_account_day'")).rows[0].n,1);
 });
 await t.test('RLS/no policies/no anon/authenticated/service grants; real SQL reads/writes denied',async()=>{
  for(const table of tables){
   const r=(await db.query(`select c.relrowsecurity rls,exists(select 1 from pg_policy where polrelid=c.oid)policies,
    has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')anon,
    has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')authenticated,
    has_table_privilege('service_role',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')service
    from pg_class c where c.oid=$1::regclass`,['spot_private.'+table])).rows[0];
   assert.deepEqual(r,{rls:true,policies:false,anon:false,authenticated:false,service:false});
  }
  for(const role of ['anon','authenticated','service_role']){
   await db.exec('set role '+role);
   for(const table of tables){await assert.rejects(db.query('select *from spot_private.'+table),/permission denied/);await assert.rejects(db.query('delete from spot_private.'+table),/permission denied/);}
   await admin(db);
  }
 });
 await t.test('no function/policy/trigger changes and no 027 or legacy row changes',async()=>{
  assert.deepEqual(await definitions(db),beforeDefinitions);assert.deepEqual(await data(db),beforeData);
 });
 await t.test('PK prevents duplicated budget rows; different Places retain one global parent',async()=>{
  await db.query("insert into spot_private.ora_spot_daily_quota values($1,'2026-10-17',5)",[ids.a]);
  await assert.rejects(db.query("insert into spot_private.ora_spot_daily_quota values($1,'2026-10-17',0)",[ids.a]),/unique constraint/);
  await db.query("insert into spot_private.ora_spot_place_quota values($1,$2,'2026-10-17',3),($1,$3,'2026-10-17',2)",[ids.a,ids.v,ids.w]);
  await assert.rejects(db.query("insert into spot_private.ora_spot_place_quota values($1,$2,'2026-10-17',0)",[ids.a,ids.v]),/unique constraint/);
  await assert.rejects(db.query("insert into spot_private.ora_spot_place_quota values($1,$2,'2026-10-18',1)",[ids.a,ids.v]),/foreign key/);
  await db.query("delete from spot_private.ora_spot_daily_quota where user_id=$1",[ids.a]);
  assert.equal((await db.query('select count(*)n from spot_private.ora_spot_place_quota')).rows[0].n,0);
 });
 await t.test('malformed values rejected, mutable limits do not hardcode counter CHECKs',async()=>{
  await assert.rejects(db.query("update spot_private.ora_spot_policy set timezone='UTC'"),/check constraint/);
  await assert.rejects(db.query('update spot_private.ora_spot_policy set place_daily_limit=6'),/check constraint/);
  await assert.rejects(db.query("insert into spot_private.ora_spot_daily_quota values($1,current_date,-1)",[ids.a]),/check constraint/);
  await assert.rejects(db.query("insert into spot_private.ora_spot_daily_quota values($1,current_date,0)",[randomUUID()]),/foreign key/);
  // Admin-only data below demonstrates representation, NOT implemented enforcement.
  await db.exec('begin;update spot_private.ora_spot_policy set daily_limit=7,place_daily_limit=4');
  await db.query('insert into spot_private.ora_spot_daily_quota values($1,current_date,7)',[ids.a]);await db.exec('rollback');
 });
 await t.test('Europe/Rome dates and DST boundaries derive from server timestamps, not session timezone',async()=>{
  await db.exec("set timezone='UTC'");
  const r=(await db.query(`select
   (timestamptz '2026-10-17 22:30+00'at time zone 'Europe/Rome')::date::text summer,
   (timestamptz '2026-10-25 23:30+00'at time zone 'Europe/Rome')::date::text winter,
   (timestamptz '2026-10-25 00:30+00'at time zone 'Europe/Rome')::date::text fallback_a,
   (timestamptz '2026-10-25 01:30+00'at time zone 'Europe/Rome')::date::text fallback_b`)).rows[0];
  assert.deepEqual(r,{summer:'2026-10-18',winter:'2026-10-26',fallback_a:'2026-10-25',fallback_b:'2026-10-25'});
 });
 await t.test('legacy QR/Spot remain unmetered and both staging schema gates still pass',async()=>{
  await asUser(db,ids.a);await db.query('select check_in($1)',[ids.r]);await db.query('select check_in($1)',[ids.q]);
  await db.query('select send_spot($1,$2)',[ids.b,ids.v]);await admin(db);
  assert.equal((await db.query('select count(*)n from spot_private.ora_spot_daily_quota')).rows[0].n,0);
  await db.exec(await readFile('tests/staging/soma-v2-schema-check.sql','utf8'));
  await db.exec(await readFile('tests/staging/ora-spot-quota-schema-check.sql','utf8'));
 });
});

test('ORA QUOTA 028: legacy smoke after 028 rolls back all synthetic data and controls',async t=>{
 const db=await setup(t);await db.exec(sql);
 await db.exec("update spot_private.photo_cutover_control set phase='PAUSED',execute_enabled=false,scheduler_enabled=false");
 const before=await data(db);await db.exec(await readFile('tests/staging/soma-v2-legacy-smoke.sql','utf8'));
 assert.deepEqual(await data(db),before);
 await db.exec(await readFile('tests/staging/ora-spot-quota-schema-check.sql','utf8'));
});

test('ORA QUOTA 028: wrong environment/project or active v2 aborts before DDL',async t=>{
 const db=await setup(t);
 await db.exec("update spot_private.privacy_environment set environment='production'");
 await assert.rejects(db.exec(sql),/ORA_QUOTA_STAGING_ONLY/);await db.exec('rollback');
 await db.exec("update spot_private.privacy_environment set environment='staging';set supabase.project_ref='wrong-project'");
 await assert.rejects(db.exec(sql),/ORA_QUOTA_PROJECT_MISMATCH/);await db.exec('rollback');
 await db.exec("set supabase.project_ref='zjinjtkekmaqtxsuyvho';update spot_private.soma_v2_control set ora_enabled=true");
 await assert.rejects(db.exec(sql),/ORA_QUOTA_REQUIRES_SCHEMA_OFF/);await db.exec('rollback');
 assert.equal((await db.query("select to_regclass('spot_private.ora_spot_policy')t")).rows[0].t,null);
});
