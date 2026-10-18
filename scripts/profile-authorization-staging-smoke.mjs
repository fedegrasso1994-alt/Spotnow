/** Staging-only real Auth/RPC/Storage smoke. Credentials supplied in ignored synthetic manifest.
 * No admin/service key; no tokens or signed URLs printed/persisted. Confirm email stays ON.
 */
import fs from'node:fs/promises';import assert from'node:assert/strict';import{createClient}from'@supabase/supabase-js';
import{createBackend}from'../src/backend.js';import{preflightCanaryFixtures}from'../tests/fixtures/photo-canary-generator.mjs';import{inspectPhoto}from'../src/photo-contract.js';
const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLIC_KEY,manifest=process.env.PROFILE_AUTH_FIXTURES;
assert.equal(url,'https://zjinjtkekmaqtxsuyvho.supabase.co');assert.ok(key);assert.ok(manifest);assert.ok(!key.startsWith('sb_secret_'));if(key.split('.').length===3)assert.equal(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role,'anon');else assert.ok(key.startsWith('sb_publishable_'));
const people=JSON.parse(await fs.readFile(manifest,'utf8'));assert.equal(people.length,2);assert.ok(people.every(p=>p.id.startsWith('fea36000-')&&p.email.endsWith('@example.invalid')));
const results=[],ok=r=>{if(r.error)throw Error(`STAGING:${r.error.code||r.error.status}:${r.error.message}`);return r.data;};
const record=async(name,fn)=>{await fn();results.push({name,result:'PASS'});console.log(name,'PASS');await fs.writeFile(process.env.PROFILE_AUTH_EVIDENCE||'.local/profile-auth-v2/api-evidence.json',JSON.stringify(results,null,2));};
const rpc=(u,n,args={})=>u.client.rpc(n,args).then(ok),place='fea36100-0000-4000-8000-000000000001',qr='fea36200-0000-4000-8000-000000000001';
for(const u of people){u.client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const session=ok(await u.client.auth.signInWithPassword({email:u.email,password:u.password})).session;assert.equal(session.user.id,u.id);u.token=session.access_token;u.api=createBackend(u.client,{privacyEnabled:true,onboardingEnabled:true,oraEnabled:true,spotV2Enabled:true,rightsEnabled:true,profileAuthorizationEnabled:true});}
const [a,b]=people,mode=process.argv[2];
const get=async(u,target)=>rpc(u,'authorized_profile',{target_user:target.id});
const signed=async(u,refs)=>ok(await u.client.functions.invoke('profile-photo',{body:{refs}}));
const exit=async u=>{const p=await rpc(u,'my_presence');if(p)await rpc(u,'end_ora',{presence_id:p.presence_id});};
if(mode==='setup'){
 const fixtures=await preflightCanaryFixtures();await record('PHOTO fixture unchanged strict prevalidation 5/5',async()=>assert.equal(fixtures.size,5));
 for(const [i,u]of people.entries())await record(`Synthetic ${i+1}: real Auth AGE consent PHOTO upload canonical publication`,async()=>{
  await rpc(u,'attest_adult_checkbox',{declared:true,operation_id:crypto.randomUUID()});const c=await rpc(u,'dating_consent_challenge');await rpc(u,'accept_dating_consent',{challenge:c.token,operation_id:crypto.randomUUID()});
  const photo=await u.api.uploadPhoto(new File([fixtures.get(i?20:10)],'synthetic.jpg',{type:'image/jpeg'}));await u.api.saveProfile({name:'SYNTHETIC AUTHZ '+(i+1),age:25,gender:i?'M':'F',preference:'ALL',occupation:'Synthetic test only',photo});await rpc(u,'complete_onboarding');
 });
}else if(mode==='smoke'){
 await record('QR zero-Tribe shared live ORA profile and canonical/thumb/detail allowed',async()=>{
  for(const u of people){const state=await rpc(u,'my_onboarding_state');assert.equal(state.tribes.length,0);await rpc(u,'start_ora_qr',{qr_token:qr});assert.equal((await rpc(u,'my_onboarding_state')).tribes.length,0);}
  const p=(await get(a,b))[0];assert.ok(p);assert.deepEqual(Object.keys(p).sort(),['id','name','age','gender','occupation','photo_path','thumbnail_path','detail_path'].sort());
  const refs=[p.photo_path,p.thumbnail_path,p.detail_path],s=await signed(a,refs);assert.equal(s.expires_in,30);assert.equal(s.photos.length,3);
  for(const photo of s.photos){const r=await fetch(photo.url);assert.equal(r.status,200);assert.equal(inspectPhoto(new Uint8Array(await r.arrayBuffer())).format,'JPEG');}a.reference=s.photos[0].url;a.refs=refs;
 });
 await record('Storage authenticated download/list/long signing and permanent public bypass denied',async()=>{
  const own=await b.api.getProfile(),storage=a.client.storage.from('profile-photos');assert.ok((await storage.download(own.photo_path)).error);assert.ok((await storage.createSignedUrl(own.photo_path,31536000)).error);const listing=await storage.list(b.id);assert.ok(listing.error||listing.data.length===0);
  const r=await fetch(url+'/storage/v1/object/public/profile-photos/'+own.photo_path);assert.ok(r.status>=400);assert.equal((await a.client.from('profiles').select('*').eq('id',b.id)).data.length,0);
 });
 await record('Self profile/photo/edit and refresh via normal sign-in',async()=>{
  const p=await a.api.getProfile();await a.api.saveProfile({name:p.name,age:p.age,gender:p.gender,preference:p.preference,photo:p.photo_path,occupation:'Synthetic metadata update'});const s=await signed(a,[p.photo_path]);assert.equal(s.photos.length,1);assert.equal((await fetch(s.photos[0].url)).status,200);assert.ok(ok(await a.client.auth.refreshSession()).session);
 });
 await record('One-sided Spot + target exits ORA => profile/photo denied',async()=>{
  const spot=await a.api.spotV2.send(b.id,crypto.randomUUID());assert.equal(spot.state,'pending');await exit(b);assert.equal((await get(a,b)).length,0);assert.equal((await signed(a,a.refs)).photos.length,0);
 });
 await record('Same Tribe only + known UUID has no directory/profile/photo access',async()=>{
  for(const u of people)await rpc(u,'join_tribe',{tribe_id:place});assert.equal((await get(a,b)).length,0);assert.equal((await signed(a,a.refs)).photos.length,0);assert.ok((await a.client.rpc('location_people_photos_page',{place,live:false})).error);
 });
 await record('Reciprocal Spot => unique Match persists ORA exit/Tribe leave; chat/rights remain',async()=>{
  await rpc(b,'start_ora_qr',{qr_token:qr});const m=await b.api.spotV2.send(a.id,crypto.randomUUID());assert.ok(m.match_id);for(const u of people){await exit(u);await rpc(u,'leave_tribe',{tribe_id:place});}
  assert.equal((await get(a,b)).length,1);assert.equal((await signed(a,a.refs)).photos.length,3);await a.api.sendMessage(m.match_id,'Synthetic authorization smoke',crypto.randomUUID());assert.equal((await b.api.messages(m.match_id)).at(-1).body,'Synthetic authorization smoke');assert.equal((await a.api.rights.page('profile')).owner_id,a.id);
 });
 await record('Existing Match survives dating consent revoke; pending does not create permission',async()=>{await a.api.revokeConsent();assert.equal((await get(a,b)).length,1);assert.equal((await signed(a,a.refs)).photos.length,3);});
 await record('Signed reference expiry on uncached network request, authorized refresh succeeds',async()=>{
  await new Promise(r=>setTimeout(r,35000));const r=await fetch(a.reference+'&authz_test='+crypto.randomUUID(),{cache:'no-store'});assert.ok(r.status>=400);const s=await signed(a,a.refs);assert.equal(s.photos.length,3);assert.equal((await fetch(s.photos[0].url)).status,200);
 });
}else if(mode==='replace'){
 await record('Self replacement keeps old current until publish; Match gets new version and stale ref denied',async()=>{
  const old=await a.api.getProfile(),before=(await get(b,a))[0],fixtures=await preflightCanaryFixtures();
  const pending=a.api.uploadPhoto(new File([fixtures.get(30)],'synthetic-replacement.jpg',{type:'image/jpeg'}));
  assert.equal((await a.api.getProfile()).photo_path,old.photo_path);assert.equal((await signed(a,[old.photo_path])).photos.length,1);
  const next=await pending;assert.equal((await a.api.getProfile()).photo_path,old.photo_path);
  await a.api.saveProfile({name:old.name,age:old.age,gender:old.gender,preference:old.preference,occupation:old.occupation,photo:next});
  const after=(await get(b,a))[0];assert.notEqual(after.photo_path,before.photo_path);assert.equal((await signed(b,[before.photo_path])).photos.length,0);const s=await signed(b,[after.photo_path]);assert.equal(s.photos.length,1);assert.equal((await fetch(s.photos[0].url)).status,200);
 });
}else if(mode==='delete'){
 for(const [i,u]of people.entries())await record(`Synthetic ${i+1}: normal delete-account and unusable Auth`,async()=>{await u.api.deleteAccount();const fresh=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});assert.ok((await fresh.auth.signInWithPassword({email:u.email,password:u.password})).error);});
}else throw Error('Explicit setup/smoke/delete mode required');
