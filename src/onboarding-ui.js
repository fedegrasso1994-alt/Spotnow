import {createPilotTribeOnboarding}from './pilot-onboarding.js';
import {onboardingError}from './onboarding.js';
/** One immediate, server-authoritative join at a time; no client membership writer/budget. */
export function createTribeOnboarding({api,onDone,document:doc=globalThis.document,pilot=false}){
 if(pilot)return createPilotTribeOnboarding({api,onDone,document:doc});
 const screen=doc.createElement('section');screen.id='tribeOnboarding';screen.className='screen';
 const title=doc.createElement('h2');title.className='disp';title.textContent='Le tue Tribe';
 const note=doc.createElement('p');note.className='sub';note.textContent='Scegli fino a 3 community. Puoi anche continuare senza Tribe.';
 const field=doc.createElement('div');field.className='field';const label=doc.createElement('label');label.textContent='Cerca una Tribe';label.setAttribute('for','tribeSearch');
 const input=doc.createElement('input');input.id='tribeSearch';input.type='search';input.maxLength=80;input.setAttribute('aria-label','Cerca una Tribe');
 const search=doc.createElement('button');search.className='backlink';search.textContent='Cerca';
 const status=doc.createElement('p');status.className='sub';status.setAttribute('role','status');
 const list=doc.createElement('div');list.className='list';
 const more=doc.createElement('button');more.className='backlink';more.textContent='Altre Tribe';more.hidden=true;
 const next=doc.createElement('button');next.className='btn btn-primary';next.textContent='Continua';
 const skip=doc.createElement('button');skip.className='backlink';skip.textContent='Salta per ora';
 field.append(label,input);screen.append(title,note,field,search,status,list,more,next,skip);doc.getElementById('phone').append(screen);
 let generation=0,busy=false,selected=new Set(),rows=[],offset=0;
 const paint=()=>{list.replaceChildren();for(const tribe of rows){const button=doc.createElement('button');button.className='person';button.style.color='var(--text)';button.style.textAlign='left';button.textContent=tribe.name+(selected.has(tribe.id)?' · Aggiunta':' · Aggiungi');button.disabled=busy||selected.has(tribe.id);button.onclick=()=>join(tribe.id);list.append(button);}};
 const lock=value=>{busy=value;next.disabled=skip.disabled=search.disabled=more.disabled=input.disabled=value;paint();};
 async function load(reset=true){if(busy)return;const g=++generation;lock(true);status.textContent='Caricamento…';const requestedOffset=reset?0:offset+20;if(reset)rows=[];try{const data=await api.search(input.value.trim(),requestedOffset);if(g!==generation)return;offset=requestedOffset;rows=reset?data:[...rows,...data];more.hidden=data.length<20;status.textContent=rows.length?'Le Tribe vengono salvate quando tocchi Aggiungi.':'Nessuna Tribe trovata. Puoi continuare senza sceglierne una.';}catch(error){if(g===generation)status.textContent=onboardingError(error);}finally{if(g===generation)lock(false);}}
 async function join(id){if(busy)return;const g=generation;lock(true);status.textContent='Salvataggio…';try{await api.join(id);if(g!==generation)return;const state=await api.state();if(g!==generation)return;selected=new Set(state.tribes.map(t=>t.id));status.textContent='Tribe aggiunta.';}catch(error){if(g===generation)status.textContent=onboardingError(error);}finally{if(g===generation)lock(false);}}
 async function finish(){if(busy)return;const g=generation;lock(true);try{const state=await api.complete();if(g===generation&&state.complete)await onDone();}catch(error){if(g===generation)status.textContent=onboardingError(error);}finally{if(g===generation)lock(false);}}
 search.onclick=()=>load();input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void load();}});more.onclick=()=>load(false);next.onclick=skip.onclick=finish;
 return {screen,async open(state){generation++;busy=false;input.value='';selected=new Set(state.tribes.map(t=>t.id));await load();},reset(){generation++;busy=false;selected.clear();rows=[];list.replaceChildren();},pause(){generation++;busy=false;}};
}
