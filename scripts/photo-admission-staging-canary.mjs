/** Controlled PHOTO staging canary. Public key + isolated synthetic user credentials only.
 * Admission control remains an operator action through the existing gated RPC.
 * Never enables cleanup/scheduler, mutates fixture timestamps, or fabricates smoke receipts.
 */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {preflightCanaryFixtures} from '../tests/fixtures/photo-canary-generator.mjs';
import {inspectPhoto} from '../src/photo-contract.js';
const ref='zjinjtkekmaqtxsuyvho',url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLIC_KEY;
assert.equal(url,`https://${ref}.supabase.co`);assert.ok(key);
// No Auth request or canary action is permitted before full unchanged PHOTO-01 preflight.
const fixtureBytes=await preflightCanaryFixtures();
const file=process.env.PHOTO_CANARY_FIXTURES;assert.ok(file,'Explicit isolated fixture manifest required');
const manifest=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(manifest.ref,ref);
assert.equal(manifest.users.length,2);assert.ok(manifest.users.every(u=>/^photo-gate-[a-f0-9-]+@example.invalid$/.test(u.email)));
assert.notEqual(manifest.stopped,true,'Stopped canary: preserve evidence, do not resume automatically');
const mode=process.argv[2],ok=r=>{if(r.error)throw Error(`STAGING_${r.error.code||r.error.status||'RPC'}:${r.error.message}`);return r.data;};
const save=()=>fs.writeFile(file,JSON.stringify({...manifest,users:manifest.users.map(({client,token,...u})=>u)}),{mode:0o600});
const record=async(name,fn)=>{await fn();(manifest.results??=[]).push({name,result:'PASS',at:new Date().toISOString()});await save();console.log(name,'PASS');};
const bytes=seed=>{const b=fixtureBytes.get(seed);assert.ok(b,'Unvalidated fixture');return b;};
async function login(u){const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const s=ok(await client.auth.signInWithPassword({email:u.email,password:u.password})).session;assert.ok(s);if(u.id)assert.equal(u.id,s.user.id);u.id=s.user.id;u.client=client;u.token=s.access_token;return u;}
// Do not serialize client sessions or access/refresh tokens.
const cleanSave=save;
async function rpc(u,name,args={}){return ok(await u.client.rpc(name,args));}
async function request(u,name,body,headers={}){const r=await fetch(`${url}/functions/v1/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${u.token}`,...headers},body,signal:AbortSignal.timeout(60000)});return{status:r.status,body:await r.json(),protocol:r.headers.get('x-soma-photo-protocol'),cache:r.headers.get('cache-control')};}
const upload=(u,seed=10,data=bytes(seed))=>request(u,'photo-assets',data,{'Content-Type':'application/octet-stream','X-Photo-Request-Id':randomUUID()});
async function valid(u,seed){const r=await upload(u,seed);assert.equal(r.status,200,JSON.stringify({code:r.body.code}));assert.equal(r.protocol,'photo02');assert.equal(r.body.ready,true);assert.ok(r.body.photo_path.startsWith(u.id+'/'));return r.body.photo_path;}
async function publish(u,path,existing=false){const row={id:u.id,name:`Synthetic PHOTO ${u.label}`,age:25,gender:'M',preference:'ALL',occupation:'Staging canary',photo_path:path};const q=existing?u.client.from('profiles').update(row).eq('id',u.id):u.client.from('profiles').insert(row);ok(await q.select().single());u.current=path;}
async function canonical(u,path){for(const suffix of['','.detail.jpg','.thumb.jpg']){const blob=ok(await u.client.storage.from('profile-photos').download(path+suffix));const data=new Uint8Array(await blob.arrayBuffer());const info=inspectPhoto(data);assert.equal(info.format,'JPEG');assert.ok(info.width<=(suffix==='.thumb.jpg'?480:1600));assert.ok(info.height<=(suffix==='.thumb.jpg'?480:1600));}}
async function erase(u){const r=await request(u,'delete-account',JSON.stringify({confirm:true}),{'Content-Type':'application/json'});assert.equal(r.status,200,JSON.stringify({code:r.body.code}));assert.equal(r.body.deleted,true);const check=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});assert.ok((await check.auth.signInWithPassword({email:u.email,password:u.password})).error);u.deleted=true;}
try{
 if(mode==='prepare'){

  for(const u of manifest.users){await login(u);ok(await u.client.auth.updateUser({data:{photo02_fixture:true,soma_synthetic_canary:true}}));await rpc(u,'attest_adult_checkbox',{declared:true,operation_id:randomUUID()});const c=await rpc(u,'dating_consent_challenge');await rpc(u,'accept_dating_consent',{challenge:c.token,operation_id:randomUUID()});}
  await record('normal fixture Auth + AGE/consent; paused admission rejects before upload',async()=>{for(const u of manifest.users){const profile=ok(await u.client.from('profiles').select('photo_path').eq('id',u.id).maybeSingle());assert.equal(profile?.photo_path||null,u.current||null);const r=await upload(u);assert.equal(r.status,503);assert.equal(r.body.code,'PAUSED');assert.equal(r.cache,'no-store');}});
 }else if(mode==='smoke'){
  const [a,b]=await Promise.all(manifest.users.map(login));
  await record('real canonical upload and new profile; optional Tribe skip',async()=>{assert.equal(b.current,undefined);const path=await valid(b,40);await publish(b,path);await canonical(b,path);const s=await rpc(b,'my_onboarding_state');assert.equal(s.profile_complete,true);assert.equal(s.complete,false);assert.equal((await rpc(b,'complete_onboarding')).complete,true);});
  await record('existing current remains readable during concurrent upload + metadata update',async()=>{assert.ok(a.current);const old=a.current,processing=valid(a,30);await publish(a,old,true);await canonical(a,old);const next=await processing;await publish(a,next,true);await canonical(a,next);await canonical(a,old);assert.notEqual(old,next);a.previous=old;});
  await record('invalid input rejected, retry succeeds; second fixture replace',async()=>{const invalid=await upload(b,1,new Uint8Array([1,2,3]));assert.ok(invalid.status>=400&&invalid.status<500);assert.notEqual(invalid.body.code,'PAUSED');const next=await valid(b,41);await publish(b,next,true);await canonical(b,next);});
  await record('normal delete-account canary with global cleanup/scheduler OFF',()=>erase(b));
 }else if(mode==='finish'){
  const a=await login(manifest.users[0]);await record('final synthetic account normal delete',()=>erase(a));
 }else throw Error('Mode must be prepare / smoke / finish');
}catch(error){manifest.stopped=true;manifest.failure={mode,code:error.code||error.name};throw error;}finally{await cleanSave();}
