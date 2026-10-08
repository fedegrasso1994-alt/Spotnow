import test from'node:test';import assert from'node:assert/strict';import jpeg from'jpeg-js';import{createPhotoUpload}from'../src/photo-upload.js';import{photoUploadHandler}from'../supabase/functions/_shared/photo-upload.js';
const bytes=jpeg.encode({width:2,height:2,data:new Uint8Array(16).fill(255)},85).data,nonce='40000000-0000-4000-8000-000000000001';
test('client retries immutable file with same nonce, exposes safe server errors, never falls back to raw Storage',async()=>{const calls=[],file=new Blob([bytes],{type:'image/jpeg'});let fail=true;const client={functions:{invoke:async(name,args)=>{calls.push({name,args});return fail?{error:{context:new Response(JSON.stringify({code:'MEMORY'}))}}:{data:{ready:true,photo_path:'caller/validated.jpg'}};}}};const upload=createPhotoUpload(client,async()=> 'caller');await assert.rejects(upload(file),e=>e.code==='MEMORY');fail=false;assert.equal(await upload(file),'caller/validated.jpg');assert.equal(calls[0].args.headers['X-Photo-Request-Id'],calls[1].args.headers['X-Photo-Request-Id']);assert.equal(calls[0].args.body,file);await upload(new Blob([bytes],{type:'image/jpeg'}));assert.notEqual(calls[2].args.headers['X-Photo-Request-Id'],calls[0].args.headers['X-Photo-Request-Id']);});
function endpoint(failure){const calls=[];const admin={auth:{getUser:async()=>({data:{user:{id:'caller'}}})},rpc:name=>({then(resolve){calls.push(name);resolve({data:name.endsWith('begin_photo_upload')?{photo_path:'caller/validated.jpg',lease_token:'lease'}:name==='photo_upload_lease_active'?true:name==='finish_photo_upload'?'caller/validated.jpg':null,error:null});}}),storage:{from:()=>({upload:async(path,data)=>{calls.push(['upload',path]);return{error:failure==='storage'?{}:null};}})}};
 const fetcher=async()=>{if(failure==='worker')throw Error('network');return new Response(JSON.stringify({detail:Buffer.from(bytes).toString('base64'),thumbnail:Buffer.from(bytes).toString('base64'),preview:'data:image/jpeg;base64,'+Buffer.from(bytes).toString('base64')}));};
 return {calls,handler:photoUploadHandler({admin,url:'https://stage',serviceKey:'service',fetcher})};}
const request=()=>new Request('https://stage',{method:'POST',headers:{Authorization:'Bearer user','X-Photo-Request-Id':nonce,'Content-Type':'application/octet-stream'},body:bytes});
test('only three canonical objects are uploaded and registration follows successful writes',async()=>{const e=endpoint();const r=await e.handler(request());assert.equal(r.status,200);assert.equal((await r.json()).ready,true);assert.equal(e.calls.filter(c=>Array.isArray(c)).length,3);assert.equal(e.calls.at(-1),'finish_photo_upload');});
test('worker/storage failures never finalize publication and release the lease safely',async()=>{for(const failure of['worker','storage']){const e=endpoint(failure),r=await e.handler(request());assert.equal(r.status,503);assert.equal((await r.json()).code,'UPLOAD');assert.ok(!e.calls.includes('finish_photo_upload'));assert.equal(e.calls.at(-1),'fail_photo_upload');assert.equal((await e.handler(new Request('https://stage',{method:'POST'}))).status,401);}});
test('8 MiB exact client boundary: over limit makes no backend call, valid retry still works',async()=>{
 const calls=[];const client={functions:{invoke:async(name,args)=>{calls.push(args.body.size);return{data:{ready:true,photo_path:'caller/validated.jpg'}};}}};
 const upload=createPhotoUpload(client,async()=> 'caller');const exact=new Blob([new Uint8Array(8388608)],{type:'image/jpeg'}),above=new Blob([new Uint8Array(8388609)],{type:'image/jpeg'});
 await assert.rejects(upload(above),/8 MB/);assert.deepEqual(calls,[]);
 assert.equal(await upload(exact),'caller/validated.jpg');assert.deepEqual(calls,[8388608]);
 assert.equal(await upload(new Blob([bytes],{type:'image/jpeg'})),'caller/validated.jpg');assert.equal(calls.length,2);
});
test('server rejects over-8-MiB declared and streamed bodies before creating a job or writing Storage',async()=>{
 for(const declared of[true,false]){
  const calls=[];const admin={auth:{getUser:async()=>({data:{user:{id:'caller'}}})},rpc:async()=>{calls.push('rpc');throw Error('must not create jobs');},storage:{from:()=>{calls.push('storage');throw Error('must not write');}}};
  const handler=photoUploadHandler({admin,url:'https://test',serviceKey:'service',fetcher:async()=>{calls.push('worker');throw Error('must not decode');}});
  const headers={Authorization:'Bearer user','X-Photo-Request-Id':nonce,'Content-Type':'application/octet-stream'};if(declared)headers['Content-Length']='8388609';
  const response=await handler(new Request('https://test',{method:'POST',headers,body:new Uint8Array(declared?1:8388609)}));
  assert.equal(response.status,413);assert.equal((await response.json()).code,'SIZE');assert.deepEqual(calls,[]);
 }
});
test('legacy normalization review: mixed Storage success leaves unpublished partial objects; old reference stays safe',async()=>{
 const written=[],calls=[];const admin={auth:{getUser:async()=>({data:{user:{id:'caller'}}})},rpc:async name=>{calls.push(name);return{data:name.endsWith('begin_photo_upload')?{photo_path:'caller/new.jpg',lease_token:'lease'}:name==='photo_upload_lease_active'?true:null,error:null};},storage:{from:()=>({upload:async path=>{if(path.endsWith('.thumb.jpg'))return{error:{message:'injected failure'}};written.push(path);return{error:null};}})}};
 const asset={detail:Buffer.from(bytes).toString('base64'),thumbnail:Buffer.from(bytes).toString('base64'),preview:'data:image/jpeg;base64,'+Buffer.from(bytes).toString('base64')};
 const handler=photoUploadHandler({admin,url:'https://test',serviceKey:'service',fetcher:async()=>new Response(JSON.stringify(asset))});
 const response=await handler(request());assert.equal(response.status,503);assert.equal((await response.json()).code,'UPLOAD');assert.equal(written.length,2);assert.ok(!calls.includes('finish_photo_upload'));assert.ok(!calls.includes('publish_normalized_photo'));assert.equal(calls.at(-1),'fail_photo_upload');
});
