/** RIGHTS HTTP rehearsal: synthetic accounts only, exact staging allowlist, no service-role key. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat,readdir} from 'node:fs/promises';
import https from 'node:https';
import {resolve4} from 'node:dns/promises';
import {randomUUID,createHash} from 'node:crypto';
import jpeg from 'jpeg-js';
import {rightsFixtureTeardown} from './rights-fixture-teardown.mjs';
import {createClient} from '@supabase/supabase-js';
import {collectRights,createRightsApi,RIGHTS_SECTIONS} from '../src/user-rights.js';
const ref='zjinjtkekmaqtxsuyvho',dir='.local/rights01';await mkdir(dir,{recursive:true});
const env=await readFile('.local/privacy-stage/frontend-env.sh','utf8');
const value=name=>env.match(new RegExp(name+"=['\"]?([^'\"\\n]+)"))?.[1];
const url=value('VITE_SUPABASE_URL'),key=value('VITE_SUPABASE_PUBLIC_KEY');
assert.equal(url,`https://${ref}.supabase.co`);assert.ok(key);
// The OS lookup fails on this runner. DNS resolution still preserves the original TLS hostname.
const lookup=(host,options,cb)=>resolve4(host).then(a=>options.all?cb(null,a.map(address=>({address,family:4}))):cb(null,a[0],4),cb);
async function stageFetch(input,init={}){
 const target=new URL(typeof input==='string'?input:input.url);assert.equal(target.origin,url);
 return new Promise((resolve,reject)=>{
  const req=https.request(target,{lookup,method:init.method||'GET',headers:Object.fromEntries(new Headers(init.headers)),timeout:60000},res=>{
   const chunks=[];let bytes=0;res.on('data',c=>{bytes+=c.length;if(bytes>10*1024*1024)req.destroy(Error('HTTP response cap'));else chunks.push(c);});
   res.on('error',reject);res.on('end',()=>resolve(new Response([204,205,304].includes(res.statusCode)?null:Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));
  });req.on('error',reject);req.on('timeout',()=>req.destroy(Error('HTTP timeout')));req.end(init.body);
 });
}
const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:stageFetch}});
// Credentials belong only to the temporary test context, outside the repository.
const sessionFile='/private/tmp/soma-rights01-http-private.json';
const mode=process.argv[2]||'probe';let manifest;try{manifest=JSON.parse(await readFile(sessionFile,'utf8'));}catch{manifest={users:[],results:[]};}
const save=()=>writeFile(sessionFile,JSON.stringify(manifest),{mode:0o600});
const ok=r=>{if(r.error)throw Error(r.error.code||'HTTP request failed');return r.data;};
const authed=async u=>{const c=client();const r=ok(await c.auth.signInWithPassword({email:u.email,password:u.password}));assert.equal(r.user.id,u.id);assert.equal(r.user.user_metadata.rights_fixture,true);u.access_token=r.session.access_token;u.refresh_token=r.session.refresh_token;await save();return c;};
const record=name=>{manifest.results.push({name,status:'PASS',at:new Date().toISOString()});console.log(name,'PASS');};
const rpc=async(c,name,args={})=>ok(await c.rpc(name,args));
const age=(c,n)=>rpc(c,'attest_adult',{age:n,declared:true,statement_version:'adult-v1',operation_id:randomUUID()});
const consent=async c=>{const challenge=await rpc(c,'dating_consent_challenge');return rpc(c,'accept_dating_consent',{challenge:challenge.token,operation_id:randomUUID()});};
const image=()=>{const data=Buffer.alloc(64*64*4);for(let i=0;i<data.length;i+=4){data[i]=(i+11)%256;data[i+1]=11;data[i+2]=128;data[i+3]=255;}return jpeg.encode({data,width:64,height:64},85).data;};
async function upload(u,request_id=randomUUID()){
 const r=await stageFetch(url+'/functions/v1/photo-assets',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+u.access_token,'Content-Type':'application/octet-stream','X-Photo-Request-Id':request_id},body:image()});
 const b=await r.json();assert.equal(r.status,200,'Synthetic photo upload failed');assert.equal(b.ready,true);return b.photo_path;
}
async function publish(c,u,path){ok(await c.from('profiles').upsert({id:u.id,name:'RIGHTS SYNTHETIC '+u.label,age:25,gender:u.label==='A'?'M':'F',preference:'ALL',occupation:'PRIVATE_SENTINEL_'+u.label,photo_path:path}).select().single());}
async function verifyExports(A,B,uA,uB){
 for(const [c,u,peer]of[[A,uA,uB],[B,uB,uA]]){
  const data=await collectRights(createRightsApi(c));assert.deepEqual(Object.keys(data.sections),RIGHTS_SECTIONS);assert.equal(data.sections.account[0].id,u.id);assert.equal(data.sections.profile[0].occupation,'PRIVATE_SENTINEL_'+u.label);
  const text=JSON.stringify(data);assert.ok(!text.includes(peer.email));assert.ok(!text.includes('PRIVATE_SENTINEL_'+peer.label));for(const field of['access_token','refresh_token','encrypted_password','request_fingerprint','lease_token','raw_user_meta_data','service_role'])assert.ok(!text.includes(field));
  assert.ok(data.sections.photos.some(p=>p.path===u.photo&&p.copies.length===3));assert.ok(data.sections.tribes.some(t=>t.venue_id===manifest.venue.id));assert.ok(data.sections.matches.some(m=>m.id===manifest.match));
  const again=await collectRights(createRightsApi(c));assert.deepEqual(again.sections,data.sections);assert.ok((await c.rpc('my_rights_page',{section:'account',target_user:peer.id})).error);assert.equal(ok(await c.from('profiles').select('id').eq('id',peer.id)).length,0);assert.ok((await c.storage.from('profile-photos').download(peer.photo)).error);
  u.export_sha=createHash('sha256').update(JSON.stringify(data.sections)).digest('hex');await save();record('JWT '+u.label+' owner-only 15 sections/photo metadata/isolation/export retry');
 }
}
if(mode==='probe'){
 const health=await stageFetch(url+'/auth/v1/health',{headers:{apikey:key}});assert.equal(health.status,200);record('Auth health HTTP 200');
 const response=await stageFetch(url+'/rest/v1/rpc/my_rights_page',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{"section":"account"}'});
 assert.equal(response.status,401);assert.equal((await response.json()).code,'42501');record('Unsigned caller HTTP 401 / 42501');
}else if(mode==='auth-preflight'){
 // Public Auth settings only. No signup, account write or administrator key lookup.
 const r=await stageFetch(url+'/auth/v1/settings?rights_preflight='+Date.now(),{headers:{apikey:key,'Cache-Control':'no-cache'}});assert.equal(r.status,200);
 const settings=await r.json();const providers=Object.entries(settings.external||{}).filter(([,on])=>on===true).map(([name])=>name);
 const evidence={observed_at:new Date().toISOString(),status:r.status,signup_enabled:settings.disable_signup===false,email_autoconfirm:settings.mailer_autoconfirm===true,enabled_providers:providers,accounts_created:0};
 evidence.fixture_gate=evidence.signup_enabled&&evidence.email_autoconfirm&&providers.includes('email')?'READY_FOR_SYNTHETIC_SIGNUP':'BLOCKED_EMAIL_CONFIRMATION_OR_PROVIDER';
 await writeFile(dir+'/http-auth-preflight.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}else if(mode==='prepare'){
 const response=await stageFetch(url+'/auth/v1/settings?rights_preflight='+Date.now(),{headers:{apikey:key,'Cache-Control':'no-cache'}});assert.equal(response.status,200);const settings=await response.json();
 assert.equal(settings.disable_signup,false);assert.equal(settings.mailer_autoconfirm,true,'FIXTURE_AUTH_NOT_READY');assert.equal(settings.external.email,true);
 assert.ok(manifest.users.length<=2);manifest.venue??={id:randomUUID(),qr:randomUUID()};await save();
 for(const label of ['A','B']){
  let u=manifest.users.find(x=>x.label===label);if(!u){u={label,email:`rights-${label.toLowerCase()}-${randomUUID()}@example.invalid`,password:randomUUID()+'Aa1!'};manifest.users.push(u);await save();}
  const c=client();if(!u.id){const r=ok(await c.auth.signUp({email:u.email,password:u.password,options:{data:{rights_fixture:true,photo02_fixture:true,synthetic:true}}}));assert.ok(r.session,'Synthetic signup did not create a confirmed session');u.id=r.user.id;u.access_token=r.session.access_token;u.refresh_token=r.session.refresh_token;await save();}
  const login=ok(await c.auth.signInWithPassword({email:u.email,password:u.password}));assert.equal(login.user.id,u.id);assert.equal(login.user.user_metadata.rights_fixture,true);u.access_token=login.session.access_token;u.refresh_token=login.session.refresh_token;await save();record('Normal synthetic signup/login '+label);
 }
 const ids=manifest.users.map(u=>"'"+u.id+"'::uuid");
 await writeFile('/private/tmp/soma-rights01-http-canary.sql',`begin;\ndo $$begin if not exists(select 1 from spot_private.privacy_environment where environment='staging') or (select phase from spot_private.photo_cutover_control where singleton)<>'PAUSED' then raise exception 'STAGING_PAUSED_REQUIRED';end if;end$$;\nselect photo_cutover_set('canary','rights-http','two-synthetic-owner-smoke','ef964a56b99e6947c1244dc2639a5668613839dc',array[${ids}]);\ninsert into public.venues(id,name,address)values('${manifest.venue.id}','RIGHTS SYNTHETIC VENUE','Synthetic staging only');\ninsert into spot_private.venue_codes(venue_id,qr_token)values('${manifest.venue.id}','${manifest.venue.qr}');\ncommit;\nselect (select phase from spot_private.photo_cutover_control where singleton) as phase,(select cardinality(canary_users) from spot_private.photo_cutover_control where singleton) as synthetic_canary_owners,(select execute_enabled from spot_private.photo_cutover_control where singleton) as cleanup,(select scheduler_enabled from spot_private.photo_cutover_control where singleton) as scheduler;`);
}else if(mode==='data'){
 assert.equal(manifest.users.length,2);assert.ok(!manifest.match,'Data already seeded: use verify');const [uA,uB]=manifest.users;const A=await authed(uA),B=await authed(uB);
 for(const [c,u]of[[A,uA],[B,uB]]){await age(c,25);await consent(c);const nonce=randomUUID();const path=await upload(u,nonce);assert.equal(await upload(u,nonce),path);u.photo=path;await save();await publish(c,u,path);ok(await c.storage.from('profile-photos').download(path));record('Synthetic '+u.label+' valid photo/upload replay/profile');await rpc(c,'check_in',{qr_token:manifest.venue.qr});assert.ok((await rpc(c,'my_tribes')).some(t=>t.id===manifest.venue.id));}
 await rpc(A,'send_spot',{target_user:uB.id,place:manifest.venue.id});manifest.match=await rpc(B,'send_spot',{target_user:uA.id,place:manifest.venue.id});await save();
 const nonce=randomUUID();await rpc(A,'send_message',{target_match:manifest.match,message_text:'RIGHTS OWN SYNTHETIC MESSAGE',client_nonce:nonce});await rpc(A,'send_message',{target_match:manifest.match,message_text:'RIGHTS OWN SYNTHETIC MESSAGE',client_nonce:nonce});await rpc(B,'send_message',{target_match:manifest.match,message_text:'PRIVATE_SENTINEL_B_MESSAGE',client_nonce:randomUUID()});
 assert.equal(ok(await A.from('messages').select('id').eq('match_id',manifest.match)).length,2);record('Tribe Spot match chat and nonce replay');
 await rpc(A,'report_profile',{target_user:uB.id,report_reason:'other',report_details:'SYNTHETIC ONLY',also_block:false,client_nonce:randomUUID()});await rpc(A,'block_profile',{target_user:uB.id});
 await verifyExports(A,B,uA,uB);
}else if(mode==='verify'){
 const [uA,uB]=manifest.users;const A=await authed(uA),B=await authed(uB);assert.equal((await collectRights(createRightsApi(A))).sections.messages.filter(m=>m.match_id===manifest.match).length,1);assert.equal((await collectRights(createRightsApi(B))).sections.messages.filter(m=>m.match_id===manifest.match).length,1);assert.ok((await rpc(A,'my_tribes')).some(t=>t.id===manifest.venue.id));record('Existing synthetic social state and replay verified');await verifyExports(A,B,uA,uB);
}else if(mode==='post-a'){
 const [uA,uB]=manifest.users;assert.equal(uA.deleted,true);const B=await authed(uB);const data=await collectRights(createRightsApi(B));assert.equal(data.sections.account[0].id,uB.id);assert.equal(data.sections.profile[0].occupation,'PRIVATE_SENTINEL_B');assert.ok(data.sections.photos.some(p=>p.path===uB.photo&&p.current&&p.copies.length===3));assert.ok(data.sections.tribes.some(t=>t.venue_id===manifest.venue.id));assert.equal(data.sections.spots.length,0);assert.equal(data.sections.matches.length,0);assert.equal(data.sections.messages.length,0);ok(await B.storage.from('profile-photos').download(uB.photo));const failed=await client().auth.signInWithPassword({email:uA.email,password:uA.password});assert.ok(failed.error);record('Post-delete A cannot login; B Auth/profile/current photo/Tribe preserved; relationship cascades complete');
}else if(mode==='restricted-verify'){
 const u=manifest.users[0],c=await authed(u);const data=await collectRights(createRightsApi(c));assert.equal(data.sections.age[0].status,'restricted');assert.equal(data.sections.consent[0].status,'revoked');u.restricted_export_sha=createHash('sha256').update(JSON.stringify(data.sections)).digest('hex');const retry=await c.rpc('revoke_dating_consent',{operation_id:randomUUID()});manifest.restricted_revoke_retry={status:retry.error?'FAIL':'PASS',code:retry.error?.code||null,reason:retry.error?.message==='AGE_REQUIRED'?'AGE_REQUIRED':null};console.log('Restricted repeated revoke:',JSON.stringify(manifest.restricted_revoke_retry));ok(await c.storage.from('profile-photos').download(u.photo));record('Restricted/revoked owner access export and own photo remain available');
}else if(mode==='photo-file'){
 const u=manifest.users[0],c=await authed(u);const blob=ok(await c.storage.from('profile-photos').download(u.photo));const cloud=Buffer.from(await blob.arrayBuffer());const local=await readFile('/Users/federicograsso/Downloads/soma-foto-propria-test.jpg');assert.equal(createHash('sha256').update(local).digest('hex'),createHash('sha256').update(cloud).digest('hex'));u.photo_sha=createHash('sha256').update(cloud).digest('hex');const pixels=jpeg.decode(local,{maxMemoryUsageInMB:8});assert.ok(pixels.width>0&&pixels.height>0);record('Actual browser canonical photo download matches authorized Storage bytes');
 await writeFile(dir+'/http-download-evidence.json',JSON.stringify({json_actual_file_verified:true,json_categories:15,photo_actual_file_verified:true,photo_bytes:local.length,width:pixels.width,height:pixels.height,mode:'Local harness with real staging Auth and RIGHTS component; not a staging frontend deployment'},null,2));
}else if(mode==='teardown-plan'){
 const paths=JSON.parse(await readFile('/private/tmp/soma-rights01-download-created.json','utf8'));const cases=[manifest.match];for(const entry of paths.filter(p=>p.path.endsWith('.json'))){const data=JSON.parse(await readFile(entry.path,'utf8'));for(const r of data.sections.reports)cases.push(r.id);}
 manifest.teardown_ops??=[randomUUID(),randomUUID()];await save();const sql=rightsFixtureTeardown({owners:manifest.users,venueId:manifest.venue.id,caseIds:[...new Set(cases)],operationId:manifest.teardown_ops[0],pausedOperationId:manifest.teardown_ops[1]});await writeFile('/private/tmp/soma-rights01-fixture-teardown.sql',sql,{mode:0o600});console.log('Scoped teardown SQL prepared; requires deleted Auth/files and settled writers.');
}else if(mode==='browser-files'){
 const baseline=JSON.parse(await readFile('/private/tmp/soma-rights01-download-baseline.json','utf8'));const files=[];const roles=[];
 for(const name of await readdir('/Users/federicograsso/Downloads')){if(!/^soma-dati-personali.*\.json$/.test(name))continue;const path='/Users/federicograsso/Downloads/'+name;if(baseline.files[path])continue;const info=await stat(path);if(info.mtimeMs*1e6<baseline.started_ns)continue;
  const bytes=await readFile(path),data=JSON.parse(bytes.toString());assert.equal(data.format,'soma-rights-staging-v1');assert.deepEqual(Object.keys(data.sections),RIGHTS_SECTIONS);const u=manifest.users.find(x=>x.id===data.sections.account[0].id);assert.ok(u,'Only this run synthetic exports');const restricted=data.sections.age[0].status==='restricted',digest=createHash('sha256').update(JSON.stringify(data.sections)).digest('hex');assert.equal(digest,restricted?u.restricted_export_sha:u.export_sha);const text=bytes.toString();for(const field of['access_token','refresh_token','request_fingerprint','lease_token','service_role','encrypted_password'])assert.ok(!text.includes(field));assert.ok(!text.includes(manifest.users.find(x=>x.id!==u.id).email));
  files.push({path,sha:createHash('sha256').update(bytes).digest('hex')});roles.push(u.label+(restricted?' restricted':' eligible'));
 }
 const photoPath='/Users/federicograsso/Downloads/soma-foto-propria-test.jpg',photo=await readFile(photoPath);assert.equal(createHash('sha256').update(photo).digest('hex'),manifest.users[0].photo_sha);files.push({path:photoPath,sha:manifest.users[0].photo_sha});await writeFile('/private/tmp/soma-rights01-download-created.json',JSON.stringify(files),{mode:0o600});
 assert.ok(roles.includes('A eligible'));assert.ok(roles.includes('A restricted'));assert.ok(roles.includes('B eligible'));record('Actual browser JSON A/B and restricted downloads verified against API digests');await writeFile(dir+'/http-browser-files-evidence.json',JSON.stringify({json_files:roles.length,roles,photo_file:true,preexisting_files_preserved:true},null,2));
}else if(mode==='restrict'){
 const [uA]=manifest.users;const A=await authed(uA);const op=randomUUID();await rpc(A,'revoke_dating_consent',{operation_id:op});await rpc(A,'revoke_dating_consent',{operation_id:op});assert.equal((await collectRights(createRightsApi(A))).sections.consent[0].status,'revoked');assert.equal(ok(await A.from('profiles').select('preference').single()).preference,null);record('Revoked consent allows export; sensitive preference erased');
 await age(A,17);const data=await collectRights(createRightsApi(A));assert.equal(data.sections.age[0].status,'restricted');assert.equal(data.sections.consent[0].status,'revoked');assert.ok(data.sections.messages.some(m=>m.body==='RIGHTS OWN SYNTHETIC MESSAGE'));assert.ok(data.sections.photos.some(p=>p.path===uA.photo));uA.restricted_export_sha=createHash('sha256').update(JSON.stringify(data.sections)).digest('hex');record('Restricted account still exports own existing data');
}else if(mode==='smoke'){
 assert.equal(manifest.users.length,2);assert.equal(new Set(manifest.users.map(u=>u.id)).size,2);for(const u of manifest.users)assert.equal(ok(await (await authed(u)).auth.getUser()).user.user_metadata.rights_fixture,true);const A=await authed(manifest.users[0]),B=await authed(manifest.users[1]);
 const denied=await client().rpc('my_rights_page',{section:'account'});assert.ok(denied.error);record('Unsigned caller denied HTTP');
 for(const [c,u]of[[A,manifest.users[0]],[B,manifest.users[1]]]){
  const data=await collectRights(createRightsApi(c));assert.equal(data.sections.account[0].id,u.id);
  assert.equal(data.sections.age[0].status,'restricted');assert.equal(data.sections.consent[0].status,'revoked');
  assert.ok(!JSON.stringify(data).includes(manifest.users.find(x=>x.id!==u.id).id));
  assert.ok(!(await c.rpc('my_rights_page',{section:'account',target_user:manifest.users.find(x=>x.id!==u.id).id})).data);
  assert.ok((await c.rpc('my_rights_page',{section:'safety_holds'})).error);
  assert.ok((await c.rpc('my_rights_page',{section:'account',page_size:101})).error);
  record('JWT '+u.label+' owner-only 15-section export restricted/revoked');
 }
}else if(['cleanup','delete-a'].includes(mode)){
 assert.equal(manifest.users.length,2,'Two tracked synthetic fixtures required');
 for(const u of manifest.users.filter(u=>mode!=='delete-a'||u.label==='A')){if(u.deleted)continue;
  const c=await authed(u);const proof=ok(await c.auth.getUser());assert.equal(proof.user.id,u.id);assert.equal(proof.user.user_metadata.rights_fixture,true);
  const r=await stageFetch(url+'/functions/v1/delete-account',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+u.access_token,'Content-Type':'application/json'},body:'{"confirm":true}'});
  const b=await r.json();assert.equal(r.status,200,'Delete must succeed through normal endpoint');assert.equal(b.deleted,true);u.deleted=true;await save();
  assert.ok((await c.rpc('my_rights_page',{section:'account'})).error);assert.ok((await c.auth.getUser()).error);const retry=await stageFetch(url+'/functions/v1/delete-account',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+u.access_token,'Content-Type':'application/json'},body:'{"confirm":true}'});assert.equal(retry.status,401);record('JWT '+u.label+' delete: Auth/RIGHTS denied and retry HTTP 401');
 }
}else throw Error('Use probe, auth-preflight, smoke or cleanup; never production');
if(!['probe','auth-preflight'].includes(mode))await save();await writeFile(dir+'/http-results.json',JSON.stringify(manifest.results,null,2));
