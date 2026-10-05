import test from 'node:test';import assert from 'node:assert/strict';import {renderAvatar} from '../src/avatar.js';import {dom} from './helpers/dom.js';
function setup(){const ui=dom();const old=globalThis.document;globalThis.document=ui.document;return {...ui,restore:()=>globalThis.document=old};}
test('broken photo keeps placeholder and an unchanged URL keeps the same image node',t=>{const ui=setup();t.after(ui.restore);const avatar=ui.get('face');renderAvatar(avatar,{photo:'/private-photo'});const image=avatar.children[0];renderAvatar(avatar,{photo:'/private-photo'});assert.equal(avatar.children[0],image);image.onerror();assert.equal(avatar.children.length,0);assert.equal(avatar.textContent,'📷');renderAvatar(avatar,{photo:'/new-signed-photo'});assert.equal(avatar.children.length,1);});
test('a late photo failure cannot remove a replacement photo',t=>{const ui=setup();t.after(ui.restore);const avatar=ui.get('face');renderAvatar(avatar,{photo:'/old'});const old=avatar.children[0];renderAvatar(avatar,{photo:'/new'});const current=avatar.children.at(-1);old.onerror();assert.equal(avatar.children.at(-1),current);assert.equal(current.src,'/new');});

test('pending image leaves the initial visible until a successful load',t=>{const ui=setup();t.after(ui.restore);const avatar=ui.get('face');renderAvatar(avatar,{name:'Anna',photo:'/slow'});const image=avatar.children[0];assert.equal(avatar.textContent,'A');assert.equal(image.style.opacity,'0');image.onload();assert.equal(image.style.opacity,'1');});

test('signed URL renewal and a transient request failure preserve a decoded image of the same file',t=>{
 const ui=setup();t.after(ui.restore);const face=ui.get('face');renderAvatar(face,{name:'Anna',photo_path:'anna/photo',photo:'/signed-1'});const image=face.children[0];image.onload();
 renderAvatar(face,{name:'Anna',photo_path:'anna/photo',photo:'/signed-2'});assert.equal(face.children[0],image);assert.equal(image.style.opacity,'1');
 renderAvatar(face,{name:'Anna',photo_path:'anna/photo',photo:null});assert.equal(face.children[0],image);
 renderAvatar(face,{name:'Anna',photo_path:'anna/replacement',photo:'/new-file'});assert.notEqual(face.children[0],image);
});
test('polling never restarts an image that is still downloading, and a failed URL can retry',t=>{
 const ui=setup();t.after(ui.restore);const face=ui.get('face');renderAvatar(face,{photo_path:'anna/photo',photo:'/slow'});const image=face.children[0];
 renderAvatar(face,{photo_path:'anna/photo',photo:null});renderAvatar(face,{photo_path:'anna/photo',photo:'/renewed'});assert.equal(face.children[0],image);
 image.onerror();renderAvatar(face,{photo_path:'anna/photo',photo:'/renewed'});assert.equal(face.children[0].src,'/renewed');
});
test('first visible photos are eager and clearing an account removes its decoded photo',t=>{
 const ui=setup();t.after(ui.restore);const face=ui.get('face');renderAvatar(face,{photo_path:'anna/photo',photo:'/photo'},{eager:true});assert.equal(face.children[0].loading,'eager');face.children[0].onload();renderAvatar(face,{name:'',photo:null});assert.equal(face.children.length,0);
});

test('choosing a new local photo replaces the old decoded photo before its storage path changes',t=>{
 const ui=setup();t.after(ui.restore);const face=ui.get('face');renderAvatar(face,{photoPath:'me/old',photo:'/old'});const image=face.children[0];image.onload();
 renderAvatar(face,{photoPath:'me/old',photo:'data:image/jpeg;base64,bmV3'});assert.notEqual(face.children[0],image);assert.equal(face.children[0].src,'data:image/jpeg;base64,bmV3');
});

test('metadata preview is visible before signing, survives a failed thumbnail and upgrades on load',t=>{
 const ui=setup();t.after(ui.restore);const face=ui.get('face'),profile={name:'Anna',photo_path:'a/full',thumbnail_path:'a/full.thumb.jpg',photo_preview:'data:image/jpeg;base64,YQ=='};renderAvatar(face,profile,{thumbnail:true});assert.equal(face.children[0].src,profile.photo_preview);
 renderAvatar(face,{...profile,photo:'/slow-thumb'},{thumbnail:true});let image=face.children.at(-1);assert.equal(face.children.length,2);image.onerror();assert.equal(face.children[0].src,profile.photo_preview);renderAvatar(face,{...profile,photo:'/retry'},{thumbnail:true});image=face.children.at(-1);assert.equal(image.src,'/retry');image.onload();assert.equal(face.children.length,1);assert.equal(face.children[0],image);renderAvatar(face,profile,{thumbnail:true});assert.equal(face.children[0],image);
});


test('detail upgrade keeps decoded thumbnail until the original loads and preserves it on failure',t=>{
 const ui=setup();t.after(ui.restore);const face=ui.get('face'),p={name:'Anna',photo_path:'a/full',thumbnail_path:'a/thumb',photo_preview:'data:image/jpeg;base64,YQ==',photo:'/thumb'};
 renderAvatar(face,p,{eager:true,thumbnail:true,progressive:true});const thumb=face.children.at(-1);thumb.onload();
 renderAvatar(face,{...p,photo:'/original'},{eager:true,progressive:true});const original=face.children.at(-1);
 assert.ok(face.children.includes(thumb));assert.equal(thumb.style.opacity,'1');original.onerror();assert.ok(face.children.includes(thumb));
 renderAvatar(face,{...p,photo:'/retry'},{eager:true,progressive:true});const retry=face.children.at(-1);retry.onload();assert.deepEqual(face.children,[retry]);assert.equal(retry.src,'/retry');
});
test('opening another profile never retains the previous person as a fallback',t=>{
 const ui=setup();t.after(ui.restore);const face=ui.get('face');renderAvatar(face,{photo_path:'a/full',photo:'/a'},{progressive:true});const old=face.children[0];old.onload();
 renderAvatar(face,{photo_path:'b/full',photo:'/b'},{progressive:true});assert.ok(!face.children.includes(old));old.onload();assert.equal(face.children[0].src,'/b');
});

test('full image bytes do not remove the visible thumbnail before decode finishes',async t=>{
 const {deferred,flush}=await import('./helpers/dom.js');const ui=setup();t.after(ui.restore);const face=ui.get('face'),p={photo_path:'decode/full',thumbnail_path:'decode/thumb',photo:'/thumb'};
 renderAvatar(face,p,{thumbnail:true,progressive:true});const thumb=face.children.at(-1);thumb.onload();renderAvatar(face,{...p,photo:'/full'},{progressive:true});const full=face.children.at(-1),decode=deferred();full.decode=()=>decode.promise;full.onload();assert.ok(face.children.includes(thumb));assert.equal(full.style.opacity,'0');decode.resolve();await flush();assert.deepEqual(face.children,[full]);assert.equal(full.style.opacity,'1');
});
test('failed full decode keeps the previous image and enables recovery',async t=>{
 const {flush}=await import('./helpers/dom.js');const ui=setup();t.after(ui.restore);const face=ui.get('face'),p={photo_path:'failure/full',thumbnail_path:'failure/thumb',photo:'/thumb'};let errors=0;
 renderAvatar(face,p,{thumbnail:true,progressive:true});const thumb=face.children.at(-1);thumb.onload();renderAvatar(face,{...p,photo:'/full'},{progressive:true,onError:()=>errors++});const full=face.children.at(-1);full.decode=()=>Promise.reject(Error('decode'));full.onload();await flush();assert.deepEqual(face.children,[thumb]);assert.equal(errors,1);
});
