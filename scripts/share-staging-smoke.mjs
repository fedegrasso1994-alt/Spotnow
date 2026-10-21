// Explicit synthetic staging smoke only. No service role, production, or CI execution.
import assert from'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises';
import{createClient}from'@supabase/supabase-js';import{createSpottedApi}from'../src/spotted-social.js';import{createBackend}from'../src/backend.js';import{shareUrl}from'../src/spotted-share.js';
const root='.local/spotted-qod-share',evidence='docs/evidence/spotted-share',url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLIC_KEY,prefix='fea47200',place=prefix+'-0000-4000-9000-000000000001';
assert.equal(new URL(url).hostname,'zjinjtkekmaqtxsuyvho.supabase.co');const fixtures=JSON.parse(await readFile(root+'/credentials.json','utf8'));assert.equal(fixtures.length,3);assert.ok(fixtures.every(f=>f.id.startsWith(prefix+'-')&&f.email.endsWith('@example.invalid')));
const actors=[];for(const f of fixtures){const c=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),r=await c.auth.signInWithPassword({email:f.email,password:f.password});assert.ifError(r.error);actors.push({c,s:createSpottedApi(c),b:createBackend(c,{privacyEnabled:true,onboardingEnabled:true}),session:r.data.session});}const[A,B,C]=actors;
let state={};try{state=JSON.parse(await readFile(root+'/share-state.json','utf8'));}catch{}const results=[],pass=name=>{results.push({name,result:'PASS'});console.log(name+': PASS');},phase=process.argv[2];
const save=()=>writeFile(root+'/share-state.json',JSON.stringify(state),{mode:0o600});
if(phase==='create'){
 assert.ok(!state.post);state.post=await A.s.create(place,'SYNTHETIC SHARE — un piccolo gesto può cambiare una giornata.',await A.s.operation(place));await save();
 state.comment=await B.s.comment(state.post,'SYNTHETIC SHARE — una risposta nella stessa community.',await B.s.operation(place));await save();
 state.postRef=await A.s.share.create(state.post,'post');state.commentRef=await B.s.share.create(state.comment,'comment');
 state.expiring=await A.s.create(place,'SYNTHETIC SHARE — expiry fixture.',await A.s.operation(place));state.expiringRef=await A.s.share.create(state.expiring,'post');await save();pass('Real normal-JWT post/comment share references');
}
if(phase==='verify'){
 const p=await B.s.share.resolve(state.postRef),c=await B.s.share.resolve(state.commentRef);assert.equal(p.available,true);assert.equal(c.comment.id,state.comment);assert.equal(c.post.id,state.post);assert.equal(c.place,place);assert.equal(await B.s.share.create(state.post,'post'),state.postRef);
 for(const forbidden of['author_id','user_id','created_at','expires_at',fixtures[0].id])assert.ok(!JSON.stringify(c).includes(forbidden));pass('Member post/comment resolve, stable references and anonymous projection');
 for(const token of[state.postRef,state.commentRef,'0'.repeat(64),state.postRef.slice(0,-1)+(state.postRef.endsWith('a')?'b':'a'),'invalid'])assert.deepEqual(await C.s.share.resolve(token),{available:false});pass('Other Tribe, guessed and modified references neutral');
 for(let i=0;i<16;i++){const guess=state.postRef.slice(0,-2)+i.toString(16).padStart(2,'0');if(guess!==state.postRef)assert.deepEqual(await B.s.share.resolve(guess),{available:false});}pass('Bounded nearby-token enumeration by an eligible member fails');
 const anon=createSpottedApi(createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}));await assert.rejects(anon.share.resolve(state.postRef));pass('Unauthenticated resolver denied');
 const leave=await B.c.rpc('leave_tribe',{tribe_id:place});assert.ifError(leave.error);assert.equal((await B.b.onboarding.state()).tribes.length,0);assert.deepEqual(await B.s.share.resolve(state.commentRef),{available:false});assert.deepEqual(await B.s.share.resolve(state.postRef),{available:false});await B.b.onboarding.join(place);assert.equal((await B.s.share.resolve(state.commentRef)).available,true);pass('Normal leave to zero-Tribe revokes access; explicit normal rejoin rechecks authorization');
}
if(phase==='launches'){
 const preview=process.env.SHARE_PREVIEW;assert.ok(/^https:\/\/spot-[a-z0-9]+-fedegrasso1994-1482\.vercel\.app\/$/.test(preview));
 const launches=actors.map(a=>{const u=new URL(shareUrl(preview,state.commentRef));u.hash=new URLSearchParams({access_token:a.session.access_token,refresh_token:a.session.refresh_token,token_type:'bearer',expires_in:String(a.session.expires_in)}).toString();return u.href;});await writeFile(root+'/browser-launches.json',JSON.stringify(launches),{mode:0o600});console.log('Private normal Auth callback URLs prepared; not emitted.');
}
if(phase==='browser-leave'){
 const r=await B.c.rpc('leave_tribe',{tribe_id:place});assert.ifError(r.error);assert.equal((await B.b.onboarding.state()).tribes.length,0);assert.deepEqual(await B.s.share.resolve(state.commentRef),{available:false});pass('Browser fixture now zero-Tribe through normal leave; target denied');
}
if(phase==='browser-rejoin'){
 await B.b.onboarding.join(place);assert.equal((await B.s.share.resolve(state.commentRef)).available,true);pass('Explicit normal fixture rejoin restores only live authorized resolution');
}
if(phase==='removed'){
 assert.deepEqual(await B.s.share.resolve(state.expiringRef),{available:false});await A.s.remove(state.post,'post',crypto.randomUUID());for(const ref of[state.postRef,state.commentRef])assert.deepEqual(await B.s.share.resolve(ref),{available:false});pass('Synthetic expired and deleted post/comment references are neutral');
}
if(phase==='enumeration'){
 assert.ok(!state.enumPost);state.enumPost=await A.s.create(place,'SYNTHETIC SHARE — bounded enumeration probe.',await A.s.operation(place));await save();const reference=await A.s.share.create(state.enumPost,'post');assert.equal((await B.s.share.resolve(reference)).available,true);
 for(let i=0;i<16;i++){const guess=reference.slice(0,-2)+i.toString(16).padStart(2,'0');if(guess!==reference)assert.deepEqual(await B.s.share.resolve(guess),{available:false});}await A.s.remove(state.enumPost,'post',crypto.randomUUID());pass('Eligible member resolves valid reference but all bounded nearby-token guesses fail');
}
if(results.length){await mkdir(evidence,{recursive:true});await writeFile(evidence+'/staging-'+phase+'.json',JSON.stringify({project_ref:'zjinjtkekmaqtxsuyvho',synthetic_only:true,phase,results},null,2)+'\n');}
