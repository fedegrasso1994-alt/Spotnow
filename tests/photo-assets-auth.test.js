import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(await readFile('supabase/functions/photo-assets/index.ts','utf8')).replace(/^import .*;$/mg,'');
function endpoint({valid=true,anonymous=false}={}){
 let handler;const calls=[],admin={auth:{getUser:async token=>{calls.push(['auth',token]);return {data:{user:valid?{id:'caller',is_anonymous:anonymous}:null},error:valid?null:{}};}},storage:{from:()=>{throw Error('Unexpected private storage access');}}};
 const reader={rpc:async name=>{calls.push(['rpc',name]);return name==='photo_asset_status'?{data:[{thumbnail_path:'caller/current.thumb.jpg'}]}:{error:{code:'42501'}};},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{photo_path:'caller/current'}})})})})};
 vm.runInNewContext(source,{Deno:{env:{get:name=>name==='SUPABASE_SERVICE_ROLE_KEY'?'service':'public'},serve:f=>handler=f},createClient:(_url,key)=>key==='service'?admin:reader,Response,Request,console});return {handler,calls};
}
const request=body=>new Request('https://test',{method:'POST',headers:{Authorization:'Bearer user-token'},body:JSON.stringify(body)});
test('photo generator rejects missing, anonymous and forged ownership without reading storage',async()=>{
 const e=endpoint();assert.equal((await e.handler(new Request('https://test',{method:'POST',body:'{}'}))).status,401);assert.equal(e.calls.length,0);assert.equal((await e.handler(request({photo_path:'someone-else/photo'}))).status,403);assert.equal((await endpoint({valid:false}).handler(request({photo_path:'caller/current'}))).status,401);assert.equal((await endpoint({anonymous:true}).handler(request({photo_path:'caller/current'}))).status,401);assert.equal((await e.handler(request({photo_path:'caller/old'}))).status,403);
});
test('user token cannot start administrative conversion and current prepared photo avoids duplicate processing',async()=>{
 const e=endpoint();assert.equal((await e.handler(request({backfill:true,user_id:'victim'}))).status,403);const response=await e.handler(request({photo_path:'caller/current'}));assert.equal(response.status,200);assert.deepEqual(await response.json(),{ready:true});assert.ok(e.calls.some(c=>c[1]==='pending_photo_assets'));
});
