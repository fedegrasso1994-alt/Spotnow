import { modalController } from './modal.js';
import { userMessage } from './errors.js';
/** Reports remain private; blocking is a separate, explicit option. */
export function createReportPrompt({onReport,onBlock}) {
 const overlay=document.createElement('div');overlay.className='overlay';overlay.style.zIndex='10';
 const sheet=document.createElement('form');sheet.className='sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','Segnala o blocca');
 const title=document.createElement('h2');title.className='disp';title.textContent='Segnala o blocca';
 const reason=document.createElement('select');reason.className='input';reason.setAttribute('aria-label','Motivo della segnalazione');
 for(const [value,label] of [['harassment','Molestie o comportamento offensivo'],['fake_profile','Profilo falso'],['underage','Persona minorenne'],['inappropriate','Contenuti inappropriati'],['other','Altro']]){const option=document.createElement('option');option.value=value;option.textContent=label;reason.append(option);}
 const details=document.createElement('textarea');details.className='input';details.maxLength=1000;details.placeholder='Aggiungi dettagli (facoltativo)';details.setAttribute('aria-label','Dettagli');details.style.marginTop='12px';
 const label=document.createElement('label');const block=document.createElement('input');block.type='checkbox';block.checked=true;label.append(block,' Blocca anche questo profilo');label.style.display='block';label.style.margin='16px 0';
 const info=document.createElement('p');info.className='sub';info.textContent='La segnalazione è riservata. Il blocco impedisce di vedervi e scrivervi.';
 const submit=document.createElement('button');submit.type='submit';submit.className='btn btn-primary';submit.textContent='Invia segnalazione';submit.style.marginTop='18px';
 const onlyBlock=document.createElement('button');onlyBlock.type='button';onlyBlock.className='btn btn-ghost';onlyBlock.textContent='Blocca senza segnalare';
 const cancel=document.createElement('button');cancel.type='button';cancel.className='backlink';cancel.textContent='Annulla';
 const status=document.createElement('p');status.className='sub';status.setAttribute('role','status');
 let target,focus,busy=false,epoch=0;const requests=new Map();
 const modal=modalController(overlay,{firstFocus:reason,onEscape:()=>close()});
 function close(){if(busy)return;modal.close();}
 async function send(report){if(busy)return;const generation=epoch,person=target;const key=JSON.stringify([person,reason.value,details.value,block.checked,report]);let nonce=requests.get(key);if(!nonce){nonce=crypto.randomUUID();requests.set(key,nonce);}busy=true;submit.disabled=onlyBlock.disabled=cancel.disabled=true;status.textContent='Invio in corso…';
  try{if(report)await onReport(person,reason.value,details.value,block.checked,nonce);else await onBlock(person);if(generation!==epoch)return;requests.delete(key);busy=false;close();}
  catch(error){if(generation===epoch)status.textContent=userMessage(error)+' I dettagli sono ancora qui.';}
  finally{if(generation===epoch){busy=false;submit.disabled=onlyBlock.disabled=cancel.disabled=false;}}
 }
 sheet.onsubmit=e=>{e.preventDefault();void send(true);};onlyBlock.onclick=()=>void send(false);cancel.onclick=close;
 sheet.append(title,info,reason,details,label,submit,onlyBlock,cancel,status);overlay.append(sheet);document.getElementById('phone').append(overlay);
 return {open(id){if(busy)return;target=id;focus=document.activeElement;details.value='';block.checked=true;status.textContent='';modal.open();},close,reset(){epoch++;busy=false;target=null;requests.clear();modal.close();submit.disabled=onlyBlock.disabled=cancel.disabled=false;}};
}
