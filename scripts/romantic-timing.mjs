// Diagnostic only; local PostgreSQL timing is not a network/constant-time guarantee.
import assert from'node:assert/strict';import{writeFile,mkdir}from'node:fs/promises';
import{romanticDatabase,ids,admin,asUser,post,submit,opt,setting}from'../tests/helpers/romantic-database.js';
let close;const d=await romanticDatabase({after:f=>{close=f;}});const results=[];
try{const p=await post(d);for(const [recipientOptIn,actor]of[[false,ids.b],[true,ids.c]]){
 await asUser(d,ids.a);await opt(d,recipientOptIn);await asUser(d,actor);const samples=[];
 for(let i=0;i<6;i++){const start=performance.now(),r=await submit(d,p);samples.push(performance.now()-start);assert.deepEqual(r,{submitted:true});}
 assert.equal((await setting(d)).remaining,0);const sorted=[...samples].sort((a,b)=>a-b);results.push({condition:recipientOptIn?'eligible_then_pending_suppression':'recipient_opt_out',samples_ms:samples,median_ms:sorted[3],responses_identical:true,quota_used:6});
 }await mkdir('docs/evidence/spotted-romantic',{recursive:true});await writeFile('docs/evidence/spotted-romantic/local-timing.json',JSON.stringify({engine:'PostgreSQL via PGlite',results,limitation:'Small local sample; not a constant-time implementation or proof of network timing indistinguishability. Sender body/status/quota are independently tested. No artificial sleep or new worker/provider.'},null,2)+'\n');console.log('Local timing diagnostic complete; identical neutral bodies and six charges in both cases.');
}finally{await close();}
