import {oraError}from './ora.js';
/** Minimal staging controls, independent from Tribe choices and social actions. */
export function mountOraControls({root,api,onChange,document:doc=globalThis.document}){
 const box=doc.createElement('div');box.id='oraControls';const status=doc.createElement('p');status.className='sub';status.setAttribute('role','status');
 const field=doc.createElement('div');field.className='field';const label=doc.createElement('label');label.textContent='Cerca Place Soma';label.setAttribute('for','oraSearch');const input=doc.createElement('input');input.id='oraSearch';input.type='search';input.maxLength=80;field.append(label,input);
 const search=doc.createElement('button');search.className='backlink';search.textContent='Cerca Place';const list=doc.createElement('div');list.className='list';
 const more=doc.createElement('button');more.className='backlink';more.textContent='Altri Places';more.hidden=true;
 const scan=doc.createElement('button');scan.className='backlink';scan.textContent='Inquadra QR Place';
 const exit=doc.createElement('button');exit.className='btn btn-ghost';exit.textContent='Esci da Ora';exit.hidden=true;
 box.append(status,field,search,list,more,scan,exit);root.prepend(box);let generation=0,busy=false,presence=null,offset=0;
 const lock=v=>{busy=v;for(const n of [input,search,more,scan,exit,...list.children])n.disabled=v;};
 async function action(work){if(busy)return;const g=generation;lock(true);try{const p=await work();if(g!==generation)return;list.replaceChildren();await onChange(p);}catch(e){if(g===generation)status.textContent=oraError(e);}finally{if(g===generation)lock(false);}}
 async function load(reset=true){if(busy)return;const g=++generation;lock(true);status.textContent='Caricamento Places…';const next=reset?0:offset+20;try{const rows=await api.search(input.value.trim(),next);if(g!==generation)return;if(reset)list.replaceChildren();offset=next;more.hidden=rows.length<20;for(const p of rows){const b=doc.createElement('button');b.className='person';b.style.color='var(--text)';b.textContent=p.name+' · Sono qui';b.onclick=()=>action(()=>api.start(p.place_id));list.append(b);}status.textContent=rows.length?'Seleziona il Place in cui sei.':'Nessun Place trovato.';}catch(e){if(g===generation)status.textContent=oraError(e);}finally{if(g===generation)lock(false);}}
 search.onclick=()=>load();more.onclick=()=>load(false);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void load();}});exit.onclick=()=>{const id=presence?.presence_id;return action(async()=>{await api.end(id);return api.current();});};
 return {scan,show(p){presence=p;exit.hidden=!p?.presence_id;status.textContent=p?'Sei qui ora: '+p.name:'Scegli un Place o inquadra il suo QR.';},pause(){generation++;lock(false);},reset(){generation++;lock(false);presence=null;list.replaceChildren();input.value='';exit.hidden=true;}};
}
