import{readFile,writeFile}from'node:fs/promises';import assert from'node:assert/strict';import{preflightCanaryFixtures}from'../tests/fixtures/photo-canary-generator.mjs';
const c=JSON.parse(await readFile('.local/legacy-key-migration/config.json','utf8'));if(c.url!=='https://zjinjtkekmaqtxsuyvho.supabase.co')throw Error('STAGING_ONLY');const results=[];
async function edge(name,body,key=c.serverKey,extra={}){const r=await fetch(c.url+'/functions/v1/'+name,{method:'POST',headers:{apikey:key,'Content-Type':body instanceof Uint8Array?'application/octet-stream':'application/json',...extra},body:body instanceof Uint8Array?body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});let data;try{data=await r.json();}catch{}return{r,data};}
try{
 const fixtures=await preflightCanaryFixtures(),bytes=fixtures.values().next().value;
 for(const key of [c.publicKey,'malformed','']){const{r}=await edge('photo-normalize-jpeg',bytes,key);assert.ok([401,403].includes(r.status));}
 let x=await edge('photo-normalize-jpeg',bytes);results.push({step:'normalizer-modern-apikey',status:x.r.status,code:x.data?.code||x.data?.error||null});assert.equal(x.r.status,200);assert.ok(x.data.detail&&x.data.thumbnail);
 x=await edge('photo-lifecycle',{dry_run:true});results.push({step:'photo-lifecycle-modern-apikey',status:x.r.status});assert.equal(x.r.status,200);assert.equal(x.data.dry_run,true);
 x=await edge('operations',{action:'phase_a_run',operation_id:crypto.randomUUID(),dry_run:true,batch_limit:1,max_batches:1});results.push({step:'retention-modern-dry-run',status:x.r.status});assert.equal(x.r.status,200);assert.ok(x.data.runs);
 x=await edge('notifications',{action:'prune'},c.publicKey);assert.equal(x.r.status,401);results.push({step:'notifications-no-dispatch-secret-denied',status:x.r.status});
 await writeFile('.local/legacy-key-migration/edge-smoke.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}catch{await writeFile('.local/legacy-key-migration/edge-smoke.json',JSON.stringify({status:'STOP',results},null,2));console.log(JSON.stringify({status:'STOP',results}));process.exitCode=1;}
