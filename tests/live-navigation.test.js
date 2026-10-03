import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import {singleFlight,stableList} from '../src/ui-refresh.js';
import {userMessage} from '../src/errors.js';
import {createNavigation} from '../src/navigation.js';
import {renderAvatar} from '../src/avatar.js';
import {validProfile} from '../src/domain.js';
import {dom,Element,flush,deferred} from './helpers/dom.js';

const source=(await fs.readFile(new URL('../src/live.js',import.meta.url),'utf8')).replace(/^import .*\n/gm,'').replace(/const backend=connectBackend\([^\n]+\);/,'const backend=testBackend;').replace('export function onFirstMatch','function onFirstMatch');
const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
async function boot(overrides={},anonymous=false){
 const ui=dom();for(const [,id]of html.matchAll(/id="([^"]+)"/g))ui.get(id);for(const id of ['intro','scan','camera','login','onboarding','venue','tribes','tribe','matches','chats','myprofile','chat','match','suspended'])ui.screen(id);
 for(const [id,cls]of [['intro','btn-primary'],['venue','addr'],['login','sub'],['onboarding','disp'],['onboarding','backlink']]){const el=new Element();el.className=cls;ui.get(id).append(el);}
 const session={user:{id:'me',is_anonymous:anonymous}};let callback;const assigned=[],intervals=[],storage=new Map();
 const backend={session:async()=>session,onSessionChange:cb=>{callback=cb;},accountState:async()=> 'active',isSuspended:async()=>false,getProfile:async()=>({name:'Alex',age:28,gender:'M',preference:'ALL',photo_path:'me/photo'}),photoUrl:async()=>'/photo',ownCheckIn:async()=>({venue_id:'place',expires_at:new Date(Date.now()+600000).toISOString()}),getVenue:async()=>({id:'place',name:'Locale'}),locationPeople:async()=>[{id:'person',name:'Anna',age:25,photo_path:'person/photo',checked_in_at:new Date().toISOString(),expires_at:new Date(Date.now()+600000).toISOString()}],tribes:async()=>[{id:'place',name:'Locale',member_count:2,live_count:1}],googleLogin:async()=>({url:'https://accounts.google.com/oauth'}),linkGoogle:async()=>({url:'https://accounts.google.com/link'}),signOut:async()=>callback('SIGNED_OUT',null),...overrides};
 const window={addEventListener(type,handler){(this.listeners??={})[type]=handler;}};
 const context={renderAvatar,document:ui.document,window,testBackend:backend,validatePhoto:async file=>file,userMessage,createNavigation:(options)=>createNavigation({history:{state:null,replaceState(){},pushState(){}},...options}),singleFlight,stableList,validProfile,URL,URLSearchParams,Date,console,location:{search:'',href:'https://spot.example/',origin:'https://spot.example',pathname:'/',assign:url=>assigned.push(url)},history:{replaceState(){}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setInterval:fn=>{intervals.push(fn);return intervals.length;},setTimeout:()=>0,clearTimeout:()=>{},createVenueScanner:()=>({stop(){},open(){}}),setupInstallApp:()=>({close(){},showAfterMatch(){}}),createSuspensionScreen:()=>{},createLiveSocial:()=>({onScreen(){},resume(){},reset(){},openDetail(){},route(){return {}},restoreChat(){}})};
 vm.createContext(context);await vm.runInContext(`(async()=>{${source}})()`,context);await flush();
 return {...ui,window,backend,assigned,intervals,storage,callback};
}
test('background refresh preserves live row identity rather than showing loading every five seconds',async()=>{
 const ui=await boot();const row=ui.get('list').children[0];await ui.intervals[0]();await flush();assert.equal(ui.get('list').children[0],row);assert.equal(ui.get('list').children[0].className,'person');
});
test('resuming app does not reset chat, draft or unsaved profile form',async()=>{
 const ui=await boot();ui.window.go('chat');ui.get('chatIn').value='Bozza';ui.document.listeners.visibilitychange();await flush();assert.equal(ui.document.querySelector('.screen.active').id,'chat');assert.equal(ui.get('chatIn').value,'Bozza');
 ui.window.editProfile();ui.get('inName').value='Nome nuovo';ui.document.listeners.visibilitychange();await flush();assert.equal(ui.document.querySelector('.screen.active').id,'onboarding');assert.equal(ui.get('inName').value,'Nome nuovo');
});
test('Tribe profiles render in Tribe grid, never in Ora; navigation clears detail overlay',async()=>{
 const ui=await boot();ui.window.go('tribes');await flush();ui.get('tribesList').children[0].onclick();await flush();assert.equal(ui.get('tribeGrid').children[0].className,'tribe-card');assert.equal(ui.get('list').children[0].className,'person');
 ui.get('detailOverlay').classList.add('active');ui.window.go('myprofile');assert.equal(ui.get('detailOverlay').classList.contains('active'),false);
});
test('normal Google entry uses existing-account sign-in even for legacy anonymous session',async()=>{
 let signed=0,linked=0;const ui=await boot({googleLogin:async()=>{signed++;return {url:'https://accounts.google.com/oauth'};},linkGoogle:async()=>{linked++;return {}; }},true);
 ui.window.go('login');await ui.get('googleLoginBtn').onclick();assert.equal(signed,1);assert.equal(linked,0);assert.equal(ui.assigned[0],'https://accounts.google.com/oauth');
});
test('Google failure after signout stays on login with visible error and retry enabled',async()=>{
 const ui=await boot({googleLogin:async()=>{throw new Error('offline');}},true);ui.window.go('login');await ui.get('googleLoginBtn').onclick();assert.equal(ui.document.querySelector('.screen.active').id,'login');assert.match(ui.get('loginStatus').textContent,/Connessione non disponibile/);assert.equal(ui.get('googleLoginBtn').disabled,false);
});
test('slow list response cannot populate another screen after logout',async()=>{
 const wait=deferred();const ui=await boot({locationPeople:()=>wait.promise});ui.callback('SIGNED_OUT',null);wait.resolve([{id:'person',name:'Anna',age:25,photo_path:'person/photo',expires_at:new Date().toISOString()}]);await flush();assert.equal(ui.document.querySelector('.screen.active').id,'intro');assert.equal(ui.get('list').children.length,0);
});

test('editing an existing profile has a save action and returns to profile without a new check-in',async()=>{
 const ui=await boot();ui.window.editProfile();assert.equal(ui.get('profileBtn').textContent,'Salva modifiche');ui.get('onboarding').querySelector('.backlink').onclick();await flush();assert.equal(ui.document.querySelector('.screen.active').id,'myprofile');
});
test('profile photo is renewed when returning to profile after its signed URL expires',async()=>{
 let photos=0;const ui=await boot({photoUrl:async()=>`/photo-${++photos}`});ui.window.go('myprofile');await flush();const first=ui.get('mpAvatar').dataset.photoSource;ui.window.go('chats');ui.window.go('myprofile');await flush();assert.notEqual(ui.get('mpAvatar').dataset.photoSource,first);
});
test('signout clears profile fields and photo before another account can enter',async()=>{
 const ui=await boot();ui.callback('SIGNED_OUT',null);assert.equal(ui.get('inName').value,'');assert.equal(ui.get('inAge').value,'');assert.equal(ui.get('photoCircle').style.backgroundImage,'');
});

test('a slow former navigation cannot strand a newly opened Tribe in loading',async()=>{
 const first=deferred();let calls=0;const ui=await boot({tribes:()=>++calls===1?first.promise:Promise.resolve([{id:'place',name:'Locale',member_count:2,live_count:1}])});ui.window.go('tribes');await flush();ui.window.go('myprofile');ui.window.go('tribes');await flush();assert.equal(ui.get('tribesList').children[0].className,'person');first.resolve([]);await flush();assert.equal(ui.get('tribesList').children[0].className,'person');
});
test('a signed-in first-time account without QR can create its profile instead of being trapped in intro',async()=>{
 const ui=await boot({getProfile:async()=>null});assert.equal(ui.document.querySelector('.screen.active').id,'onboarding');
});
test('a partially deleted account opens a recoverable deletion screen',async()=>{
 const ui=await boot({accountState:async()=> 'deleting'});assert.equal(ui.document.querySelector('.screen.active').id,'deleting');
});
test('navigation cannot re-enable controls behind an already active dialog',async()=>{const ui=await boot();const dialog=ui.get('reportDialog');dialog.className='overlay active';ui.window.go('myprofile');assert.equal(ui.get('myprofile').inert,true);assert.equal(ui.get('tabbar').inert,true);});
