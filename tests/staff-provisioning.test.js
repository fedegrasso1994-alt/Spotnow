import test from'node:test';
import assert from'node:assert/strict';
import{staffCanaryFetch,probe,validateEvidence}from'../tools/staff-provisioning/canary.js';
import{STAGING}from'../tools/staff-mfa/auth.js';
import{readFile}from'node:fs/promises';
test('staff provisioning transport confines browser to staging Auth and explicit RPCs',async()=>{
 const calls=[],f=staffCanaryFetch(async(u,i)=>{calls.push(u);return {};});
 await f(STAGING+'/rest/v1/rpc/ops_health',{method:'POST'});
 await f(STAGING+'/auth/v1/token?grant_type=password',{method:'POST'});
 for(const [u,i]of [[STAGING+'/rest/v1/rpc/ops_health',{method:'GET'}],[STAGING+'/rest/v1/rpc/other',{method:'POST'}],['https://other.supabase.co/rest/v1/rpc/ops_health',{method:'POST'}],[STAGING+'/storage/v1/object/a',{}]])assert.throws(()=>f(u,i));
 assert.equal(calls.length,2);
});
test('staff provisioning probes keep data out of evidence and require explicit SQL authorization denial',async()=>{
 const client={async rpc(name){return name==='moderation_review_queue'?{data:{private:'must not appear'}}:{error:{code:'42501',message:'private'}};}};
 const result=await probe(client,'MODERATOR','allowed');assert.equal(result.passed,true);
 assert.doesNotMatch(JSON.stringify(result),/private|must not appear/);
 const wrong={async rpc(){return {error:{code:'PGRST301'}};}};
 assert.equal((await probe(wrong,'ADMIN','denied')).passed,false); // expiry is not proof of guard denial
 const success={async rpc(){return {data:{secret:'not evidence'}};}};
 assert.equal((await probe(success,'ADMIN','denied')).passed,false);
 assert.equal((await probe(success,'ADMIN','allowed')).passed,true);
});
test('staff provisioning evidence permits enums and booleans only; rejects token/PII payload injection',async()=>{
 const result=await probe({async rpc(){return {data:{}};}},'ADMIN','allowed');
 const safe={role:'ADMIN',phase:'allowed',...result};assert.equal(validateEvidence(safe),safe);
 for(const bad of [{...safe,token:'synthetic'},{...safe,phase:'free text'},{...safe,checks:[{operation:'email',result:'allowed',passed:true}]},{...safe,checks:safe.checks.map(c=>({...c,email:'private'}))}])assert.throws(()=>validateEvidence(bad));
});
test('staff provisioning UI has no MFA mutation, token rendering/persistence or product mount',async()=>{
 const page=await readFile('tools/staff-provisioning/page.js','utf8');
 assert.doesNotMatch(page,/\.enroll\(|\.unenroll\(|console\.|localStorage|sessionStorage|serviceWorker/);
 assert.match(page,/persistSession:false/);assert.match(page,/token=null/);
 assert.match(page,/\$\('password'\)\.value=''/);assert.match(page,/\$\('code'\)\.value=''/);
});
