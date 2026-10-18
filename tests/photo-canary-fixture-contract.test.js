import test from 'node:test';
import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import {inspectPhoto} from '../src/photo-contract.js';
import {validateJpegPayload} from '../supabase/functions/_shared/photo-jpeg-validation.js';
test('canary JPEG fixture needs strict entropy preflight, not only header or permissive decoder acceptance',()=>{
 const data=new Uint8Array(64*64*4);for(let i=0;i<data.length;i+=4){data[i]=40;data[i+1]=(i+40)%255;data[i+2]=140;data[i+3]=255;}
 const image=jpeg.encode({data,width:64,height:64},85).data,header=inspectPhoto(image);
 assert.equal(header.format,'JPEG');assert.equal(jpeg.decode(image).width,64);
 assert.deepEqual([...image.subarray(-4)],[255,0,255,217]);
 assert.throws(()=>validateJpegPayload(image,header),e=>e.code==='INVALID');
});
