/** Read-only staging probe. No fixture, admin credential, decoder payload or mutation. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import https from 'node:https';
import { resolve4 } from 'node:dns/promises';
const env=await readFile('.local/privacy-stage/frontend-env.sh','utf8');
const value=name=>env.match(new RegExp(name+"=['\"]?([^'\"\\n]+)"))?.[1];
const url=value('VITE_SUPABASE_URL'), key=value('VITE_SUPABASE_PUBLIC_KEY');
assert.equal(url,'https://zjinjtkekmaqtxsuyvho.supabase.co');
assert.ok(key&&!key.startsWith('sb_secret_'));
async function get(path){return new Promise((resolve,reject)=>{
 const req=https.request(url+path,{method:'GET',headers:{apikey:key,'Cache-Control':'no-cache'},lookup:(host,options,cb)=>resolve4(host).then(a=>options.all?cb(null,a.map(address=>({address,family:4}))):cb(null,a[0],4),cb),timeout:20000},res=>{
 const chunks=[];let size=0;res.on('data',c=>{size+=c.length;if(size>65536)req.destroy(Error('BODY_CAP'));else chunks.push(c);});
 res.on('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks).toString())});}catch{reject(Error('NON_JSON'));}});
 });req.on('error',reject);req.on('timeout',()=>req.destroy(Error('NETWORK_TIMEOUT')));req.end();
});}
const results=[];
for(const name of ['photo01-preflight','photo01-bounded-bench','photo01-verification']){
 const r=await get('/functions/v1/'+name);assert.equal(r.status,404);assert.equal(r.body.code,'NOT_FOUND');results.push({name,status:r.status,code:r.body.code});
}
for(const name of ['photo-assets','photo-lifecycle','delete-account','privacy-retention']){
 const r=await get('/functions/v1/'+name);assert.ok([401,403,405].includes(r.status));results.push({name,status:r.status,authentication_or_method_guard:true});
}
const auth=await get('/auth/v1/settings?phase_a='+Date.now());assert.equal(auth.status,200);
const evidence={at:new Date().toISOString(),staging_only:true,results,confirm_email:auth.body.mailer_autoconfirm!==true,fixtures_created:0};
await mkdir('.local/phase-a',{recursive:true});await writeFile('.local/phase-a/retirement-probe.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
