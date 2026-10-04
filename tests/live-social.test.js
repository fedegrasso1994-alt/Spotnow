import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveSocial} from '../src/live-social.js';
import {singleFlight,stableList} from '../src/ui-refresh.js';
import {dom,Element,deferred,flush} from './helpers/dom.js';

function setup(t, overrides={},avatar=()=>{}){
 const ui=dom();for(const id of ['venue','matches','chats','chat','match'])ui.screen(id);
 const report=new Element();report.className='report-link';ui.get('detailOverlay').append(report);
 const status=new Element();status.className='status';ui.get('chat').append(status);
 const previous={document:globalThis.document,window:globalThis.window,setInterval:globalThis.setInterval};
 globalThis.document=ui.document;globalThis.window={};globalThis.setInterval=()=>0;
 t.after(()=>Object.assign(globalThis,previous));
 let records=[{id:'match-a',person_id:'a',name:'Anna',age:24,venue_name:'Locale',photo_path:'a/photo',first_message_at:null}];
 const backend={matches:async()=>records,photoUrl:async()=>'/photo',messages:async()=>[{id:'msg',sender_id:'a',body:'Ciao'}],sendMessage:async()=>{},...overrides};
 let social;const go=id=>{ui.activate(id);social?.onScreen(id);};
 social=createLiveSocial({backend,go,showToast:()=>{},avatar,profile:()=>({}),session:()=>({user:{id:'me'}}),onFirstMatch:()=>{},venueName:()=> 'Locale'});
 return {...ui,social,go,backend,setRecords:value=>{records=value;}};
}

test('refresh during tab switch populates the new tab and re-entry opens the chat',async t=>{
 const wait=deferred();const ui=setup(t,{matches:()=>wait.promise});ui.go('venue');const pending=ui.social.refresh();await flush();ui.go('chats');
 wait.resolve([{id:'m',person_id:'a',name:'Anna',age:24,venue_name:'Locale',photo_path:'a/photo'}]);await pending;await flush();
 assert.equal(ui.get('chatsList').children.length,1);await ui.get('chatsList').children[0].onclick();assert.equal(ui.document.querySelector('.screen.active').id,'chat');
 ui.go('chats');await flush();await ui.get('chatsList').children[0].onclick();assert.equal(ui.document.querySelector('.screen.active').id,'chat');assert.equal(ui.get('bubbles').children.at(-1).textContent,'Ciao');
});
test('poll retains clickable chat rows and message bubbles',async t=>{
 const ui=setup(t);ui.go('chats');await ui.social.refresh();const row=ui.get('chatsList').children[0];await ui.social.refresh();assert.equal(ui.get('chatsList').children[0],row);
 await row.onclick();const bubble=ui.get('bubbles').children.at(-1);await ui.social.refresh();assert.equal(ui.get('bubbles').children.at(-1),bubble);
});
test('new match while chatting does not replace the selected conversation or draft',async t=>{
 const opened=[];const ui=setup(t,{messages:async id=>{opened.push(id);return [];}});ui.go('chats');await ui.social.refresh();await ui.get('chatsList').children[0].onclick();ui.get('chatIn').value='Bozza';
 ui.setRecords([{id:'match-a',person_id:'a',name:'Anna',age:24,venue_name:'Locale',photo_path:'a/photo'},{id:'match-b',person_id:'b',name:'Bea',age:25,venue_name:'Locale',photo_path:'b/photo'}]);await ui.social.refresh();
 assert.equal(opened.at(-1),'match-a');assert.equal(ui.get('chatIn').value,'Bozza');assert.equal(ui.get('cName').textContent,'Anna');
});
test('expired or unavailable photo cannot make a conversation inaccessible',async t=>{
 const ui=setup(t,{photoUrl:async()=>{throw new Error('storage offline');}});ui.go('chats');await ui.social.refresh();assert.equal(ui.get('chatsList').children[0].className,'person');await ui.get('chatsList').children[0].onclick();assert.equal(ui.get('bubbles').children.at(-1).textContent,'Ciao');
});
test('older chat response cannot overwrite messages after reopening',async t=>{
 const wait=deferred();let calls=0;const ui=setup(t,{messages:()=>++calls===1?wait.promise:Promise.resolve([{id:'new',sender_id:'a',body:'Nuovo'}])});ui.go('chats');await ui.social.refresh();const first=ui.get('chatsList').children[0].onclick();await flush();ui.go('chats');await flush();await ui.get('chatsList').children[0].onclick();wait.resolve([{id:'old',sender_id:'a',body:'Vecchio'}]);await first;
 assert.equal(ui.get('bubbles').children.at(-1).textContent,'Nuovo');
});
test('logout ignores in-flight results even if the same account signs back in',async t=>{
 const wait=deferred();const ui=setup(t,{matches:()=>wait.promise});ui.go('venue');const pending=ui.social.refresh();await flush();ui.social.reset();wait.resolve([{id:'m',photo_path:'a/photo'}]);await pending;ui.go('chats');assert.notEqual(ui.get('chatsList').children[0]?.className,'person');await ui.social.refresh();await flush();
});
test('single flight shares requests, propagates errors and permits retry',async()=>{
 const wait=deferred();let calls=0;const task=singleFlight(()=>{calls++;return calls===1?wait.promise:42;});const a=task(),b=task();assert.equal(a,b);await flush();assert.equal(calls,1);wait.reject(new Error('offline'));await assert.rejects(a,/offline/);assert.equal(await task(),42);
});
test('stable list preserves rows and scroll, removes blocked rows and updates ordering',()=>{
 const el=new Element();el.scrollTop=75;const options={key:p=>p.id,signature:p=>p.name,create:()=>new Element()};stableList(el,[{id:'a',name:'Anna'},{id:'b',name:'Bea'}],options);const [a,b]=el.children;
 stableList(el,[{id:'b',name:'Bea'},{id:'a',name:'Anna'}],options);assert.deepEqual(el.children,[b,a]);assert.equal(el.scrollTop,75);stableList(el,[{id:'a',name:'Anna'}],options);assert.deepEqual(el.children,[a]);
});

test('ambiguous send retries the same nonce, and read failure after send is not a failed write',async t=>{
 const attempts=[];let reads=0;const ui=setup(t,{sendMessage:async(id,text,nonce)=>{attempts.push(nonce);if(attempts.length===1)throw new Error('Failed to fetch');},messages:async()=>{if(++reads>1)throw new Error('Failed to fetch');return [];}});
 ui.go('chats');await ui.social.refresh();await ui.get('chatsList').children[0].onclick();ui.get('chatIn').value='Ciao';await globalThis.window.sendMsg();assert.equal(ui.get('chatIn').value,'Ciao');await globalThis.window.sendMsg();assert.equal(attempts[0],attempts[1]);assert.equal(ui.get('chatIn').value,'');assert.equal(ui.get('chatSendStatus').textContent,'Messaggio inviato');
});
test('slow read survives polling instead of being perpetually invalidated',async t=>{
 const wait=deferred();let calls=0;const ui=setup(t,{messages:()=>{calls++;return wait.promise;}});ui.go('chats');await ui.social.refresh();const opened=ui.get('chatsList').children[0].onclick();await flush();const poll=ui.social.refresh();await flush();assert.equal(calls,1);wait.resolve([{id:'m',sender_id:'a',body:'Arrivato'}]);await opened;await poll;assert.equal(ui.get('bubbles').children.at(-1).textContent,'Arrivato');
});
test('logout clears visible chat data and a late write cannot clear another account draft',async t=>{
 const wait=deferred();const ui=setup(t,{sendMessage:()=>wait.promise});ui.go('chats');await ui.social.refresh();await ui.get('chatsList').children[0].onclick();ui.get('chatIn').value='Vecchio';const sending=globalThis.window.sendMsg();await flush();ui.social.reset();assert.equal(ui.get('bubbles').children.length,0);ui.get('chatIn').value='Altro account';wait.resolve({});await sending;assert.equal(ui.get('chatIn').value,'Altro account');
});
test('receiving a new message preserves older bubbles and scroll when reading history',async t=>{let messages=[{id:'old',sender_id:'a',body:'Primo'}];const ui=setup(t,{messages:async()=>messages});ui.go('chats');await ui.social.refresh();await ui.get('chatsList').children[0].onclick();const older=ui.get('bubbles').children[1];ui.get('bubbles').scrollTop=35;messages=[...messages,{id:'new',sender_id:'me',body:'Secondo'}];await ui.social.refresh();assert.equal(ui.get('bubbles').children[1],older);assert.equal(ui.get('bubbles').scrollTop,35);assert.equal(ui.get('bubbles').children.at(-1).textContent,'Secondo');});


test('matched Tribe profile opens the existing chat without sending another interest',async t=>{
 let writes=0,opened;const ui=setup(t,{expressInterest:async()=>{writes++;},messages:async id=>{opened=id;return [];}});ui.go('venue');await ui.social.refresh();
 ui.social.openDetail({id:'a',name:'Anna',age:24,venue_id:'place',source:'tribe',interest_sent:true});
 assert.equal(ui.get('interestBtn').textContent,'Apri la Chat');assert.equal(ui.get('interestBtn').disabled,false);
 await globalThis.window.expressInterest();assert.equal(opened,'match-a');assert.equal(writes,0);assert.equal(ui.document.querySelector('.screen.active').id,'chat');assert.equal(ui.get('detailOverlay').classList.contains('active'),false);
});
test('one-way interest stays disabled until a reciprocal match arrives, and updates while detail is open',async t=>{
 const ui=setup(t);ui.setRecords([]);ui.go('venue');await ui.social.refresh();ui.social.openDetail({id:'a',name:'Anna',age:24,venue_id:'place',source:'tribe',interest_sent:true});await flush();
 assert.equal(ui.get('interestBtn').textContent,'Interesse già inviato');assert.equal(ui.get('interestBtn').disabled,true);
 ui.setRecords([{id:'match-a',person_id:'a',name:'Anna',age:24,photo_path:'a/photo'}]);await ui.social.refresh();
 assert.equal(ui.get('interestBtn').textContent,'Apri la Chat');assert.equal(ui.get('interestBtn').disabled,false);
 ui.setRecords([]);await ui.social.refresh();assert.equal(ui.get('interestBtn').textContent,'Interesse già inviato');assert.equal(ui.get('interestBtn').disabled,true);
});
test('a match for another profile never enables the chat action on the selected person',async t=>{
 const wait=deferred();const ui=setup(t,{matches:()=>wait.promise});ui.go('venue');ui.social.openDetail({id:'a',name:'Anna',age:24,venue_id:'place',interest_sent:true});await flush();
 ui.social.openDetail({id:'b',name:'Bea',age:25,venue_id:'place',interest_sent:true});wait.resolve([{id:'match-a',person_id:'a',photo_path:'a/photo'}]);await flush();
 assert.equal(ui.get('dName').textContent,'Bea, 25');assert.equal(ui.get('interestBtn').textContent,'Interesse già inviato');assert.equal(ui.get('interestBtn').disabled,true);
});
test('an unmatched profile still offers Mi Interessa',async t=>{const ui=setup(t);ui.setRecords([]);ui.social.openDetail({id:'b',name:'Bea',age:25,venue_id:'place'});await flush();assert.equal(ui.get('interestBtn').textContent,'Mi Interessa');assert.equal(ui.get('interestBtn').disabled,false);});

test('opening a Tribe card before its image is ready fills the enlarged photo when the request completes',async t=>{
 const wait=deferred(),photos=[];const ui=setup(t,{photoUrl:()=>wait.promise},(el,p)=>{if(el.id==='dAvatar')photos.push(p.photo);});ui.setRecords([]);
 ui.social.openDetail({id:'a',name:'Anna',age:24,photo_path:'a/photo',source:'tribe'});assert.equal(photos.at(-1),undefined);wait.resolve('/loaded-photo');await flush();assert.equal(photos.at(-1),'/loaded-photo');
});
test('a late detail photo never overwrites another person or repopulates a closed detail',async t=>{
 const first=deferred(),second=deferred(),photos=[];const ui=setup(t,{photoUrl:path=>path==='a/photo'?first.promise:second.promise},(el,p)=>{if(el.id==='dAvatar')photos.push(p.photo);});ui.setRecords([]);
 ui.social.openDetail({id:'a',name:'Anna',age:24,photo_path:'a/photo'});ui.social.openDetail({id:'b',name:'Bea',age:25,photo_path:'b/photo'});const count=photos.length;
 first.resolve('/anna');await flush();assert.equal(photos.length,count);ui.social.closeDetail();second.resolve('/bea');await flush();assert.equal(photos.length,count);
});


test('2,000 matches are paged and an off-page Tribe match opens without a duplicate interest',async t=>{
 const records=Array.from({length:2000},(_,i)=>({id:`match-${i}`,person_id:`person-${i}`,name:`Persona ${i}`,age:25,photo_path:`${i}/photo`,venue_name:'Luogo'}));let writes=0;
 const ui=setup(t,{matchesPage:async offset=>({items:records.slice(offset,offset+48),hasMore:offset+48<records.length,total:records.length}),matchById:async id=>records.find(m=>m.id===id),matchWith:async id=>records.find(m=>m.person_id===id),expressInterest:async()=>{writes++;},messages:async()=>[]});
 ui.go('chats');await ui.social.refresh();assert.equal(ui.get('chatsList').children.length,48);
 const pager=ui.get('chats').querySelector('.pager');pager.children[2].onclick();await flush();await ui.social.refresh();assert.equal(pager.children[1].textContent,'49–96 di 2000');assert.equal(ui.get('chatsList').children.length,48);
 ui.social.openDetail({id:'person-1500',name:'Persona 1500',age:25,interest_sent:true,source:'tribe'});await flush();assert.equal(ui.get('interestBtn').textContent,'Apri la Chat');await globalThis.window.expressInterest();await ui.social.refresh();assert.equal(ui.get('cName').textContent,'Persona 1500');assert.equal(ui.document.querySelector('.screen.active').id,'chat');assert.equal(writes,0);
 ui.social.reset();await ui.social.restoreChat('match-1500');assert.equal(ui.get('cName').textContent,'Persona 1500');assert.equal(ui.document.querySelector('.screen.active').id,'chat');
});
test('20,000-message history stays bounded, supports previous/latest and sending from history',async t=>{
 const records=Array.from({length:20000},(_,i)=>({id:`message-${i}`,sender_id:'a',body:`Messaggio ${i}`,created_at:new Date(1700000000000+i*1000).toISOString()}));let writes=0;
 const ui=setup(t,{messages:async(id,before)=>records.filter(m=>!before||m.created_at<before.created_at).slice(-100),sendMessage:async()=>{writes++;records.push({id:'sent',sender_id:'me',body:'Nuovo',created_at:new Date().toISOString()});}});
 ui.go('chats');await ui.social.refresh();await ui.get('chatsList').children[0].onclick();assert.equal(ui.get('bubbles').children.length,101);assert.equal(ui.get('bubbles').children.at(-1).textContent,'Messaggio 19999');
 const [older,latest]=ui.get('chat').querySelector('.chat-history-controls').children;older.onclick();await flush();assert.equal(ui.get('bubbles').children.at(-1).textContent,'Messaggio 19899');assert.equal(ui.get('bubbles').children.length,101);
 latest.onclick();await flush();assert.equal(ui.get('bubbles').children.at(-1).textContent,'Messaggio 19999');older.onclick();await flush();ui.get('chatIn').value='Nuovo';await globalThis.window.sendMsg();assert.equal(writes,1);assert.equal(ui.get('bubbles').children.at(-1).textContent,'Nuovo');assert.equal(ui.get('bubbles').children.length,101);
});
