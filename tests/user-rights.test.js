import test from 'node:test';
import {rightsFixtureTeardown} from '../scripts/rights-fixture-teardown.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,seed,ids,asUser,admin} from './helpers/database.js';
import {createRightsApi,collectRights,rightsEnabled,RIGHTS_SECTIONS,makeRightsDownload} from '../src/user-rights.js';
async function setup(t){const db=await database();t.after(()=>db.close());await seed(db);for(const f of ['020_age_eligibility.sql','021_dating_consent.sql','022_location_minimization.sql','023_privacy_retention.sql','024_user_rights.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'));await db.exec("select set_config('request.jwt.claims','{\"role\":\"service_role\",\"ref\":\"zjinjtkekmaqtxsuyvho\"}',false);select privacy_staging_enable('zjinjtkekmaqtxsuyvho');");return db;}
const page=async(db,section,key='',size=100)=>(await db.query('select my_rights_page($1,$2,$3) r',[section,key,size])).rows[0].r;
test('RIGHTS authorization: signed-out denied, owner restricted allowed, staging-only fails closed',async t=>{
 const d=await setup(t);await assert.rejects(page(d,'profile'),/RIGHTS_AUTH/);await asUser(d,ids.a);
 assert.equal((await page(d,'profile')).items[0].data.name,'Anna');
 await d.query("select attest_adult(17,true,'adult-v1','a0000000-0000-4000-8000-000000000001')");
 assert.equal((await page(d,'age')).items[0].data.status,'restricted');
 assert.equal((await page(d,'profile')).items.length,1);
 await assert.rejects(page(d,'safety_holds'),/RIGHTS_SECTION/);await assert.rejects(page(d,'profile','',101),/RIGHTS_INPUT/);
 await admin(d);await d.exec("update spot_private.privacy_environment set environment='production'");await asUser(d,ids.a);await assert.rejects(page(d,'profile'),/RIGHTS_STAGING_ONLY/);
});
test('RIGHTS minimization: peer preference, received messages, reporter identity, fingerprints and leases excluded',async t=>{
 const d=await setup(t);await admin(d);
 await d.query('insert into matches(id,user_a,user_b,venue_id)values($1,$2,$3,$4)',['b0000000-0000-4000-8000-000000000001',ids.a,ids.b,ids.v]);
 await d.query('insert into messages(match_id,sender_id,body)values($1,$2,$3),($1,$4,$5)',['b0000000-0000-4000-8000-000000000001',ids.a,'OWN SENT',ids.b,'PEER PRIVATE']);
 await d.query("insert into spot_private.reports(reporter_id,target_id,reason,details)values($1,$2,'other','CONFIDENTIAL REPORT')",[ids.b,ids.a]);
 await asUser(d,ids.a);const api={page:(s,k)=>page(d,s,k)};const exportA=await collectRights(api);
 const text=JSON.stringify(exportA);assert.ok(text.includes('OWN SENT'));for(const hidden of ['PEER PRIVATE','CONFIDENTIAL REPORT','request_fingerprint','lease_token','refresh_token','last_checkin_at'])assert.ok(!text.includes(hidden));
 assert.equal(exportA.sections.reports.length,0);assert.equal(exportA.sections.account[0].id,ids.a);
 await asUser(d,ids.b);assert.equal((await page(d,'profile')).items[0].data.name,'Luca');assert.equal((await page(d,'reports')).items[0].data.reason,'other');
});
test('RIGHTS pagination: exact boundaries, all own rows, no peer rows and no offset truncation',async t=>{
 const d=await setup(t);await admin(d);const m='b0000000-0000-4000-8000-000000000002';await d.query('insert into matches(id,user_a,user_b,venue_id)values($1,$2,$3,$4)',[m,ids.a,ids.b,ids.v]);
 await d.query("insert into messages(id,match_id,sender_id,body) select ('c0000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,$1,$2,'OWN ROW' from generate_series(1,101)n",[m,ids.a]);
 await asUser(d,ids.a);const first=await page(d,'messages');assert.equal(first.items.length,100);assert.ok(first.next_key);const second=await page(d,'messages',first.next_key);assert.equal(second.items.length,1);assert.equal(second.next_key,null);
 const out=await collectRights({page:(s,k)=>page(d,s,k)});assert.equal(out.sections.messages.length,101);assert.equal(new Set(out.sections.messages.map(x=>x.id)).size,101);
});
test('RIGHTS deletion: restricted/revoked account proof disappears; only held report evidence survives preparation',async t=>{
 const d=await setup(t);await admin(d);await d.query("insert into spot_private.reports(id,reporter_id,target_id,reason,details)values($1,$2,$3,'other','DO NOT PRESERVE')",['d0000000-0000-4000-8000-000000000001',ids.a,ids.b]);
 await d.query("select privacy_safety_hold('reports',$1,'test-case','MODERATION',now()+interval '1 day','test-operator',$2)",['d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002']);
 await asUser(d,ids.a);await d.query("select attest_adult(17,true,'adult-v1',$1)",['d0000000-0000-4000-8000-000000000003']);await d.query('select revoke_dating_consent($1)',['d0000000-0000-4000-8000-000000000004']);await admin(d);
 await d.query('select photo02_begin_account_deletion($1)',[ids.a]);await d.query('select prepare_account_deletion($1)',[ids.a]);await d.query('delete from auth.users where id=$1',[ids.a]);
 assert.equal((await d.query('select count(*) n from spot_private.account_eligibility where user_id=$1',[ids.a])).rows[0].n,0);
 assert.equal((await d.query('select count(*) n from spot_private.consent_events where user_id=$1',[ids.a])).rows[0].n,0);
 const evidence=(await d.query('select * from spot_private.safety_evidence')).rows;assert.equal(evidence.length,1);assert.ok(!JSON.stringify(evidence).includes('DO NOT PRESERVE'));
 await asUser(d,ids.a);await assert.rejects(page(d,'account'),/RIGHTS_AUTH/);
});
test('RIGHTS client: no production enable, generic errors, cancellation and loop protection',async()=>{
 assert.equal(rightsEnabled({}),false);assert.throws(()=>rightsEnabled({VITE_RIGHTS_PHASE1:'true',VITE_SUPABASE_URL:'https://qlucwdjcjomwyziegxrn.supabase.co'}));
 await assert.rejects(createRightsApi({rpc:async()=>({error:{message:'secret internals'}})}).page('profile'),e=>!e.message.includes('secret'));
 await assert.rejects(collectRights({page:async s=>({owner_id:'owner',section:s,items:[],next_key:'loop'})}),/Paginazione/);
 const c=new AbortController();c.abort();await assert.rejects(collectRights({}, {signal:c.signal}),/annullato/);
 const out=await collectRights({page:async s=>({owner_id:'owner',section:s,items:[],next_key:null})});assert.deepEqual(Object.keys(out.sections),RIGHTS_SECTIONS);
});
test('RIGHTS export aborts on owner change and size limits; no partial file is published',async()=>{
 let calls=0;await assert.rejects(collectRights({page:async s=>({owner_id:++calls===1?'a':'b',section:s,items:[],next_key:null})}),/Account cambiato/);
 const api={page:async s=>({owner_id:'a',section:s,items:[{data:{value:'payload'}}],next_key:null})};
 await assert.rejects(collectRights(api,{maxBytes:1}),/troppo grande/);await assert.rejects(collectRights(api,{maxRows:0}),/troppo grande/);
});
test('RIGHTS JSON download is local only and releases its object URL',async()=>{
 let blob=null,released=null;
 const artifact=makeRightsDownload({synthetic:true},{createObjectURL:b=>{blob=b;return 'blob:synthetic';},revokeObjectURL:u=>{released=u;}});
 assert.equal(blob.type,'application/json');assert.deepEqual(JSON.parse(await blob.text()),{synthetic:true});assert.equal(artifact.name,'soma-dati-personali.json');artifact.release();assert.equal(released,'blob:synthetic');
});
test('RIGHTS retention: active purge/replay cannot recreate a deleted account or its product data',async t=>{
 const d=await setup(t);await asUser(d,ids.a);await d.query("select attest_adult(17,true,'adult-v1',$1)",['e1000000-0000-4000-8000-000000000001']);await d.query('select revoke_dating_consent($1)',['e1000000-0000-4000-8000-000000000002']);await admin(d);
 await d.query('select photo02_begin_account_deletion($1)',[ids.a]);const claim=(await d.query('select claim_photo_account_cleanup($1) token',[ids.a])).rows[0].token;assert.ok(claim);
 // Local Storage mock only: real recursive Storage deletion is covered by the HTTP rehearsal.
 await d.query("delete from storage.objects where split_part(name,'/',1)=$1",[ids.a]);await d.query('select prepare_account_deletion($1)',[ids.a]);await d.query('delete from auth.users where id=$1',[ids.a]);await d.query('select finish_photo_account_cleanup($1,$2)',[ids.a,claim]);
 const categories=(await d.query('select category from spot_private.retention_policies order by category')).rows.map(r=>r.category);
 await d.query('select privacy_retention_config(paused:=false)');let sequence=10;
 for(const category of categories){await d.query('select privacy_retention_config(category:=$1,enabled:=true)',[category]);const dry='e1000000-0000-4000-8000-'+String(sequence++).padStart(12,'0'),purge='e1000000-0000-4000-8000-'+String(sequence++).padStart(12,'0');await d.query('select privacy_retention_run($1,$2,true)',[category,dry]);await d.query('select privacy_retention_run($1,$2,false)',[category,purge]);const repeated=(await d.query('select privacy_retention_run($1,$2,false) r',[category,purge])).rows[0].r;assert.equal(repeated.replay,true);
  const rows=(await d.query("select (select count(*) from auth.users where id=$1)+(select count(*) from profiles where id=$1)+(select count(*) from spot_private.account_eligibility where user_id=$1)+(select count(*) from spot_private.consent_state where user_id=$1)+(select count(*) from checkins where user_id=$1)+(select count(*) from spot_private.tribe_memberships where user_id=$1)+(select count(*) from storage.objects where split_part(name,'/',1)=$1::text) n",[ids.a])).rows[0].n;assert.equal(rows,0);
 }
 assert.equal((await d.query('select count(*) n from profiles where id=$1',[ids.b])).rows[0].n,1);assert.equal((await d.query("select coalesce(sum(reserved_bytes),0)::bigint n from spot_private.photo_lifecycle_sets where user_id=$1 and state<>'purged'",[ids.a])).rows[0].n,0);
 // Completed technical receipts remain under PHOTO-02's existing seven-day policy, not safety holds.
 assert.equal((await d.query("select count(*) n from spot_private.photo_cleanup_accounts where user_id=$1 and state='completed'",[ids.a])).rows[0].n,1);
 await asUser(d,ids.a);await assert.rejects(page(d,'account'),/RIGHTS_AUTH/);
});
test('RIGHTS fixture teardown refuses live accounts and preserves the bystander',async t=>{
 const d=await setup(t);await admin(d);await d.query("update spot_private.photo_cutover_control set phase='CANARY',canary_users=array[$1::uuid,$2::uuid],execute_enabled=false,scheduler_enabled=false",[ids.a,ids.b]);
 const sql=rightsFixtureTeardown({owners:[{id:ids.a,deleted:true},{id:ids.b,deleted:true}],venueId:ids.v,operationId:'e2000000-0000-4000-8000-000000000001',pausedOperationId:'e2000000-0000-4000-8000-000000000002'});
 await assert.rejects(d.exec(sql),/FIXTURE_NOT_DELETED/);await d.exec('rollback');assert.equal((await d.query('select count(*) n from auth.users')).rows[0].n,3);assert.equal((await d.query('select count(*) n from profiles where id=$1',[ids.c])).rows[0].n,1);assert.equal((await d.query('select count(*) n from spot_private.photo_cutover_audit')).rows[0].n,3);
});
test('RIGHTS teardown scope rejects extra/duplicate/injected owners and never copies credentials',()=>{
 const input={owners:[{id:ids.a,deleted:true,password:'DO_NOT_COPY_CREDENTIALS'},{id:ids.b,deleted:true,refresh_token:'DO_NOT_COPY_TOKEN'}],venueId:ids.v,operationId:'e3000000-0000-4000-8000-000000000001',pausedOperationId:'e3000000-0000-4000-8000-000000000002'};
 const sql=rightsFixtureTeardown(input);assert.ok(!sql.includes('DO_NOT_COPY'));assert.throws(()=>rightsFixtureTeardown({...input,owners:[...input.owners,{id:ids.c,deleted:true}]}));assert.throws(()=>rightsFixtureTeardown({...input,owners:[input.owners[0],input.owners[0]]}));assert.throws(()=>rightsFixtureTeardown({...input,owners:[{id:ids.a+"'; delete from auth.users;--",deleted:true},input.owners[1]]}));
});
test('RIGHTS concluded photo receipts: no product payload, seven-day purge covers every residual table and is repeatable',async t=>{
 const d=await setup(t);await admin(d);const path=ids.a+'/a.png';
 await d.query("insert into spot_private.photo_cutover_attempts(path,user_id,protocol,writer,evidence,completed_at)values($1,$2,'PHOTO02','settled','READY_CONFIRMED',clock_timestamp())",[path,ids.a]);
 await d.query('select photo02_begin_account_deletion($1)',[ids.a]);const token=(await d.query('select claim_photo_account_cleanup($1) t',[ids.a])).rows[0].t;
 await d.query("delete from storage.objects where split_part(name,'/',1)=$1",[ids.a]);await d.query('select prepare_account_deletion($1)',[ids.a]);await d.query('delete from auth.users where id=$1',[ids.a]);await d.query('select finish_photo_account_cleanup($1,$2)',[ids.a,token]);
 const tables={photo_lifecycle_sets:'user_id',photo_cleanup_accounts:'user_id',photo_cutover_attempts:'user_id',photo_cutover_deletions:'user_id',photo_cutover_audit:'owner_id'};
 for(const [table,column]of Object.entries(tables)){
  const rows=(await d.query(`select * from spot_private.${table} where ${column}=$1`,[ids.a])).rows;assert.equal(rows.length,1,table);
  for(const row of rows)for(const forbidden of ['preview','body','preference','name','email','occupation','venue_id','checked_in_at','expires_at','source_width','source_height'])assert.ok(!(forbidden in row),table+': '+forbidden);
 }
 const set=(await d.query('select * from spot_private.photo_lifecycle_sets where user_id=$1',[ids.a])).rows[0];assert.equal(set.manifest,null);assert.equal(set.reserved_bytes,0);assert.equal(set.claim_token,null);assert.equal(set.state,'purged');
 for(const table of Object.keys(tables))await d.exec(`update spot_private.${table} set ${table==='photo_cutover_audit'||table==='photo_cutover_deletions'?'created_at':'completed_at'}=clock_timestamp()-interval '7 days'+interval '1 minute' where ${tables[table]}='${ids.a}'`);
 await d.query('select photo_metadata_purge()');for(const [table,col]of Object.entries(tables))assert.equal((await d.query(`select count(*) n from spot_private.${table} where ${col}=$1`,[ids.a])).rows[0].n,1,table+' before TTL');
 for(const table of Object.keys(tables))await d.exec(`update spot_private.${table} set ${table==='photo_cutover_audit'||table==='photo_cutover_deletions'?'created_at':'completed_at'}=clock_timestamp()-interval '7 days'-interval '1 minute' where ${tables[table]}='${ids.a}'`);
 await d.query('select photo_metadata_purge()');await d.query('select photo_metadata_purge()');
 for(const [table,col]of Object.entries(tables))assert.equal((await d.query(`select count(*) n from spot_private.${table} where ${col}=$1`,[ids.a])).rows[0].n,0,table+' after TTL');
 assert.equal((await d.query('select count(*) n from profiles where id=$1',[ids.b])).rows[0].n,1);assert.equal((await d.query("select count(*) n from spot_private.photo_lifecycle_sets where user_id=$1 and state='current'",[ids.b])).rows[0].n,1);
});
