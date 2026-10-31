import test from'node:test';import assert from'node:assert/strict';
import{oraQuotaDatabase,ids,users,places,asUser,admin,send,budget,start,setClock,exposure}from'./helpers/ora-quota-database.js';
const presence=d=>d.query('select my_presence()v').then(r=>r.rows[0].v);
async function colocate(d,peer,place){await asUser(d,peer);await start(d,place);await asUser(d,ids.a);return start(d,place);}
test('ORA061 A/B/C allowed D denied; same Place visits and new 4h presence cannot reset one Spot',async t=>{
 const d=await oraQuotaDatabase(t);const a=await start(d,places[0]);assert.equal(Date.parse(a.expires_at)-Date.parse(a.started_at),4*3600000);assert.equal((await start(d,places[0])).presence_id,a.presence_id);
 const op=crypto.randomUUID(),first=await send(d,ids.b,op);assert.deepEqual(await send(d,ids.b,op),first);assert.deepEqual(await send(d,ids.b),first);assert.deepEqual(await budget(d),{remaining:0,place_remaining:0});await assert.rejects(send(d,ids.c),/SPOT_PLACE_QUOTA/);
 await d.query('select end_ora($1)',[a.presence_id]);const re=await start(d,places[0]);assert.notEqual(re.presence_id,a.presence_id);await assert.rejects(send(d,ids.c),/SPOT_PLACE_QUOTA/);assert.equal((await start(d,places[0])).presence_id,re.presence_id);
 await colocate(d,users[3],places[1]);await send(d,users[3]);await colocate(d,users[4],places[2]);await send(d,users[4]);await assert.rejects(start(d,places[3]),/ORA_LOCATION_DAILY_QUOTA/);assert.equal((await presence(d)).place_id,places[2]);await start(d,places[0]);await assert.rejects(send(d,ids.c),/SPOT_PLACE_QUOTA/);
 await admin(d);const q=(await d.query('select count(*)::int n,sum(used)::int used,max(used)::int max_used from spot_private.ora_spot_place_quota where user_id=$1',[ids.a])).rows[0];assert.deepEqual(q,{n:3,used:3,max_used:1});
});
test('ORA061 new day restores A/B/C; DST and client timezone never reset same Rome day',async t=>{
 const d=await oraQuotaDatabase(t);
 for(const [first,last,next]of[['2030-03-31T00:00:00+01:00','2030-03-31T23:59:59+02:00','2030-04-01T00:00:00+02:00'],['2030-10-27T00:00:00+02:00','2030-10-27T23:59:59+01:00','2030-10-28T00:00:00+01:00']]){
  await setClock(d,first);await d.exec("set timezone='Pacific/Honolulu'");await start(d,places[0]);await start(d,places[1]);await start(d,places[2]);await assert.rejects(start(d,places[3]),/ORA_LOCATION_DAILY_QUOTA/);
  await setClock(d,last);await assert.rejects(start(d,places[3]),/ORA_LOCATION_DAILY_QUOTA/);await start(d,places[0]);await colocate(d,ids.b,places[0]);await send(d,ids.b);await assert.rejects(send(d,ids.c),/SPOT_ORA_CONTEXT|SPOT_PLACE_QUOTA/);
  await setClock(d,next);for(const p of places.slice(0,3))await start(d,p);await assert.rejects(start(d,places[3]),/ORA_LOCATION_DAILY_QUOTA/);await start(d,places[0]);assert.equal((await budget(d)).remaining,1);
 }
});
test('ORA061 midnight while same 4h presence stays active charges new day visit without resetting duration',async t=>{
 const d=await oraQuotaDatabase(t);await setClock(d,'2031-01-01T23:59:59+01:00');await colocate(d,ids.b,places[0]);const p=await presence(d);await send(d,ids.b);await setClock(d,'2031-01-02T00:00:00+01:00');assert.equal((await budget(d)).remaining,1);await asUser(d,ids.c);await start(d,places[0]);await asUser(d,ids.a);await send(d,ids.c);assert.equal((await budget(d)).remaining,0);assert.equal((await presence(d)).presence_id,p.presence_id);await admin(d);assert.equal((await d.query('select count(*)::int n from spot_private.ora_spot_place_quota where user_id=$1',[ids.a])).rows[0].n,3);
});
test('ORA061 direct client writes/actor/day injection denied, QR shares same visit limit',async t=>{
 const d=await oraQuotaDatabase(t);await assert.rejects(d.query('select spot_private.ora_charge_visit($1,$2,now())',[ids.a,places[3]]),/permission denied/);await assert.rejects(d.query('insert into spot_private.ora_spot_place_quota values($1,$2,current_date,0)',[ids.a,places[3]]),/permission denied/);await assert.rejects(d.query('select start_ora_manual($1,$2)',[places[3],ids.b]),/does not exist/);
 await start(d,places[1]);await start(d,places[2]);await admin(d);await d.query('insert into spot_private.venue_codes values($1,$2)',[places[3],places[3]]);await asUser(d,ids.a);await assert.rejects(d.query('select start_ora_qr($1)',[places[3]]),/ORA_LOCATION_DAILY_QUOTA/);await d.query('select start_ora_qr($1)',[ids.q]);await send(d,ids.b);await assert.rejects(send(d,ids.c),/SPOT_PLACE_QUOTA/);
});
test('ORA061 reciprocity Match/chat, existing pending, rollback and Tribe remain independent',async t=>{
 const d=await oraQuotaDatabase(t);await d.exec('begin');await send(d,ids.b);await d.exec('rollback');assert.equal((await budget(d)).remaining,1);await send(d,ids.b);await asUser(d,ids.b);const m=await send(d,ids.a);assert.ok(m.match_id);assert.equal((await send(d,ids.a)).match_id,m.match_id);await d.query('select send_message($1,$2)',[m.match_id,'SYNTHETIC ORA']);assert.equal((await budget(d)).remaining,0);await admin(d);assert.equal((await d.query('select count(*)::int n from matches')).rows[0].n,1);
 const e=await exposure(d,ids.a,ids.c);await asUser(d,ids.a);await send(d,ids.c,crypto.randomUUID(),'tribe',e);assert.equal((await budget(d)).remaining,0);await admin(d);assert.equal((await d.query('select sum(used)::int n from spot_private.ora_spot_place_quota where user_id=$1',[ids.a])).rows[0].n,1);
});


test('ORA061 carried presence counts in new Rome day before switching, even if it just expired',async t=>{
 const d=await oraQuotaDatabase(t);await setClock(d,'2031-01-01T23:59:59+01:00');await start(d,places[0]);await setClock(d,'2031-01-02T04:00:00+01:00');await start(d,places[1]);await start(d,places[2]);await assert.rejects(start(d,places[3]),/ORA_LOCATION_DAILY_QUOTA/);await start(d,places[0]);assert.equal((await budget(d)).remaining,1);
});
