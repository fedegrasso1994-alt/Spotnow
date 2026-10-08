/** Temporary service-only staging probe. Never deploy this endpoint to production. */
import {readFile,writeFile}from'node:fs/promises';
let source=await readFile('/tmp/soma-photo01-edge/photo-normalize-png.ts','utf8');
source="import webpFactory from 'npm:@jsquash/webp@1.5.0/codec/dec/webp_dec.js';\n"+source;
source=source.replace(/const processor=createPhotoProcessor\([^\n]+\);/,`const processors=Object.fromEntries(['JPEG','PNG','WebP'].map(kind=>[kind,createPhotoProcessor(kind,{Inflate,encoderFactory:createBoundedJpegEncoder,webpFactory,memory:()=>Deno.memoryUsage()})]));
const processor={process:async bytes=>{if(bytes.length>65536)rejectPhoto('SIZE');const kind=inspectPhoto(bytes).format,p=processors[kind],reuse=[];let asset;
for(const [name,input]of [['valid',bytes],['corrupt',bytes.subarray(0,bytes.length-7)],['valid-after-failure',bytes],['invalid',new Uint8Array([1,2,3])],['valid-again',bytes]]){const before=Deno.memoryUsage();try{asset=await p.process(input);reuse.push({name,status:'PASS',linear:p.memoryBytes,before,after:Deno.memoryUsage()});}catch(e){reuse.push({name,status:'REJECT SAFE',code:e.code,linear:p.memoryBytes,before,after:Deno.memoryUsage()});}}
return {...asset,reuse};}};`);
source=source.replace('Deno.serve(photoWorker','if(!url.includes("zjinjtkekmaqtxsuyvho"))throw Error("STAGING ONLY");\nDeno.serve(photoWorker');
await writeFile('/tmp/soma-photo01-edge/photo01-verification.ts',source);console.log('staging-only probe generated');
