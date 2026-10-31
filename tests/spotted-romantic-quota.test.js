import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{romanticDatabase,ids,users,admin,asUser,uuid,call,post,submit,setting,count}from'./helpers/romantic-database.js';
import{freezeDiscoveryTestClock}from'./helpers/discovery-test-clock.js';
async function clock(d,stamp){await admin(d);await freezeDiscoveryTestClock(d,stamp);await d.exec("create or replace function pg_catalog.statement_timestamp()returns timestamptz language sql stable as $$select current_setting('soma.test_clock')::timestamptz$$");}
test('ROMANTIC060 one global initiative covers post/comment and second board; retries consume once',async t=>{
 const d=await romanticDatabase(t);const p=await post(d);await d.query('select join_tribe($1)',[ids.w]);const q=await post(d,'Other board',ids.w);const c=await call(d,'spotted_create_comment($1,$2,$3)',[p,'Synthetic comment',await call(d,'board_operation($1)',[ids.v])]);await asUser(d,ids.b);await d.query('select join_tribe($1)',[ids.w]);assert.equal((await setting(d)).remaining,1);const op=uuid();await submit(d,p,'post',op);await submit(d,p,'post',op);await submit(d,p);await submit(d,q);await submit(d,c,'comment');assert.equal((await setting(d)).remaining,0);assert.equal(await count(d,'spot_private.board_request_attempts'),1);assert.equal(await count(d,'spot_private.board_romantic_requests'),1);await admin(d);assert.equal((await d.query('select used from spot_private.board_request_quota where user_id=$1',[ids.b])).rows[0].used,1);
});
test('ROMANTIC060 reads, likes, comments and reports do not spend initiative quota',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);await call(d,'spotted_feed($1)',[ids.v]);await call(d,'spotted_like($1,$2,$3,$4)',[p,'post',true,uuid()]);const c=await call(d,'spotted_create_comment($1,$2,$3)',[p,'Social only',await call(d,'board_operation($1)',[ids.v])]);await call(d,"board_report($1,'other',$2)",[p,uuid()]);await asUser(d,ids.c);await call(d,"spotted_report_comment($1,'other',$2)",[c,uuid()]);await asUser(d,ids.b);assert.equal((await setting(d)).remaining,1);assert.equal(await count(d,'spot_private.board_request_quota'),0);await submit(d,p);assert.equal((await setting(d)).remaining,0);
});
test('ROMANTIC060 Rome midnight resets quota, both DST days are calendar days, caller timezone irrelevant',async t=>{
 const d=await romanticDatabase(t);
 for(const [before,after]of[['2030-03-30T23:59:59+01:00','2030-03-31T00:00:00+01:00'],['2030-10-26T23:59:59+02:00','2030-10-27T00:00:00+02:00']]){
  await clock(d,before);await asUser(d,ids.a);const p=await post(d);await asUser(d,ids.c);const q=await post(d,'Another recipient');await asUser(d,ids.b);await d.exec("set timezone='Pacific/Honolulu'");await submit(d,p);assert.equal((await setting(d)).remaining,0);await submit(d,q);await clock(d,after);await asUser(d,ids.b);assert.equal((await setting(d)).remaining,1);await submit(d,q);assert.equal((await setting(d)).remaining,0);
 }
 await admin(d);const rows=(await d.query('select day,used from spot_private.board_request_quota where user_id=$1 order by day',[ids.b])).rows;assert.equal(rows.length,4);assert.ok(rows.every(x=>x.used===1));
 for(const [first,second,day]of[['2031-03-30T00:00:00+01:00','2031-03-30T23:59:59+02:00','2031-03-30'],['2031-10-26T00:00:00+02:00','2031-10-26T23:59:59+01:00','2031-10-26']]){
  await clock(d,first);await asUser(d,ids.a);const p=await post(d);await asUser(d,users[3]);await submit(d,p);await clock(d,second);await asUser(d,ids.a);const q=await post(d,'Late DST content');await asUser(d,users[3]);await submit(d,q);assert.equal((await setting(d)).remaining,0);await admin(d);assert.equal((await d.query('select count(*)::int n,max(used)used from spot_private.board_request_quota where user_id=$1 and day=$2',[users[3],day])).rows[0].used,1);
 }
});
test('ROMANTIC060 direct API cannot choose actor/day/limit or modify private quota',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);await assert.rejects(d.query('select spot_private.spotted_romantic_daily_limit()'),/permission denied/);await assert.rejects(d.query('insert into spot_private.board_request_quota values($1,current_date,0)',[ids.b]),/permission denied/);await assert.rejects(call(d,'spotted_romantic_submit($1,$2,$3,$4)',[p,'post',uuid(),'2030-01-01']),/does not exist/);await submit(d,p);await submit(d,p);assert.equal(await count(d,'spot_private.board_request_attempts'),1);
});
test('ROMANTIC060 migration refuses incompatible historical counters without rewriting them',async t=>{
 const d=await romanticDatabase(t,{onePerDay:false});await admin(d);await d.query('insert into spot_private.board_request_quota values($1,current_date,6)',[ids.b]);await assert.rejects(d.exec(await readFile('supabase/migrations/060_spotted_romantic_one_per_day.sql','utf8')),/ROMANTIC_QUOTA_HISTORY_REVIEW_REQUIRED/);await d.exec('rollback');assert.equal((await d.query('select used from spot_private.board_request_quota')).rows[0].used,6);assert.equal((await d.query("select to_regprocedure('spot_private.spotted_romantic_daily_limit()')v")).rows[0].v,null);
});
