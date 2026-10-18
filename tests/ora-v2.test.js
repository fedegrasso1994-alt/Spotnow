import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile}from 'node:fs/promises';
import {database,seed,ids,asUser,admin}from './helpers/database.js';
import {createOraApi,oraEnabled,createPresenceClock,pendingQrFresh}from '../src/ora.js';
import {mountOraControls}from '../src/ora-ui.js';
import {dom}from './helpers/dom.js';
const migration=await readFile('supabase/migrations/032_places_ora_v2.sql','utf8');
const third='ef310000-0000-4000-8000-000000000003',fourth='ef310000-0000-4000-8000-000000000004';
async function setup(t){const d=await database();t.after(()=>d.close());await seed(d);
 await d.exec('alter table auth.users add column email text,add column raw_user_meta_data jsonb,add column banned_until timestamptz');
 for(const f of ['020_age_eligibility.sql','021_dating_consent.sql','022_location_minimization.sql','023_privacy_retention.sql','024_user_rights.sql','025_moderation.sql','026_tribe_board.sql','027_soma_v2_schema_off.sql','028_ora_spot_quota_schema_off.sql','030_tribe_membership_engine.sql']){if(f.startsWith('025'))await d.exec("update spot_private.privacy_environment set environment='staging'");await d.exec(await readFile('supabase/migrations/'+f,'utf8'));}
 await d.exec(`set soma.photo_protocol='PHOTO02';update spot_private.account_eligibility a set status='eligible',declared_age=p.age from public.profiles p where p.id=a.user_id;
 insert into spot_private.consent_state(user_id,status,version)select id,'active','dating-staging-v1'from auth.users;
 insert into public.venues(id,name,address)values('${third}','Terza','Synthetic'),('${fourth}','Quarta','Synthetic');
 insert into spot_private.tribe_catalog(id,active,joinable)select id,true,true from public.venues;`);
 await d.exec(await readFile('supabase/migrations/031_signup_without_qr.sql','utf8'));await d.exec(migration);await d.exec("update spot_private.soma_v2_control set ora_enabled=true;update public.venues set ora_enabled=true;update public.profiles set preference='ALL'");return d;
}

const start=(d,p=ids.v)=>d.query('select start_ora_manual($1)v',[p]).then(r=>r.rows[0].v);
const qr=(d,q=ids.q)=>d.query('select start_ora_qr($1)v',[q]).then(r=>r.rows[0].v);
const current=d=>d.query('select my_presence()v').then(r=>r.rows[0].v);
const end=(d,id)=>d.query('select end_ora($1)v',[id]);
test('ORA 032 manual zero Tribe, 4h server expiry, same retry/no renewal, switch and stale exit',async t=>{
 const d=await setup(t);await asUser(d,ids.a);const a=await start(d);assert.equal(a.source,'manual');assert.equal(Date.parse(a.expires_at)-Date.parse(a.started_at),14400000);assert.ok(a.presence_id);
 const again=await start(d);assert.equal(again.presence_id,a.presence_id);assert.equal(again.expires_at,a.expires_at);assert.equal(again.started_at,a.started_at);
 const b=await start(d,ids.w);assert.notEqual(a.presence_id,b.presence_id);await end(d,a.presence_id);assert.equal((await current(d)).presence_id,b.presence_id);
 await end(d,b.presence_id);await end(d,b.presence_id);assert.equal(await current(d),null);await admin(d);assert.equal((await d.query('select count(*)n from spot_private.tribe_memberships')).rows[0].n,0);assert.equal((await d.query('select count(*)n from spot_private.tribe_account_state')).rows[0].n,0);
});
test('ORA QR controlled resolution, no autojoin/grace, source preserved same Place across source',async t=>{
 const d=await setup(t);await asUser(d,ids.a);const p=await qr(d);assert.equal(p.source,'qr');assert.equal((await start(d)).presence_id,p.presence_id);assert.equal((await start(d)).source,'qr');
 await assert.rejects(qr(d,ids.w),/ORA_QR_INVALID/);assert.equal((await current(d)).presence_id,p.presence_id);
 await admin(d);for(const name of ['tribe_memberships','tribe_account_state','tribe_rejoin_guards'])assert.equal((await d.query('select count(*)n from spot_private.'+name)).rows[0].n,0);
});
test('ORA retires both legacy writer bodies and grants; direct writes/source/expiry injection denied',async t=>{
 const d=await setup(t);await asUser(d,ids.a);await assert.rejects(d.query('select check_in($1)',[ids.q]),/permission denied/);await assert.rejects(d.query('select privacy_prior_check_in($1)',[ids.q]),/permission denied/);
 await assert.rejects(d.query('select spot_private.start_ora($1,$2)',[ids.v,'qr']),/permission denied/);await assert.rejects(d.query('insert into checkins(user_id,venue_id)values($1,$2)',[ids.b,ids.v]),/permission denied/);
 await assert.rejects(d.query('select start_ora_manual($1,$2)',[ids.v,ids.b]),/does not exist/);await admin(d);await assert.rejects(d.query('select check_in($1)',[ids.q]),/ORA_LEGACY_RETIRED/);await assert.rejects(d.query('select privacy_prior_check_in($1)',[ids.q]),/ORA_LEGACY_RETIRED/);
});
test('ORA inactive/disabled Places and anonymous/AGE/revoked/suspended/banned/deleting/staff gates',async t=>{
 const d=await setup(t);await admin(d);await d.query('update venues set active=false where id=$1',[ids.w]);await asUser(d,ids.a);await assert.rejects(start(d,ids.w),/ORA_PLACE_UNAVAILABLE/);
 await admin(d);await d.query('update venues set ora_enabled=false where id=$1',[ids.v]);await asUser(d,ids.a);await assert.rejects(qr(d),/ORA_QR_INVALID/);
 await admin(d);await d.query('update venues set ora_enabled=true where id=$1',[ids.v]);await d.query("update account_eligibility set status='confirmation_required' where user_id=$1".replace('account_eligibility','spot_private.account_eligibility'),[ids.a]);await asUser(d,ids.a);await assert.rejects(start(d),/ORA_ACCOUNT/);
 await admin(d);await d.query("update spot_private.account_eligibility set status='eligible' where user_id=$1",[ids.a]);await asUser(d,ids.a);await start(d);await d.query('select revoke_dating_consent($1)',['bc320000-0000-4000-8000-000000000001']);await assert.rejects(start(d),/ORA_ACCOUNT/);await end(d,(await d.query('select presence_id from checkins')).rows[0].presence_id);
 await admin(d);await d.query("update spot_private.consent_state set status='active' where user_id=$1",[ids.a]);await d.query("update auth.users set banned_until=now()+interval '1 day'where id=$1",[ids.a]);await asUser(d,ids.a);await assert.rejects(start(d),/ORA_ACCOUNT/);
 await d.exec('reset role;set role anon');await assert.rejects(start(d),/permission denied/);
});
test('ORA discovery same Place without Tribe, no presence timestamps, narrow photo access/block/expiry',async t=>{
 const d=await setup(t);await asUser(d,ids.a);await start(d);await asUser(d,ids.b);await qr(d);await asUser(d,ids.c);await start(d,ids.w);await asUser(d,ids.a);
 let rows=(await d.query('select * from ora_people_page()')).rows;assert.deepEqual(rows.map(p=>p.id),[ids.b]);assert.equal('expires_at'in rows[0],false);assert.equal('checked_in_at'in rows[0],false);assert.equal('preference'in rows[0],false);
 assert.equal((await d.query('select spot_private.can_view_photo($1)v',[ids.b+'/b.png'])).rows[0].v,true);assert.equal((await d.query('select spot_private.can_view_photo($1)v',[ids.c+'/c.png'])).rows[0].v,false);
 await d.query('insert into blocks values($1,$2)',[ids.a,ids.b]);assert.equal((await d.query('select * from ora_people_page()')).rows.length,0);assert.equal((await d.query('select spot_private.can_view_photo($1)v',[ids.b+'/b.png'])).rows[0].v,false);
 await d.query('delete from blocks where blocker_id=$1',[ids.a]);await admin(d);await d.query("update checkins set checked_in_at=now()-interval '5 hours',expires_at=now()-interval '1 hour'where user_id=$1",[ids.b]);await asUser(d,ids.a);assert.equal((await d.query('select * from ora_people_page()')).rows.length,0);
 await admin(d);await d.query("update checkins set checked_in_at=now()-interval '5 hours',expires_at=now()-interval '1 hour'where user_id=$1",[ids.a]);await asUser(d,ids.a);assert.equal(await current(d),null);await assert.rejects(d.query('select * from ora_people_page()'),/ORA_PRESENCE_REQUIRED/);assert.ok((await start(d)).presence_id);
});
test('ORA existing 90m rows untouched, positive <=4h constraint; quotas/other features OFF and empty',async t=>{
 const d=await setup(t);await admin(d);await d.query("insert into checkins(user_id,venue_id,checked_in_at,expires_at,presence_source)values($1,$2,now()-interval '3 hours',now()-interval '90 minutes','legacy')",[ids.a,ids.v]);const old=(await d.query('select * from checkins')).rows[0];await asUser(d,ids.b);await start(d);await admin(d);assert.deepEqual((await d.query('select * from checkins where user_id=$1',[ids.a])).rows[0],old);
 await assert.rejects(d.query("update checkins set expires_at=checked_in_at+interval '5 hours'where user_id=$1",[ids.a]),/check constraint/);
 for(const n of ['ora_spot_daily_quota','ora_spot_place_quota'])assert.equal((await d.query('select count(*)n from spot_private.'+n)).rows[0].n,0);assert.equal((await d.query('select enabled from spot_private.ora_spot_policy')).rows[0].enabled,false);
});
test('ORA owner-only stale exit cannot delete another account, pause fails closed',async t=>{
 const d=await setup(t);await asUser(d,ids.a);const a=await start(d);await asUser(d,ids.b);await end(d,a.presence_id);await asUser(d,ids.a);assert.equal((await current(d)).presence_id,a.presence_id);await admin(d);await d.exec('update spot_private.soma_v2_control set ora_enabled=false');await asUser(d,ids.a);await assert.rejects(start(d),/ORA_PAUSED/);await end(d,a.presence_id);
});
test('ORA API sends intent only and staging flag fails closed; monotonic clock ignores wall clock edits',async()=>{
 const calls=[];const api=createOraApi({rpc:async(n,a)=>{calls.push([n,a]);return {data:n==='ora_people_page'?[]:null};}});await api.start(ids.v);await api.qr(ids.q);await api.end(ids.q);await api.current();await api.search('Uni');await api.people();assert.deepEqual(calls.map(c=>c[0]),['start_ora_manual','start_ora_qr','end_ora','my_presence','search_places','ora_people_page']);assert.deepEqual(calls[0][1],{place_id:ids.v});
 assert.equal(oraEnabled({}),false);assert.throws(()=>oraEnabled({VITE_ORA_V2:'true',VITE_SUPABASE_URL:'https://wrong.supabase.co'}));let mono=0;const clock=createPresenceClock(()=>mono);clock.set({expires_at:'2026-01-01T04:00:00Z',server_now:'2026-01-01T00:00:00Z'});assert.equal(clock.live(),true);mono=14400001;assert.equal(clock.live(),false);clock.clear();assert.equal(clock.live(),false);
});
test('ORA hosted smoke rehearsal rolls back all synthetic onboarding/presence/Tribe/photo metadata',async t=>{
 const d=await setup(t);await d.exec("update spot_private.photo_cutover_control set phase='PAUSED'");const r=await d.exec(await readFile('tests/staging/ora-v2-smoke.sql','utf8'));const row=r.flatMap(x=>x.rows??[]).find(x=>x.evidence);assert.match(row.evidence,/PASS/);assert.equal(row.residual_auth,0);assert.equal(row.residual_places,0);
});
test('ORA suspended/deleting/staff excluded from start and same-place discovery, search minimal/literal',async t=>{
 const d=await setup(t);await asUser(d,ids.a);await start(d);await asUser(d,ids.b);await start(d);await admin(d);await d.query("insert into spot_private.suspensions(user_id,reason)values($1,'synthetic')",[ids.b]);await asUser(d,ids.b);await assert.rejects(start(d),/ORA_ACCOUNT/);await asUser(d,ids.a);assert.equal((await d.query('select * from ora_people_page()')).rows.length,0);
 await admin(d);await d.query('delete from spot_private.suspensions where user_id=$1',[ids.b]);await d.query("insert into spot_private.account_deletions(user_id)values($1)",[ids.b]);await asUser(d,ids.b);await assert.rejects(start(d),/ORA_ACCOUNT/);
 await admin(d);await d.query('delete from spot_private.account_deletions where user_id=$1',[ids.b]);await d.query("insert into spot_private.moderation_roles(user_id,role)values($1,'MODERATOR')",[ids.b]);await asUser(d,ids.b);await assert.rejects(start(d),/ORA_ACCOUNT/);
 await asUser(d,ids.a);assert.equal((await d.query("select * from search_places('%')")).rows.length,0);const row=(await d.query('select * from search_places()')).rows[0];assert.deepEqual(Object.keys(row).sort(),['address','has_tribe','name','place_id']);
});
test('ORA controls preserve current on failure and exit captures presence identity, reset drops stale search',async()=>{
 const ui=dom();const root=ui.get('venue');let ended;const api={search:async()=>[{place_id:'p',name:'Place'}],start:async()=>{throw Error('ORA_PLACE_UNAVAILABLE');},end:async id=>{ended=id;},current:async()=>null};let latest;const controls=mountOraControls({root,api,document:ui.document,onChange:async p=>{latest=p;}});controls.show({presence_id:'A',name:'A'});const box=root.children[0];await box.children[2].onclick();await box.children[3].children[0].onclick();assert.equal(ended,undefined);await box.children.at(-1).onclick();assert.equal(ended,'A');assert.equal(latest,null);controls.reset();assert.equal(box.children[3].children.length,0);
});
test('ORA 032 preserves legacy Spot/match/chat between eligible Tribe members, no quota counters',async t=>{
 const d=await setup(t);for(const id of [ids.a,ids.b]){await asUser(d,id);await d.query('select join_tribe($1)',[ids.v]);}
 await asUser(d,ids.a);await d.query('select send_spot($1,$2)',[ids.b,ids.v]);await asUser(d,ids.b);const m=(await d.query('select send_spot($1,$2)v',[ids.a,ids.v])).rows[0].v;assert.ok(m);
 await d.query('select send_message($1,$2,$3)',[m,'synthetic hello','ab320000-0000-4000-8000-000000000001']);assert.equal((await d.query('select body from messages')).rows[0].body,'synthetic hello');await asUser(d,ids.a);assert.equal((await d.query('select * from my_matches_page()')).rows.length,1);
});
test('ORA real session fixture setup/teardown rehearses without persistent leftovers',async t=>{
 const d=await setup(t);await d.exec("update spot_private.photo_cutover_control set phase='PAUSED',canary_users='{}',execute_enabled=false,scheduler_enabled=false,cleanup_all=false");await d.exec(await readFile('tests/staging/ora-v2-concurrency-fixture.sql','utf8'));await d.exec(await readFile('tests/staging/ora-v2-concurrency-teardown.sql','utf8'));assert.equal((await d.query("select count(*)n from auth.users where id::text like 'fe323000-%'")).rows[0].n,0);
});

test('ORA pending context lifetime is bounded to one hour and excludes malformed/legacy drafts',()=>{assert.equal(pendingQrFresh({savedAt:100},3600100),true);assert.equal(pendingQrFresh({savedAt:100},3600101),false);assert.equal(pendingQrFresh({},100),false);assert.equal(pendingQrFresh({savedAt:200},100),false);});
test('ORA final hosted grants/schema/control check rehearses against migrated database',async t=>{const d=await setup(t);await d.exec("update spot_private.photo_cutover_control set phase='PAUSED',execute_enabled=false,scheduler_enabled=false,cleanup_all=false");const r=await d.exec(await readFile('tests/staging/ora-v2-check.sql','utf8'));assert.match(r.flatMap(x=>x.rows??[]).find(x=>x.evidence).evidence,/PASS/);await d.exec(await readFile('tests/staging/ora-v2-source-check.sql','utf8'));await d.exec(await readFile('tests/staging/ora-v2-enable.sql','utf8'));});
