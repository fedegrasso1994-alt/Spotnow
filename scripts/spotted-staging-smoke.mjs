// Real JWT/Storage smoke with synthetic accounts only. Run phases explicitly.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {createBackend} from '../src/backend.js';
import {createSpottedApi} from '../src/spotted-social.js';
import {preflightCanaryFixtures} from '../tests/fixtures/photo-canary-generator.mjs';
const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLIC_KEY;
assert.equal(new URL(url).hostname,'zjinjtkekmaqtxsuyvho.supabase.co');
const fs=JSON.parse(await readFile('.local/spotted-social/credentials.json','utf8'));
assert.equal(fs.length,3);assert.ok(fs.every(f=>f.id.startsWith('fea42000-')&&f.email.endsWith('@example.invalid')));
const venues=['fea42000-0000-4000-9000-000000000001','fea42000-0000-4000-9000-000000000002'];
const uuid=()=>crypto.randomUUID();const results=[];const pass=name=>{results.push({name,result:'PASS'});console.log(name+': PASS');};
const actors=[];for(const f of fs){const c=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const r=await c.auth.signInWithPassword({email:f.email,password:f.password});if(r.error)throw Error('SYNTHETIC_LOGIN_FAILED');assert.equal(r.data.user.id,f.id);actors.push({id:f.id,c,b:createBackend(c,{privacyEnabled:true,boardEnabled:true,rightsEnabled:true,onboardingEnabled:true,oraEnabled:true,spotV2Enabled:true,profileAuthorizationEnabled:true}),s:createSpottedApi(c)});}
const [A,B,C]=actors;const stateFile='.local/spotted-social/state.json';let state={};try{state=JSON.parse(await readFile(stateFile,'utf8'));}catch{}
const save=()=>writeFile(stateFile,JSON.stringify(state,null,2),{mode:0o600});
const rpc=async(a,n,p)=>{const r=await a.c.rpc(n,p);if(r.error)throw r.error;return r.data;};
const denied=async p=>{let error;try{await p;}catch(e){error=e;}assert.ok(error,'EXPECTED_DENIAL');};
const phase=process.argv[2];
if(phase==='setup'){
 const images=await preflightCanaryFixtures();for(let i=0;i<3;i++){const a=actors[i];await a.b.attestAdultCheckbox(true);await a.b.acceptConsent(await a.b.consentChallenge());const photo=await a.b.uploadPhoto(new File([images.get(10)],'synthetic.jpg',{type:'image/jpeg'}));await a.b.saveProfile({name:'SYNTHETIC SPOTTED '+String.fromCharCode(65+i),age:25,gender:'M',preference:'ALL',photo});await a.b.onboarding.join(venues[i===2?1:0]);await a.b.onboarding.complete();}pass('Normal Auth AGE consent PHOTO profile Membership Engine for three fixtures');state.setup=true;await save();
}
if(phase==='social'){
 assert.ok(state.setup&&!state.social);
 const op=await A.s.operation(venues[0]),p=await A.s.create(venues[0],'Synthetic social post for staging smoke',op);state.post=p;await save();assert.equal(await A.s.create(venues[0],'Synthetic social post for staging smoke',op),p);
 const f=await B.s.feed(venues[0]);assert.equal(f.items.length,1);assert.equal(f.items[0].id,p);assert.deepEqual(Object.keys(f.items[0]).sort(),['can_delete','comments','id','liked','likes','text']);assert.ok(!JSON.stringify(f).includes(A.id));pass('Peer-anonymous post across same-Tribe normal JWTs and exact payload allowlist');
 await denied(C.s.feed(venues[0]));await denied(C.s.comments(p));await denied(C.s.comment(p,'Outside',await C.s.operation(venues[1])));await denied(B.s.comments(uuid()));pass('Non-member guessed post/comments and cross-Tribe write denied');
 await Promise.all(Array.from({length:8},()=>B.s.like(p,'post',true,uuid())));assert.equal((await B.s.feed(venues[0])).items[0].likes,1);await B.s.like(p,'post',false,uuid());assert.equal((await B.s.feed(venues[0])).items[0].likes,0);pass('Real concurrent likes unique and removable');
 const cop=await B.s.operation(venues[0]),c=await B.s.comment(p,'Synthetic anonymous comment',cop);state.comment=c;await save();assert.equal(await B.s.comment(p,'Synthetic anonymous comment',cop),c);await denied(B.s.comment(c,'Nested',await B.s.operation(venues[0])));await denied(B.s.comment(p,'x'.repeat(281),await B.s.operation(venues[0])));
 const thread=await A.s.comments(p);assert.deepEqual(Object.keys(thread.items[0]).sort(),['can_delete','id','liked','likes','text']);assert.ok(!JSON.stringify(thread).includes(B.id));await A.s.like(c,'comment',true,uuid());await A.s.like(c,'comment',false,uuid());pass('One-level anonymous comment, own retry, server280 and nested denial');
 state.postReport=await B.s.report(p,'post','other',uuid());state.commentReport=await A.s.report(c,'comment','other',uuid());await save();await denied(rpc(A,'board_moderation_queue',{}));pass('Post/comment reports reuse moderation queue and peers cannot access staff');
 await B.b.revokeConsent();assert.equal((await B.s.feed(venues[0])).items.length,1);assert.equal((await A.b.rights.page('board_likes')).section,'board_likes');assert.equal((await B.b.rights.page('board_comments')).items[0].data.id,c);pass('Revoked dating consent retains social access and owner-only rights inventory');
 const operations=await Promise.all(Array.from({length:3},()=>A.s.operation(venues[0])));const attempts=await Promise.allSettled(operations.map((o,i)=>A.s.create(venues[0],'Synthetic quota post '+i,o)));assert.equal(attempts.filter(a=>a.status==='fulfilled').length,2);pass('Actual concurrent daily post quota exactly3 total');
 await rpc(B,'leave_tribe',{tribe_id:venues[0]});await denied(B.s.feed(venues[0]));await denied(B.s.comments(p));await denied(B.s.like(p,'post',true,uuid()));pass('Membership leave revokes social reads/writes');
 assert.equal((await rpc(A,'my_daily_discovery',{})).status,'paused');state.social=true;await save();
}
if(phase==='expiry'){
 assert.ok(state.social&&state.expiryPrepared);const f=await A.s.feed(venues[0]);assert.ok(!f.items.some(p=>p.id===state.post));await denied(A.s.comments(state.post));await denied(A.s.like(state.comment,'comment',true,uuid()));pass('Real expired post and comments inaccessible by normal JWT');state.expiryVerified=true;await save();
}
if(phase==='cleanup'){
 assert.ok(state.setup);for(const a of actors){const p=await a.b.getProfile();assert.equal(p.id,a.id);assert.match(p.name,/^SYNTHETIC SPOTTED [ABC]$/);await a.b.checkDeletion();await a.b.deleteAccount();assert.equal((await a.c.auth.getUser()).data.user,null);pass('Normal account delete fixture '+a.id.slice(-1));}state.deleted=true;await save();
}
await writeFile('docs/evidence/spotted-social-core/staging-'+phase+'.json',JSON.stringify({phase,results,synthetic_only:true,project_ref:'zjinjtkekmaqtxsuyvho'},null,2)+'\n');
