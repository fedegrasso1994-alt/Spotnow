import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import {singleFlight,stableList} from '../src/ui-refresh.js';
import {userMessage} from '../src/errors.js';
import {createNavigation} from '../src/navigation.js';
import {renderAvatar} from '../src/avatar.js';
import {validProfile} from '../src/domain.js';
import {createPager} from '../src/pagination.js';
import {dom,Element,flush,deferred} from './helpers/dom.js';

import {photoVariants} from '../src/photo-variants.js';
const source=(await fs.readFile(new URL('../src/live.js',import.meta.url),'utf8')).replace(/^import .*\n/gm,'').replace(/const backend=connectBackend\([^\n]+\);/,'const backend=testBackend;').replace('export function onFirstMatch','function onFirstMatch');
const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
async function boot(overrides={},anonymous=false,duringBoot,options={}){
 const ui=dom();for(const [,id]of html.matchAll(/id="([^"]+)"/g))ui.get(id);for(const id of ['boot','intro','scan','camera','login','onboarding','venue','tribes','tribe','matches','chats','myprofile','chat','match','suspended'])ui.screen(id);
 for(const [id,cls]of [['intro','btn-primary'],['venue','addr'],['login','sub'],['onboarding','disp'],['onboarding','backlink']]){const el=new Element();el.className=cls;ui.get(id).append(el);}
 ui.activate('boot');
 const session={user:{id:'me',is_anonymous:anonymous}};let callback,scanner;const assigned=[],intervals=[],storage=new Map(),drafts=options.drafts||new Map();
 const backend={session:async()=>session,onSessionChange:cb=>{callback=cb;},accountState:async()=> 'active',isSuspended:async()=>false,getProfile:async()=>({name:'Alex',age:28,gender:'M',preference:'ALL',photo_path:'me/photo'}),photoUrl:async()=>'/photo',ownCheckIn:async()=>({venue_id:'place',expires_at:new Date(Date.now()+600000).toISOString()}),getVenue:async()=>({id:'place',name:'Locale'}),locationPeople:async()=>[{id:'person',name:'Anna',age:25,photo_path:'person/photo',checked_in_at:new Date().toISOString(),expires_at:new Date(Date.now()+600000).toISOString()}],tribes:async()=>[{id:'place',name:'Locale',member_count:2,live_count:1}],googleLogin:async()=>({url:'https://accounts.google.com/oauth'}),linkGoogle:async()=>({url:'https://accounts.google.com/link'}),signOut:async()=>callback('SIGNED_OUT',null),...overrides};
 const window={addEventListener(type,handler){(this.listeners??={})[type]=handler;}};
 const context={FileReader:class{readAsDataURL(){this.result="data:image/jpeg;base64,ZGVtbw==";this.onload();}},renderAvatar,document:ui.document,window,testBackend:backend,optimizePhoto:async file=>file,validatePhoto:async file=>file,userMessage,createNavigation:(options)=>createNavigation({history:{state:null,replaceState(){},pushState(){}},...options}),singleFlight,stableList,createPager,validProfile,photoVariants:options.photoVariants||photoVariants,URL,URLSearchParams,Date,console,location:{search:options.search||'',href:'https://spot.example/'+(options.search||''),origin:'https://spot.example',pathname:'/',assign:url=>assigned.push(url)},history:{replaceState(){}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},localStorage:{getItem:k=>drafts.get(k),setItem:(k,v)=>drafts.set(k,v),removeItem:k=>drafts.delete(k)},setInterval:fn=>{intervals.push(fn);return intervals.length;},setTimeout:()=>0,clearTimeout:()=>{},createVenueScanner:options=>{scanner=options;return {stop(){},open(){}};},setupInstallApp:()=>({close(){},showAfterMatch(){}}),createSuspensionScreen:()=>{},createLiveSocial:()=>({onScreen(){},resume(){},reset(){},openDetail(){},route(){return {}},restoreChat(){}})};
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
test('renewing the own photo URL never restarts the same pending image',async()=>{
 let photos=0;const ui=await boot({photoUrl:async()=>`/photo-${++photos}`});ui.window.go('myprofile');await flush();const first=ui.get('mpAvatar').children[0];ui.window.go('chats');ui.window.go('myprofile');await flush();assert.equal(ui.get('mpAvatar').children[0],first);assert.ok(photos>=3);
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

test('Tribe cards are usable while photos load, and refresh failures do not erase decoded photos',async()=>{
 const wait=deferred();let calls=0;const ui=await boot({ownCheckIn:async()=>null,photoUrls:()=>++calls===1?wait.promise:Promise.reject(Error('offline'))});
 ui.window.go('tribes');await flush();ui.get('tribesList').children[0].onclick();await flush();const card=ui.get('tribeGrid').children[0];assert.equal(card.className,'tribe-card');assert.equal(typeof card.onclick,'function');
 wait.resolve(new Map([['person/photo','/anna']]));await flush();const image=card.querySelector('img');image.onload();await ui.intervals[0]();await flush();assert.equal(ui.get('tribeGrid').children[0],card);assert.equal(card.querySelector('img'),image);assert.equal(image.style.opacity,'1');
});

test('10,000 people remain bounded to 48 cards per page during repeated navigation',async()=>{
 const people=Array.from({length:10000},(_,i)=>({id:`person-${i}`,name:`Persona ${i}`,age:25,photo_path:`person-${i}/photo`,checked_in_at:new Date().toISOString(),expires_at:new Date(Date.now()+5400000).toISOString()}));let largestPhotos=0;
 const ui=await boot({locationPeoplePage:async(place,live,offset)=>({items:people.slice(offset,offset+48),hasMore:offset+48<people.length,total:people.length}),photoUrls:async paths=>{largestPhotos=Math.max(largestPhotos,paths.length);return new Map(paths.map(path=>[path,'/photo']));}});
 assert.equal(ui.get('list').children.length,48);assert.equal(ui.get('countPill').textContent,'10000 ora');const pager=ui.get('venue').querySelector('.pager');pager.children[2].onclick();await flush();assert.equal(ui.get('list').children[0].dataset.rowKey,'person-48');assert.equal(ui.get('list').children.length,48);
 for(let i=0;i<100;i++){ui.window.go('tribes');ui.window.go('myprofile');ui.window.go('venue');}await flush();assert.equal(ui.get('list').children.length,48);assert.ok(largestPhotos<=48);assert.equal(ui.document.querySelector('.screen.active').id,'venue');
});
test('opening another Tribe resets pagination and a late page never populates its grid',async()=>{
 const wait=deferred();let pages=0;const ui=await boot({ownCheckIn:async()=>null,tribes:async()=>[{id:'a',name:'A',member_count:200},{id:'b',name:'B',member_count:200}],locationPeoplePage:async(place,live,offset)=>{pages++;if(place==='a'&&offset)return wait.promise;return {items:[{id:place,name:place,age:25,photo_path:`${place}/photo`}],hasMore:true,total:200};}});
 ui.get('tribesList').children[0].onclick();await flush();ui.get('tribe').querySelector('.pager').children[2].onclick();await flush();ui.window.go('tribes');await flush();ui.get('tribesList').children[1].onclick();await flush();wait.resolve({items:[{id:'old',name:'old',age:25}],hasMore:false,total:200});await flush();assert.equal(ui.get('tribeGrid').children[0].dataset.rowKey,'b');assert.match(ui.get('tribe').querySelector('.page-label').textContent,/^1–/);assert.ok(pages>=3);
});

test('the first visible photos render before a slower remaining batch finishes',async()=>{
 const tail=deferred(),people=Array.from({length:12},(_,i)=>({id:`fast-${i}`,name:`Persona ${i}`,age:25,photo_path:`fast-${i}/photo`})),groups=[];
 const ui=await boot({ownCheckIn:async()=>null,locationPeoplePage:async()=>({items:people,hasMore:false,total:12}),photoUrls:paths=>{groups.push(paths);return paths.length===4?Promise.resolve(new Map(paths.map(path=>[path,'/ready']))):tail.promise;}});
 ui.get('tribesList').children[0].onclick();await flush();const cards=ui.get('tribeGrid').children;assert.equal(cards[0].querySelector('img').src,'/ready');assert.equal(cards[3].querySelector('img').loading,'eager');assert.equal(cards[4].querySelector('img'),null);assert.deepEqual(groups.map(group=>group.length),[4,8]);
 tail.resolve(new Map(people.slice(4).map(p=>[p.photo_path,'/later'])));await flush();assert.equal(cards[4].querySelector('img').src,'/later');
});


test('account change during photo variant generation cannot upload the former account photo',async()=>{
 const wait=deferred();let uploads=0;const ui=await boot({uploadPhoto:async()=>{uploads++;return 'me/new';}},false,undefined,{photoVariants:()=>wait.promise});ui.window.editProfile();await ui.window.handlePhoto({target:{files:[{type:'image/jpeg',size:100}]}});const saving=ui.window.trySaveProfile();await flush();ui.callback('SIGNED_OUT',null);wait.resolve(null);await saving;assert.equal(uploads,0);assert.equal(ui.document.querySelector('.screen.active').id,'intro');
});


test('slow persisted session never flashes QR entry before opening the account',async()=>{
 const wait=deferred();
 const ui=await boot({session:()=>wait.promise},false,async ui=>{
  assert.equal(ui.document.querySelector('.screen.active').id,'boot');
  wait.resolve({user:{id:'me',is_anonymous:false}});
 });
 assert.equal(ui.document.querySelector('.screen.active').id,'venue');
});
test('slow profile recovery stays on neutral startup until Tribe is available',async()=>{
 const wait=deferred();
 const ui=await boot({getProfile:()=>wait.promise,ownCheckIn:async()=>null},false,async ui=>{
  assert.equal(ui.document.querySelector('.screen.active').id,'boot');
  wait.resolve({name:'Alex',age:28,gender:'M',preference:'ALL',photo_path:'me/photo'});
 });
 assert.equal(ui.document.querySelector('.screen.active').id,'tribes');
});
test('account recovery failure offers retry without showing QR entry',async()=>{
 const ui=await boot({getProfile:async()=>{throw Error('Failed to fetch');}});
 assert.equal(ui.document.querySelector('.screen.active').id,'boot');
 assert.equal(ui.get('retryBootBtn').hidden,false);
 assert.match(ui.get('bootStatus').textContent,/Connessione/);
});
test('a signed-out visitor sees QR entry only after session resolution',async()=>{
 const wait=deferred();
 const ui=await boot({session:()=>wait.promise},false,async ui=>{
  assert.equal(ui.document.querySelector('.screen.active').id,'boot');wait.resolve(null);
 });
 assert.equal(ui.document.querySelector('.screen.active').id,'intro');
});
