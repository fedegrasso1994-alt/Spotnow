import {romanticError}from'./spotted-romantic.js';
/** Lightweight request section in MATCH, opt-out in PROFILO; existing unified chat. */
export function mountRomanticRequests({inboxRoot,settingsRoot,api,photoUrls,onMatch,document:doc=globalThis.document}){
 const el=(tag,text='',cls='')=>{const n=doc.createElement(tag);n.textContent=text;n.className=cls;return n;};
 const button=(text,run)=>{const n=el('button',text,'btn btn-ghost');n.type='button';n.onclick=run;return n;};
 const section=el('section','','romantic-requests'),status=el('p','','sub'),list=el('div'),refresh=button('Aggiorna richieste',()=>load());section.append(el('h3','Vorrebbero conoscerti'),status,refresh,list);section.hidden=true;inboxRoot.append(section);
 const settings=el('section','','romantic-settings'),label=el('label','Ricevi richieste “Mi piacerebbe conoscerti”'),check=el('input'),settingStatus=el('p','','sub');check.type='checkbox';label.prepend(check);settings.append(label,settingStatus);settings.hidden=true;settingsRoot.append(settings);
 status.setAttribute('role','status');settingStatus.setAttribute('role','status');
 let generation=0,screen=null,busy=false;
 async function load(){const g=++generation;busy=false;list.replaceChildren();section.hidden=true;settings.hidden=true;status.textContent='Caricamento richieste…';
  try{const s=await api.settings();if(g!==generation)return;if(!s.enabled)return;settings.hidden=false;check.checked=s.receive;check.disabled=false;settingStatus.textContent='Disattivando questa opzione, le richieste ricevute ancora in sospeso vengono annullate.';
   if(screen!=='matches')return;section.hidden=false;const r=await api.inbox();if(g!==generation)return;status.textContent=r.items.length?'Scegli liberamente se aprire una conversazione.':'Nessuna richiesta ricevuta.';
   for(const item of r.items){if(!item.sender)continue;const card=el('article','','board-card'),p=item.sender;card.append(el('h4',`${p.name}, ${p.age}`),el('p',p.occupation||'','sub'),el('p',item.context,'board-text'));
    const image=el('img');image.alt='Foto profilo';image.loading='lazy';image.decoding='async';image.className='romantic-profile-photo';card.prepend(image);
    void photoUrls([p.detail_path||p.photo_path]).then(urls=>{if(g===generation){const url=urls.get(p.detail_path||p.photo_path);if(url)image.src=url;else image.remove();}}).catch(()=>{if(g===generation)image.remove();});
    const result=el('p','','sub'),actions=el('div','','spotted-actions');
    const decide=async accept=>{if(busy)return;busy=true;for(const b of section.querySelectorAll('button'))b.disabled=true;try{const value=await api.decide(item.id,accept);if(g!==generation)return;await load();if(screen==='matches'&&generation===g+1&&value.match_id)await onMatch(value.match_id);}catch(error){if(g===generation){result.textContent=romanticError(error);busy=false;for(const b of section.querySelectorAll('button'))b.disabled=false;}}};
    actions.append(button('Accetta',()=>decide(true)),button('Rifiuta',()=>decide(false)),button('Segnala e blocca',async()=>{if(busy)return;busy=true;try{await api.report(p.id);if(g===generation)await load();}catch{if(g===generation){result.textContent='Segnalazione non disponibile. Riprova.';busy=false;}}}));card.append(actions,result);list.append(card);
   }
  }catch(error){if(g===generation){section.hidden=screen!=='matches';status.textContent=romanticError(error);}}
 }
 check.onchange=async()=>{const g=generation;check.disabled=true;try{await api.optIn(check.checked);if(g===generation)await load();}catch(error){if(g===generation){check.checked=!check.checked;settingStatus.textContent=romanticError(error);check.disabled=false;}}};
 return {open(next){screen=next;if(next==='matches'||next==='myprofile')void load();else {generation++;list.replaceChildren();section.hidden=true;}},reset(){generation++;screen=null;busy=false;list.replaceChildren();section.hidden=settings.hidden=true;}};
}
