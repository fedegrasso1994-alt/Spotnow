import test from 'node:test';
import assert from 'node:assert/strict';
import {photoForProfileSave} from '../src/profile-photo-save.js';
import {PhotoError} from '../src/photo-contract.js';
test('profile can reuse server-confirmed current photo when replacement admission is paused',async()=>{
 const result=await photoForProfileSave({file:{},path:'owner/current',uploadPhoto:async()=>{throw new PhotoError('PAUSED');},currentProfile:async()=>({photo_path:'owner/current'})});
 assert.deepEqual(result,{path:'owner/current',reusedCurrent:true});
});
test('local preview, unpublished draft and changed account never substitute for canonical current photo',async()=>{
 for(const [path,current]of [[undefined,null],['owner/draft',{photo_path:'owner/current'}],['owner/current',null],['owner/current',{photo_path:'other/current'}]]){
  await assert.rejects(photoForProfileSave({file:{},path,uploadPhoto:async()=>{throw new PhotoError('PAUSED');},currentProfile:async()=>current}),e=>e.code==='PAUSED');
 }
});
test('profile photo upload errors besides admission pause are not hidden or auto-published',async()=>{
 for(const code of ['INVALID','UPLOAD','MEMORY','RATE'])await assert.rejects(photoForProfileSave({file:{},path:'owner/current',uploadPhoto:async()=>{throw new PhotoError(code);},currentProfile:async()=>{throw Error('must not read');}}),e=>e.code===code);
});
test('normal upload and metadata-only save preserve existing photo protocol',async()=>{
 assert.deepEqual(await photoForProfileSave({file:{},path:'owner/current',uploadPhoto:async()=> 'owner/new'}),{path:'owner/new',reusedCurrent:false});
 assert.deepEqual(await photoForProfileSave({path:'owner/current',uploadPhoto:async()=>{throw Error('no upload');}}),{path:'owner/current',reusedCurrent:false});
});
