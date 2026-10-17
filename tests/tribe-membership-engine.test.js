import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {database,seed,ids,asUser,admin} from './helpers/database.js';
const migration=await readFile('supabase/migrations/030_tribe_membership_engine.sql','utf8');
const third='ee300000-0000-4000-8000-000000000003',fourth='ee300000-0000-4000-8000-000000000004';
const result=r=>r.rows[0].value;
const join=(d,v=ids.v)=>d.query('select public.join_tribe($1)value',[v]).then(result);
const leave=(d,v=ids.v)=>d.query('select public.leave_tribe($1)value',[v]).then(result);
async function setup(t){
 const d=await database();t.after(()=>d.close());await seed(d);
 await d.exec('alter table auth.users add column email text,add column raw_user_meta_data jsonb,add column banned_until timestamptz');
 for(const f of ['020_age_eligibility.sql','021_dating_consent.sql','022_location_minimization.sql','023_privacy_retention.sql','024_user_rights.sql','025_moderation.sql','026_tribe_board.sql','027_soma_v2_schema_off.sql','028_ora_spot_quota_schema_off.sql']){
  if(f.startsWith('025'))await d.exec("update spot_private.privacy_environment set environment='staging'");
  await d.exec(await readFile('supabase/migrations/'+f,'utf8'));
 }
 await d.exec(`update spot_private.account_eligibility a set status='eligible',declared_age=p.age from public.profiles p where p.id=a.user_id;
 insert into public.venues(id,name,address)values('${third}','Synthetic third','Test'),('${fourth}','Synthetic fourth','Test');
 insert into spot_private.tribe_catalog(id,active,joinable)select id,true,true from public.venues;`);
 await d.exec("set soma.photo_protocol='PHOTO02'");
 const existing=async()=> (await d.query(`select jsonb_object_agg(p.oid::text,pg_get_functiondef(p.oid))v from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','spot_private')and p.prokind='f'and p.proname not in('join_tribe','leave_tribe','tribe_membership_lock','tribe_configuration_immutable')`)).rows[0].v;
 const before=await existing();await d.exec(migration);assert.deepEqual(await existing(),before);return d;
}
async function state(d){await admin(d);return(await d.query('select * from spot_private.tribe_account_state where user_id=$1',[ids.a])).rows[0];}
async function oldState(d,legacy=false){await admin(d);await d.query("insert into spot_private.tribe_account_state(user_id,configuration_state,configuration_started_at)values($1,$2,$3)",[ids.a,legacy?'legacy_closed':'started',legacy?null:new Date(Date.now()-25*3600000).toISOString()]);await asUser(d,ids.a);}

test('MEMBERSHIP first/second/third/fourth, duplicate and immutable global start',async t=>{
 const d=await setup(t);await d.query("insert into spot_private.tribe_account_state(user_id,configuration_state)values($1,'unstarted')",[ids.a]);await asUser(d,ids.a);const first=await join(d);assert.equal(first.membership_source,'manual');assert.equal(first.initial_grace_active,true);assert.equal(first.slots_used,1);
 const anchor=(await state(d)).configuration_started_at;await asUser(d,ids.a);
 assert.deepEqual(await join(d),first);assert.equal((await join(d,ids.w)).slots_used,2);assert.equal((await join(d,third)).slots_used,3);
 await assert.rejects(join(d,fourth),/TRIBE_LIMIT/);assert.deepEqual((await state(d)).configuration_started_at,anchor);
 await assert.rejects(d.query("update spot_private.tribe_account_state set configuration_started_at=clock_timestamp()where user_id=$1",[ids.a]),/TRIBE_CONFIGURATION_IMMUTABLE/);
});
test('MEMBERSHIP grace leave/rejoin/all-empty does not reset first anchor or create guard',async t=>{
 const d=await setup(t);await asUser(d,ids.a);const first=await join(d),anchor=(await state(d)).configuration_started_at;await asUser(d,ids.a);
 assert.equal((await leave(d)).slots_used,0);assert.equal((await leave(d)).left,false);
 const second=await join(d);assert.notEqual(first.membership_id,second.membership_id);assert.equal(second.initial_grace_active,true);
 assert.deepEqual((await state(d)).configuration_started_at,anchor);assert.equal((await d.query('select count(*)n from spot_private.tribe_rejoin_guards')).rows[0].n,0);
});
test('MEMBERSHIP post-grace cooldown, retry does not extend, other Tribe allowed and expiry boundary admits',async t=>{
 const d=await setup(t);await oldState(d);await join(d);const a=await state(d);await asUser(d,ids.a);assert.equal((await leave(d)).left,true);
 await admin(d);const guard=(await d.query('select * from spot_private.tribe_rejoin_guards')).rows[0];assert.ok(Math.abs(Date.parse(guard.rejoin_not_before)-Date.now()-30*86400000)<3000);
 await asUser(d,ids.a);assert.equal((await leave(d)).left,false);await assert.rejects(join(d),/TRIBE_COOLDOWN/);assert.equal((await join(d,ids.w)).slots_used,1);
 await admin(d);assert.deepEqual((await d.query('select rejoin_not_before from spot_private.tribe_rejoin_guards')).rows[0].rejoin_not_before,guard.rejoin_not_before);
 await d.exec("update spot_private.tribe_rejoin_guards set rejoin_not_before=clock_timestamp()-interval '1 millisecond'");await asUser(d,ids.a);assert.equal((await join(d)).slots_used,2);
 assert.deepEqual((await state(d)).configuration_started_at,a.configuration_started_at);assert.equal((await d.query('select count(*)n from spot_private.tribe_rejoin_guards')).rows[0].n,0);
});
test('MEMBERSHIP exact 24h boundary is outside grace, legacy_closed remains NULL and never gains grace',async t=>{
 const d=await setup(t);await oldState(d,true);const j=await join(d);assert.equal(j.initial_grace_active,false);await leave(d);const s=await state(d);assert.equal(s.configuration_state,'legacy_closed');assert.equal(s.configuration_started_at,null);
 await d.query("delete from spot_private.tribe_account_state where user_id=$1",[ids.a]);await d.query("insert into spot_private.tribe_account_state(user_id,configuration_state,configuration_started_at)values($1,'started',clock_timestamp()-interval '24 hours')",[ids.a]);
 await asUser(d,ids.a);assert.equal((await join(d,ids.w)).initial_grace_active,false);await leave(d,ids.w);await admin(d);assert.equal((await d.query('select count(*)n from spot_private.tribe_rejoin_guards')).rows[0].n,2);
});
test('MEMBERSHIP inactive/nonjoinable/null denied, failure cannot start grace; absent leave creates no state',async t=>{
 const d=await setup(t);await d.query('update spot_private.tribe_catalog set joinable=false where id=$1',[ids.v]);await d.query('update public.venues set active=false where id=$1',[ids.w]);await d.query('update spot_private.tribe_catalog set active=false where id=$1',[third]);await asUser(d,ids.a);
 for(const v of [ids.v,ids.w,third,randomUUID()])await assert.rejects(join(d,v),/TRIBE_UNAVAILABLE/);
 await assert.rejects(join(d,null),/TRIBE_INPUT/);assert.equal((await leave(d,randomUUID())).left,false);assert.equal(await state(d),undefined);
});
test('MEMBERSHIP authenticated owner-only, denied arbitrary user/source/clock and no direct table access',async t=>{
 const d=await setup(t);await asUser(d,ids.b);const b=await join(d);await asUser(d,ids.a);await join(d);
 for(const table of ['tribe_memberships','tribe_account_state','tribe_rejoin_guards']){
  await assert.rejects(d.query('select * from spot_private.'+table),/permission denied/);
  await assert.rejects(d.query('delete from spot_private.'+table),/permission denied/);
 }
 await assert.rejects(d.query('select join_tribe($1,$2)',[ids.v,ids.b]),/does not exist/);
 await assert.rejects(d.query('select spot_private.tribe_membership_lock()'),/permission denied/);
 await leave(d);await asUser(d,ids.b);assert.deepEqual(await join(d),b);
 await d.exec('reset role;set role anon');await assert.rejects(join(d),/permission denied/);
 await d.exec('reset role;set role service_role');await assert.rejects(join(d),/permission denied/);
 await d.exec("reset role;set role authenticated;select set_config('request.jwt.claim.sub','',false)");await assert.rejects(join(d),/TRIBE_AUTH/);
});
test('MEMBERSHIP AGE/suspension/ban/deleting/staff denied, revoked/absent dating consent allowed',async t=>{
 const d=await setup(t);await d.query("update spot_private.account_eligibility set status='confirmation_required'where user_id=$1",[ids.a]);await asUser(d,ids.a);await assert.rejects(join(d),/TRIBE_ACCOUNT/);
 await admin(d);await d.query("update spot_private.account_eligibility set status='eligible'where user_id=$1",[ids.a]);await d.query("update auth.users set banned_until=clock_timestamp()+interval '1 day'where id=$1",[ids.a]);await asUser(d,ids.a);await assert.rejects(join(d),/TRIBE_ACCOUNT/);
 await admin(d);await d.query('update auth.users set banned_until=null where id=$1',[ids.a]);
 await d.query("insert into spot_private.suspensions(user_id,reason)values($1,'Synthetic suspension')",[ids.a]);await asUser(d,ids.a);await assert.rejects(join(d),/TRIBE_ACCOUNT/);await assert.rejects(leave(d),/TRIBE_ACCOUNT/);
 await admin(d);await d.query('delete from spot_private.suspensions where user_id=$1',[ids.a]);
 await d.query("insert into spot_private.moderation_roles(user_id,role)values($1,'MODERATOR')",[ids.a]);await asUser(d,ids.a);await assert.rejects(join(d),/TRIBE_ACCOUNT/);
 await admin(d);await d.query('delete from spot_private.moderation_roles where user_id=$1',[ids.a]);await d.query('insert into spot_private.account_deletions(user_id)values($1)',[ids.a]);await asUser(d,ids.a);await assert.rejects(join(d),/TRIBE_ACCOUNT/);
 await admin(d);await d.query('delete from spot_private.account_deletions where user_id=$1',[ids.a]);await asUser(d,ids.a);assert.equal((await join(d)).slots_used,1);
 await d.query('select revoke_dating_consent($1)',[randomUUID()]);assert.equal((await join(d,ids.w)).slots_used,2);
});
test('MEMBERSHIP queued competing joins/duplicate/leave serialize, cooldown cannot be raced',async t=>{
 const d=await setup(t);await oldState(d);await join(d);await join(d,ids.w);
 const competing=await Promise.allSettled([join(d,third),join(d,fourth)]);assert.equal(competing.filter(r=>r.status==='fulfilled').length,1);assert.match(competing.find(r=>r.status==='rejected').reason.message,/TRIBE_LIMIT/);
 const duplicate=await Promise.all([join(d),join(d)]);assert.deepEqual(duplicate[0],duplicate[1]);
 const leaves=await Promise.all([leave(d),leave(d)]);assert.equal(leaves.filter(x=>x.left).length,1);
 const denied=await Promise.allSettled([join(d),join(d)]);assert.ok(denied.every(x=>x.status==='rejected'&&/TRIBE_COOLDOWN/.test(x.reason.message)));
 // PGlite queues one connection. Real multi-session locking is a separate hosted staging gate.
});
test('MEMBERSHIP leave revokes Board access/actions, preserves matches/chat and own Rights; delete cascades new private state',async t=>{
 const d=await setup(t);await asUser(d,ids.a);await join(d);const op=(await d.query('select board_operation($1)op',[ids.v])).rows[0].op;
 const p=(await d.query('select board_create($1,$2,$3)p',[ids.v,'Synthetic membership test',op])).rows[0].p;
 await asUser(d,ids.b);await join(d);await admin(d);await d.query('insert into public.matches(id,user_a,user_b,venue_id)values($1,$2,$3,$4)',[randomUUID(),ids.a,ids.b,ids.v]);
 const match=(await d.query('select id from public.matches')).rows[0].id;await d.query('insert into public.messages(match_id,sender_id,body)values($1,$2,$3)',[match,ids.a,'Synthetic preserved']);
 await asUser(d,ids.a);assert.equal((await d.query('select * from my_tribes()')).rows.length,1);assert.equal((await d.query("select my_rights_page('tribes')v")).rows[0].v.items.length,1);
 await leave(d);await assert.rejects(d.query('select board_feed($1)',[ids.v]),/BOARD_ACCESS/);await assert.rejects(d.query('select board_react($1,$2,$3)',[p,'❤️',randomUUID()]),/BOARD_ACCESS/);
 assert.equal((await d.query('select * from my_tribes()')).rows.length,0);assert.equal((await d.query('select * from public.messages')).rows.length,1);
 await admin(d);await d.query('delete from auth.users where id=$1',[ids.a]);
 for(const table of ['tribe_memberships','tribe_account_state','tribe_rejoin_guards'])assert.equal((await d.query('select count(*)n from spot_private.'+table+' where user_id=$1',[ids.a])).rows[0].n,0);
});
test('MEMBERSHIP legacy QR remains unchanged, null legacy identity requires reconciliation; existing functions byte-identical',async t=>{
 const d=await setup(t);await admin(d);await d.query("insert into spot_private.consent_state(user_id,status,version)values($1,'active','dating-staging-v1')",[ids.a]);await d.query("update public.profiles set preference='ALL'where id=$1",[ids.a]);
 await asUser(d,ids.a);await d.query('select check_in($1)',[ids.q]);await assert.rejects(join(d),/TRIBE_LEGACY_RECONCILIATION_REQUIRED/);
 await leave(d);await admin(d);assert.equal((await d.query('select configuration_state from spot_private.tribe_account_state')).rows[0].configuration_state,'legacy_closed');
 // The unchanged legacy QR writer can reinsert despite a v2 cooldown. Explicit cutover blocker, not silently fixed here.
 await asUser(d,ids.a);await d.query('select check_in($1)',[ids.q]);assert.equal((await d.query('select * from my_tribes()')).rows.length,1);
});

test('MEMBERSHIP real legacy identity/source preserved on retry, leave creates only current cooldown',async t=>{
 const d=await setup(t);const member=randomUUID();await d.query("insert into spot_private.tribe_memberships(user_id,venue_id,membership_id,membership_source)values($1,$2,$3,'legacy')",[ids.a,ids.v,member]);
 await oldState(d,true);const j=await join(d);assert.equal(j.membership_id,member);assert.equal(j.membership_source,'legacy');assert.equal(j.initial_grace_active,false);
 await leave(d);await asUser(d,ids.a);await assert.rejects(join(d),/TRIBE_COOLDOWN/);assert.equal((await join(d,ids.w)).initial_grace_active,false);
 assert.equal((await state(d)).configuration_started_at,null);
 // Delete through the established preparation path with an actual live guard,
 // not an empty-table cascade assertion.
 assert.equal((await d.query('select count(*)n from spot_private.tribe_rejoin_guards where user_id=$1',[ids.a])).rows[0].n,1);
 await d.query('select prepare_account_deletion($1)',[ids.a]);await d.query('delete from auth.users where id=$1',[ids.a]);
 for(const table of ['tribe_memberships','tribe_account_state','tribe_rejoin_guards'])assert.equal((await d.query('select count(*)n from spot_private.'+table+' where user_id=$1',[ids.a])).rows[0].n,0);
});
test('MEMBERSHIP failed transaction rolls back first anchor and membership, no ghost grace',async t=>{
 const d=await setup(t);await asUser(d,ids.a);await d.exec('begin');await join(d);await d.exec('rollback');assert.equal(await state(d),undefined);
 await asUser(d,ids.a);assert.equal((await d.query('select * from my_tribes()')).rows.length,0);assert.equal((await join(d)).initial_grace_active,true);
});
test('MEMBERSHIP mutation revision fences stricter-isolation writers; duplicate requests remain no-op',async t=>{
 const d=await setup(t);await asUser(d,ids.a);await join(d);const a=await state(d);await asUser(d,ids.a);await join(d);assert.equal((await state(d)).revision,a.revision);
 await asUser(d,ids.a);await join(d,ids.w);const b=await state(d);assert.equal(b.revision,a.revision+1);await asUser(d,ids.a);await leave(d);assert.equal((await state(d)).revision,b.revision+1);
});
test('MEMBERSHIP hosted SQL smoke rehearsal validates real script and rolls back synthetic fixtures',async t=>{
 const d=await setup(t);await d.exec("update spot_private.photo_cutover_control set phase='PAUSED'");
 const r=await d.exec(await readFile('tests/staging/tribe-membership-smoke.sql','utf8'));
 const row=r.flatMap(x=>x.rows??[]).find(x=>x.evidence);assert.match(row.evidence,/PASS/);assert.equal(row.residual_auth,0);assert.equal(row.residual_venues,0);
});
test('MEMBERSHIP deployment schema gate, explicit state/guard/source writes denied, missing age denied',async t=>{
 const d=await setup(t);await d.exec(await readFile('tests/staging/tribe-membership-check.sql','utf8'));await asUser(d,ids.a);
 await assert.rejects(d.query("update spot_private.tribe_account_state set configuration_started_at=clock_timestamp(),configuration_state='started'"),/permission denied/);
 await assert.rejects(d.query("update spot_private.tribe_memberships set membership_source='qr'"),/permission denied/);
 await assert.rejects(d.query("insert into spot_private.tribe_rejoin_guards values($1,$2,clock_timestamp())",[ids.b,ids.v]),/permission denied/);
 await admin(d);await d.query('delete from spot_private.account_eligibility where user_id=$1',[ids.a]);await asUser(d,ids.a);await assert.rejects(join(d),/TRIBE_ACCOUNT/);
});
test('MEMBERSHIP committed multi-session fixture setup/teardown is scoped, repeatable and leaves no synthetic state',async t=>{
 const d=await setup(t);await d.exec("update spot_private.photo_cutover_control set phase='PAUSED',canary_users='{}',cleanup_all=false,execute_enabled=false,scheduler_enabled=false");
 const tables=['auth.users','public.profiles','public.venues','spot_private.tribe_catalog','spot_private.tribe_account_state','spot_private.photo_lifecycle_sets','spot_private.photo_cutover_audit','spot_private.validated_photos'];
 const counts=async()=>Promise.all(tables.map(t=>d.query('select count(*)n from '+t).then(r=>r.rows[0].n)));
 const before=await counts();await d.exec(await readFile('tests/staging/tribe-membership-concurrency-fixture.sql','utf8'));
 await d.exec(await readFile('tests/staging/tribe-membership-concurrency-teardown.sql','utf8'));assert.deepEqual(await counts(),before);
 await d.exec(await readFile('tests/staging/tribe-membership-concurrency-teardown.sql','utf8'));assert.deepEqual(await counts(),before);
});
