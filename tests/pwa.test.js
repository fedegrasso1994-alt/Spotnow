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

function navigationWorker(fetch,match){
 const events={};
 vm.runInNewContext(source,{URL,Response,fetch,caches:{match},self:{location:{origin:'https://spot.example'},addEventListener:(type,handler)=>events[type]=handler}});
 return async()=>{let response;events.fetch({request:{url:'https://spot.example/',mode:'navigate',method:'GET'},respondWith:p=>response=p});return response;};
}
test('navigation HTTP errors and auth redirects do not trigger the offline explanation',async()=>{
 for(const status of [200,302,401,403,500]){
  const response=new Response('upstream response',{status});
  const navigate=navigationWorker(async()=>response,async()=>assert.fail('HTTP status is not a network rejection'));
  assert.equal(await navigate(),response);
 }
});
test('navigation fetch rejection triggers fallback without consulting navigator online or Auth state',async()=>{
 const offline=new Response('cached static offline explanation');let matches=0;
 const navigate=navigationWorker(async()=>{throw new TypeError('Failed to fetch');},async path=>{assert.equal(path,'/offline.html');matches++;return offline;});
 assert.equal(await navigate(),offline);assert.equal(matches,1);
});
test('worker retries navigation over the network after failure and never caches the failed document',async()=>{
 let attempt=0,matches=0;const online=new Response('application HTML');
 const navigate=navigationWorker(async()=>{if(++attempt===1)throw Error('network failure');return online;},async()=>{matches++;return undefined;});
 const fallback=await navigate();assert.equal(fallback.status,503);
 assert.equal(await navigate(),online);assert.equal(attempt,2);assert.equal(matches,1);
});
