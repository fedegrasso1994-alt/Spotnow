import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {policyDatabase,enableFixture,projection,admin,asUser,ids} from './helpers/discovery-policy-database.js';
import {window,tribeSpot} from './helpers/discovery-database.js';
import {send} from './helpers/spot-database.js';
const migration=await readFile('supabase/migrations/039_dd_outgoing_spot_state.sql','utf8');
async function setup(t){const d=await policyDatabase(t,3);await admin(d);await d.exec(migration);await enableFixture(d);await window(d);return d;}
const own=(d,user=ids.a)=>projection(d,user);
const target=r=>r.profiles[0].id;
async function state(d){await admin(d);return (await d.query(`select jsonb_build_object('allocations',(select jsonb_agg(to_jsonb(a)order by user_id)from spot_private.discovery_allocations a),'exposures',(select jsonb_agg(to_jsonb(e)order by id)from spot_private.discovery_exposures e),'intents',(select jsonb_agg(to_jsonb(i)order by id)from spot_private.spot_v2_intents i),'operations',(select jsonb_agg(to_jsonb(o)order by operation_id)from spot_private.spot_v2_operations o),'ora_quota',(select jsonb_agg(to_jsonb(q)order by user_id)from spot_private.ora_spot_daily_quota q))v`)).rows[0].v;}
const withoutFlag=r=>r.profiles.map(({outgoing_spot_pending,...p})=>p);
test('DD outgoing contract: boolean false with no outgoing, no extra Spot metadata or authorization',async t=>{
 const d=await setup(t),r=await own(d);assert.equal(r.profiles.length,2);assert.ok(r.profiles.every(p=>p.outgoing_spot_pending===false));assert.deepEqual(Object.keys(r.profiles[0]).sort(),['id','name','age','gender','occupation','photo_path','thumbnail_path','detail_path','tribe_id','tribe_name','exposure_id','outgoing_spot_pending'].sort());
 await asUser(d,ids.a);await assert.rejects(d.query('select *from spot_private.spot_v2_intents'),/permission denied/);await assert.rejects(d.query('select spot_private.dd_current_projection()'),/permission denied/);
});
test('DD outgoing TRIBE pending is visible on fresh reads; retries preserve receipts, expiry and quotas',async t=>{
 const d=await setup(t),before=await own(d),b=target(before),op=crypto.randomUUID();await asUser(d,ids.a);const sent=await tribeSpot(d,b,op);assert.equal(sent.state,'pending');const after=await own(d);assert.equal(after.profiles.find(p=>p.id===b).outgoing_spot_pending,true);assert.deepEqual(withoutFlag(after),withoutFlag(before));assert.equal(after.window_spots_remaining,before.window_spots_remaining-1);
 const snapshot=await state(d);for(let i=0;i<3;i++){await own(d);await asUser(d,ids.a);assert.deepEqual(await tribeSpot(d,b,op),sent);}assert.deepEqual(await state(d),snapshot);
});
test('DD outgoing ORA-origin pending is person-level; DD reads charge no TRIBE or ORA credit',async t=>{
 const d=await setup(t),before=await own(d),b=target(before);await asUser(d,ids.a);await d.query('select start_ora_manual($1)',[ids.v]);await asUser(d,b);await d.query('select start_ora_manual($1)',[ids.v]);await asUser(d,ids.a);const r=await send(d,b);assert.equal(r.state,'pending');
 const snapshot=await state(d);const after=await own(d);assert.equal(after.profiles.find(p=>p.id===b).outgoing_spot_pending,true);assert.equal(after.window_spots_remaining,before.window_spots_remaining);assert.equal(after.day_spots_remaining,before.day_spots_remaining);assert.deepEqual(withoutFlag(after),withoutFlag(before));assert.deepEqual(await state(d),snapshot);
});
test('DD outgoing expiry and terminal states are not pending; reads never renew validity',async t=>{
 const d=await setup(t),b=target(await own(d));await asUser(d,ids.a);await tribeSpot(d,b);for(const status of ['expired','invalidated','matched']){await admin(d);await d.query('update spot_private.spot_v2_intents set state=$1 where sender_id=$2',[status,ids.a]);assert.equal((await own(d)).profiles.find(p=>p.id===b).outgoing_spot_pending,false);}
 await admin(d);await d.query("update spot_private.spot_v2_intents set state='pending',created_at=transaction_timestamp()-interval '721 hours',valid_until=transaction_timestamp()-interval '1 hour'where sender_id=$1",[ids.a]);const snapshot=await state(d);assert.equal((await own(d)).profiles.find(p=>p.id===b).outgoing_spot_pending,false);assert.deepEqual(await state(d),snapshot);
});
test('DD incoming-only Spot is indistinguishable in viewer profile payload and own budget',async t=>{
 const d=await setup(t),before=await own(d),b=target(before);await asUser(d,b);await tribeSpot(d,ids.a);const after=await own(d);assert.deepEqual(after.profiles,before.profiles);assert.equal(after.window_spots_remaining,before.window_spots_remaining);assert.equal(after.day_spots_remaining,before.day_spots_remaining);assert.equal(after.profiles.find(p=>p.id===b).outgoing_spot_pending,false);
});
test('DD outgoing pending never grants profile access after exposure expires',async t=>{
 const d=await setup(t),before=await own(d),b=target(before);await asUser(d,ids.a);await tribeSpot(d,b);await admin(d);await d.query("update spot_private.discovery_windows set state='closed'where id=$1",[before.window_id]);await asUser(d,ids.a);assert.equal((await d.query('select *from authorized_profile($1)',[b])).rows.length,0);const r=await own(d);assert.ok(!r.profiles.some(p=>p.id===b));
});
test('DD 039 migration: only projection changes; OFF and ACL retained, wrong environment rejected',async t=>{
 const d=await policyDatabase(t,3);await admin(d);const def=async()=> (await d.query("select pg_get_functiondef('public.my_daily_discovery()'::regprocedure)body")).rows[0].body;const before=await def();await d.exec(migration);assert.equal(await def(),before);await asUser(d,ids.a);const paused=(await d.query('select my_daily_discovery()v')).rows[0].v;assert.equal(paused.status,'paused');assert.deepEqual(paused.profiles,[]);
 await admin(d);await d.exec("update spot_private.privacy_environment set environment='production'");await assert.rejects(d.exec(migration),/DD_STAGING_ONLY/);await d.exec('rollback');
});
test('DD public RPC returns ORA outgoing state and hides incoming-only; projection rereads are pure',async t=>{
 const d=await policyDatabase(t,3);await admin(d);await d.exec(migration);await enableFixture(d);await admin(d);
 // Isolated CI database: synthetic current window regardless of wall-clock/night.
 // The hosted clock and policy are never replaced.
 await d.exec(`create or replace function spot_private.dd_clock_at(stamp timestamptz)returns table(local_date date,slot text,starts_at timestamptz,ends_at timestamptz,next_window_starts_at timestamptz)language sql stable security definer set search_path=''as $$select (stamp at time zone 'Europe/Rome')::date,'morning'::text,stamp-interval '1 minute',stamp+interval '3 minutes',stamp+interval '3 minutes'$$`);
 for(const id of [ids.a,ids.b,ids.c]){await asUser(d,id);await d.query('select start_ora_manual($1)',[ids.v]);}
 await asUser(d,ids.a);await send(d,ids.b);await asUser(d,ids.c);await send(d,ids.a);await asUser(d,ids.a);
 const first=(await d.query('select my_daily_discovery()v')).rows[0].v;
 assert.equal(first.profiles.find(p=>p.id===ids.b).outgoing_spot_pending,true);assert.equal(first.profiles.find(p=>p.id===ids.c).outgoing_spot_pending,false);assert.equal(first.window_spots_remaining,2);assert.equal(first.day_spots_remaining,4);
 const before=await state(d);for(let i=0;i<3;i++){const r=await own(d);assert.deepEqual(r.profiles,first.profiles);assert.equal(r.window_spots_remaining,2);assert.equal(r.day_spots_remaining,4);}assert.deepEqual(await state(d),before);
});
