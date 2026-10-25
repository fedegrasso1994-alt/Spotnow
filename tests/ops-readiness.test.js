import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {qodDatabase,ids,admin,asUser,call,uuid} from './helpers/qod-database.js';

import {staffSession} from './helpers/staff-session.js';

// Disposable local PostgreSQL only: no remote Auth, secrets, Storage or provider client.
async function currentDatabase(t){
 const d=await qodDatabase(t);await admin(d);
 await d.exec('alter table auth.users add column if not exists created_at timestamptz default now()');
 for(const name of ['048_spotted_share.sql','049_notifications_mvp.sql','050_analytics_mvp.sql','051_admin_analytics_dashboard.sql','052_moderation_finalization.sql','053_operational_observability.sql','054_retention_phase_a.sql','055_staff_session_revocation.sql'])
  await d.exec(await readFile('supabase/migrations/'+name,'utf8'));
 return d;
}
const aal=staffSession;
async function initialAdmin(d){
 await admin(d);
 // Owner bootstrap is fixture setup, NOT an operational provisioning bypass.
 await d.query("insert into spot_private.moderation_roles(user_id,role)values($1,'ADMIN')",[ids.a]);
 await d.query("insert into auth.mfa_factors(user_id,status,factor_type)values($1,'verified','totp'),($2,'verified','totp')",[ids.a,ids.b]);
 await aal(d,ids.a);
}

test('OPS: real role RPC provisions moderator, isolates dashboard, audits and revokes existing AAL2 session',async t=>{
 const d=await currentDatabase(t);await initialAdmin(d);
 const op=uuid();await call(d,"moderation_role_set($1,'MODERATOR',$2)",[ids.b,op]);
 await call(d,"moderation_role_set($1,'MODERATOR',$2)",[ids.b,op]);
 await aal(d,ids.b);await call(d,'moderation_review_queue()');
 await assert.rejects(call(d,'admin_analytics_dashboard()'),/DENIED|REQUIRED|ACCESS/);
 await assert.rejects(call(d,"moderation_role_set($1,'ADMIN',$2)",[ids.b,uuid()]),/DENIED/);
 await aal(d,ids.a);await call(d,"moderation_role_set($1,'REVOKED',$2)",[ids.b,uuid()]);
 await aal(d,ids.b);await assert.rejects(call(d,'moderation_review_queue()'),/DENIED/);
 await admin(d);
 assert.equal((await d.query('select count(*)::int n from spot_private.moderation_role_events where target_id=$1',[ids.b])).rows[0].n,2);
});

test('OPS: ADMIN AAL1, missing verified factor, revoked role and anonymous cannot use ops or dashboard',async t=>{
 const d=await currentDatabase(t);await initialAdmin(d);
 await call(d,'admin_analytics_dashboard()');await call(d,'ops_health()');
 await aal(d,ids.a,'aal1');await assert.rejects(call(d,'ops_health()'),/DENIED|REQUIRED|ACCESS/);
 await admin(d);await d.query('delete from auth.mfa_factors where user_id=$1',[ids.a]);
 await aal(d,ids.a);await assert.rejects(call(d,'admin_analytics_dashboard()'),/DENIED|REQUIRED|ACCESS/);
 await admin(d);await d.query("insert into auth.mfa_factors(user_id,status,factor_type)values($1,'verified','totp')",[ids.a]);
 await d.query('update spot_private.moderation_roles set active=false where user_id=$1',[ids.a]);
 await aal(d,ids.a);await assert.rejects(call(d,'ops_health()'),/DENIED|REQUIRED|ACCESS/);
 await admin(d);await d.exec('set role anon');
 await assert.rejects(call(d,'ops_health()'),/permission denied/);
 await assert.rejects(call(d,'retention_phase_a_batch($1,$2,true,100)',['analytics',uuid()]),/permission denied/);
});

test('OPS Phase A: moderator AAL1/factor loss/revocation deny direct RPC, including simulated logout and fresh login',async t=>{
 const d=await currentDatabase(t);await initialAdmin(d);
 await call(d,"moderation_role_set($1,'MODERATOR',$2)",[ids.b,uuid()]);
 await aal(d,ids.b,'aal1');await assert.rejects(call(d,'moderation_review_queue()'),/DENIED/);
 await aal(d,ids.b);await call(d,'moderation_review_queue()');
 await admin(d);await d.query("update auth.mfa_factors set status='unverified' where user_id=$1",[ids.b]);
 await aal(d,ids.b);await assert.rejects(call(d,'moderation_review_queue()'),/DENIED/);
 await admin(d);await d.query("update auth.mfa_factors set status='verified' where user_id=$1",[ids.b]);
 await aal(d,ids.a);await call(d,"moderation_role_set($1,'REVOKED',$2)",[ids.b,uuid()]);
 await aal(d,ids.b);await assert.rejects(call(d,'moderation_review_queue()'),/DENIED/);
 await admin(d);await d.query("select set_config('request.jwt.claims','',false)");await d.query("select set_config('request.jwt.claim.sub','',false)");
 await aal(d,ids.b);await assert.rejects(call(d,'moderation_review_queue()'),/DENIED/);
 await assert.rejects(call(d,'admin_analytics_dashboard()'),/DENIED|REQUIRED|ACCESS/);
});

test('OPS Phase A: revoked ADMIN cannot retain access; recovery on new principal never reauthorizes old AAL2 claims',async t=>{
 const d=await currentDatabase(t);await initialAdmin(d);
 await call(d,"moderation_role_set($1,'ADMIN',$2)",[ids.b,uuid()]);
 const oldSession=await aal(d,ids.b);await call(d,'ops_health()');await call(d,'admin_analytics_dashboard()');
 await aal(d,ids.a);await call(d,"moderation_role_set($1,'REVOKED',$2)",[ids.b,uuid()]);
 await aal(d,ids.b);await assert.rejects(call(d,'ops_health()'),/DENIED|REQUIRED|ACCESS/);
 await assert.rejects(call(d,"moderation_role_set($1,'ADMIN',$2)",[ids.c,uuid()]),/DENIED/);
 // Same old provider session cannot regain privileges after a regrant.
 await aal(d,ids.a);await call(d,"moderation_role_set($1,'ADMIN',$2)",[ids.b,uuid()]);
 await aal(d,ids.b,'aal2',oldSession);await assert.rejects(call(d,'ops_health()'),/DENIED/);
 await aal(d,ids.b);await call(d,'ops_health()');
 await aal(d,ids.a);await call(d,"moderation_role_set($1,'REVOKED',$2)",[ids.b,uuid()]);
 await admin(d);await d.query("insert into auth.mfa_factors(user_id,status,factor_type)values($1,'verified','totp')",[ids.c]);
 await aal(d,ids.a);const op=uuid();await call(d,"moderation_role_set($1,'ADMIN',$2)",[ids.c,op]);
 await call(d,"moderation_role_set($1,'ADMIN',$2)",[ids.c,op]);
 await aal(d,ids.c,'aal1');await assert.rejects(call(d,'ops_health()'),/DENIED|REQUIRED|ACCESS/);
 await aal(d,ids.c);await call(d,'ops_health()');
 await aal(d,ids.b);await assert.rejects(call(d,'ops_health()'),/DENIED|REQUIRED|ACCESS/);
 // Fresh login is a new local claims context, not a hosted Auth login assertion.
 await aal(d,ids.b,'aal1');await assert.rejects(call(d,'admin_analytics_dashboard()'),/DENIED|REQUIRED|ACCESS/);
 await aal(d,ids.b);await assert.rejects(call(d,'admin_analytics_dashboard()'),/DENIED|REQUIRED|ACCESS/);
});

test('OPS: current-schema isolated restore resurrects snapshot gates/data; quarantine blocks writes and purge, DB cannot recover bytes',async t=>{
 const d=await currentDatabase(t);
 const rows=(await d.query('select id,photo_path from profiles order by id')).rows;
 const bytes=new Map(rows.map((r,i)=>[r.photo_path,Uint8Array.from([i,7,9])]));
 const byteBackup=new Map([...bytes].map(([k,v])=>[k,v.slice()]));
 await d.exec('update spot_private.retention_phase_a_control set manual_enabled=true,scheduler_enabled=true');
 const snapshot=await d.dumpDataDir();
 await d.query('delete from public.profiles where id=$1',[ids.b]);bytes.clear();
 const restored=new PGlite({loadDataDir:snapshot});t.after(()=>restored.close());
 // The existing DD fixture clock is session-local; a fresh connection must initialize it.
 await restored.query("select set_config('soma.test_clock','2026-10-21T12:00:00+02:00',false)");
 const restoredRows=(await restored.query('select id,photo_path from profiles order by id')).rows;
 assert.deepEqual(restoredRows,rows); // Deletion AFTER snapshot is lost: mandatory replay gate, not a solved registry.
 assert.equal((await restored.query('select scheduler_enabled from spot_private.retention_phase_a_control')).rows[0].scheduler_enabled,true);
 assert.equal(rows.filter(r=>!bytes.has(r.photo_path)).length,rows.length);
 await restored.query("select photo_cutover_set('pause','synthetic-operator','ops-local-quarantine')");
 await restored.exec('update spot_private.retention_phase_a_control set manual_enabled=false,scheduler_enabled=false;update spot_private.soma_v2_control set discovery_enabled=false,ora_enabled=false,spot_enabled=false,comments_enabled=false,requests_enabled=false,system_posts_enabled=false,jobs_paused=true;update spot_private.notification_control set enabled=false,delivery_enabled=false;update spot_private.analytics_control set enabled=false;update spot_private.ops_control set enabled=false;update spot_private.retention_control set paused=true');
 const p=await call(restored,'photo_cutover_status()');assert.equal(p.phase,'PAUSED');assert.equal(p.execute_enabled,false);
 assert.equal((await call(restored,'retention_phase_a_batch($1,$2,false,100)',['analytics',uuid()])).status,'paused');
 await assert.rejects(call(restored,'photo02_begin_photo_upload($1,$2,$3)',[ids.a,uuid(),'a'.repeat(64)]),/PHOTO_PAUSED/);
 for(const [key,value]of byteBackup)bytes.set(key,value.slice());
 assert.equal(rows.filter(r=>!bytes.has(r.photo_path)).length,0);
 assert.deepEqual([...bytes],[...byteBackup]);
 assert.equal((await restored.query('select count(*)::int n from profiles where id=$1',[ids.b])).rows[0].n,1);
 // Deliberately no reopen: no durable deletion/revocation replay or cloud restore proven here.
});
