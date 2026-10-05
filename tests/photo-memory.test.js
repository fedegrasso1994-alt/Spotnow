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

test('Tribe warming actually downloads only the first four thumbnails and a logout invalidates late loads',async t=>{
 clearPhotoMemory();const previous=globalThis.Image,downloads=[],callbacks=[];globalThis.Image=class{constructor(){Object.assign(this,image(callbacks));downloads.push(this);}set src(value){this.url=value;}};t.after(()=>{globalThis.Image=previous;clearPhotoMemory();});let reads=0;
 const api=createBackend({auth:{signOut:async()=>({data:null})},rpc:async()=>{reads++;return {data:Array.from({length:8},(_,i)=>({id:String(i),photo_path:`${i}/full`,thumbnail_path:`${i}/thumb`,total_count:8}))};},storage:{from:()=>({createSignedUrls:async paths=>({data:paths.map(path=>({path,signedUrl:'/private/'+path}))})})}});await api.prefetchTribe('place');assert.equal(downloads.length,4);assert.deepEqual(downloads.map(i=>i.url),['/private/0/thumb','/private/1/thumb','/private/2/thumb','/private/3/thumb']);await api.locationPeoplePage('place',false);assert.equal(reads,1);downloads[0].onload();callbacks[0](new Blob(['pixels']));assert.ok(cachedPhoto('0/thumb'));await api.signOut();downloads[1].onload();assert.equal(callbacks.length,1);assert.equal(cachedPhoto('0/thumb'),null);
});

test('a late load in a detached avatar cannot repopulate the photo memory after logout',async t=>{
 const {renderAvatar}=await import('../src/avatar.js'),{dom}=await import('./helpers/dom.js');clearPhotoMemory();const ui=dom(),face=ui.get('face'),row=ui.get('row'),list=ui.get('list'),callbacks=[];row.append(face);list.append(row);renderAvatar(face,{photo_path:'former/photo',photo:'/private-url'});const loading=face.querySelector('img');Object.assign(loading,image(callbacks));list.replaceChildren();clearPhotoMemory();loading.onload();assert.equal(callbacks.length,0);assert.equal(cachedPhoto('former/photo'),null);t.after(clearPhotoMemory);
});

test('eviction cannot revoke a cached image during detail decode but logout always revokes it',async()=>{
 const {retainPhotoSource}=await import('../src/photo-memory.js');clearPhotoMemory();const callbacks=[];rememberPhoto('shown/full',image(callbacks));callbacks[0](new Blob(['pixels']));const url=cachedPhoto('shown/full'),release=retainPhotoSource(url);
 for(let i=0;i<65;i++){const c=[];rememberPhoto(`${i}/new`,image(c));c[0](new Blob(['new']));}
 assert.equal(cachedPhoto('shown/full'),null);assert.equal(await (await fetch(url)).text(),'pixels');release();await assert.rejects(fetch(url));
 const c=[];rememberPhoto('logout/full',image(c));c[0](new Blob(['private']));const privateUrl=cachedPhoto('logout/full'),held=retainPhotoSource(privateUrl);clearPhotoMemory();await assert.rejects(fetch(privateUrl));held();
});
