import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile}from'node:fs/promises';
import {EXCLUDED_DATA,makeContract,validateContract,SESSION_BARRIER_SQL}from'../scripts/recovery/session-contract.mjs';
import {validateManifest}from'../scripts/recovery/checkpoint-artifact.mjs';
import {qodDatabase,ids,admin,call}from'./helpers/qod-database.js';
import {staffSession}from'./helpers/staff-session.js';

test('RECOVERY contract v2 classifies every table, excludes receipt DATA only and refuses a new dependent child',()=>{
 const names=[...EXCLUDED_DATA,'auth.users','auth.mfa_factors','spot_private.moderation_roles'];
 const fk={child:'spot_private.staff_revoked_sessions',parent:'auth.sessions'};
 const c=makeContract(names,[fk]);assert.equal(c.tables.length,names.length);
 assert.equal(c.tables.find(x=>x.table===fk.child).action,'deliberately_exclude');
 assert.equal(c.tables.find(x=>x.table==='spot_private.moderation_roles').action,'restore_directly');
 assert.throws(()=>makeContract([...names,'public.new_session_child'],[fk,{child:'public.new_session_child',parent:'auth.sessions'}]),/UNCLASSIFIED_SESSION_DEPENDENCY/);
 assert.throws(()=>validateContract({...c,version:1}),/CONTRACT_VERSION/);
 assert.throws(()=>validateContract({...c,tables:c.tables.slice(1)}));
 assert.throws(()=>validateManifest({version:1,source_ref:'zjinjtkekmaqtxsuyvho',checkpoint_id:'10000000-0000-4000-8000-000000000001',snapshot_at:'2026-10-26',files:[{}]}),/CONTRACT_VERSION/);
});

test('RECOVERY PostgreSQL: empty-session barrier preserves roles/fences/FK; old staff denied, fresh MFA model allowed, revoke/regrant/logout remain enforced',async t=>{
 const d=await qodDatabase(t);await admin(d);
 await d.exec('alter table auth.users add column if not exists created_at timestamptz default now()');
 for(const f of ['048_spotted_share','049_notifications_mvp','050_analytics_mvp','051_admin_analytics_dashboard','052_moderation_finalization','053_operational_observability','054_retention_phase_a','055_staff_session_revocation'])await d.exec(await readFile('supabase/migrations/'+f+'.sql','utf8'));
 // The shared unit harness models only sessions/factors. Empty provider tables
 // complete the barrier's catalog; no placeholder Auth rows are inserted.
 for(const name of ['refresh_tokens','one_time_tokens','flow_state','mfa_challenges','mfa_amr_claims'])
  await d.exec('create table if not exists auth.'+name+'(id uuid primary key)');
 await d.query("insert into auth.mfa_factors(user_id,status,factor_type)values($1,'verified','totp'),($2,'verified','totp')",[ids.a,ids.b]);
 await d.query("insert into spot_private.moderation_roles(user_id,role)values($1,'ADMIN'),($2,'MODERATOR')",[ids.a,ids.b]);
 const oldA=await staffSession(d,ids.a),oldB=await staffSession(d,ids.b);
 // In this synthetic harness, model sessions fenced before the checkpoint.
 await admin(d);await d.query('update spot_private.moderation_roles set active=false where user_id in($1,$2)',[ids.a,ids.b]);
 await d.query('update spot_private.moderation_roles set active=true where user_id in($1,$2)',[ids.a,ids.b]);
 const before=(await d.query('select user_id,role,active,session_not_before from spot_private.moderation_roles order by user_id')).rows;
 await assert.rejects(d.exec(SESSION_BARRIER_SQL),/SESSION_BARRIER_NOT_EMPTY/);
 // Equivalent source state of an empty-session restore; FK cascade remains enabled.
 await d.exec('delete from auth.sessions');
 await d.exec(SESSION_BARRIER_SQL);
 assert.deepEqual((await d.query('select user_id,role,active,session_not_before from spot_private.moderation_roles order by user_id')).rows,before);
 await assert.rejects(d.query('insert into spot_private.staff_revoked_sessions values($1)',[oldA]),/foreign key/);
 for(const [person,sid,surface]of[[ids.a,oldA,'ops_health()'],[ids.b,oldB,'moderation_review_queue()']]){
  await staffSession(d,person,'aal2',sid);await assert.rejects(call(d,surface),/DENIED/);
  await staffSession(d,person,'aal1');await assert.rejects(call(d,surface),/DENIED/);
  const fresh=await staffSession(d,person);await call(d,surface);
  if(person===ids.a)await call(d,'admin_analytics_dashboard()');
  else{
   await assert.rejects(call(d,'admin_analytics_dashboard()'),/DENIED/);
   await assert.rejects(call(d,'ops_health()'),/DENIED/);
   await assert.rejects(call(d,"moderation_role_set($1,'ADMIN',$2)",[ids.c,crypto.randomUUID()]),/DENIED/);
  }
  await admin(d);await d.query('update spot_private.moderation_roles set active=false where user_id=$1',[person]);
  await staffSession(d,person,'aal2',fresh);await assert.rejects(call(d,surface),/DENIED/);
  await admin(d);await d.query('update spot_private.moderation_roles set active=true where user_id=$1',[person]);
  await staffSession(d,person,'aal2',fresh);await assert.rejects(call(d,surface),/DENIED/);
  const restored=await staffSession(d,person);await call(d,surface);
  await admin(d);await d.query('delete from auth.sessions where id=$1',[restored]);
  await staffSession(d,person,'aal2',restored);await assert.rejects(call(d,surface),/DENIED/);
 }
});
