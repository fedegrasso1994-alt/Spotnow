import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
test('offline worker leaves photos, auth and chat API requests untouched',()=>{
 const events={};vm.runInNewContext(source,{URL,self:{location:{origin:'https://spot.example'},addEventListener:(type,handler)=>events[type]=handler}});
 for(const url of ['https://project.supabase.co/auth/v1/token','https://project.supabase.co/rest/v1/messages','https://spot.example/assets/app.js']){
  events.fetch({request:{url,mode:'cors',method:'GET'},respondWith:()=>assert.fail('Private/API request intercepted')});
 }
});
test('offline fallback caches only a static explanation and never a navigation URL',async()=>{
 const events={},stored=[];let response;
 vm.runInNewContext(source,{self:{location:{origin:'https://spot.example'},addEventListener:(type,handler)=>events[type]=handler},caches:{open:async()=>({add:async path=>stored.push(path)}),match:async path=>({offline:path})},fetch:async()=>{throw new Error('offline');},URL,Response});
 let install;events.install({waitUntil:p=>install=p});await install;
 events.fetch({request:{url:'https://spot.example/?venue=private-token',mode:'navigate',method:'GET'},respondWith:p=>response=p});
 assert.deepEqual(await response,{offline:'/offline.html'});assert.deepEqual(stored,['/offline.html']);
});
