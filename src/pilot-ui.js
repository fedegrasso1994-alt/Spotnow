/** Pilot presentation only. No membership, exposure, Spot or presence limits live here. */
export const PILOT_PLACES=Object.freeze(['Università IULM Milano','Università Bocconi Milano','Palestra FitActive Cesena']);
export const PILOT_TABS=Object.freeze([
 ['daily','👥','TRIBE'],['spotted','👀','SPOTTED'],['venue','🔥','ORA'],['matches','💘','MATCH'],['myprofile','🙂','PROFILO']
]);
export const pilotRoute=screen=>({tribes:'daily',tribe:'daily',chats:'matches'}[screen]||screen);
export const pilotTab=screen=>['chat','match'].includes(screen)?'matches':pilotRoute(screen);
export const matchPreview=match=>!match.first_message_at?'❤️ Nuovo match!':match.last_message||'Conversazione avviata';
// Match only a real catalog identity; never relabel an unrelated TEST venue.
export function pilotPlaces(rows){return PILOT_PLACES.map(name=>{const matches=rows.filter(r=>r.name===name);return {name,id:matches.length===1?matches[0].id:null};});}
export function mountPilotShell({doc=globalThis.document,go,tribes,onChoose,boardApi,mountBoard}){
 const el=(tag,text='',cls='')=>{const e=doc.createElement(tag);e.textContent=text;e.className=cls;return e;};
 const nav=doc.getElementById('tabbar');nav.replaceChildren();for(const [id,icon,label]of PILOT_TABS){const b=el('button','','tab');b.type='button';b.dataset.tab=id;b.append(el('span',icon,'ic'),el('span',label));b.onclick=()=>go(id);nav.append(b);}
 const screen=id=>{const s=el('section','','screen tabscreen pilot-screen');s.id=id;doc.getElementById('phone').append(s);return s;};
 const daily=screen('daily'),status=el('p','','sub'),communities=el('p','','privacy-note'),choose=el('button','Scegli la tua community','btn btn-primary'),retry=el('button','Riprova','backlink');
 daily.append(el('h2','Tribe','disp'),el('p','Ogni giorno, nuove possibilità.','sub'),communities,status,choose,retry);choose.onclick=onChoose;retry.hidden=true;
 const spotted=screen('spotted'),boardStatus=el('p','','sub'),selector=el('select'),label=el('label','La tua community'),host=el('div','','pilot-board-host'),pick=el('button','Scegli una community','btn btn-primary'),boardRetry=el('button','Riprova','backlink');selector.setAttribute('aria-label','Community Spotted');label.append(selector);pick.onclick=onChoose;boardRetry.hidden=true;spotted.append(el('h2','Spotted','disp'),el('p','La bacheca della tua community.','sub'),label,boardStatus,pick,boardRetry,host);
 const board=boardApi?mountBoard({root:host,api:boardApi,peopleNodes:[],onPeople:()=>{},standalone:true,document:doc}):null;
 let epoch=0,selected=null;
 async function openDaily(){const g=++epoch;status.textContent='Caricamento…';choose.hidden=true;retry.hidden=true;communities.textContent='';try{const rows=await tribes();if(g!==epoch)return;communities.textContent=rows.map(t=>t.name).join(' · ');status.textContent=rows.length?'Daily Discovery sarà disponibile nel prossimo aggiornamento. Qui troverai i profili selezionati per te.':'Scegli una community per trovare le tue crush. Puoi usare Ora anche senza una Tribe.';choose.hidden=rows.length>0;}catch{if(g===epoch){status.textContent='Non riesco a caricare le tue community. Riprova.';retry.hidden=false;}}}
 async function openSpotted(){const g=++epoch;board?.pause();host.hidden=true;pick.hidden=true;label.hidden=true;boardRetry.hidden=true;boardStatus.textContent='Caricamento…';try{const rows=await tribes();if(g!==epoch)return;selector.replaceChildren();for(const t of rows){const o=el('option',t.name);o.value=t.id;selector.append(o);}selected=rows.find(t=>t.id===selected)?.id||rows[0]?.id||null;selector.value=selected||'';label.hidden=rows.length<2;pick.hidden=rows.length>0;boardStatus.textContent=rows.length?rows.find(t=>t.id===selected).name:'Scegli una community per leggere e scrivere su Spotted.';if(selected&&board){host.hidden=false;board.context(selected);}else if(selected)boardStatus.textContent='Spotted non è disponibile in questo ambiente.';}catch{if(g===epoch){boardStatus.textContent='Non riesco a caricare Spotted. Riprova.';boardRetry.hidden=false;}}}
 selector.onchange=()=>{selected=selector.value;boardStatus.textContent=Array.from(selector.children).find(o=>o.value===selected)?.textContent||'';board?.context(selected);};retry.onclick=openDaily;boardRetry.onclick=openSpotted;
 return {open(screen){if(screen==='daily')void openDaily();if(screen==='spotted')void openSpotted();},pause(){epoch++;board?.pause();},reset(){epoch++;selected=null;board?.reset();host.hidden=true;communities.textContent='';}};
}
