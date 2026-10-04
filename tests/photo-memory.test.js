import test from 'node:test';import assert from 'node:assert/strict';
import {cachedPhoto,rememberPhoto,clearPhotoMemory} from '../src/photo-memory.js';
import {createBackend} from '../src/backend.js';
function image(callbacks){return {naturalWidth:4000,naturalHeight:3000,ownerDocument:{createElement:()=>({getContext:()=>({drawImage(){}}),toBlob:cb=>callbacks.push(cb)})}};}
test('decoded photos are reused without signing again, and logout revokes them',async()=>{
 clearPhotoMemory();const callbacks=[];rememberPhoto('me/photo',image(callbacks));callbacks[0](new Blob(['pixels'],{type:'image/webp'}));const url=cachedPhoto('me/photo');assert.match(url,/^blob:/);
 let signed=0;const api=createBackend({auth:{signOut:async()=>({data:null})},storage:{from:()=>({createSignedUrl:()=>{signed++;}})}});assert.equal(await api.photoUrl('me/photo'),url);assert.equal((await api.photoUrls(['me/photo'])).get('me/photo'),url);assert.equal(signed,0);await api.signOut();assert.equal(cachedPhoto('me/photo'),null);await assert.rejects(fetch(url));
});
test('late canvas results cannot restore private photos after account reset',()=>{
 clearPhotoMemory();const callbacks=[];rememberPhoto('old/photo',image(callbacks));clearPhotoMemory();callbacks[0](new Blob(['old pixels']));assert.equal(cachedPhoto('old/photo'),null);
});
test('photo memory is bounded to 64 recently used files',()=>{
 clearPhotoMemory();for(let i=0;i<65;i++){const callbacks=[];rememberPhoto(`${i}/photo`,image(callbacks));callbacks[0](new Blob(['pixels']));}assert.equal(cachedPhoto('0/photo'),null);assert.ok(cachedPhoto('64/photo'));clearPhotoMemory();
});
