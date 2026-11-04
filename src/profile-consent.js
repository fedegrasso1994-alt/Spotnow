import {legalGateRequired} from './legal-onboarding.js';
import {legalLink} from './legal-documents.js';
/** Consent for the existing profile/preferences form; no alternate dating flow. */
export function createProfileConsent({backend,onState=(_state)=>{},document:doc=globalThis.document}){
 const section=doc.createElement('section');section.className='privacy-choice profile-consent';
 const label=doc.createElement('label');label.className='privacy-check';
 const checkbox=doc.createElement('input');checkbox.type='checkbox';checkbox.id='datingDeclaration';
 const text=doc.createElement('span');text.className='privacy-consent-text';label.append(checkbox,text);
 const help=doc.createElement('p');help.className='privacy-help';help.textContent='Puoi revocare il consenso alle preferenze dal profilo.';
 const notice=legalLink(doc,'privacy','Informativa sulla privacy');section.append(label,help,notice);
 doc.getElementById('prefOptions').parentElement.append(section);
 let state=null,epoch=0,pending=null;
 function update(next){
  const changed=!state||state.consent_status!==next.consent_status||state.required_version!==next.required_version||state.consent_revision!==next.consent_revision||state.consent_text!==next.consent_text;
  state=next;if(changed){checkbox.checked=false;pending=null;}
  const active=next.consent_status==='active';label.hidden=active;checkbox.disabled=!next.consent_text;
  text.textContent=next.consent_text||'Testo del consenso non disponibile. Riprova più tardi.';
  help.textContent=active?'Consenso alle preferenze registrato. Puoi revocarlo dal profilo.':'Puoi revocare il consenso alle preferenze dal profilo.';
 }
 function reset(){epoch++;state=null;pending=null;checkbox.checked=false;checkbox.disabled=true;label.hidden=false;text.textContent='';}
 async function prepareSave(preference,{existingProfile=false,current=()=>true}={}){
  const e=epoch,shown=state,chosen=checkbox.checked;
  const ensure=()=>{if(e!==epoch||!current())throw Error('CONSENT_ACCOUNT_CHANGED');};ensure();
  const fresh=await backend.privacyState();ensure();
  if(legalGateRequired(fresh))throw Error('Completa le conferme 18+ e Termini prima di salvare.');
  if(fresh.consent_status==='active'){update(fresh);onState(fresh);return;}
  // Preserve the existing own-profile NULL edit. New-user refusal consequences remain a legal decision.
  if(preference===null&&existingProfile){update(fresh);onState(fresh);return;}
  if(!chosen)throw Error('Per salvare queste preferenze serve una scelta esplicita sul consenso.');
  if(!shown||fresh.required_version!==shown.required_version||fresh.consent_text!==shown.consent_text||!fresh.consent_text){update(fresh);onState(fresh);throw Error('Il testo del consenso è cambiato. Leggilo prima di confermare.');}
  const challenge=pending?.challenge||await backend.consentChallenge();ensure();
  if(challenge.version!==shown.required_version||challenge.text!==shown.consent_text){pending=null;checkbox.checked=false;throw Error('Il testo del consenso è cambiato. Ricarica il profilo.');}
  pending??={challenge,operation:crypto.randomUUID()};
  const result=await backend.acceptConsent(challenge,pending.operation);ensure();
  if(result.consent_status!=='active')throw Error('Consenso non registrato. Riprova.');
  update(result);onState(result);
 }
 reset();return {section,update,reset,prepareSave};
}
