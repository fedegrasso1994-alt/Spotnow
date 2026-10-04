import test from 'node:test';
import assert from 'node:assert/strict';
import {optimizePhoto} from '../src/optimize-photo.js';
function setup(t,{width=4000,height=3000,blob=new Blob(['webp'],{type:'image/webp'})}={}){
 const saved={document:globalThis.document,createImageBitmap:globalThis.createImageBitmap};t.after(()=>Object.assign(globalThis,saved));let closed=0,draw;
 const canvas={getContext:()=>({drawImage:(...args)=>draw=args}),toBlob:cb=>cb(blob)};
 globalThis.document={createElement:()=>canvas};globalThis.createImageBitmap=async()=>({width,height,close:()=>closed++});return {canvas,closed:()=>closed,draw:()=>draw};
}
test('large new photos are reduced proportionally to 1024 pixels and encoded before upload',async t=>{
 const ui=setup(t);const file=new File([new Uint8Array(800000)],'photo.jpg',{type:'image/jpeg',lastModified:123});const optimized=await optimizePhoto(file);
 assert.equal(ui.canvas.width,1024);assert.equal(ui.canvas.height,768);assert.equal(optimized.type,'image/webp');assert.ok(optimized.size<file.size);assert.equal(optimized.lastModified,123);assert.equal(ui.closed(),1);
});
test('small photos are not enlarged or recompressed',async t=>{
 const ui=setup(t,{width:600,height:900});const file=new File(['small'],'photo.jpg',{type:'image/jpeg'});assert.equal(await optimizePhoto(file),file);assert.equal(ui.draw(),undefined);assert.equal(ui.closed(),1);
});
test('unsupported encoding keeps the original upload and releases the decoded image',async t=>{
 const ui=setup(t,{blob:new Blob(['png'],{type:'image/png'})});const file=new File([new Uint8Array(800000)],'photo.jpg',{type:'image/jpeg'});assert.equal(await optimizePhoto(file),file);assert.equal(ui.closed(),1);
});
