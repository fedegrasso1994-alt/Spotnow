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
