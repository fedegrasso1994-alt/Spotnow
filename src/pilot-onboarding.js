import {pilotPlaces}from './pilot-ui.js';
import {onboardingError}from './onboarding.js';
/** Single local choice, committed once on Continue. Server remains max3 and authoritative. */
export function createPilotTribeOnboarding({api,onDone,document:doc=globalThis.document}){
 const el=(tag,text='',cls='')=>{const e=doc.createElement(tag);e.textContent=text;e.className=cls;return e;};
 const screen=el('section','','screen pilot-onboarding');screen.id='tribeOnboarding';const list=el('div','','list pilot-cards'),status=el('p','','sub pilot-status'),next=el('button','Continua','btn btn-primary');status.setAttribute('role','status');
 screen.append(el('h2','Quale posto frequenti più spesso?','disp'),el('p','Scegli il luogo che senti più tuo.','sub'),list,status,next);doc.getElementById('phone').append(screen);
 let generation=0,busy=false,rows=[],choice=null,joined=null,members=[];
 function paint(){list.replaceChildren();for(const row of rows){const b=el('button',row.name,'person pilot-place-card');b.type='button';b.setAttribute('aria-pressed',String(choice===row.id&&Boolean(row.id)));b.classList.toggle('selected',choice===row.id&&Boolean(row.id));b.disabled=busy||!row.id||members.length>0;b.onclick=()=>{if(busy||!row.id||members.length)return;choice=row.id;paint();};if(!row.id)b.append(el('span','Non ancora disponibile','sub'));list.append(b);}next.disabled=busy||(!choice&&!joined&&!members.length);}
 async function finish(){if(busy||(!choice&&!joined&&!members.length))return;const g=generation;busy=true;paint();status.textContent='Salvataggio…';try{if(choice&&!joined){await api.join(choice);joined=choice;}if(g!==generation)return;const s=await api.complete();if(g===generation&&s.complete)await onDone({tribeId:joined});}catch(e){if(g===generation)status.textContent=onboardingError(e);}finally{if(g===generation){busy=false;paint();}}}
 next.onclick=finish;
 return {screen,async open(state){const g=++generation;busy=true;choice=null;joined=null;members=state.tribes||[];rows=pilotPlaces([]);status.textContent='Caricamento…';paint();try{const catalog=await api.search('',0);if(g!==generation)return;rows=pilotPlaces(catalog);status.textContent=members.length?'Hai già una Tribe. Puoi continuare.':rows.some(r=>!r.id)?'Alcuni luoghi non sono ancora disponibili. Scegli un luogo disponibile o riprova più tardi.':'';}catch(e){if(g===generation)status.textContent=onboardingError(e);}finally{if(g===generation){busy=false;paint();}}},pause(){generation++;busy=false;},reset(){generation++;busy=false;choice=null;joined=null;members=[];rows=[];list.replaceChildren();}};
}
