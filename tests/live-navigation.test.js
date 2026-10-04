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
async function boot(overrides={},anonymous=false,duringBoot,options={}){
 const ui=dom();for(const [,id]of html.matchAll(/id="([^"]+)"/g))ui.get(id);for(const id of ['intro','scan','camera','login','onboarding','venue','tribes','tribe','matches','chats','myprofile','chat','match','suspended'])ui.screen(id);
 for(const [id,cls]of [['intro','btn-primary'],['venue','addr'],['login','sub'],['onboarding','disp'],['onboarding','backlink']]){const el=new Element();el.className=cls;ui.get(id).append(el);}
 const session={user:{id:'me',is_anonymous:anonymous}};let callback,scanner;const assigned=[],intervals=[],storage=new Map(),drafts=options.drafts||new Map();
 const backend={session:async()=>session,onSessionChange:cb=>{callback=cb;},accountState:async()=> 'active',isSuspended:async()=>false,getProfile:async()=>({name:'Alex',age:28,gender:'M',preference:'ALL',photo_path:'me/photo'}),photoUrl:async()=>'/photo',ownCheckIn:async()=>({venue_id:'place',expires_at:new Date(Date.now()+600000).toISOString()}),getVenue:async()=>({id:'place',name:'Locale'}),locationPeople:async()=>[{id:'person',name:'Anna',age:25,photo_path:'person/photo',checked_in_at:new Date().toISOString(),expires_at:new Date(Date.now()+600000).toISOString()}],tribes:async()=>[{id:'place',name:'Locale',member_count:2,live_count:1}],googleLogin:async()=>({url:'https://accounts.google.com/oauth'}),linkGoogle:async()=>({url:'https://accounts.google.com/link'}),signOut:async()=>callback('SIGNED_OUT',null),...overrides};
 const window={addEventListener(type,handler){(this.listeners??={})[type]=handler;}};
 const context={FileReader:class{readAsDataURL(){this.result="data:image/jpeg;base64,ZGVtbw==";this.onload();}},renderAvatar,document:ui.document,window,testBackend:backend,validatePhoto:async file=>file,userMessage,createNavigation:(options)=>createNavigation({history:{state:null,replaceState(){},pushState(){}},...options}),singleFlight,stableList,validProfile,URL,URLSearchParams,Date,console,location:{search:options.search||'',href:'https://spot.example/'+(options.search||''),origin:'https://spot.example',pathname:'/',assign:url=>assigned.push(url)},history:{replaceState(){}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},localStorage:{getItem:k=>drafts.get(k),setItem:(k,v)=>drafts.set(k,v),removeItem:k=>drafts.delete(k)},setInterval:fn=>{intervals.push(fn);return intervals.length;},setTimeout:()=>0,clearTimeout:()=>{},createVenueScanner:options=>{scanner=options;return {stop(){},open(){}};},setupInstallApp:()=>({close(){},showAfterMatch(){}}),createSuspensionScreen:()=>{},createLiveSocial:()=>({onScreen(){},resume(){},reset(){},openDetail(){},route(){return {}},restoreChat(){}})};
 vm.createContext(context);const running=vm.runInContext(`(async()=>{${source}})()`,context);if(duringBoot){await flush();await duringBoot({...ui,window});}await running;await flush();
 return {...ui,window,backend,assigned,intervals,storage,drafts,callback,scanner};
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
 const first=deferred();let calls=0;const ui=await boot({tribes:()=>++calls===1?first.promise:Promise.resolve([{id:'place',name:'Locale',member_count:2,live_count:1}])});ui.window.go('tribes');await flush();ui.window.go('myprofile');ui.window.go('tribes');await flush();assert.equal(ui.get('tribesList').children[0].className,'person tribe-place');first.resolve([]);await flush();assert.equal(ui.get('tribesList').children[0].className,'person tribe-place');
});
test('a first-time account must scan a QR before creating its profile',async()=>{
 const ui=await boot({getProfile:async()=>null});assert.equal(ui.document.querySelector('.screen.active').id,'intro');ui.window.editProfile();assert.equal(ui.document.querySelector('.screen.active').id,'intro');
});
test('a partially deleted account opens a recoverable deletion screen',async()=>{
 const ui=await boot({accountState:async()=> 'deleting'});assert.equal(ui.document.querySelector('.screen.active').id,'deleting');
});
test('navigation cannot re-enable controls behind an already active dialog',async()=>{const ui=await boot();const dialog=ui.get('reportDialog');dialog.className='overlay active';ui.window.go('myprofile');assert.equal(ui.get('myprofile').inert,true);assert.equal(ui.get('tabbar').inert,true);});

test('opening scanner during slow account recovery never enters yesterday’s venue',async()=>{
 const wait=deferred();let reads=0;
 const ui=await boot({getProfile:()=>wait.promise,ownCheckIn:async()=>{reads++;return null;}},false,async ui=>{ui.window.go('camera');wait.resolve({name:'Alex',age:28,gender:'M',preference:'ALL',photo_path:'me/photo'});});
 assert.equal(ui.document.querySelector('.screen.active').id,'camera');assert.equal(reads,0);
});
test('only a freshly scanned QR exits scanner and performs check-in',async()=>{
 let token;const ui=await boot({scanVenue:async value=>{token=value;return {venue_id:'place',expires_at:new Date(Date.now()+600000).toISOString()};}});
 ui.window.go('camera');await flush();assert.equal(ui.document.querySelector('.screen.active').id,'camera');
 await ui.scanner.onScan('fresh-token');await flush();assert.equal(token,'fresh-token');assert.equal(ui.document.querySelector('.screen.active').id,'venue');
});
test('Ora discovery button opens the Tribe of the current place',async()=>{
 const ui=await boot();await ui.get('discoverTribeBtn').onclick();await flush();assert.equal(ui.document.querySelector('.screen.active').id,'tribe');assert.equal(ui.get('tribeTitle').textContent,'Locale');
});

test('completed profiles without a check-in land in Tribe and Ora requires a fresh scan',async()=>{
 let scans=0;const ui=await boot({ownCheckIn:async()=>null,scanVenue:async()=>{scans++;}});
 assert.equal(ui.document.querySelector('.screen.active').id,'tribes');ui.window.go('venue');await flush();
 assert.equal(scans,0);assert.equal(ui.get('discoverTribeBtn').hidden,true);assert.equal(ui.get('venue').querySelector('.addr').textContent,'Nessun check-in attivo');
 const button=ui.get('list').children.at(-1);assert.equal(button.textContent,'Scansiona il QR per vedere chi c’è qui ora');button.onclick();assert.equal(ui.document.querySelector('.screen.active').id,'camera');
});
test('expired check-ins land in Tribe without retrieving an obsolete venue or renewing presence',async()=>{
 const ui=await boot({ownCheckIn:async()=>({venue_id:'yesterday',expires_at:new Date(Date.now()-1).toISOString()}),getVenue:async()=>{throw Error('must not read expired venue');},scanVenue:async()=>{throw Error('must not renew');}});
 assert.equal(ui.document.querySelector('.screen.active').id,'tribes');
});
test('reopening an active check-in uses its original expiry without scanning again',async()=>{
 const checkin={venue_id:'place',checked_in_at:new Date(Date.now()-1800000).toISOString(),expires_at:new Date(Date.now()+3600000).toISOString()};let scans=0;
 const ui=await boot({ownCheckIn:async()=>checkin,scanVenue:async()=>{scans++;}});
 assert.equal(ui.document.querySelector('.screen.active').id,'venue');assert.equal(scans,0);assert.equal(ui.get('discoverTribeBtn').hidden,false);
});
test('new signed-in users validate the QR and retain its venue through profile creation',async()=>{
 let previewed,scans=0;const ui=await boot({getProfile:async()=>null,venuePreview:async token=>{previewed=token;return {id:'new-place',name:'Nuovo locale',member_count:3,live_count:1};},scanVenue:async()=>{scans++;}});
 ui.window.go('camera');await ui.scanner.onScan('new-token');
 assert.equal(previewed,'new-token');assert.equal(scans,0);assert.equal(ui.document.querySelector('.screen.active').id,'onboarding');assert.equal(ui.get('scanVenueName').textContent,'Nuovo locale');assert.equal(JSON.parse(ui.drafts.get('spot-onboarding-venue-v1')).owner,'me');
});
test('interrupted onboarding recovers a validated venue owned by the same account',async()=>{
 const drafts=new Map([['spot-onboarding-venue-v1',JSON.stringify({token:'draft-token',owner:'me'})]]);let previewed;
 const ui=await boot({getProfile:async()=>null,venuePreview:async token=>{previewed=token;return {id:'place',name:'Locale',member_count:1,live_count:0};}},false,undefined,{drafts});
 assert.equal(previewed,'draft-token');assert.equal(ui.document.querySelector('.screen.active').id,'onboarding');
});
test('a completed profile never replays an interrupted onboarding token',async()=>{
 const drafts=new Map([['spot-onboarding-venue-v1',JSON.stringify({token:'old-token',owner:'me'})]]);let scans=0;
 const ui=await boot({ownCheckIn:async()=>null,scanVenue:async()=>{scans++;}},false,undefined,{drafts});
 assert.equal(scans,0);assert.equal(ui.document.querySelector('.screen.active').id,'tribes');assert.equal(drafts.size,0);
});
test('another account cannot resume a stored onboarding venue',async()=>{
 const drafts=new Map([['spot-onboarding-venue-v1',JSON.stringify({token:'other-token',owner:'another-user'})]]);
 const ui=await boot({getProfile:async()=>null,venuePreview:async()=>{throw Error('must not preview another account draft');}},false,undefined,{drafts});assert.equal(ui.document.querySelector('.screen.active').id,'intro');
});
test('invalid QR does not enter onboarding, retain a draft or create a check-in',async()=>{
 let scans=0;const ui=await boot({getProfile:async()=>null,venuePreview:async()=>{throw Error('QR non valido');},scanVenue:async()=>{scans++;}});ui.window.go('camera');
 await assert.rejects(ui.scanner.onScan('invalid-token'));assert.equal(scans,0);assert.equal(ui.drafts.size,0);assert.equal(ui.document.querySelector('.screen.active').id,'camera');
});
test('a boot failure never dismisses a scanner the user has explicitly opened',async()=>{
 const wait=deferred();const ui=await boot({getProfile:()=>wait.promise},false,async ui=>{ui.window.go('camera');wait.reject(Error('offline'));});assert.equal(ui.document.querySelector('.screen.active').id,'camera');
});
test('the returning-account shortcut opens login without creating presence',async()=>{
 const ui=await boot({},true);ui.get('returningAccountBtn').onclick();assert.equal(ui.document.querySelector('.screen.active').id,'login');
});

test('saving a resumed first profile checks in once at the preserved venue without a second QR',async()=>{
 let profile=null,scans=0;const drafts=new Map([['spot-onboarding-venue-v1',JSON.stringify({token:'preserved-token',owner:'me'})]]);
 const ui=await boot({getProfile:async()=>profile,venuePreview:async()=>({id:'place',name:'Locale',member_count:1,live_count:0}),uploadPhoto:async()=> 'me/photo',saveProfile:async draft=>{profile={...draft,photo_path:draft.photo};},scanVenue:async token=>{assert.equal(token,'preserved-token');scans++;return {venue_id:'place',expires_at:new Date(Date.now()+5400000).toISOString()};}},false,undefined,{drafts});
 ui.get('inName').value='Alex';ui.get('inAge').value='28';const button=new Element();button.parentElement=new Element();button.parentElement.append(button);ui.window.setGender('M',button);
 await ui.window.handlePhoto({target:{files:[{type:'image/jpeg',size:100}]}});await ui.window.trySaveProfile();await flush();
 assert.equal(scans,1);assert.equal(ui.document.querySelector('.screen.active').id,'venue');assert.equal(drafts.size,0);
});
