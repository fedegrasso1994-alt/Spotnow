import{readFile,writeFile}from'node:fs/promises';import assert from'node:assert/strict';
const c=JSON.parse(await readFile('.local/legacy-key-migration/config.json','utf8'));if(c.url!=='https://zjinjtkekmaqtxsuyvho.supabase.co')throw Error('STAGING_ONLY');
const results=[];async function request(name,body,key=c.serverKey){const r=await fetch(c.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const data=await r.json();return {r,data};}
try{
 for(const name of ['photo02_staging_scheduler','photo_cutover_scheduler_configure']){
 const args=name==='photo02_staging_scheduler'?{enable:false}:{project_ref:'zjinjtkekmaqtxsuyvho',enabled:false};
 for(const key of [c.publicKey,'malformed','']){const{r}=await request(name,args,key);assert.ok([401,403,404].includes(r.status));}
 const{r}=await request(name,args);assert.equal(r.status,200);results.push({name,modern_server_allowed:true,public_missing_malformed_denied:true});
 }
 const wrong=await request('photo_cutover_scheduler_configure',{project_ref:'other',enabled:false});assert.ok(!wrong.r.ok);assert.equal(wrong.data.message,'STAGING_BINDING_REQUIRED');results.push({wrong_project_denied:true});
 await writeFile('.local/legacy-key-migration/sql-smoke.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}catch{console.error('SQL_SMOKE_FAILED — STOP; inspect status/code only');process.exitCode=1;}
