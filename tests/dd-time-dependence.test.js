import test from'node:test';import assert from'node:assert/strict';
import{discoveryDatabase,window,drop,admin}from'./helpers/discovery-database.js';
import{policyDatabase}from'./helpers/discovery-policy-database.js';
import{freezeDiscoveryTestClock}from'./helpers/discovery-test-clock.js';
const cases=[['07:59:00',null,null,null,'2026-10-21T06:00:00.000Z'],['08:00:00','morning','2026-10-21T06:00:00.000Z','2026-10-21T14:00:00.000Z','2026-10-21T14:00:00.000Z'],['15:59:00','morning','2026-10-21T06:00:00.000Z','2026-10-21T14:00:00.000Z','2026-10-21T14:00:00.000Z'],['16:00:00','afternoon','2026-10-21T14:00:00.000Z','2026-10-21T22:00:00.000Z','2026-10-22T06:00:00.000Z'],['23:59:00','afternoon','2026-10-21T14:00:00.000Z','2026-10-21T22:00:00.000Z','2026-10-22T06:00:00.000Z'],['00:00:00',null,null,null,'2026-10-21T06:00:00.000Z']];
const iso=d=>d?.toISOString()??null;
test('DD deterministic six-time matrix separates original harness failure from frozen 08/16/00 product policy',async()=>{
 const policy=await policyDatabase({after(){}},2);try{for(const[time,slot,start,end,next]of cases){
  const stamp='2026-10-21T'+time+'+02:00',d=await discoveryDatabase({after(){}},2);try{
   await admin(d);await freezeDiscoveryTestClock(d,stamp);assert.equal((await d.query('select clock_timestamp()t')).rows[0].t.toISOString(),new Date(stamp).toISOString());
   const w=await window(d);await drop(d);await admin(d);
   const old=(await d.query('select starts_at,ends_at from spot_private.discovery_windows where id=$1',[w])).rows[0];
   // Original +1 min assertion fails at 23:59 because the day boundary guard is first.
   await assert.rejects(d.query("update spot_private.discovery_windows set ends_at=ends_at+interval '1 minute'where id=$1",[w]),time==='23:59:00'?/DD_WINDOW_DAY/:/DD_WINDOW_IMMUTABLE/);
   // Corrected assertion must always reach the immutable guard, never accept any error.
   await assert.rejects(d.query("update spot_private.discovery_windows set ends_at=ends_at-interval '1 minute'where id=$1",[w]),/DD_WINDOW_IMMUTABLE/);
   assert.deepEqual((await d.query('select starts_at,ends_at from spot_private.discovery_windows where id=$1',[w])).rows[0],old);
   await assert.rejects(d.query("insert into spot_private.discovery_windows(local_date,slot,policy_version,starts_at,ends_at)select local_date,'afternoon',policy_version,starts_at,ends_at from spot_private.discovery_windows where id=$1",[w]),/DD_WINDOW_OVERLAP/);
   const c=(await policy.query('select *from spot_private.dd_clock_at($1)',[stamp])).rows[0];assert.equal(c.slot,slot,time);assert.equal(c.local_date.toISOString().slice(0,10),'2026-10-21');assert.equal(iso(c.starts_at),start,time);assert.equal(iso(c.ends_at),end,time);assert.equal(iso(c.next_window_starts_at),next,time);
  }finally{await d.close();}
 }}finally{await policy.close();}
});
test('DD explicit Rome DST instants preserve overnight policy and correct UTC countdown targets',async t=>{
 const d=await policyDatabase(t,2);for(const[stamp,next]of [['2026-03-29T01:59:59+01:00','2026-03-29T06:00:00.000Z'],['2026-03-29T03:00:00+02:00','2026-03-29T06:00:00.000Z'],['2026-10-25T02:30:00+02:00','2026-10-25T07:00:00.000Z'],['2026-10-25T02:30:00+01:00','2026-10-25T07:00:00.000Z']]){const c=(await d.query('select *from spot_private.dd_clock_at($1)',[stamp])).rows[0];assert.equal(c.slot,null);assert.equal(iso(c.next_window_starts_at),next);}
});
test('DD frozen-clock helper refuses remote/non-PGlite connections',async()=>{await assert.rejects(freezeDiscoveryTestClock({query(){throw Error('REMOTE_USED');}},'2026-10-21T12:00:00+02:00'),/LOCAL_PGLITE_TEST_DATABASE_REQUIRED/);});
