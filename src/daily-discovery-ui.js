import {renderAvatar,clearAvatar} from './avatar.js';
import {createDiscoveryClock,countdownText,discoveryView} from './daily-discovery-state.js';
/** Finite server-projected drop. Operations survive navigation, never account reset.
 * @param {any} options
 */
export function mountDailyDiscovery({root,api,photoUrls=async()=>new Map(),onChoose=()=>{},onOpen=()=>{},onMatch=async()=>{},onExpire=()=>{},onState=()=>{},document:doc=globalThis.document,avatar=renderAvatar,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,operationId=()=>crypto.randomUUID()}){
 const el=(tag,text='',cls='')=>{const n=doc.createElement(tag);n.textContent=text;n.className=cls;return n;};
 const clock=createDiscoveryClock(now),head=el('div','','dd-clock'),label=el('span','Prossimi profili'),time=el('span','—'),content=el('div','','dd-content'),quota=el('p','','privacy-note dd-quota'),notice=el('p','','empty-hint dd-notice'),retry=el('button','Riprova','btn btn-ghost'),choose=el('button','Scegli la tua community','btn btn-primary');
 head.append(label,time);notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');retry.type=choose.type='button';retry.hidden=choose.hidden=true;choose.onclick=onChoose;
 root.append(head,content,quota,notice,retry,choose);root.classList.add('dd-screen');
 let generation=0,owner=0,active=false,payload=null,view=null,timer=null,poll=null,loading=false,request=0,lastBoundary=null,grid=null;
 const operations=new Map(),busy=new Set(),cards=new Map();
 function clearCards(){for(const c of cards.values())clearAvatar(c.face);cards.clear();grid=null;content.replaceChildren();}
 function actions(){for(const [id,c]of cards){const pending=c.person.outgoing_spot_pending;const expired=view?.windowEnd&&clock.remaining(view.windowEnd)===0;c.action.disabled=busy.has(id)||loading||pending||!view?.budget||Boolean(expired);c.action.textContent=busy.has(id)?'Invio…':pending?'Spot inviato':view?.budget===0?'Spot esauriti':'Spot';}}
 function message(title,body){clearCards();const box=el('div','','chat-empty dd-empty');box.append(el('h2',title,'disp'),el('p',body,'sub'));content.append(box);}
 function fail(){onExpire();payload=null;view=null;clock.clear();head.hidden=true;quota.textContent='';message('Non siamo riusciti a caricare','Controlla la connessione e riprova.');retry.hidden=false;}
 function paint(p){
  view=discoveryView(p);payload=p;retry.hidden=true;choose.hidden=view.kind!=='tribe_required';head.hidden=['paused','tribe_required'].includes(view.kind);label.textContent=view.kind==='overnight'?'Nuovi profili alle 08:00':'Prossimi profili';quota.textContent=view.budget===null?'':`${view.budget} Spot disponibili in questa finestra · ${p.day_spots_remaining} oggi`;
  if(view.profiles.length){
   if(!grid){clearCards();grid=el('div','','dd-grid');content.append(grid);}
   const allowed=new Set(view.profiles.map(p=>p.id));for(const[id,c]of cards)if(!allowed.has(id)){clearAvatar(c.face);c.card.remove();cards.delete(id);}
   for(const[index,person]of view.profiles.entries()){
    let c=cards.get(person.id);
    if(!c){const card=el('article','','dd-card'),open=el('button','','tribe-card dd-photo'),face=el('div','','avatar'),caption=el('div','','nm'),name=el('span'),tribe=el('span','','dd-attribution'),action=el('button','Spot','btn btn-primary btn-sm dd-spot');open.type=action.type='button';caption.append(name,tribe);open.append(face,caption);card.append(open,action);c={person,card,open,face,name,tribe,action};cards.set(person.id,c);avatar(face,person,{eager:true,thumbnail:true});open.onclick=()=>{const current=cards.get(person.id)?.person;if(current&&active&&clock.remaining(view.windowEnd)>0)onOpen({...current,source:'daily',daily_spot_allowed:view.budget>0,venue_name:current.tribe_name});};action.onclick=()=>spot(person.id);
    }else if(c.person.photo_path!==person.photo_path||c.person.thumbnail_path!==person.thumbnail_path){clearAvatar(c.face);avatar(c.face,person,{eager:true,thumbnail:true});}
    c.person=person;c.name.textContent=`${person.name}${Number.isInteger(person.age)?`, ${person.age}`:''}`;c.tribe.textContent=person.tribe_name||'';c.open.setAttribute('aria-label',`Apri il profilo di ${person.name}`);c.action.setAttribute('aria-label',`Spot a ${person.name}`);
    if(grid.children[index]!==c.card)grid.insertBefore(c.card,grid.children[index]||null);
   }
  }else{const copy={paused:['Daily Discovery è in preparazione','Qui troverai i profili selezionati per te quando sarà disponibile.'],tribe_required:['Scegli la tua community','Trova le tue crush nei posti che frequenti.'],overnight:['Si riparte alle 08:00','Per ora è tutto. I prossimi profili arrivano al mattino.'],exhausted:['Per questa finestra è tutto','I nuovi profili arrivano al prossimo drop.'],empty:['Per ora nessun profilo','In questa finestra non ci sono profili compatibili disponibili. Torna al prossimo drop.']}[view.kind];message(...copy);}
  actions();onState(view.profiles,view.budget);
 }
 async function load({initial=false}={}){
  if(!active)return;const g=generation,r=++request,start=now();loading=true;retry.hidden=true;notice.textContent='';
  if(initial){clearCards();head.hidden=true;quota.textContent='';content.append(el('p','Caricamento…','empty-hint'));}actions();
  try{const p=await api.current();if(!active||g!==generation||r!==request)return;clock.set(p,start);paint(p);
   const targets=[...cards.values()],refs=targets.map(c=>c.person.thumbnail_path||c.person.photo_path).filter(Boolean);
   if(refs.length)void photoUrls(refs).then(urls=>{if(!active||g!==generation||r!==request)return;for(const c of targets)if(cards.get(c.person.id)===c){const ref=c.person.thumbnail_path||c.person.photo_path;const photo=urls.get(ref);if(photo)avatar(c.face,{...c.person,photo},{eager:true,thumbnail:true,progressive:true});}}).catch(()=>{if(active&&g===generation)notice.textContent='Alcune foto non sono disponibili. Si aggiorneranno automaticamente.';});
  }catch{if(active&&g===generation&&r===request)fail();}
  finally{if(active&&g===generation&&r===request){loading=false;actions();tick();cancel(poll);poll=schedule(()=>void load(),30000);}}
 }
 function tick(){cancel(timer);if(!active)return;const target=view?.next;time.textContent=countdownText(clock.remaining(target));
  const expiry=view?.windowEnd||view?.next;if(expiry&&clock.remaining(expiry)===0&&!loading){clearCards();onExpire();const key=`${payload?.window_id||''}:${expiry}`;message('Aggiornamento dei profili','Attendi un momento…');if(lastBoundary!==key){lastBoundary=key;void load();return;}}
  timer=schedule(tick,1000);
 }
 async function spot(id){
  const c=cards.get(id);if(!active||!c||busy.has(id)||loading||c.person.outgoing_spot_pending||!view?.budget||clock.remaining(view.windowEnd)===0)return;
  const g=generation,o=owner;let op=operations.get(id);if(!op){op=operationId();operations.set(id,op);}busy.add(id);actions();notice.textContent='';
  try{const result=await api.spot(id,op);if(o!==owner)return;if(!['pending','matched'].includes(result?.state)||(result?.state==='matched'&&!result.match_id))throw Error('DD_SPOT_RESPONSE');operations.delete(id);if(!active||g!==generation)return;
   if(result?.state==='matched'&&result.match_id){await onMatch(result.match_id);}
   else if(result?.state==='pending'){notice.textContent='Spot inviato.';}else throw Error('DD_SPOT_RESPONSE');
   if(active&&g===generation)await load();
  }catch{if(active&&g===generation&&o===owner){await load();if(active&&g===generation)notice.textContent='Invio non confermato. Puoi riprovare: lo stesso tentativo non consuma altri Spot.';/* retain operation ID until a confirmed result */}}
  finally{if(o===owner){busy.delete(id);if(active)actions();}}
 }
 retry.onclick=()=>load({initial:true});
 function pause(){active=false;generation++;request++;loading=false;cancel(timer);cancel(poll);clearCards();payload=null;view=null;clock.clear();quota.textContent='';notice.textContent='';onExpire();}
 return {open(){pause();active=true;void load({initial:true});},pause,reset(){pause();owner++;operations.clear();busy.clear();},spot,refresh:()=>load(),get state(){return view;}};
}
