import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(await readFile('supabase/functions/delete-account/index.ts','utf8')).replace(/^import .*?;\n/,'');
function endpoint(valid=true,storageFails=false){
 let handler;const calls=[];let listed=false;
 const admin={auth:{getUser:async token=>{calls.push(['auth',token]);return valid?{data:{user:{id:'caller'}},error:null}:{data:{user:null},error:{}};},admin:{deleteUser:async id=>{calls.push(['delete',id]);return {error:null};}}},
 storage:{from:()=>({list:async id=>{calls.push(['list',id]);const files=listed?[]:[{name:'photo.png'}];listed=true;return {data:files,error:storageFails?{}:null};},remove:async names=>{calls.push(['remove',names]);return {error:null};}})},
 rpc:async(name,args)=>{calls.push([name,args]);return {error:null};}};
 vm.runInNewContext(source,{Deno:{env:{get:()=> 'test'},serve:f=>handler=f},createClient:()=>admin,Response,Request});return {handler,calls};
}
test('account deletion validates JWT and ignores a forged target user',async()=>{
 const {handler,calls}=endpoint();const response=await handler(new Request('https://test',{method:'POST',headers:{Authorization:'Bearer token'},body:JSON.stringify({user_id:'victim',confirm:true})}));
 assert.equal(response.status,200);assert.deepEqual(calls.map(x=>JSON.parse(JSON.stringify(x))),[['auth','token'],['begin_account_deletion',{target_user:'caller'}],['list','caller'],['remove',['caller/photo.png']],['list','caller'],['prepare_account_deletion',{target_user:'caller'}],['delete','caller']]);
});
test('invalid or absent sessions cannot delete accounts',async()=>{
 const e=endpoint(false);assert.equal((await e.handler(new Request('https://test',{method:'POST',headers:{Authorization:'Bearer invalid'}}))).status,401);assert.equal(e.calls.length,1);
 const absent=endpoint();assert.equal((await absent.handler(new Request('https://test',{method:'POST'}))).status,401);assert.equal(absent.calls.length,0);
});
test('storage failure does not claim account deletion succeeded',async()=>{
 const e=endpoint(true,true);assert.equal((await e.handler(new Request('https://test',{method:'POST',headers:{Authorization:'Bearer token'},body:JSON.stringify({confirm:true})}))).status,500);assert.equal(e.calls.some(c=>c[0]==='delete'),false);
});

test('deletion dry-run validates the session without modifying any data',async()=>{
 const e=endpoint();const response=await e.handler(new Request('https://test',{method:'POST',headers:{Authorization:'Bearer token'},body:JSON.stringify({dry_run:true})}));assert.equal(response.status,200);assert.deepEqual(await response.json(),{authenticated:true,deletionStarted:false});assert.equal(e.calls.length,1);
});
test('deletion requires explicit confirmation and rejects malformed body',async()=>{
 for(const body of ['{}','invalid','{"confirm":"true"}']){const e=endpoint();assert.equal((await e.handler(new Request('https://test',{method:'POST',headers:{Authorization:'Bearer token'},body}))).status,400);assert.equal(e.calls.length,1);}
});
