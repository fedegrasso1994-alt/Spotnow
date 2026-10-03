import test from 'node:test';import assert from 'node:assert/strict';
import {boundedFetch} from '../src/request.js';import {userMessage} from '../src/errors.js';import {createNavigation} from '../src/navigation.js';import {validProfile} from '../src/domain.js';import {singleFlight} from '../src/ui-refresh.js';import {deferred,flush} from './helpers/dom.js';
test('network timeout aborts a hung request and permits a fresh request',async()=>{
 let calls=0;const api=boundedFetch((_input,{signal})=>{calls++;if(calls===2)return Promise.resolve(new Response('ok'));return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));},10);
 await assert.rejects(api('https://test'),/troppo tempo/);assert.equal(await (await api('https://test')).text(),'ok');
});
test('caller cancellation and normal completion do not leave timeout listeners active',async()=>{
 const ctrl=new AbortController();ctrl.abort(new Error('cancelled'));const api=boundedFetch((_input,{signal})=>{assert.equal(signal.aborted,true);return Promise.reject(signal.reason);},20);await assert.rejects(api('https://test',{signal:ctrl.signal}),/cancelled/);
});
test('single flight separates requests from another navigation generation',async()=>{
 const old=deferred();const api=singleFlight(generation=>generation===1?old.promise:'new');const pending=api(1);await flush();assert.equal(await api(2),'new');old.resolve('old');assert.equal(await pending,'old');
});
test('error copy never reveals database details or signed URLs',()=>{
 for(const message of ['relation profiles does not exist: secret','https://private/?token=secret','SQL failure uuid=private'])assert.equal(userMessage({message}),'Operazione non riuscita. Riprova.');assert.match(userMessage({message:'Failed to fetch'}),/Connessione/);
});
test('browser history restores only supported routes and contains no profile or token data',async()=>{
 const entries=[],restored=[];const history={state:null,replaceState(value){this.state=value;entries.push(value);},pushState(value){this.state=value;entries.push(value);}};const nav=createNavigation({history,onNavigate:route=>restored.push(route)});
 nav.record('venue');nav.record('chats');nav.record('chat',{matchId:'match-id'});await nav.back({state:entries[1]});assert.equal(restored[0].screen,'chats');await nav.back({state:{spotRoute:{screen:'javascript'}}});assert.equal(restored.length,1);assert.equal(JSON.stringify(entries).includes('token'),false);
});
test('profile validates age, name, preference and an already uploaded photo independently of signed URL',()=>{
 const profile={name:'Anna',age:24,gender:'F',preference:'ALL',photoPath:'me/photo'};assert.equal(validProfile(profile),true);
 for(const patch of [{age:121},{age:18.5},{name:'a'.repeat(61)},{name:'  '},{preference:'INVALID'},{photoPath:null}])assert.equal(validProfile({...profile,...patch}),false);
});

test('image upload rejects an HTML file renamed to JPEG',async()=>{
 const {validatePhoto}=await import('../src/photo.js');const renamed=new Blob(['<html><script>bad</script>'],{type:'image/jpeg'});await assert.rejects(validatePhoto(renamed),/foto JPG/);
 const valid=new Blob([new Uint8Array([255,216,255,224,0,16])],{type:'image/jpeg'});assert.equal(await validatePhoto(valid),valid);
});
