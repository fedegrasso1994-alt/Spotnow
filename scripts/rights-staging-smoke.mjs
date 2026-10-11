/** RIGHTS HTTP rehearsal: synthetic accounts only, exact staging allowlist, no service-role key. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import https from 'node:https';
import {resolve4} from 'node:dns/promises';
import {createClient} from '@supabase/supabase-js';
import {collectRights,createRightsApi} from '../src/user-rights.js';
const ref='zjinjtkekmaqtxsuyvho',dir='.local/rights01';await mkdir(dir,{recursive:true});
const env=await readFile('.local/privacy-stage/frontend-env.sh','utf8');
const value=name=>env.match(new RegExp(name+"=['\"]?([^'\"\\n]+)"))?.[1];
const url=value('VITE_SUPABASE_URL'),key=value('VITE_SUPABASE_PUBLIC_KEY');
assert.equal(url,`https://${ref}.supabase.co`);assert.ok(key);
// The OS lookup fails on this runner. DNS resolution still preserves the original TLS hostname.
const lookup=(host,options,cb)=>resolve4(host).then(a=>options.all?cb(null,a.map(address=>({address,family:4}))):cb(null,a[0],4),cb);
async function stageFetch(input,init={}){
 const target=new URL(typeof input==='string'?input:input.url);assert.equal(target.origin,url);
 return new Promise((resolve,reject)=>{
  const req=https.request(target,{lookup,method:init.method||'GET',headers:Object.fromEntries(new Headers(init.headers)),timeout:60000},res=>{
   const chunks=[];let bytes=0;res.on('data',c=>{bytes+=c.length;if(bytes>10*1024*1024)req.destroy(Error('HTTP response cap'));else chunks.push(c);});
   res.on('error',reject);res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));
  });req.on('error',reject);req.on('timeout',()=>req.destroy(Error('HTTP timeout')));req.end(init.body);
 });
}
const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:stageFetch}});
const mode=process.argv[2]||'probe';let manifest;try{manifest=JSON.parse(await readFile(dir+'/http-fixtures-private.json','utf8'));}catch{manifest={users:[],results:[]};}
const save=()=>writeFile(dir+'/http-fixtures-private.json',JSON.stringify(manifest),{mode:0o600});
const ok=r=>{if(r.error)throw Error(r.error.code||'HTTP request failed');return r.data;};
const authed=async u=>{const c=client();ok(await c.auth.setSession({access_token:u.access_token,refresh_token:u.refresh_token}));return c;};
const record=name=>{manifest.results.push({name,status:'PASS',at:new Date().toISOString()});console.log(name,'PASS');};
if(mode==='probe'){
 const health=await stageFetch(url+'/auth/v1/health',{headers:{apikey:key}});assert.equal(health.status,200);record('Auth health HTTP 200');
 const response=await stageFetch(url+'/rest/v1/rpc/my_rights_page',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{"section":"account"}'});
 assert.equal(response.status,401);assert.equal((await response.json()).code,'42501');record('Unsigned caller HTTP 401 / 42501');
}else if(mode==='smoke'){
 assert.equal(manifest.users.length,2);assert.equal(new Set(manifest.users.map(u=>u.id)).size,2);for(const u of manifest.users)assert.equal(ok(await (await authed(u)).auth.getUser()).user.user_metadata.rights_fixture,true);const A=await authed(manifest.users[0]),B=await authed(manifest.users[1]);
 const denied=await client().rpc('my_rights_page',{section:'account'});assert.ok(denied.error);record('Unsigned caller denied HTTP');
 for(const [c,u]of[[A,manifest.users[0]],[B,manifest.users[1]]]){
  const data=await collectRights(createRightsApi(c));assert.equal(data.sections.account[0].id,u.id);
  assert.equal(data.sections.age[0].status,'restricted');assert.equal(data.sections.consent[0].status,'revoked');
  assert.ok(!JSON.stringify(data).includes(manifest.users.find(x=>x.id!==u.id).id));
  assert.ok(!(await c.rpc('my_rights_page',{section:'account',target_user:manifest.users.find(x=>x.id!==u.id).id})).data);
  assert.ok((await c.rpc('my_rights_page',{section:'safety_holds'})).error);
  assert.ok((await c.rpc('my_rights_page',{section:'account',page_size:101})).error);
  record('JWT '+u.label+' owner-only 15-section export restricted/revoked');
 }
}else if(mode==='cleanup'){
 assert.equal(manifest.users.length,2,'Two tracked synthetic fixtures required');
 for(const u of manifest.users){if(u.deleted)continue;
  const c=await authed(u);const proof=ok(await c.auth.getUser());assert.equal(proof.user.id,u.id);assert.equal(proof.user.user_metadata.rights_fixture,true);
  const r=await stageFetch(url+'/functions/v1/delete-account',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+u.access_token,'Content-Type':'application/json'},body:'{"confirm":true}'});
  const b=await r.json();assert.equal(r.status,200,'Delete must succeed through normal endpoint');assert.equal(b.deleted,true);u.deleted=true;await save();
  assert.ok((await c.rpc('my_rights_page',{section:'account'})).error);assert.ok((await c.auth.getUser()).error);record('JWT '+u.label+' restricted/revoked delete and post-delete denial');
 }
}else throw Error('Use probe, smoke or cleanup; never production');
if(mode!=='probe')await save();await writeFile(dir+'/http-results.json',JSON.stringify(manifest.results,null,2));
