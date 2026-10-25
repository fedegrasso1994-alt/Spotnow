import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile}from'node:fs/promises';
import {qodDatabase,ids,admin,call,uuid,asUser}from'./helpers/qod-database.js';
import {staffSession}from'./helpers/staff-session.js';
async function db(t){
 const d=await qodDatabase(t);await admin(d);
 await d.exec('alter table auth.users add column if not exists created_at timestamptz default now()');
 for(const f of ['048_spotted_share','049_notifications_mvp','050_analytics_mvp','051_admin_analytics_dashboard','052_moderation_finalization','053_operational_observability','054_retention_phase_a','055_staff_session_revocation'])await d.exec(await readFile('supabase/migrations/'+f+'.sql','utf8'));
 await d.query("insert into auth.mfa_factors(user_id,status,factor_type)values($1,'verified','totp'),($2,'verified','totp')",[ids.a,ids.b]);
 await d.query("insert into spot_private.moderation_roles(user_id,role)values($1,'ADMIN')",[ids.a]);
 await staffSession(d,ids.a);return d;
}
for(const role of ['ADMIN','MODERATOR'])test(`STAFF055 ${role}: revoke/regrant rejects old sessions and refresh, fresh login/MFA restores, logout denies`,async t=>{
 const d=await db(t);
 await call(d,"moderation_role_set($1,$2,$3)",[ids.b,role,uuid()]);
 const first=await staffSession(d,ids.b),second=await staffSession(d,ids.b);
 const surface=role==='ADMIN'?'ops_health()':'moderation_review_queue()';
 await call(d,surface);
 if(role==='MODERATOR'){
  await assert.rejects(call(d,'admin_analytics_dashboard()'),/DENIED/);
  await assert.rejects(call(d,'ops_health()'),/DENIED/);
  await assert.rejects(call(d,"moderation_role_set($1,'ADMIN',$2)",[ids.c,uuid()]),/DENIED/);
 }
 await staffSession(d,ids.a);await call(d,"moderation_role_set($1,'REVOKED',$2)",[ids.b,uuid()]);
 await staffSession(d,ids.b,'aal2',first);await assert.rejects(call(d,surface),/DENIED/);
 await staffSession(d,ids.a);await call(d,"moderation_role_set($1,$2,$3)",[ids.b,role,uuid()]);
 for(const sid of [first,second]){
  await staffSession(d,ids.b,'aal2',sid); // refresh keeps provider session_id
  await assert.rejects(call(d,surface),/DENIED/);
 }
 const fresh=await staffSession(d,ids.b);await call(d,surface);
 await admin(d);await d.query('delete from auth.sessions where id=$1',[fresh]);
 await staffSession(d,ids.b,'aal2',fresh);await assert.rejects(call(d,surface),/DENIED/);
 await staffSession(d,ids.b);await call(d,surface);
 await staffSession(d,ids.a);await call(d,"moderation_role_set($1,'REVOKED',$2)",[ids.b,uuid()]);
 await staffSession(d,ids.b);await assert.rejects(call(d,surface),/DENIED/);
 await admin(d);
 assert.equal((await d.query('select count(*)::int n from spot_private.moderation_role_events where target_id=$1',[ids.b])).rows[0].n,4);
});
test('STAFF055 malformed claims, missing/foreign session, AAL1, invalid/unverified factor, expired session and normal user fail closed',async t=>{
 const d=await db(t);const sid=await staffSession(d,ids.a);
 for(const value of ['', 'not json','null','[]',JSON.stringify({aal:'aal2'}),JSON.stringify({aal:'aal2',session_id:{}}),JSON.stringify({aal:'aal2',session_id:'bad'}),JSON.stringify({aal:'aal1',session_id:sid})]){
  await d.query("select set_config('request.jwt.claims',$1,false)",[value]);await assert.rejects(call(d,'ops_health()'),/DENIED/);
 }
 await staffSession(d,ids.b,'aal2',sid);await assert.rejects(call(d,'ops_health()'),/DENIED/);
 await staffSession(d,ids.a,'aal2',uuid());await assert.rejects(call(d,'ops_health()'),/DENIED/);
 await staffSession(d,ids.a,'aal1');await assert.rejects(call(d,'ops_health()'),/DENIED/);
 const valid=await staffSession(d,ids.a);
 await admin(d);await d.query("update auth.mfa_factors set status='unverified'where user_id=$1",[ids.a]);
 await staffSession(d,ids.a,'aal2',valid);await assert.rejects(call(d,'ops_health()'),/DENIED/);
 await admin(d);await d.query("update auth.mfa_factors set status='verified'where user_id=$1",[ids.a]);await d.query("update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=$1",[valid]);
 await staffSession(d,ids.a,'aal2',valid);await assert.rejects(call(d,'ops_health()'),/DENIED/);
 await asUser(d,ids.c);await assert.rejects(call(d,'spot_private.moderation_role()'),/permission denied/);
 await assert.rejects(d.query('select * from spot_private.staff_revoked_sessions'),/permission denied/);
});
test('STAFF055 exact boundaries, same-second transitions, old session with future clock, idempotent retry and cascade',async t=>{
 const d=await db(t);await call(d,"moderation_role_set($1,'MODERATOR',$2)",[ids.b,uuid()]);
 const old=await staffSession(d,ids.b);
 await admin(d);await d.query("update auth.sessions set created_at=clock_timestamp()+interval '1 hour'where id=$1",[old]);
 await staffSession(d,ids.a);await call(d,"moderation_role_set($1,'REVOKED',$2)",[ids.b,uuid()]);
 const op=uuid();await call(d,"moderation_role_set($1,'MODERATOR',$2)",[ids.b,op]);
 await admin(d);const fence=(await d.query('select session_not_before::text t from spot_private.moderation_roles where user_id=$1',[ids.b])).rows[0].t;
 await d.query("update auth.sessions set created_at=clock_timestamp()-interval '1 microsecond'where id=$1",[old]);
 await staffSession(d,ids.b,'aal2',old);await assert.rejects(call(d,'moderation_review_queue()'),/DENIED/);
 const sid=await staffSession(d,ids.b);
 await admin(d);await d.query('update auth.sessions set created_at=$1::timestamptz where id=$2',[fence,sid]);
 await staffSession(d,ids.b,'aal2',sid);await assert.rejects(call(d,'moderation_review_queue()'),/DENIED/);
 await admin(d);await d.query("update auth.sessions set created_at=$1::timestamptz+interval '1 microsecond'where id=$2",[fence,sid]);
 await staffSession(d,ids.b,'aal2',sid);await call(d,'moderation_review_queue()');
 await staffSession(d,ids.a);await call(d,"moderation_role_set($1,'MODERATOR',$2)",[ids.b,op]);
 await staffSession(d,ids.b,'aal2',sid);await call(d,'moderation_review_queue()');
 await admin(d);await d.query('delete from auth.sessions where id=$1',[old]);
 assert.equal((await d.query('select count(*)::int n from spot_private.staff_revoked_sessions where session_id=$1',[old])).rows[0].n,0);
});
test('STAFF055 pinned snapshots deny and both lock orders preserve revocation boundary (single-connection rehearsal)',async t=>{
 const d=await db(t);const sid=await staffSession(d,ids.a);
 await d.exec('begin isolation level repeatable read');
 await assert.rejects(call(d,'ops_health()'),/DENIED/);await d.exec('rollback');
 await call(d,'ops_health()');
 await admin(d);await d.exec('begin');
 await d.query("select pg_advisory_xact_lock(hashtextextended('moderation-roles',25))");
 await d.query('update spot_private.moderation_roles set active=false where user_id=$1',[ids.a]);
 await d.exec('commit');
 await staffSession(d,ids.a,'aal2',sid);await assert.rejects(call(d,'ops_health()'),/DENIED/);
 await admin(d);await d.query('update spot_private.moderation_roles set active=true where user_id=$1',[ids.a]);
 await staffSession(d,ids.a,'aal2',sid);await assert.rejects(call(d,'ops_health()'),/DENIED/);
 await staffSession(d,ids.a);await call(d,'ops_health()');
});
