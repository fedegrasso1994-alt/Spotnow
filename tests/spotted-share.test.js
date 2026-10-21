import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{qodDatabase,publish,answer,nonce,ids,users,asUser,admin,editorial,call,uuid}from'./helpers/qod-database.js';
import{post}from'./helpers/romantic-database.js';
async function database(t){const d=await qodDatabase(t);await editorial(d);await d.exec(await readFile('supabase/migrations/048_spotted_share.sql','utf8'));await asUser(d,ids.a);return d;}
const share=(d,id,kind='post')=>call(d,'spotted_share($1,$2)',[id,kind]);
const resolve=(d,token)=>call(d,'spotted_resolve_share($1)',[token]);
test('Share member post/comment references are opaque, stable across members and resolve anonymous parent context',async t=>{
 const d=await database(t),p=await post(d,'Private text'),c=await call(d,'spotted_create_comment($1,$2,$3)',[p,'Private comment',await nonce(d)]),s=await share(d,p),cs=await share(d,c,'comment');
 assert.match(s,/^[a-f0-9]{64}$/);assert.notEqual(s,cs);for(const id of [p,c,ids.a,ids.v])assert.ok(!s.includes(id.replaceAll('-','')));
 await asUser(d,ids.b);assert.equal(await share(d,p),s);assert.equal(await share(d,c,'comment'),cs);const result=await resolve(d,cs);assert.equal(result.available,true);assert.equal(result.place,ids.v);assert.equal(result.post.id,p);assert.equal(result.comment.id,c);assert.equal(result.comment.text,'Private comment');
 for(const key of['author_id','user_id','created_at','expires_at','revision'])assert.ok(!JSON.stringify(result).includes(key));assert.ok(!JSON.stringify(result).includes(ids.a));assert.deepEqual(Object.keys(result).sort(),['available','comment','place','post']);
});
test('Share nonmember, zero Tribe, malformed, guessed and nearby references have identical unavailable payload',async t=>{
 const d=await database(t),p=await post(d),s=await share(d,p);await asUser(d,users[8]);
 for(const token of[s,'a'.repeat(64),'0'.repeat(64),s.slice(0,-1)+(s.endsWith('f')?'e':'f'),'short','',null])assert.deepEqual(await resolve(d,token),{available:false});
 await assert.rejects(share(d,p),/BOARD_ACCESS/);await d.query('select join_tribe($1)',[ids.w]);assert.deepEqual(await resolve(d,s),{available:false});
});
test('Share denies anon RPC/table access and authenticated raw mapping inspection',async t=>{
 const d=await database(t);await assert.rejects(d.query('select *from spot_private.spotted_share_refs'),/permission denied/);await admin(d);await d.exec('set role anon');await assert.rejects(resolve(d,'a'.repeat(64)),/permission denied/);await assert.rejects(share(d,uuid()),/permission denied/);
});
test('Share remains membership-only even with Match; leaving revokes existing token without auto-join',async t=>{
 const d=await database(t),p=await post(d),s=await share(d,p);await admin(d);await d.query('insert into matches(user_a,user_b,venue_id)values($1,$2,$3)',[ids.a,ids.b,ids.v]);await asUser(d,ids.b);assert.equal((await resolve(d,s)).available,true);await d.query('select leave_tribe($1)',[ids.v]);assert.deepEqual(await resolve(d,s),{available:false});await admin(d);assert.equal((await d.query('select count(*)::int n from matches')).rows[0].n,1);assert.equal((await d.query('select count(*)::int n from spot_private.tribe_memberships where user_id=$1',[ids.b])).rows[0].n,0);
});
test('Share removed comment does not resolve through its still-visible parent, hidden/expired/deleted post is neutral',async t=>{
 const d=await database(t),p=await post(d),c=await call(d,'spotted_create_comment($1,$2,$3)',[p,'Comment',await nonce(d)]),ps=await share(d,p),cs=await share(d,c,'comment');
 await call(d,'spotted_delete_comment($1,$2)',[c,uuid()]);assert.deepEqual(await resolve(d,cs),{available:false});assert.equal((await resolve(d,ps)).available,true);
 await admin(d);await d.query('update spot_private.board_posts set hidden=true where id=$1',[p]);await asUser(d,ids.b);assert.deepEqual(await resolve(d,ps),{available:false});await assert.rejects(share(d,p),/BOARD_ACCESS/);
 const p2=await post(d),s2=await share(d,p2);await admin(d);await d.query("update spot_private.board_posts set expires_at=clock_timestamp()-interval '1 second'where id=$1",[p2]);await asUser(d,ids.a);assert.deepEqual(await resolve(d,s2),{available:false});
 await call(d,'board_delete($1,$2)',[p,uuid()]);assert.deepEqual(await resolve(d,ps),{available:false});
});
test('Share QoD user answer/comment reuse links, official question is never shareable and close revokes links',async t=>{
 const d=await database(t),q=await publish(d),a=await answer(d,q),s=await share(d,a);await assert.rejects(share(d,q),/BOARD_ACCESS/);await assert.rejects(share(d,a,'system'),/BOARD_ACCESS/);assert.equal((await resolve(d,s)).post.qod_answer,true);await editorial(d);await call(d,'spot_private.qod_close($1)',[q]);await asUser(d,ids.a);assert.deepEqual(await resolve(d,s),{available:false});
});
test('Share concurrency creates one content reference and no social/quota/receipt side effects',async t=>{
 const d=await database(t),p=await post(d);await admin(d);const counts=async()=>Promise.all(['matches','spot_private.spot_v2_intents','spot_private.board_romantic_requests','spot_private.board_likes','spot_private.board_receipts','spot_private.board_quota'].map(async table=>(await d.query('select count(*)::int n from '+table)).rows[0].n));const before=await counts();await asUser(d,ids.a);const refs=await Promise.all(Array.from({length:6},()=>share(d,p)));assert.equal(new Set(refs).size,1);for(let i=0;i<3;i++)assert.equal((await resolve(d,refs[0])).available,true);await admin(d);assert.deepEqual(await counts(),before);assert.equal((await d.query('select count(*)::int n from spot_private.spotted_share_refs')).rows[0].n,1);
});
test('Share cascade removes reference when its product content is physically purged',async t=>{
 const d=await database(t),p=await post(d);await share(d,p);await admin(d);await d.query('delete from spot_private.board_posts where id=$1',[p]);assert.equal((await d.query('select count(*)::int n from spot_private.spotted_share_refs')).rows[0].n,0);
});
test('Share normal account-deletion preparation and Auth cascade leave no routing reference for deleted user content',async t=>{
 const d=await database(t),p=await post(d),s=await share(d,p);await asUser(d,ids.b);assert.equal((await resolve(d,s)).available,true);await editorial(d);await call(d,'prepare_account_deletion($1)',[ids.a]);await d.query('delete from auth.users where id=$1',[ids.a]);assert.equal((await d.query('select count(*)::int n from spot_private.spotted_share_refs')).rows[0].n,0);await asUser(d,ids.b);assert.deepEqual(await resolve(d,s),{available:false});
});
