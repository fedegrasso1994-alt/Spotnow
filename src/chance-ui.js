import{createChanceHero}from'./chance-hero.js';
import{renderAvatar,clearAvatar}from'./avatar.js';import{chanceView,createDiscoveryClock,chanceCountdown,chanceTime}from'./chance-state.js';
/** One private introduction at a time. No peer cache, preview list or client-side release calculation.
 * @param {any} options
 */
export function mountChance({root,api,photoUrls=async()=>new Map(),onChoose=()=>{},onOpen=()=>{},onMatch=async()=>{},onExpire=()=>{},onState=()=>{},document:doc=globalThis.document,avatar=renderAvatar,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,operationId=()=>crypto.randomUUID()}){
 const el=(tag,text='',cls='')=>{const n=doc.createElement(tag);n.textContent=text;n.className=cls;return n;};
 const header=el('div','','chance-clock'),next=el('span'),countdown=el('span'),count=el('p','','privacy-note chance-backlog'),host=el('div','','chance-host'),notice=el('p','','empty-hint'),retry=el('button','Riprova','btn btn-ghost'),nav=el('div','','chance-nav'),prev=el('button','←','backlink chance-back'),forward=el('button','Continua','backlink chance-forward'),position=el('span','','privacy-note');
 header.append(next,countdown);prev.setAttribute('aria-label','Chance precedente');nav.append(prev,position,forward);notice.setAttribute('role','status');for(const b of[retry,prev,forward])b.type='button';retry.hidden=true;nav.hidden=true;root.append(host,nav,count,header,notice,retry);root.classList.add('chance-screen');
 const clock=createDiscoveryClock(now),operations=new Map();let active=false,epoch=0,owner=0,request=0,index=0,payload=null,person=null,face=null,card=null,spotButton=null,expiry=null,timer=null,poll=null,loading=false,busy=false,boundary=null,resting=false;
 const selected=()=>payload?.chances[index];
 function clear(){nav.hidden=true;if(face)clearAvatar(face);face=null;card=null;spotButton=null;expiry=null;person=null;host.replaceChildren();onExpire();onState([],0);}
 function message(title,text){clear();const box=el('div','','chat-empty chance-empty');box.append(el('h3',title,'disp'),el('p',text,'sub'));host.append(box);}
 function status(){
  const c=selected(),pending=Boolean(payload?.chances.length),revealed=Boolean(c?.revealed&&person);
  root.dataset.chanceState=resting?'resting':revealed?'revealed':c&&!c.revealed?'unrevealed':payload?.status||'loading';
  count.textContent=payload?.unrevealed_count?`Hai ${payload.unrevealed_count} Chance da scoprire`:'';count.hidden=!payload?.unrevealed_count;
  nav.hidden=resting||!revealed;prev.disabled=index===0||busy||loading;forward.disabled=!c||busy||loading;position.textContent=c?`${index+1} / ${payload.chances.length}`:'';
  header.hidden=!payload||['paused','tribe_required'].includes(payload.status);countdown.hidden=pending;
  next.textContent=payload?.next_release_at?`${pending?'Prossima alle':'Prossima Chance alle'} ${chanceTime(payload.next_release_at)}`:'Prossima Chance';
  root.insertBefore(header,pending?notice:host);
  if(spotButton)spotButton.disabled=busy||loading||Boolean(c?.spotted)||person?.outgoing_spot_pending||clock.remaining(c?.expires_at)===0;
 }
 function fail(){clear();payload=null;root.dataset.chanceState='error';clock.clear();header.hidden=true;nav.hidden=true;count.textContent='';message('Non siamo riusciti a caricare','Controlla la connessione e riprova.');retry.hidden=false;}
 function rest(){resting=true;message('Ogni incontro ha il suo momento','Le tue Chance ancora valide restano disponibili.');const revisit=el('button','Rivedi le Chance','btn btn-ghost');revisit.type='button';revisit.onclick=()=>{resting=false;index=0;request++;clear();void show();};host.querySelector('.chance-empty').append(revisit);status();}
 async function show({voluntary=false,quiet=false}={}){
  const c=selected();if(!c)return;const g=epoch,r=request;
  if(!c.revealed&&!voluntary){message('Hai una nuova Chance 👀','Soma pensa che ci sia qualcuno che dovresti conoscere.');host.querySelector('.chance-empty').prepend(createChanceHero(doc));const reveal=el('button','Scopri la tua Chance','btn btn-primary');reveal.type='button';reveal.onclick=()=>show({voluntary:true});host.querySelector('.chance-empty').append(reveal);status();return;}
  if(loading||busy)return;loading=true;status();if(!quiet)message('La tua Chance','Un momento…');const start=now();
  try{const p=await api.reveal(c.id);if(!active||g!==epoch||r!==request||selected()?.id!==c.id)return;
   if(p.id!==c.id||!p.profile?.id||typeof p.profile.name!=='string'||typeof p.profile.outgoing_spot_pending!=='boolean'||Date.parse(p.expires_at)!==Date.parse(c.expires_at))throw Error('CHANCE_REVEAL_RESPONSE');
   clock.set(p,start);if(clock.remaining(p.expires_at)===0)throw Error('CHANCE_EXPIRED');if(!c.revealed){c.revealed=true;payload.unrevealed_count--;}
   c.spotted=p.spotted;const previous=person;person=p.profile;
   if(!card||previous?.id!==person.id){const saved=person;clear();person=saved;card=el('article','','chance-card');const open=el('button','','tribe-card chance-photo');open.type='button';face=el('div','','avatar');const caption=el('div','','nm');caption.append(el('span',`${person.name}${Number.isInteger(person.age)?`, ${person.age}`:''}`),el('span',person.tribe_name||'','chance-attribution'));open.append(face,caption);open.setAttribute('aria-label',`Apri il profilo di ${person.name}`);open.onclick=()=>{if(person&&clock.remaining(selected()?.expires_at)>0)onOpen({...person,source:'daily',chance_id:selected().id,daily_spot_allowed:!selected().spotted&&!person.outgoing_spot_pending,venue_name:person.tribe_name});};expiry=el('p','','privacy-note chance-expiry');spotButton=el('button','Spot','btn btn-primary');spotButton.type='button';spotButton.onclick=()=>spot(c.id);card.append(open,expiry,spotButton);host.append(card);avatar(face,person,{eager:true,thumbnail:true});}
   spotButton.textContent=person.outgoing_spot_pending||c.spotted?'Spot inviato':'Spot';onState([person],!c.spotted&&!person.outgoing_spot_pending?1:0);status();tick();
   const ref=person.photo_path||person.thumbnail_path,currentFace=face;if(ref)void photoUrls([ref]).then(urls=>{if(active&&g===epoch&&r===request&&face===currentFace&&selected()?.id===c.id&&clock.remaining(c.expires_at)>0){const url=urls.get(ref);if(url)avatar(face,{...person,photo:url},{eager:true,thumbnail:false});}}).catch(()=>{});
   void api.viewed(c.id).catch(()=>{});
  }catch{if(active&&g===epoch&&r===request){message('Questa Chance non è disponibile','Riprova per aggiornare.');retry.hidden=false;}}
  finally{if(active&&g===epoch){loading=false;status();}}
 }
 async function load({initial=false}={}){if(!active||loading)return;const g=epoch,r=++request,start=now(),old=selected()?.id;retry.hidden=true;notice.textContent='';if(initial){message('Chance','Caricamento…');root.dataset.chanceState='loading';count.hidden=true;nav.hidden=true;header.hidden=true;}
  try{const p=chanceView(await api.current());if(!active||g!==epoch||r!==request)return;clock.set(p,start);payload=p;const existing=p.chances.findIndex(x=>x.id===old);index=existing>=0?existing:Math.max(0,p.chances.findIndex(x=>!x.revealed));
   if(!p.chances.length){const copy={paused:['Chance è in preparazione','Qui Soma ti presenterà una persona alla volta.'],tribe_required:['Scegli la tua community','Trova le tue crush nei posti che frequenti.'],waiting:['Ogni incontro ha il suo momento','Torna alla prossima Chance.']}[p.status]||['Per ora è tutto','Torna alla prossima Chance.'];message(...copy);if(p.status==='tribe_required'){const choose=el('button','Scegli la tua community','btn btn-primary');choose.type='button';choose.onclick=onChoose;host.querySelector('.chance-empty').append(choose);}}
   else if(resting)rest();else await show({quiet:old===selected()?.id&&Boolean(person)});status();tick();
  }catch{if(active&&g===epoch&&r===request)fail();}finally{if(active&&g===epoch){cancel(poll);poll=schedule(()=>void load(),30000);}}
 }
 function tick(){cancel(timer);if(!active)return;countdown.textContent=chanceCountdown(clock.remaining(payload?.next_release_at));const c=selected();if(expiry&&c){const left=clock.remaining(c.expires_at);expiry.textContent=left===null?'':`Scade tra ${Math.floor(left/3600)}h ${String(Math.floor(left/60)%60).padStart(2,'0')}m`;}
  const expired=c&&clock.remaining(c.expires_at)===0,due=payload?.next_release_at&&clock.remaining(payload.next_release_at)===0,key=expired?c.id:due?payload.next_release_at:null;if(key&&key!==boundary){boundary=key;clear();void load();return;}timer=schedule(tick,1000);
 }
 async function move(step){if(busy||loading||!payload)return;const nextIndex=index+step;if(nextIndex<0)return;if(nextIndex>=payload.chances.length){rest();return;}resting=false;index=nextIndex;request++;clear();await show();status();}
 async function spot(id){const c=selected();if(!active||!c||!person||!c.revealed||busy||loading||c.spotted||person.outgoing_spot_pending||![c.id,person.id].includes(id)||clock.remaining(c.expires_at)===0)return;const g=epoch,o=owner;let op=operations.get(c.id);if(!op){op=operationId();operations.set(c.id,op);}busy=true;status();
  try{const result=await api.spot(c.id,op);if(o!==owner||!active||g!==epoch)return;if(!['pending','matched'].includes(result?.state)||result.state==='matched'&&!result.match_id)throw Error('CHANCE_SPOT_RESPONSE');operations.delete(c.id);busy=false;if(result.state==='matched')await onMatch(result.match_id);await load();notice.textContent=result.state==='pending'?'Spot inviato.':'';}
  catch{if(active&&g===epoch&&o===owner){busy=false;await load();notice.textContent='Invio non confermato. Puoi riprovare senza inviare un secondo Spot.';}}finally{if(o===owner){busy=false;status();}}
 }
 prev.onclick=()=>move(-1);forward.onclick=()=>move(1);retry.onclick=()=>load({initial:true});
 function pause(){active=false;epoch++;request++;loading=false;cancel(timer);cancel(poll);clear();payload=null;resting=false;clock.clear();}
 return{open(){pause();active=true;void load({initial:true});},pause,reset(){pause();owner++;operations.clear();busy=false;},spot,refresh:()=>load(),get state(){return payload;}};
}
