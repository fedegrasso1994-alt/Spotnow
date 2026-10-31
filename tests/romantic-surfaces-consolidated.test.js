import test from 'node:test';
import assert from 'node:assert/strict';
import {romanticSurfacesDatabase,quotaSnapshot,admin,asUser,ids} from './helpers/romantic-surfaces-database.js';
import {enableChance,chances,reveal,chanceSpot,chanceClock} from './helpers/chance-database.js';
import {users,send,budget} from './helpers/spot-database.js';
import {post,submit,inbox,decide,setting} from './helpers/romantic-database.js';
const start=(d,p=ids.v)=>d.query('select start_ora_manual($1)v',[p]).then(r=>r.rows[0].v);
async function together(d,a,b,p=ids.v){await asUser(d,b);await start(d,p);await asUser(d,a);return start(d,p);}
async function content(d,author=ids.b){await asUser(d,author);return post(d);}
const neutral={submitted:true};

test('CONSOLIDATED current migrations: Chance -> Spotted -> ORA A/B have independent server counters',async t=>{
 const d=await romanticSurfacesDatabase(t);await enableChance(d);const c=(await chances(d)).chances[0];assert.ok(c);await reveal(d,c.id);
 const before=await quotaSnapshot(d);await asUser(d,ids.a);const op=crypto.randomUUID(),sent=await chanceSpot(d,c.id,op);assert.deepEqual(await chanceSpot(d,c.id,op),sent);
 const afterChance=await quotaSnapshot(d);assert.deepEqual(afterChance.romantic,before.romantic);assert.deepEqual(afterChance.ora,before.ora);
 const p=await content(d);await asUser(d,ids.a);const rop=crypto.randomUUID();assert.deepEqual(await submit(d,p,'post',rop),neutral);assert.deepEqual(await submit(d,p,'post',rop),neutral);assert.deepEqual(await submit(d,p),neutral);
 const afterRomantic=await quotaSnapshot(d);assert.deepEqual(afterRomantic.chance,afterChance.chance);assert.deepEqual(afterRomantic.ora,afterChance.ora);assert.equal(afterRomantic.romantic[0].used,1);
 // Use distinct counterpart from the Chance so a pre-existing pending cannot mask a charge.
 const peer=(await admin(d),await d.query('select user_a,user_b from spot_private.discovery_exposures where id=$1',[c.id])).rows[0];const counterpart=peer.user_a===ids.a?peer.user_b:peer.user_a;
 const others=users.slice(0,6).filter(x=>x!==ids.a&&x!==counterpart);
 for(const [i,place]of [ids.v,ids.w].entries()){await together(d,ids.a,others[i],place);await send(d,others[i]);assert.equal((await budget(d)).remaining,0);}
 const final=await quotaSnapshot(d);assert.deepEqual(final.chance,afterRomantic.chance);assert.deepEqual(final.romantic,afterRomantic.romantic);assert.equal(final.ora.reduce((n,x)=>n+x.used,0),2);
 await asUser(d,ids.a);assert.equal((await setting(d)).remaining,0);
});

test('CONSOLIDATED exhausted Spotted does not block all allocated valid Chance or ORA; repeated reads/tick do not refill',async t=>{
 const d=await romanticSurfacesDatabase(t);await enableChance(d);await chances(d);await admin(d);
 const owner=(await d.query("select a.user_id from spot_private.discovery_allocations a join spot_private.discovery_windows w on w.id=a.window_id group by a.user_id having sum(exposure_count)>0 order by sum(exposure_count) desc,a.user_id limit 1")).rows[0]?.user_id;assert.ok(owner,'fixture needs an actually allocated Chance owner');
 const author=users.slice(0,6).find(x=>x!==owner),p=await content(d,author);await asUser(d,owner);await submit(d,p);const list=await chances(d);assert.ok(list.chances.length>0&&list.chances.length<=4);const allocated=list.chances.length;
 const before=await quotaSnapshot(d,owner);await admin(d);await d.query('select spot_private.chance_release_due()');await asUser(d,owner);assert.deepEqual((await chances(d)).chances,list.chances);
 for(const c of list.chances){await reveal(d,c.id);await chanceSpot(d,c.id);await assert.rejects(chanceSpot(d,c.id),/CHANCE_SPOT_USED/);}
 await together(d,owner,author);assert.equal((await budget(d)).remaining,1);await send(d,author);const after=await quotaSnapshot(d,owner);assert.deepEqual(after.romantic,before.romantic);assert.equal(after.chance.filter(x=>x.spot_sent_at).length,allocated);
});

test('CONSOLIDATED carryover Chance, new Rome-day Spotted and ORA remain independent with spoofed timezone',async t=>{
 const d=await romanticSurfacesDatabase(t);await enableChance(d);const c=(await chances(d)).chances.at(-1);await reveal(d,c.id);await chanceClock(d,'2030-06-10T22:00:00Z');await d.exec("set timezone='Pacific/Honolulu'");await chanceSpot(d,c.id);
 const p=await content(d);await asUser(d,ids.a);await submit(d,p);await together(d,ids.a,ids.b);await send(d,ids.b);
 const s=await quotaSnapshot(d);assert.equal(s.romantic[0].day,'2030-06-11');assert.equal(s.ora[0].local_date,'2030-06-11');assert.equal(s.chance.filter(x=>x.spot_sent_at).length,1);
 await chanceClock(d,'2030-06-11T19:30:00Z');await assert.rejects(chanceSpot(d,c.id),/CHANCE_UNAVAILABLE/);
});

test('CONSOLIDATED Spotted accept and ORA/Chance pathways retain canonical Match, chat and deduplicated analytics',async t=>{
 const d=await romanticSurfacesDatabase(t);await enableChance(d);const c=(await chances(d)).chances[0],r=await reveal(d,c.id),b=r.profile.id;
 const op=crypto.randomUUID();await chanceSpot(d,c.id,op);const p=await content(d,b);await asUser(d,ids.a);await submit(d,p);await asUser(d,b);const req=(await inbox(d)).items.find(x=>x.sender.id===ids.a);assert.ok(req);const m=await decide(d,req.id,true);assert.deepEqual(await decide(d,req.id,true),m);
 await asUser(d,ids.a);assert.equal((await send(d,b)).match_id,m.match_id);await assert.rejects(chanceSpot(d,c.id),/CHANCE_UNAVAILABLE/);await asUser(d,b);await assert.rejects(reveal(d,c.id),/CHANCE_UNAVAILABLE/);
 await d.query('select send_message($1,$2)',[m.match_id,'SYNTHETIC CONSOLIDATED']);await admin(d);
 assert.equal((await d.query('select count(*)::int n from matches')).rows[0].n,1);assert.equal((await d.query('select count(*)::int n from messages where match_id=$1',[m.match_id])).rows[0].n,1);
 assert.equal((await d.query("select count(*)::int n from spot_private.analytics_events where event='match_created'")).rows[0].n,1);
 assert.equal((await d.query("select count(*)::int n from spot_private.analytics_events where event='romantic_attempt'")).rows[0].n,1);
 assert.equal((await d.query('select dropped from spot_private.analytics_control')).rows[0].dropped,0);
});
