import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {romanticSurfacesDatabase,admin,asUser,ids,quotaSnapshot} from './helpers/romantic-surfaces-database.js';
import {LEGAL_DOCUMENTS} from '../src/legal-document-data.js';
const uuid=()=>crypto.randomUUID(),T=LEGAL_DOCUMENTS.terms;
const rpc=async(d,sql,args=[])=>(await d.query('select ('+(/\bfrom\b/i.test(sql)?'select ':'')+sql+') v',args)).rows[0].v;
const state=d=>rpc(d,'my_privacy_state()');
const terms=(d,op=uuid(),version=T.version,hash=T.sha256)=>rpc(d,'accept_legal_terms($1,$2,true,$3)',[version,hash,op]);
async function setup(t){const d=await romanticSurfacesDatabase(t);await admin(d);await d.exec(await readFile('supabase/migrations/063_legal_onboarding_m1.sql','utf8'));await asUser(d,ids.a);return d;}
async function ready(d,user){await asUser(d,user);await terms(d);const c=await rpc(d,'dating_consent_challenge()');await rpc(d,'accept_dating_consent($1,$2)',[c.token,uuid()]);}
test('M1 server rejects missing/false/stale Terms, private writes and direct product bypass, with no legacy acceptance backfill',async t=>{
 const d=await setup(t);const s=await state(d);assert.equal(s.terms_status,'required');assert.equal(s.required_terms_hash,T.sha256);assert.equal(s.consent_status,'renewal_required');
 await assert.rejects(d.query('select accept_legal_terms($1,$2,false,$3)',[T.version,T.sha256,uuid()]),/LEGAL_EXPLICIT_REQUIRED/);
 await assert.rejects(terms(d,uuid(),'old'),/LEGAL_VERSION_CHANGED/);await assert.rejects(terms(d,uuid(),T.version,'bad'),/LEGAL_VERSION_CHANGED/);
 for(const q of ['select *from spot_private.terms_acceptances','select *from spot_private.terms_versions','select spot_private.m1_account_before_terms()','select spot_private.m1_privacy_before_terms()','select spot_private.m1_board_before_terms($1)','select spot_private.m1_discovery_before_terms($1)'])await assert.rejects(d.query(q,q.includes('$1')?[ids.a]:[]),/permission denied/);
 await assert.rejects(d.query('select start_ora_manual($1)',[ids.v]));await assert.rejects(d.query('select spotted_feed($1)',[ids.v]));await assert.rejects(d.query('select dating_consent_challenge()'));
 assert.equal((await d.query('update profiles set name=\'bypass\'where id=$1 returning id',[ids.a])).rows.length,0);
 await rpc(d,'revoke_dating_consent($1)',[uuid()]);assert.equal((await state(d)).consent_status,'revoked');assert.ok((await rpc(d,"my_rights_page('account')")).items.length);
 await admin(d);assert.equal(await rpc(d,'count(*)::int from spot_private.terms_acceptances'),0);
 await d.exec('set role anon');await assert.rejects(terms(d));await admin(d);await d.exec('set role service_role');await assert.rejects(terms(d));
});
test('M1 separate age/Terms/consent proof, independent idempotency and owner-scoped server timestamps',async t=>{
 const d=await setup(t);await admin(d);await d.query('delete from spot_private.account_eligibility where user_id=$1',[ids.a]);await d.query('delete from spot_private.consent_state where user_id=$1',[ids.a]);await asUser(d,ids.a);
 await assert.rejects(terms(d),/AGE_REQUIRED/);const age=uuid(),op=uuid();await rpc(d,'attest_adult_checkbox(true,$1)',[age]);
 let s=await terms(d,op);assert.equal(s.age_status,'eligible');assert.equal(s.declared_age,null);assert.equal(s.terms_status,'accepted');assert.equal(s.consent_status,'missing');assert.ok(s.terms_accepted_at);
 assert.deepEqual(await terms(d,op),s);assert.deepEqual(await terms(d),s);
 const c=await rpc(d,'dating_consent_challenge()');assert.match(c.text,/orientamento sessuale/);const cop=uuid();await rpc(d,'accept_dating_consent($1,$2)',[c.token,cop]);await rpc(d,'accept_dating_consent($1,$2)',[c.token,cop]);
 await admin(d);assert.equal(await rpc(d,'count(*)::int from spot_private.terms_acceptances where user_id=$1',[ids.a]),1);assert.equal(await rpc(d,'count(*)::int from spot_private.age_events where operation_id=$1',[age]),1);assert.equal(await rpc(d,'count(*)::int from spot_private.consent_events where operation_id=$1',[cop]),1);
 await asUser(d,ids.b);assert.equal((await state(d)).terms_status,'required');assert.equal((await state(d)).terms_accepted_at,null);
 await admin(d);await assert.rejects(d.query("update spot_private.terms_versions set document_hash=repeat('a',64)"),/IMMUTABLE/);
});
test('M1 version race denies old proof even on retry; restricted age and deleted owners do not bypass',async t=>{
 const d=await setup(t),op=uuid();await terms(d,op);await admin(d);
 await d.exec("update spot_private.terms_versions set required=false;insert into spot_private.terms_versions values('next',repeat('b',64),'/legal/next.html',true)");await asUser(d,ids.a);
 assert.equal((await state(d)).terms_status,'required');await assert.rejects(terms(d,op),/VERSION_CHANGED/);await assert.rejects(terms(d,op,'next','b'.repeat(64)),/OPERATION_CONFLICT/);
 await admin(d);await d.query("update spot_private.account_eligibility set status='restricted'where user_id=$1",[ids.a]);await asUser(d,ids.a);await assert.rejects(rpc(d,'attest_adult_checkbox(true,$1)',[uuid()]),/AGE_RESTRICTED/);await assert.rejects(terms(d,uuid(),'next','b'.repeat(64)),/AGE_REQUIRED/);
 await admin(d);await d.query('delete from auth.users where id=$1',[ids.a]);await asUser(d,ids.a);await assert.rejects(terms(d,uuid(),'next','b'.repeat(64)),/LEGAL_AUTH/);
});
test('M1 preserves product function bodies/flags/quotas and normal Match/chat after valid proofs; revocation erases preference without fabricating assent',async t=>{
 const d=await romanticSurfacesDatabase(t);await admin(d);
 const functions=()=>rpc(d,"md5(string_agg(pg_get_functiondef(p.oid),''order by p.oid))from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname in('start_ora_manual','start_ora_qr','send_spot_v2','send_chance_spot','spotted_romantic_submit','spotted_romantic_decide','send_message')");
 const before=await functions(),quota=await quotaSnapshot(d),flags=await rpc(d,'to_jsonb(c)from spot_private.soma_v2_control c');
 await d.exec(await readFile('supabase/migrations/063_legal_onboarding_m1.sql','utf8'));assert.equal(await functions(),before);assert.deepEqual(await quotaSnapshot(d),quota);assert.deepEqual(await rpc(d,'to_jsonb(c)from spot_private.soma_v2_control c'),flags);
 for(const u of[ids.a,ids.b])await ready(d,u);
 await asUser(d,ids.b);await rpc(d,'start_ora_manual($1)',[ids.v]);
 await asUser(d,ids.a);await rpc(d,'start_ora_manual($1)',[ids.v]);await rpc(d,'send_spot_v2($1,$2,$3,$4)',[ids.b,uuid(),'ora',null]);
 await asUser(d,ids.b);await rpc(d,'start_ora_manual($1)',[ids.v]);await rpc(d,'send_spot_v2($1,$2,$3,$4)',[ids.a,uuid(),'ora',null]);
 const m=(await d.query('select id from my_matches_page()')).rows[0].id;await rpc(d,'send_message($1,$2,$3)',[m,'Synthetic M1 conversation',uuid()]);
 await rpc(d,'revoke_dating_consent($1)',[uuid()]);assert.equal((await state(d)).terms_status,'accepted');assert.equal((await state(d)).consent_status,'revoked');assert.equal((await d.query('select preference from profiles where id=$1',[ids.b])).rows[0].preference,null);
 assert.equal((await d.query('select id from my_matches_page()')).rows.length,1);await rpc(d,'send_message($1,$2,$3)',[m,'Existing technical behavior, legal decision remains open',uuid()]);
 await assert.rejects(d.query('select start_ora_manual($1)',[ids.v]));assert.ok((await rpc(d,"my_rights_page('account')")).items.length);
});
