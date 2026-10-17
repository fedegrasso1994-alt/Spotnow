import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile}from 'node:fs/promises';
import {database,seed,ids,asUser,admin}from './helpers/database.js';
import {createOnboardingApi,noQrOnboardingEnabled,canConsumeQr}from '../src/onboarding.js';
import {createTribeOnboarding}from '../src/onboarding-ui.js';
import {dom,flush,deferred}from './helpers/dom.js';
const migration=await readFile('supabase/migrations/031_signup_without_qr.sql','utf8');
const third='ef310000-0000-4000-8000-000000000003',fourth='ef310000-0000-4000-8000-000000000004';
async function setup(t){const d=await database();t.after(()=>d.close());await seed(d);
 await d.exec('alter table auth.users add column email text,add column raw_user_meta_data jsonb,add column banned_until timestamptz');
 for(const f of ['020_age_eligibility.sql','021_dating_consent.sql','022_location_minimization.sql','023_privacy_retention.sql','024_user_rights.sql','025_moderation.sql','026_tribe_board.sql','027_soma_v2_schema_off.sql','028_ora_spot_quota_schema_off.sql','030_tribe_membership_engine.sql']){if(f.startsWith('025'))await d.exec("update spot_private.privacy_environment set environment='staging'");await d.exec(await readFile('supabase/migrations/'+f,'utf8'));}
 await d.exec(`set soma.photo_protocol='PHOTO02';update spot_private.account_eligibility a set status='eligible',declared_age=p.age from public.profiles p where p.id=a.user_id;
 insert into spot_private.consent_state(user_id,status,version)select id,'active','dating-staging-v1'from auth.users;
 insert into public.venues(id,name,address)values('${third}','Terza','Synthetic'),('${fourth}','Quarta','Synthetic');
 insert into spot_private.tribe_catalog(id,active,joinable)select id,true,true from public.venues;`);
 await d.exec(migration);return d;
}
async function fresh(d){await admin(d);await d.query('delete from public.profiles where id=$1',[ids.c]);await asUser(d,ids.c);
 await d.query("insert into public.profiles(id,name,age,gender,preference,photo_path)values($1,'Nuovo',25,'F','ALL',$2)",[ids.c,ids.c+'/c.png']);}
const own=d=>d.query('select my_onboarding_state()v').then(r=>r.rows[0].v);
const join=(d,id)=>d.query('select join_tribe($1)v',[id]).then(r=>r.rows[0].v);
const finish=d=>d.query('select complete_onboarding()v').then(r=>r.rows[0].v);
test('ONBOARD 031 profile creation without QR/venue enrolls, skip completes with no membership/presence/grace',async t=>{
 const d=await setup(t);await fresh(d);assert.equal((await own(d)).complete,false);const done=await finish(d);assert.equal(done.complete,true);assert.equal(done.tribes.length,0);
 await admin(d);for(const table of ['tribe_memberships','tribe_account_state','tribe_rejoin_guards'])assert.equal((await d.query('select count(*)n from spot_private.'+table+' where user_id=$1',[ids.c])).rows[0].n,0);
 assert.equal((await d.query('select count(*)n from public.checkins')).rows[0].n,0);
 const stamp=(await d.query('select completed_at from spot_private.account_onboarding where user_id=$1',[ids.c])).rows[0].completed_at;
 await asUser(d,ids.c);await finish(d);await admin(d);assert.deepEqual((await d.query('select completed_at from spot_private.account_onboarding where user_id=$1',[ids.c])).rows[0].completed_at,stamp);
});
test('ONBOARD 031 search reads minimal active/joinable catalog, no implicit join/grace, literal wildcard and input bound',async t=>{
 const d=await setup(t);await fresh(d);const rows=(await d.query("select * from search_joinable_tribes('')")).rows;assert.equal(rows.length,4);assert.deepEqual(Object.keys(rows[0]).sort(),['id','name']);assert.equal((await d.query("select * from search_joinable_tribes('%')")).rows.length,0);
 await admin(d);assert.equal((await d.query('select count(*)n from spot_private.tribe_account_state')).rows[0].n,0);await d.query('update spot_private.tribe_catalog set joinable=false where id=$1',[ids.v]);await asUser(d,ids.c);assert.equal((await d.query("select * from search_joinable_tribes('Gym')")).rows.length,0);await assert.rejects(d.query('select * from search_joinable_tribes($1)', ['x'.repeat(81)]),/ONBOARDING_INPUT/);
});
test('ONBOARD 031 one/two/three joins, fourth server denied, source manual/global grace/idempotency, resume then finish',async t=>{
 const d=await setup(t);await fresh(d);const first=await join(d,ids.v);assert.equal(first.membership_source,'manual');assert.equal(first.initial_grace_active,true);assert.equal((await join(d,ids.w)).slots_used,2);assert.equal((await join(d,third)).slots_used,3);await assert.rejects(join(d,fourth),/TRIBE_LIMIT/);assert.equal((await join(d,ids.v)).membership_id,first.membership_id);assert.equal((await own(d)).complete,false);assert.equal((await own(d)).tribes.length,3);await finish(d);assert.equal((await own(d)).complete,true);
});
test('ONBOARD 031 returning/legacy complete is not enrolled; owner isolation and delete cascade',async t=>{
 const d=await setup(t);await asUser(d,ids.a);assert.equal((await own(d)).complete,true);await fresh(d);await asUser(d,ids.a);assert.equal((await own(d)).complete,true);
 await assert.rejects(d.query('select * from spot_private.account_onboarding'),/permission denied/);await assert.rejects(d.query('select complete_onboarding($1)',[ids.c]),/does not exist/);
 await asUser(d,ids.c);await finish(d);await asUser(d,ids.a);assert.equal((await own(d)).tribes.length,0);await admin(d);await d.query('delete from auth.users where id=$1',[ids.c]);assert.equal((await d.query('select count(*)n from spot_private.account_onboarding')).rows[0].n,0);
});
test('ONBOARD 031 AGE/consent/profile/ban/suspension gates remain server-side, revoked consent allows optional Tribe',async t=>{
 const d=await setup(t);await admin(d);await d.query("update spot_private.account_eligibility set status='restricted'where user_id=$1",[ids.c]);await asUser(d,ids.c);await assert.rejects(own(d),/ONBOARDING_ACCESS/);await assert.rejects(d.query("select * from search_joinable_tribes('')"),/ONBOARDING_ACCESS/);
 await admin(d);await d.query("update spot_private.account_eligibility set status='eligible'where user_id=$1",[ids.c]);await fresh(d);
 await d.query('select revoke_dating_consent(gen_random_uuid())');assert.equal((await finish(d)).complete,true);assert.equal((await join(d,ids.v)).slots_used,1);
 await admin(d);await d.query("update auth.users set banned_until=clock_timestamp()+interval '1 day'where id=$1",[ids.c]);await asUser(d,ids.c);await assert.rejects(finish(d),/ONBOARDING_ACCESS/);await assert.rejects(own(d),/ONBOARDING_ACCESS/);
 await admin(d);await d.query('update auth.users set banned_until=null where id=$1',[ids.c]);await d.query("insert into spot_private.suspensions(user_id,reason)values($1,'Synthetic')",[ids.c]);await asUser(d,ids.c);await assert.rejects(finish(d),/ONBOARDING_ACCESS/);
});
test('ONBOARD API only transmits query/Tribe intent; never owner/source/QR and staging guard rejects wrong project',async()=>{
 const calls=[];const api=createOnboardingApi({rpc:async(n,a)=>{calls.push([n,a]);return {data:[]};}});await api.state();await api.search('Uni',20);await api.join(ids.v);await api.complete();assert.deepEqual(calls,[['my_onboarding_state',{}],['search_joinable_tribes',{search_text:'Uni',page_offset:20}],['join_tribe',{tribe_id:ids.v}],['complete_onboarding',{}]]);
 assert.equal(noQrOnboardingEnabled({}),false);assert.throws(()=>noQrOnboardingEnabled({VITE_ONBOARDING_NO_QR:'true',VITE_PRIVACY_PHASE1:'true',VITE_SUPABASE_URL:'https://wrong.supabase.co'}));
 assert.equal(canConsumeQr({enabled:true,explicitScan:false,complete:true}),false);assert.equal(canConsumeQr({enabled:true,explicitScan:true,complete:false}),false);
});
test('ONBOARD UI skip/search never join, partial error keeps prior success and retry is explicit',async()=>{
 const ui=dom();ui.get('phone');let complete=0;const selected=[];const api={search:async()=>[{id:'a',name:'A'},{id:'b',name:'B'}],state:async()=>({tribes:selected.map(id=>({id})),complete:false}),join:async id=>{if(id==='b')throw Error('TRIBE_LIMIT');selected.push(id);},complete:async()=>{complete++;return {complete:true};}};
 const step=createTribeOnboarding({api,document:ui.document,onDone:async()=>{}});await step.open({tribes:[]});assert.deepEqual(selected,[]);assert.equal(step.screen.querySelector('.list').children[0].style.color,'var(--text)');await step.screen.querySelector('.list').children[0].onclick();assert.deepEqual(selected,['a']);await step.screen.querySelector('.list').children[1].onclick();assert.deepEqual(selected,['a']);assert.equal(step.screen.querySelector('.list').children[0].disabled,true);await step.screen.children.at(-1).onclick();assert.equal(complete,1);
});
test('ONBOARD UI stale search/join results cannot cross account reset; search failure still permits skip',async()=>{
 const ui=dom();ui.get('phone');const wait=deferred();let done=0;const step=createTribeOnboarding({document:ui.document,api:{search:()=>wait.promise,complete:async()=>({complete:true}),join:async()=>{},state:async()=>({tribes:[]})},onDone:async()=>done++});const loading=step.open({tribes:[]});step.reset();wait.resolve([{id:'old',name:'Old owner'}]);await loading;assert.equal(step.screen.querySelector('.list').children.length,0);
});
test('ONBOARD hosted SQL rehearsal uses synthetic fixtures and rolls back onboarding/photo/membership rows',async t=>{
 const d=await setup(t);await d.exec("update spot_private.photo_cutover_control set phase='PAUSED'");
 const result=await d.exec(await readFile('tests/staging/onboarding-without-qr-smoke.sql','utf8'));
 const row=result.flatMap(x=>x.rows??[]).find(x=>x.evidence);assert.match(row.evidence,/PASS/);assert.equal(row.residual_auth,0);assert.equal(row.residual_onboarding,0);
});
test('ONBOARD fresh profile cannot overwrite another owner, incomplete account cannot skip profile, anonymous denied',async t=>{
 const d=await setup(t);await fresh(d);assert.equal((await d.query('update public.profiles set name=$1 where id=$2 returning id',['Other owner',ids.a])).rows.length,0);
 await assert.rejects(d.query('select my_onboarding_state($1)',[ids.a]),/does not exist/);
 await admin(d);await d.query('delete from public.profiles where id=$1',[ids.c]);await asUser(d,ids.c);await assert.rejects(finish(d),/ONBOARDING_ACCESS/);
 await d.exec('reset role;set role anon');await assert.rejects(own(d),/permission denied/);
});
test('ONBOARD UI failed search still allows explicit skip and never attempts a join',async()=>{
 const ui=dom();ui.get('phone');let completed=0,joined=0;const step=createTribeOnboarding({document:ui.document,api:{search:async()=>{throw Error('offline');},join:async()=>joined++,state:async()=>({tribes:[]}),complete:async()=>{completed++;return{complete:true};}},onDone:async()=>{}});
 await step.open({tribes:[]});assert.equal(step.screen.children.at(-1).disabled,false);await step.screen.children.at(-1).onclick();assert.equal(completed,1);assert.equal(joined,0);
});
test('ONBOARD deployment check enforces private table, RPC grants and no backfill',async t=>{
 const d=await setup(t);await d.exec(await readFile('tests/staging/onboarding-check.sql','utf8'));
});
