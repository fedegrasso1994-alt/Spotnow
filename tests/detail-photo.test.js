import test from 'node:test';import assert from 'node:assert/strict';
import {createDetailPhoto} from '../src/detail-photo.js';import {renderAvatar,clearAvatar} from '../src/avatar.js';import {clearPhotoMemory,cachedPhoto,rememberPhoto} from '../src/photo-memory.js';import {dom,deferred,flush} from './helpers/dom.js';
function setup(t,backend){const ui=dom(),old={document:globalThis.document,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};const timers=new Map();let id=0;globalThis.document=ui.document;globalThis.setTimeout=(fn)=>{timers.set(++id,fn);return id;};globalThis.clearTimeout=n=>timers.delete(n);clearPhotoMemory();t.after(()=>{clearPhotoMemory();Object.assign(globalThis,old);});const face=ui.get('face'),status=ui.get('status');return {...ui,face,status,timers,controller:createDetailPhoto({backend,avatar:renderAvatar,clearAvatar,element:face,status})};}
const record={id:'a',name:'Anna',photo_path:'a/full',thumbnail_path:'a/thumb',photo:'/thumb'};
test('original decode upgrades the detail without clearing its thumbnail or mutating grid data',async t=>{
 const pending=deferred();const ui=setup(t,{photoUrl:()=>pending.promise});ui.controller.open(record);const thumb=ui.face.children.at(-1);thumb.onload();pending.resolve('/original');await flush();const full=ui.face.children.at(-1);assert.ok(ui.face.children.includes(thumb));assert.equal(ui.status.hidden,false);full.onload();assert.deepEqual(ui.face.children,[full]);assert.equal(ui.status.hidden,true);assert.equal(record.photo,'/thumb');
});
test('failed original renews its URL automatically while the decoded fallback stays visible',async t=>{
 const requests=[];const ui=setup(t,{photoUrl:async(path,options)=>{requests.push(options);return '/original-'+requests.length;}});ui.controller.open(record);const thumb=ui.face.children.at(-1);thumb.onload();await flush();ui.face.children.at(-1).onerror();assert.ok(ui.face.children.includes(thumb));const retry=[...ui.timers.values()].at(-1);ui.timers.clear();retry();await flush();const full=ui.face.children.at(-1);assert.equal(full.src,'/original-2');assert.equal(requests[1].refresh,true);full.onload();assert.equal(ui.status.hidden,true);
});
test('switching profile or closing cancels late full photo and pending retry',async t=>{
 const wait=deferred();const ui=setup(t,{photoUrl:()=>wait.promise});ui.controller.open(record);ui.controller.stop();wait.resolve('/late');await flush();assert.equal(ui.face.children.length,0);assert.equal(ui.timers.size,0);assert.equal(ui.status.hidden,true);
});
test('a late thumbnail cannot downgrade an already decoded original',async t=>{
 const tiny=deferred();const ui=setup(t,{photoUrl:async path=>path==='a/thumb'?tiny.promise:'/original'});ui.controller.open({...record,photo:null});await flush();const full=ui.face.children.at(-1);full.onload();tiny.resolve('/thumb');await flush();assert.deepEqual(ui.face.children,[full]);assert.equal(full.src,'/original');
});
test('reopening a cached full photo shows it immediately and clears loading status after decode',async t=>{
 const ui=setup(t,{photoUrl:async()=>cachedPhoto('a/full')});let callback;rememberPhoto('a/full',{naturalWidth:1600,naturalHeight:1200,ownerDocument:{createElement:()=>({getContext:()=>({drawImage(){}}),toBlob:cb=>callback=cb})}});callback(new Blob(['pixels']));ui.controller.open(record);await flush();const full=ui.face.children.at(-1);assert.match(full.src,/^blob:/);full.onload();assert.equal(ui.status.hidden,true);assert.equal(ui.face.children.length,1);
});

test('thumbnail arriving during full download becomes fallback without cancelling the original',async t=>{
 const tiny=deferred();const ui=setup(t,{photoUrl:async path=>path==='a/thumb'?tiny.promise:'/original'});ui.controller.open({...record,photo:null,photo_preview:'data:image/jpeg;base64,YQ=='});await flush();const full=ui.face.children.at(-1);tiny.resolve('/thumb');await flush();const thumb=ui.face.children.at(-1);thumb.onload();assert.ok(ui.face.children.includes(full));assert.ok(ui.face.children.includes(thumb));full.onload();assert.deepEqual(ui.face.children,[full]);assert.equal(ui.status.hidden,true);
});
test('retries are bounded and a failed full download exposes an explicit retry without dropping the fallback',async t=>{
 let calls=0;const ui=setup(t,{photoUrl:async()=>{calls++;throw Error('offline');}});ui.controller.open(record);const thumb=ui.face.children.at(-1);thumb.onload();await flush();for(let i=0;i<2;i++){const next=[...ui.timers.values()].at(-1);ui.timers.clear();next();await flush();}assert.equal(calls,3);assert.equal(ui.timers.size,0);assert.equal(ui.status.disabled,false);assert.equal(ui.status.textContent,'Riprova foto HD');assert.ok(ui.face.children.includes(thumb));
});

test('a stalled full image times out without removing the loaded thumbnail',async t=>{
 const ui=setup(t,{photoUrl:async()=>'/stalled'});ui.controller.open(record);const thumb=ui.face.children.at(-1);thumb.onload();await flush();const full=ui.face.children.at(-1);const timeout=[...ui.timers.values()].at(-1);timeout();assert.ok(ui.face.children.includes(thumb));assert.ok(!ui.face.children.includes(full));assert.equal(ui.status.hidden,false);assert.ok(ui.timers.size>0);
});
