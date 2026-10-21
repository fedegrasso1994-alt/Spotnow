import test from 'node:test';import assert from 'node:assert/strict';
import {PILOT_PLACES,PILOT_TABS,pilotRoute,pilotTab,pilotPlaces,mountPilotShell,matchPreview}from '../src/pilot-ui.js';
import {createPilotTribeOnboarding}from '../src/pilot-onboarding.js';
import {mountPilotOraControls}from '../src/pilot-ora-ui.js';
import {createPresenceClock}from '../src/ora.js';
import {dom,flush,deferred}from './helpers/dom.js';
const catalog=PILOT_PLACES.map((name,i)=>({name,id:`tribe-${i}`,place_id:`tribe-${i}`}));
const activeButtons=screen=>screen.querySelectorAll('.pilot-place-card');
for(const row of catalog)test(`pilot onboarding ${row.name}: local choice then one server join and completion`,async()=>{
 const ui=dom(),calls=[];const c=createPilotTribeOnboarding({document:ui.document,api:{search:async()=>catalog,join:async id=>calls.push(id),complete:async()=>({complete:true})},onDone:async result=>calls.push(result)});await c.open({tribes:[]});const buttons=activeButtons(c.screen);buttons[catalog.indexOf(row)].onclick();assert.deepEqual(calls,[]);await c.screen.querySelector('.btn-primary').onclick();assert.equal(calls[0],row.id);assert.equal(calls[1].tribeId,row.id);assert.equal(c.screen.querySelector('.backlink'),null);assert.equal(c.screen.querySelector('input'),null);
});
test('pilot requires one choice, has no skip and never bypasses via direct Continue invocation',async()=>{
 const ui=dom(),calls=[];const c=createPilotTribeOnboarding({document:ui.document,api:{search:async()=>catalog,join:async id=>calls.push(id),complete:async()=>{calls.push('complete');return{complete:true};}},onDone:async r=>calls.push(r)});await c.open({tribes:[]});const next=c.screen.querySelector('.btn-primary');assert.equal(next.disabled,true);assert.equal(c.screen.querySelector('.backlink'),null);await next.onclick();assert.deepEqual(calls,[]);activeButtons(c.screen)[0].onclick();activeButtons(c.screen)[2].onclick();assert.equal(activeButtons(c.screen).filter(b=>b.getAttribute('aria-pressed')==='true').length,1);assert.equal(next.disabled,false);await next.onclick();assert.equal(calls[0],catalog[2].id);
 await c.open({tribes:[catalog[0],catalog[1]]});assert.ok(activeButtons(c.screen).every(b=>b.disabled));assert.equal(next.disabled,false);
});
test('missing catalog or failed join cannot complete mandatory pilot onboarding',async()=>{
 const ui=dom();let completes=0;const c=createPilotTribeOnboarding({document:ui.document,api:{search:async()=>[],join:async()=>{},complete:async()=>{completes++;return{complete:true};}},onDone:()=>{}});await c.open({tribes:[]});await c.screen.querySelector('.btn-primary').onclick();assert.equal(completes,0);assert.equal(c.screen.querySelector('.btn-primary').disabled,true);
 const d=createPilotTribeOnboarding({document:dom().document,api:{search:async()=>catalog,join:async()=>{throw Error('TRIBE_UNAVAILABLE');},complete:async()=>completes++},onDone:()=>{}});await d.open({tribes:[]});activeButtons(d.screen)[0].onclick();await d.screen.querySelector('.btn-primary').onclick();assert.equal(completes,0);
});
test('pilot double Continue and retry after complete failure never duplicate an accepted join',async()=>{
 const ui=dom(),wait=deferred();let joins=0,completes=0;const c=createPilotTribeOnboarding({document:ui.document,api:{search:async()=>catalog,join:async()=>{joins++;await wait.promise;},complete:async()=>{if(++completes===1)throw Error('offline');return{complete:true};}},onDone:async()=>{}});await c.open({tribes:[]});activeButtons(c.screen)[0].onclick();const next=c.screen.querySelector('.btn-primary'),first=next.onclick();await next.onclick();assert.equal(joins,1);wait.resolve();await first;await next.onclick();assert.equal(joins,1);assert.equal(completes,2);
});
test('catalog cannot silently map pilot names to unrelated legacy TEST identities',()=>{assert.ok(pilotPlaces([{id:'legacy',name:'TEST Università 1'}]).every(r=>r.id===null));});
test('pilot shell has ordered independent tabs, no directory reads, DD stays honest and old routes converge',async()=>{
 const ui=dom(),routes=[];let peopleReads=0;const shell=mountPilotShell({doc:ui.document,go:r=>routes.push(r),tribes:async()=>[],onChoose:()=>{},boardApi:null,mountBoard:()=>{peopleReads++;}});assert.deepEqual(ui.get('tabbar').children.map(b=>b.children[1].textContent),['TRIBE','SPOTTED','ORA','MATCH','PROFILO']);for(const b of ui.get('tabbar').children)b.onclick();assert.deepEqual(routes,PILOT_TABS.map(t=>t[0]));shell.open('daily');await flush();assert.equal(peopleReads,0);assert.match(ui.get('phone').querySelector('#daily').querySelector('.sub').textContent,/Ogni giorno/);assert.equal(pilotRoute('tribe'),'daily');assert.equal(pilotRoute('chats'),'matches');assert.equal(pilotTab('chat'),'matches');assert.equal(matchPreview({first_message_at:null}),'❤️ Nuovo match!');assert.equal(matchPreview({first_message_at:'now'}),'Conversazione avviata');
});
test('Spotted runs existing board under its own shell and never requires People query success',async()=>{
 const ui=dom(),contexts=[];let pauses=0;const shell=mountPilotShell({doc:ui.document,go:()=>{},tribes:async()=>[catalog[0]],onChoose:()=>{},boardApi:{},mountBoard:o=>{assert.equal(o.standalone,true);assert.deepEqual(o.peopleNodes,[]);return {context:id=>contexts.push(id),pause:()=>pauses++,reset:()=>{}};}});shell.open('spotted');await flush();assert.deepEqual(contexts,['tribe-0']);shell.pause();assert.ok(pauses>0);
});
test('ORA pilot loads catalog without search or Tribe; explicit tap starts, exit ends the same presence',async t=>{
 const ui=dom(),root=ui.get('venue');for(const cls of['name','privacy-note','addr']){const e=ui.document.createElement('div');e.className=cls;root.append(e);}root.append(ui.get('discoverTribeBtn'));let current=null;const calls=[];const api={search:async()=>catalog,start:async id=>{calls.push(id);return current={presence_id:'presence',place_id:id,name:catalog.find(p=>p.id===id).name,server_now:'2026-10-18T12:00:00Z',expires_at:'2026-10-18T16:00:00Z'};},end:async id=>{calls.push('end:'+id);current=null;},current:async()=>current};const c=mountPilotOraControls({root,api,document:ui.document,onChange:async p=>c.show(p)});t.after(()=>c.pause());c.show(null);c.open();await flush();assert.deepEqual(calls,[]);assert.equal(root.querySelector('input'),null);await activeButtons(root)[0].onclick();await flush();assert.equal(calls[0],catalog[0].id);assert.match(root.querySelector('.pilot-live').textContent,/Presenza attiva/);const exit=root.querySelectorAll('button').find(b=>b.textContent==='Esci da ORA');await exit.onclick();await flush();assert.equal(calls[1],'end:presence');assert.equal(root.querySelector('.pilot-live').textContent,'');
});
test('presence countdown uses elapsed monotonic time against server delta, without renewal on reads',()=>{let now=0;const c=createPresenceClock(()=>now);c.set({server_now:'2026-10-18T12:00:00Z',expires_at:'2026-10-18T16:00:00Z'});assert.equal(c.remaining(),14400);now=60000;assert.equal(c.remaining(),14340);assert.equal(c.remaining(),14340);c.clear();assert.equal(c.remaining(),0);});
test('ORA first frame removes legacy content before pending catalog/presence responses; errors and re-entry do not restore it',async()=>{
 const ui=dom(),root=ui.get('venue'),catalogWait=deferred();
 for(const [cls,text]of [['name',"Chi c’è ora"],['addr','Locale demo'],['privacy-note','Legacy discovery']]){const e=ui.document.createElement('div');e.className=cls;e.textContent=text;root.append(e);}
 root.append(ui.get('countPill'),ui.get('discoverTribeBtn'));ui.get('countPill').textContent='8 ora';ui.get('discoverTribeBtn').hidden=false;
 const c=mountPilotOraControls({root,api:{search:()=>catalogWait.promise},document:ui.document,timers:{setInterval(){},clearInterval(){}},onChange:()=>{}});
 const cleanFrame=()=>{assert.equal(ui.get('discoverTribeBtn').hidden,true);assert.notEqual(root.querySelector('.addr').textContent,'Locale demo');assert.notEqual(ui.get('countPill').textContent,'8 ora');assert.equal(root.querySelector('.name').textContent,'Scopri chi è qui ora con te');};
 cleanFrame();assert.ok(root.querySelectorAll('button').filter(b=>['Esci da ORA','Cambia location','Riprova'].includes(b.textContent)).every(b=>b.hidden));
 c.open();cleanFrame();
 assert.equal(root.querySelector('#oraControls').children[0].textContent,'Caricamento…');
 catalogWait.reject(Error('offline'));await flush();cleanFrame();assert.equal(root.querySelectorAll('button').find(b=>b.textContent==='Riprova').hidden,false);
 c.pause();c.open();cleanFrame();await flush();c.show(null);cleanFrame();c.reset();cleanFrame();
});
