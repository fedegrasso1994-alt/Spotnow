// Explicit normal-JWT staging smoke. Synthetic isolated actors only, never app/CI code.
import assert from'node:assert/strict';import{readFile,writeFile,mkdir}from'node:fs/promises';
import{createClient}from'@supabase/supabase-js';import{createBackend}from'../src/backend.js';import{createSpottedApi}from'../src/spotted-social.js';import{preflightCanaryFixtures}from'../tests/fixtures/photo-canary-generator.mjs';
const root=process.env.QOD_RUN_DIR||'.local/spotted-qod',evidence=process.env.QOD_EVIDENCE_DIR||'docs/evidence/spotted-qod',url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLIC_KEY;
assert.match(root,/^\.local\/spotted-qod(?:-[a-z0-9-]+)?$/);assert.match(evidence,/^docs\/evidence\/spotted-qod(?:-[a-z0-9-]+)?$/);
assert.equal(new URL(url).hostname,'zjinjtkekmaqtxsuyvho.supabase.co');
const prefix=process.env.QOD_FIXTURE_PREFIX||'fea47000';assert.match(prefix,/^fea47[0-9a-f]{3}$/);
const fixtures=JSON.parse(await readFile(root+'/credentials.json','utf8'));assert.equal(fixtures.length,3);assert.ok(fixtures.every(f=>f.id.startsWith(prefix+'-')&&f.email.endsWith('@example.invalid')));
const venues=[`${prefix}-0000-4000-9000-000000000001`,`${prefix}-0000-4000-9000-000000000002`],uuid=()=>crypto.randomUUID(),results=[];
const pass=name=>{results.push({name,result:'PASS'});console.log(name+': PASS');};
const actors=[];for(const f of fixtures){const c=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),r=await c.auth.signInWithPassword({email:f.email,password:f.password});assert.ok(!r.error,'SYNTHETIC_LOGIN');assert.equal(r.data.user.id,f.id);actors.push({id:f.id,c,s:createSpottedApi(c),b:createBackend(c,{privacyEnabled:true,boardEnabled:true,rightsEnabled:true,onboardingEnabled:true,oraEnabled:true,spotV2Enabled:true,profileAuthorizationEnabled:true})});}
const[A,B,C]=actors;let state={};try{state=JSON.parse(await readFile(root+'/state.json','utf8'));}catch{}const save=()=>writeFile(root+'/state.json',JSON.stringify(state,null,2),{mode:0o600});
const phase=process.argv[2];const denied=async(p,re)=>{let error;try{await p;}catch(e){error=e;}assert.ok(error,'DENIAL_REQUIRED');if(re)assert.match(error.message,re);};
if(phase==='setup'){
 assert.ok(!state.setup);const images=await preflightCanaryFixtures();for(let i=0;i<3;i++){const a=actors[i];await a.b.attestAdultCheckbox(true);await a.b.acceptConsent(await a.b.consentChallenge());const photo=await a.b.uploadPhoto(new File([images.get(10)],'synthetic.jpg',{type:'image/jpeg'}));await a.b.saveProfile({name:'SYNTHETIC QOD '+String.fromCharCode(65+i),age:25,gender:'M',preference:'ALL',photo});await a.b.onboarding.join(venues[i===2?1:0]);await a.b.onboarding.complete();}state.setup=true;await save();pass('Three normal JWTs, AGE/consent/photo/profile and isolated Membership Engine');
}
if(phase==='qod'){
 assert.ok(state.setup&&!state.qod);const q=(await A.s.qod.current(venues[0])).question;assert.ok(q?.official&&!q.romantic_content);state.question=q.id;await save();pass('Official active QoD available with no peer author or romantic target');
 const op=await A.s.operation(venues[0]),a=await A.s.qod.answer(q.id,'Un sorriso spontaneo alla fine di una giornata lunga.',op);state.answer=a;await save();assert.equal(await A.s.qod.answer(q.id,'Un sorriso spontaneo alla fine di una giornata lunga.',op),a);await denied(A.s.qod.answer(q.id,'Second answer',await A.s.operation(venues[0])),/ALREADY_ANSWERED/);assert.equal((await A.s.qod.current(venues[0])).question.answered,true);pass('First answer, exact retry and direct second answer denial');
 const list=await B.s.qod.answers(q.id);assert.equal(list.items[0].id,a);for(const word of['author_id','created_at','expires_at','revision',A.id])assert.ok(!JSON.stringify(list).includes(word));pass('Peer anonymity exact projection over hosted API');
 await Promise.all(Array.from({length:5},()=>B.s.like(a,'post',true,uuid())));assert.equal((await B.s.qod.answers(q.id)).items[0].likes,1);const c=await B.s.comment(a,'Anche per me i piccoli gesti contano.',await B.s.operation(venues[0]));state.comment=c;await save();await A.s.like(c,'comment',true,uuid());assert.equal((await A.s.comments(a)).items[0].likes,1);await denied(B.s.comment(c,'Nested bypass',await B.s.operation(venues[0])),/ACCESS/);pass('Real concurrent like unique, one-level comment and comment like');
 await denied(C.s.qod.current(venues[0]),/ACCESS/);await denied(C.s.qod.answers(q.id),/CLOSED/);await denied(C.s.qod.answer(q.id,'Outside',await C.s.operation(venues[1])),/CLOSED/);await denied(C.s.comments(a),/ACCESS/);pass('Other Tribe cannot read, guess or answer');
 for(let i=0;i<5;i++)await A.s.create(venues[0],'Synthetic ordinary publication '+i,await A.s.operation(venues[0]));assert.equal((await A.s.feed(venues[0])).items.length,5);assert.equal('remaining'in(await A.s.feed(venues[0])),false);pass('Five ordinary posts unaffected by QoD and absent daily quota');
 await denied(B.s.romantic.submit(q.id,'post',uuid()));await B.s.romantic.submit(a,'post',uuid());assert.ok((await A.s.romantic.inbox()).items.length===1);await A.s.romantic.submit(c,'comment',uuid());pass('Official romantic target denied; answer/comment use existing neutral request system');
 state.qod=true;await save();
}
if(phase==='concurrency'){
 assert.ok(state.qod&&!state.concurrency);const ops=await Promise.all(Array.from({length:4},()=>B.s.operation(venues[0])));const r=await Promise.allSettled(ops.map((op,i)=>B.s.qod.answer(state.question,'Synthetic competing answer '+i,op)));assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.ok(r.filter(x=>x.status==='rejected').every(x=>/ALREADY_ANSWERED/.test(x.reason.message)));const id=r.find(x=>x.status==='fulfilled').value;await B.s.remove(id,'post',uuid());assert.equal((await B.s.qod.current(venues[0])).question.answered,true);await denied(B.s.qod.answer(state.question,'Delete cannot refund',await B.s.operation(venues[0])),/ALREADY_ANSWERED/);pass('Actual concurrent hosted answer claims exactly once; content deletion never refunds');state.concurrency=true;await save();
}
if(phase==='closed'){
 assert.ok(state.qod);assert.deepEqual(await A.s.qod.current(venues[0]),{question:null});await denied(B.s.qod.answer(state.question,'Closed',await B.s.operation(venues[0])),/CLOSED/);await denied(B.s.comments(state.answer),/ACCESS/);pass('Manual close removes current question and rejects answer/comment access');state.closed=true;await save();
}
if(phase==='ui-postcheck'){
 const q=(await C.s.qod.current(venues[1])).question;assert.ok(q?.answered);await denied(C.s.qod.answer(q.id,'Browser answer cannot be repeated',await C.s.operation(venues[1])),/ALREADY_ANSWERED/);
 assert.ok((await A.s.comments(state.answer)).items.some(c=>c.text==='Un altro piccolo gesto: ricordarsi una cosa che hai raccontato.'));
 assert.equal((await B.s.qod.answers(state.question)).items.find(a=>a.id===state.answer).likes,1);assert.equal((await A.s.feed(venues[0])).items.length,5);pass('Real Preview answer/comment/like writes persisted; ordinary posts remain independent');
 const leave=await C.c.rpc('leave_tribe',{tribe_id:venues[1]});assert.ifError(leave.error);assert.equal((await C.b.onboarding.state()).tribes.length,0);await denied(C.s.qod.current(venues[1]),/ACCESS/);await denied(C.s.qod.answers(q.id),/CLOSED/);pass('Normal leave gives zero-Tribe state and revokes QoD access');
 await C.b.onboarding.join(venues[1]);assert.equal((await C.s.qod.current(venues[1])).question.answered,true);await denied(C.s.qod.answer(q.id,'Rejoin cannot reset answer',await C.s.operation(venues[1])),/ALREADY_ANSWERED/);pass('Normal grace rejoin preserves consumed answer without reset');
 state.ui=true;await save();
}
if(phase==='cleanup'){
 for(const a of actors){const p=await a.b.getProfile();assert.match(p.name,/^SYNTHETIC QOD [ABC]$/);assert.equal(p.id,a.id);await a.b.checkDeletion();await a.b.deleteAccount();assert.equal((await a.c.auth.getUser()).data.user,null);pass('Normal lifecycle account deletion '+a.id.slice(-1));}state.deleted=true;await save();
}
await mkdir(evidence,{recursive:true});await writeFile(evidence+'/staging-'+phase+'.json',JSON.stringify({project_ref:'zjinjtkekmaqtxsuyvho',synthetic_only:true,phase,results},null,2)+'\n');
