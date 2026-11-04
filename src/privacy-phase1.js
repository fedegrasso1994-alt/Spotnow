import{createOwnModerationNotice}from './moderation-api.js';
import {createRightsControls} from './user-rights.js';
import {mountLegalLinks,legalLink} from './legal-documents.js';
import {completeLegalGate,legalGateRequired,knownTerms,operationIds} from './legal-onboarding.js';
/** Staging-only controls. Server remains authoritative; no sensitive preference or DOB is cached here. */
export const STAGING_REF='zjinjtkekmaqtxsuyvho';
export function privacyPhaseEnabled(env){
 if(env.VITE_PRIVACY_PHASE1!=='true')return false;
 if(new URL(env.VITE_SUPABASE_URL).hostname!==`${STAGING_REF}.supabase.co`)throw Error('Privacy test controls require Soma staging.');
 return true;
}
export function createPrivacyApi(client){
 const call=async(name,args={})=>{const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data;};
 return {
  privacyState:()=>call('my_privacy_state'),
  attestAdultCheckbox:(declared,operation_id=crypto.randomUUID())=>call('attest_adult_checkbox',{declared,operation_id}),
  acceptTerms:(state,accepted,operation_id=crypto.randomUUID())=>call('accept_legal_terms',{expected_version:state.required_terms_version,expected_hash:state.required_terms_hash,accepted,operation_id}),
  attestAdult:(age,declared)=>call('attest_adult',{age,declared,statement_version:'adult-v1',operation_id:crypto.randomUUID()}),
  consentChallenge:()=>call('dating_consent_challenge'),
  acceptConsent:(challenge,operation_id=crypto.randomUUID())=>call('accept_dating_consent',{challenge:challenge.token,operation_id}),
  revokeConsent:()=>call('revoke_dating_consent',{operation_id:crypto.randomUUID()}),
 };
}
export function validDeclaredAge(value){return typeof value==='number'&&Number.isInteger(value)&&value>=18&&value<=120;}
export function createPrivacyControls({backend,onContinue,onRestricted,onRevoke,onDelete,onSignOut,onBack,onState=(_state)=>{},document:doc=globalThis.document}){
 const make=(tag,cls,text)=>{const el=doc.createElement(tag);el.className=cls;if(text)el.textContent=text;return el;};
 const screen=make('section','screen privacy-welcome');screen.id='privacy';screen.dataset.screen='privacy';
 const header=make('header','privacy-header');header.append(make('p','eyebrow','IL TUO SPAZIO, LE TUE SCELTE'),make('h2','disp','Prima di iniziare'),make('p','sub','Soma è per maggiorenni. Consulta i testi e conferma le tue scelte.'));
 const choices=make('div','privacy-choices'),card=make('section','privacy-choice');
 const adultLabel=make('label','privacy-check'),adult=make('input','');adult.type='checkbox';adult.id='adultDeclaration';adultLabel.append(adult,make('span','','Dichiaro di avere almeno 18 anni'));
 const adultProof=make('p','privacy-help','Dichiarazione 18+ già registrata.');
 const termsLabel=make('label','privacy-check'),terms=make('input','');terms.type='checkbox';terms.id='termsDeclaration';
 const termsText=make('span','','Ho letto e accetto i ');termsText.append(legalLink(doc,'terms','Termini e condizioni di SOMA'));termsLabel.append(terms,termsText);
 const termsProof=make('p','privacy-help');
 const next=make('button','btn btn-primary','Continua');next.id='legalContinue';next.disabled=true;
 card.append(adultLabel,adultProof,termsLabel,termsProof,next);choices.append(card);
 const status=make('p','privacy-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const footer=make('footer','privacy-footer');footer.id='privacyFooter';const links=make('div','privacy-footer-links');
 const back=make('button','backlink','Torna al profilo');back.onclick=onBack;
 const revoke=make('button','backlink','Revoca consenso dating');
 const remove=make('button','backlink privacy-danger','Elimina account');remove.onclick=onDelete;
 const signout=make('button','backlink','Esci');signout.onclick=onSignOut;
 for(const [label,category]of[['Assistenza','SUPPORT'],['Richieste privacy','PRIVACY'],['Sicurezza e segnalazioni','SAFETY']]){const a=make('a','backlink',label);a.href='mailto:somadatingapp@gmail.com?subject='+encodeURIComponent('[SOMA '+category+']');links.append(a);}
 links.append(back,revoke,remove,signout);footer.append(links);mountLegalLinks(doc,footer);mountLegalLinks(doc,doc.getElementById('login'));
 footer.append(make('p','privacy-legal-note','Anteprima staging: verifiche giuridiche aperte, pilot non autorizzato.'));
 screen.append(header,choices,status,footer);doc.getElementById('phone').append(screen);
 let state=null,epoch=0,busy=false,operations=operationIds();
 function paint(){const age=state?.age_status==='eligible',accepted=state?.terms_status==='accepted';adultLabel.hidden=age;adultProof.hidden=!age;termsLabel.hidden=accepted;termsProof.hidden=!accepted;termsProof.textContent=accepted?'Termini registrati: '+state.required_terms_version:'';back.hidden=legalGateRequired(state);revoke.hidden=!['active','renewal_required'].includes(state?.consent_status);next.disabled=busy||!knownTerms(state)||state?.age_status==='restricted'||(!age&&!adult.checked)||(!accepted&&!terms.checked);}
 adult.onchange=terms.onchange=paint;
 function update(s){state=s;adult.checked=false;terms.checked=false;status.textContent=s.age_status==='restricted'?'Soma è riservata ai maggiorenni. Puoi chiedere assistenza o eliminare l’account.':knownTerms(s)?'':'Versione dei Termini non disponibile. Ricarica o contatta assistenza.';onState(s);paint();}
 next.onclick=async()=>{if(next.disabled)return;const e=epoch;busy=true;paint();status.textContent='';try{await completeLegalGate(backend,state,{adult:adult.checked,terms:terms.checked,operations,current:()=>e===epoch,onState:update});if(e===epoch)await onContinue();}catch{if(e===epoch){adult.checked=false;terms.checked=false;try{const fresh=await backend.privacyState();if(e===epoch)update(fresh);}catch{/* keep the gate closed */}if(e===epoch)status.textContent='Conferme non completate. Verifica il testo corrente e riprova.';}}finally{if(e===epoch){busy=false;paint();}}};
 async function withdraw(){if(busy)return;const e=epoch;busy=true;paint();try{const s=await backend.revokeConsent();if(e!==epoch)return;update(s);await onRevoke();}catch{if(e===epoch)status.textContent='Revoca non completata. Riprova o contatta assistenza.';}finally{if(e===epoch){busy=false;paint();}}}
 revoke.onclick=withdraw;
 const settings=make('button','backlink','Età e Termini');settings.onclick=()=>{paint();onRestricted?.();};
 const profileRevoke=make('button','backlink','Revoca consenso dating');profileRevoke.onclick=withdraw;doc.getElementById('profileActions').append(settings,profileRevoke);mountLegalLinks(doc,doc.getElementById('profileActions'));
 createRightsControls({backend,document:doc});const moderationNotice=createOwnModerationNotice({backend,document:doc});
 function reset(){epoch++;busy=false;state=null;operations=operationIds();adult.checked=false;terms.checked=false;status.textContent='';profileRevoke.hidden=true;paint();}
 reset();return {screen,update,reset,get state(){return state;},async refresh(){const e=epoch;const s=await backend.privacyState();await moderationNotice.refresh();if(e!==epoch)return null;if(JSON.stringify(s)!==JSON.stringify(state))update(s);profileRevoke.hidden=!['active','renewal_required'].includes(s.consent_status);return s;}};
}
