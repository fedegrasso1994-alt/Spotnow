import test from'node:test';import assert from'node:assert/strict';
import{romanticDatabase,ids,users,admin,asUser,uuid,call,post,submit,inbox,decide,setting,opt,profile,count}from'./helpers/romantic-database.js';
const neutral={submitted:true};
test('ROMANTIC post/comment submission, directional profile authorization, sender has no outbox/raw state',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);assert.deepEqual(await submit(d,p),neutral);
 assert.deepEqual((await inbox(d)).items,[]);assert.equal((await profile(d,ids.a)).length,0);
 for(const table of ['board_request_attempts','board_romantic_requests','board_preferences','board_request_pair_guards','board_request_quota'])await assert.rejects(d.query('select *from spot_private.'+table),/permission denied/);
 await asUser(d,ids.a);const r=(await inbox(d)).items[0];assert.equal(r.sender.id,ids.b);assert.equal((await profile(d,ids.b)).length,1);assert.equal(r.context,'Synthetic romantic origin');
 assert.deepEqual(Object.keys(r).sort(),['context','id','sender']);await asUser(d,ids.c);await assert.rejects(decide(d,r.id,true),/UNAVAILABLE/);
});
test('ROMANTIC global six attempts/day includes incompatible, opt-out, duplicate, existing Match and seventh neutral; retry free',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);const op=uuid();assert.deepEqual(await submit(d,p,'post',op),neutral);await submit(d,p,'post',op);assert.equal((await setting(d)).remaining,5);
 for(let i=0;i<7;i++)assert.deepEqual(await submit(d,p),neutral);assert.equal((await setting(d)).remaining,0);assert.equal(await count(d,'spot_private.board_romantic_requests'),1);assert.equal(await count(d,'spot_private.board_request_attempts'),6);await admin(d);assert.equal((await d.query('select used from spot_private.board_request_quota where user_id=$1',[ids.b])).rows[0].used,6);
 await asUser(d,ids.a);await opt(d,false);await asUser(d,ids.c);await submit(d,p);assert.equal((await setting(d)).remaining,5);assert.equal(await count(d,'spot_private.board_romantic_requests'),1);
});
test('ROMANTIC one unordered pending across contents/opposite directions, never auto-Match; comment supported',async t=>{
 const d=await romanticDatabase(t),p=await post(d),p2=await post(d,'Other origin');await asUser(d,ids.b);const mine=await post(d,'Other person');await submit(d,p);await submit(d,p2);await asUser(d,ids.a);await submit(d,mine);
 assert.equal(await count(d,'spot_private.board_romantic_requests'),1);assert.equal(await count(d,'public.matches'),0);assert.equal(await count(d,'spot_private.spot_v2_intents'),0);
 await asUser(d,ids.a);const comment=await call(d,'spotted_create_comment($1,$2,$3)',[p,'Anonymous comment',await call(d,'board_operation($1)',[ids.v])]);await asUser(d,ids.c);await submit(d,comment,'comment');await asUser(d,ids.a);assert.equal((await inbox(d)).items.length,2);
});
test('ROMANTIC explicit accept creates single persistent unified Match/chat; double accept idempotent',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);await submit(d,p);await asUser(d,ids.a);const r=(await inbox(d)).items[0];const accepted=await decide(d,r.id,true);assert.ok(accepted.match_id);assert.deepEqual(await decide(d,r.id,true),accepted);
 assert.equal(await count(d,'public.matches'),1);await asUser(d,ids.b);await call(d,'send_message($1,$2)',[accepted.match_id,'Synthetic hello']);assert.equal((await d.query('select *from my_matches()')).rows.length,1);
 const messages=(await d.query('select *from messages where match_id=$1',[accepted.match_id])).rows;assert.equal(messages.length,1);await submit(d,p);assert.equal((await setting(d)).remaining,4);assert.equal(await count(d,'public.matches'),1);
});
test('ROMANTIC decline silent and exact 30-day unordered guard from declined_at, no retry extension',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);const op=uuid();await submit(d,p,'post',op);await asUser(d,ids.a);const r=(await inbox(d)).items[0];await decide(d,r.id,false);await decide(d,r.id,false);
 assert.equal((await profile(d,ids.b)).length,0);await admin(d);const g=(await d.query("select g.retry_not_before=r.declined_at+interval '720 hours' exact,g.retry_not_before from spot_private.board_request_pair_guards g cross join spot_private.board_romantic_requests r")).rows[0];assert.equal(g.exact,true);
 await asUser(d,ids.b);assert.deepEqual(await submit(d,p,'post',op),neutral);await submit(d,p);assert.deepEqual((await inbox(d)).items,[]);assert.equal(await count(d,'public.matches'),0);await admin(d);assert.equal((await d.query('select retry_not_before from spot_private.board_request_pair_guards')).rows[0].retry_not_before.getTime(),g.retry_not_before.getTime());
});
test('ROMANTIC original expiry starts guard, late sweep never extends it; expired cannot accept',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);await submit(d,p);await admin(d);await d.exec("update spot_private.board_romantic_requests set created_at=created_at-interval '8 days',expires_at=expires_at-interval '8 days'");const r=(await d.query('select *from spot_private.board_romantic_requests')).rows[0];await asUser(d,ids.a);assert.equal((await inbox(d)).items.length,0);await assert.rejects(decide(d,r.id,true),/UNAVAILABLE/);await admin(d);assert.equal((await d.query("select retry_not_before=$1::timestamptz+interval '720 hours' exact from spot_private.board_request_pair_guards",[r.expires_at])).rows[0].exact,true);
});
test('ROMANTIC opt-out invalidates pending and directional authorization immediately; opt-in never revives or deletes Match',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);await submit(d,p);await asUser(d,ids.a);const r=(await inbox(d)).items[0];await opt(d,false);assert.equal((await profile(d,ids.b)).length,0);assert.equal((await inbox(d)).items.length,0);await opt(d,true);assert.equal((await inbox(d)).items.length,0);await assert.rejects(decide(d,r.id,true),/UNAVAILABLE/);await asUser(d,ids.b);await submit(d,p);await asUser(d,ids.a);const next=(await inbox(d)).items[0];await decide(d,next.id,true);await opt(d,false);assert.equal(await count(d,'public.matches'),1);
});
test('ROMANTIC delivery suppression responses/quota uniform across optout, incompatibility and Match',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.a);await opt(d,false);await asUser(d,ids.b);assert.deepEqual(await submit(d,p),neutral);assert.equal((await setting(d)).remaining,5);
 await asUser(d,ids.a);await opt(d,true);await admin(d);await d.query("update profiles set gender='F',preference='M'where id in($1,$2)",[ids.a,ids.c]);await asUser(d,ids.c);assert.deepEqual(await submit(d,p),neutral);assert.equal((await setting(d)).remaining,5);
 await admin(d);await d.query('insert into matches(user_a,user_b,venue_id)values($1,$2,$3)',[ids.a,users[3],ids.v]);await asUser(d,users[3]);assert.deepEqual(await submit(d,p),neutral);assert.equal((await setting(d)).remaining,5);assert.equal(await count(d,'spot_private.board_romantic_requests'),0);
});
test('ROMANTIC context expiry/removal falls back without leaking deleted text, request remains actionable',async t=>{
 const d=await romanticDatabase(t),p=await post(d,'Context to remove');await asUser(d,ids.b);await submit(d,p);await admin(d);await d.query('delete from spot_private.board_posts where id=$1',[p]);await asUser(d,ids.a);const r=(await inbox(d)).items[0];assert.ok(r.context.includes('SPOTTED'));assert.ok(!r.context.includes('Context to remove'));assert.ok((await decide(d,r.id,true)).match_id);
});
test('ROMANTIC safety block/suspension/consent silently invalidates, sender operation replay stays neutral',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);const op=uuid();await submit(d,p,'post',op);await admin(d);await d.query('insert into blocks(blocker_id,blocked_id)values($1,$2)',[ids.a,ids.b]);await asUser(d,ids.a);assert.equal((await inbox(d)).items.length,0);await asUser(d,ids.b);assert.deepEqual(await submit(d,p,'post',op),neutral);assert.equal((await setting(d)).remaining,5);
 await asUser(d,ids.c);await submit(d,p);await asUser(d,ids.a);await call(d,'revoke_dating_consent($1)',[uuid()]);assert.equal((await inbox(d)).items.length,0);assert.equal((await profile(d,ids.c)).length,0);
});
test('ROMANTIC direct bypass, own/system/expired content, pending private state and cached client permissions fail closed',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await assert.rejects(submit(d,p),/CONTENT/);await asUser(d,ids.b);await assert.rejects(submit(d,uuid()),/CONTENT/);await assert.rejects(call(d,'spotted_romantic_submit($1,$2,$3,$4)',[p,'post',uuid(),ids.a]),/does not exist/);await assert.rejects(d.query('select spot_private.romantic_expire()'),/permission denied/);
 await admin(d);await d.query("update spot_private.board_posts set post_kind='system'where id=$1",[p]);await asUser(d,ids.b);await assert.rejects(submit(d,p),/CONTENT/);await admin(d);await d.exec('update spot_private.soma_v2_control set requests_enabled=false');await asUser(d,ids.b);await assert.rejects(submit(d,p),/ACCESS/);assert.equal((await setting(d)).enabled,false);
});
test('ROMANTIC queued concurrent same pair/accept/quota settle once (PGlite single-session, not multi-session proof)',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);const op=uuid();await Promise.all(Array.from({length:8},()=>submit(d,p,'post',op)));assert.equal((await setting(d)).remaining,5);await Promise.all(Array.from({length:10},()=>submit(d,p)));assert.equal((await setting(d)).remaining,0);assert.equal(await count(d,'spot_private.board_romantic_requests'),1);await asUser(d,ids.a);const r=(await inbox(d)).items[0];const values=await Promise.all(Array.from({length:8},()=>decide(d,r.id,true)));assert.equal(new Set(values.map(r=>r.match_id)).size,1);assert.equal(await count(d,'public.matches'),1);
});
test('ROMANTIC quota is global across Tribes and has server Rome calendar date; expired guard permits a genuinely new attempt',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.a);await d.query('select join_tribe($1)',[ids.w]);const q=await post(d,'Other Tribe',ids.w);await asUser(d,ids.b);await d.query('select join_tribe($1)',[ids.w]);for(let i=0;i<3;i++){await submit(d,p);await submit(d,q);}assert.equal((await setting(d)).remaining,0);await admin(d);assert.equal((await d.query("select count(*)n,bool_and(day=(clock_timestamp()at time zone 'Europe/Rome')::date)correct_day from spot_private.board_request_quota where user_id=$1",[ids.b])).rows[0].correct_day,true);
 await asUser(d,ids.a);const r=(await inbox(d)).items[0];await decide(d,r.id,false);await admin(d);await d.exec("update spot_private.board_request_pair_guards set retry_not_before=clock_timestamp()-interval '1 second';delete from spot_private.board_request_quota");await asUser(d,ids.b);await submit(d,p);await asUser(d,ids.a);assert.equal((await inbox(d)).items.length,1);
});
test('ROMANTIC pending accept reuses existing cross-surface Match without creating a second conversation',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);await submit(d,p);await asUser(d,ids.a);const r=(await inbox(d)).items[0];await admin(d);const m=(await d.query('insert into matches(user_a,user_b,venue_id)values($1,$2,$3)returning id',[ids.a,ids.b,ids.v])).rows[0].id;await asUser(d,ids.a);assert.equal((await decide(d,r.id,true)).match_id,m);assert.equal(await count(d,'public.matches'),1);
});
test('ROMANTIC normal user report/block uses existing moderation and revokes directional view; suspension is silent',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);await submit(d,p);await asUser(d,ids.a);assert.ok(await call(d,"report_profile($1,'other','Synthetic request',true)",[ids.b]));assert.equal((await inbox(d)).items.length,0);assert.equal((await profile(d,ids.b)).length,0);await asUser(d,ids.c);const op=uuid();await submit(d,p,'post',op);await admin(d);await d.query("insert into spot_private.suspensions(user_id,reason)values($1,'SYNTHETIC')",[ids.c]);await asUser(d,ids.a);assert.equal((await inbox(d)).items.length,0);await asUser(d,ids.c);await assert.rejects(submit(d,p,'post',op),/ACCESS/);
});
test('ROMANTIC public CTA marker independent of hidden delivery conditions; sender controls only public content/own quota',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);const before=await call(d,'spotted_feed($1)',[ids.v]);assert.equal(before.items[0].romantic_content,true);await asUser(d,ids.a);await opt(d,false);await asUser(d,ids.b);assert.deepEqual(await call(d,'spotted_feed($1)',[ids.v]),before);await admin(d);await d.query('insert into matches(user_a,user_b,venue_id)values($1,$2,$3)',[ids.a,ids.b,ids.v]);await asUser(d,ids.b);assert.deepEqual(await call(d,'spotted_feed($1)',[ids.v]),before);
});
test('ROMANTIC expiry guard is anchored even when first sweep happens after the full guard has elapsed',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);await submit(d,p);await admin(d);await d.exec("update spot_private.board_romantic_requests set created_at=created_at-interval '40 days',expires_at=expires_at-interval '40 days'");await asUser(d,ids.b);await submit(d,p);await asUser(d,ids.a);assert.equal((await inbox(d)).items.length,1);await admin(d);const statuses=(await d.query('select status from spot_private.board_romantic_requests order by created_at')).rows;assert.deepEqual(statuses.map(r=>r.status),['expired','pending']);
});
test('ROMANTIC delete account cascades request/quota/guards/preferences/attempts and does not touch another account',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);await submit(d,p);await asUser(d,ids.a);await opt(d,false);await admin(d);await call(d,'prepare_account_deletion($1)',[ids.b]);await d.query('delete from auth.users where id=$1',[ids.b]);for(const table of ['board_romantic_requests','board_request_attempts','board_request_quota','board_request_pair_guards'])assert.equal(await count(d,'spot_private.'+table),0);assert.equal((await d.query('select count(*)n from profiles where id=$1',[ids.a])).rows[0].n,1);
});
test('ROMANTIC refuses stale fixed-snapshot writes and opaque profile IDs never grant sender photo access',async t=>{
 const d=await romanticDatabase(t),p=await post(d);await asUser(d,ids.b);await d.exec('begin isolation level repeatable read');await assert.rejects(submit(d,p),/ISOLATION/);await d.exec('rollback');await submit(d,p);assert.equal((await profile(d,ids.a)).length,0);await assert.rejects(d.query('select spot_private.profile_request_authorized($1,$2)',[ids.b,ids.a]),/permission denied/);await asUser(d,ids.a);assert.ok((await profile(d,ids.b))[0].photo_path.startsWith('profile:'));
});
