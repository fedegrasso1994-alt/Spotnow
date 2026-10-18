import{createOwnModerationNotice}from './moderation-api.js';
import {createRightsControls} from './user-rights.js';
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
  attestAdultCheckbox:declared=>call('attest_adult_checkbox',{declared,operation_id:crypto.randomUUID()}),
  attestAdult:(age,declared)=>call('attest_adult',{age,declared,statement_version:'adult-v1',operation_id:crypto.randomUUID()}),
  consentChallenge:()=>call('dating_consent_challenge'),
  acceptConsent:challenge=>call('accept_dating_consent',{challenge:challenge.token,operation_id:crypto.randomUUID()}),
  revokeConsent:()=>call('revoke_dating_consent',{operation_id:crypto.randomUUID()}),
 };
}
export function validDeclaredAge(value){return typeof value==='number'&&Number.isInteger(value)&&value>=18&&value<=120;}
export function createPrivacyControls({backend,onContinue,onRestricted,onRevoke,onDelete,onSignOut,onBack,document:doc=globalThis.document}){
 const screen=doc.createElement('section');screen.className='screen';screen.id='privacy';screen.dataset.screen='privacy';
 const make=(tag,cls,text)=>{const el=doc.createElement(tag);el.className=cls;if(text)el.textContent=text;return el;};
 screen.className='screen privacy-welcome';
 const header=make('header','privacy-header'),eyebrow=make('p','eyebrow','IL TUO SPAZIO, LE TUE SCELTE');
 const heading=make('h2','disp','Prima di iniziare'),intro=make('p','sub','Due conferme per vivere Soma in modo consapevole.');header.append(eyebrow,heading,intro);
 const choices=make('div','privacy-choices');
 const ageCard=make('section','privacy-choice'),ageTitle=make('h3','','Un posto per maggiorenni');
 const adultLabel=make('label','privacy-check'),adult=make('input','');adult.type='checkbox';adult.id='adultDeclaration';
 const adultCopy=make('span','','Dichiaro di avere almeno 18 anni');adultLabel.append(adult,adultCopy);
 const ageButton=make('button','btn btn-primary','Conferma e continua');ageButton.disabled=true;adult.onchange=()=>{ageButton.disabled=!adult.checked;};
 ageCard.append(ageTitle,adultLabel,ageButton);
 const consentCard=make('section','privacy-choice'),consentTitle=make('h3','','Le tue preferenze, la tua scelta');
 const consentLabel=make('label','privacy-check'),consent=make('input','');consent.type='checkbox';consent.id='datingDeclaration';
 const text=make('span','privacy-consent-text');consentLabel.append(consent,text);
 const consentHelp=make('p','privacy-help','Puoi revocare il consenso in qualsiasi momento dal profilo.');
 const accept=make('button','btn btn-primary','Conferma e continua');accept.disabled=true;consent.onchange=()=>{accept.disabled=!consent.checked;};
 consentCard.append(consentTitle,consentLabel,consentHelp,accept);choices.append(ageCard,consentCard);
 const gateRevoke=make('button','backlink','Revoca consenso dating');
 const support=make('a','backlink','Assistenza e privacy');support.href='mailto:somadatingapp@gmail.com';
 const status=make('p','privacy-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const back=make('button','backlink','Torna al profilo');back.onclick=onBack;
 const remove=make('button','backlink privacy-danger','Elimina account');remove.onclick=onDelete;
 const signout=make('button','backlink','Esci');signout.onclick=onSignOut;
 const footer=make('footer','privacy-footer'),footerLinks=make('div','privacy-footer-links');footer.id='privacyFooter';
 const note=make('p','privacy-legal-note','Informativa e consenso in revisione prima del pilot.');
 footerLinks.append(back,gateRevoke,support,remove,signout);footer.append(footerLinks,note);
 screen.append(header,choices,status,footer);doc.getElementById('phone').append(screen);
 let current=null;
 const update=(s,showAge=false)=>{current=s;const eligible=s.age_status==='eligible';back.hidden=!eligible;gateRevoke.hidden=!['active','renewal_required'].includes(s.consent_status);text.textContent=s.consent_text||'Il consenso non è disponibile. Riprova più tardi.';ageCard.hidden=eligible&&!showAge;consentCard.hidden=!eligible;adult.checked=false;ageButton.disabled=true;consent.checked=false;accept.disabled=true;status.textContent=s.age_status==='restricted'?'Soma è riservata ai maggiorenni. Puoi chiedere assistenza o eliminare l’account.':'';if(s.age_status==='restricted'){adult.disabled=true;ageButton.disabled=true;}else adult.disabled=false;};
 async function work(button,fn){if(button.disabled)return;button.disabled=true;status.textContent='';try{await fn();}catch{status.textContent='Conferma non completata. Riprova tra poco o contatta assistenza.';}finally{button.disabled=button===ageButton?!adult.checked:button===accept?!consent.checked:false;}}
 ageButton.onclick=()=>work(ageButton,async()=>{if(!adult.checked)return;update(await backend.attestAdultCheckbox(true));if(current.age_status!=='eligible')onRestricted?.();else if(current.consent_status==='active')await onContinue();});
 accept.onclick=()=>work(accept,async()=>{if(!consent.checked){status.textContent='Il consenso richiede una scelta esplicita.';return;}const challenge=await backend.consentChallenge();if(challenge.version!==current.required_version||challenge.text!==current.consent_text){update(await backend.privacyState());status.textContent='Il testo è cambiato. Leggilo prima di confermare.';return;}update(await backend.acceptConsent(challenge));await onContinue();});
 const settings=doc.createElement('button');settings.className='backlink';settings.textContent='Età e consenso preferenze dating';settings.onclick=()=>{update(current,true);onRestricted?.();};doc.getElementById('profileActions').append(settings);
 const revoke=doc.createElement('button');revoke.className='backlink';revoke.textContent='Revoca consenso dating';revoke.onclick=()=>work(revoke,async()=>{update(await backend.revokeConsent());await onRevoke();});doc.getElementById('profileActions').append(revoke);
 gateRevoke.onclick=()=>work(gateRevoke,async()=>{update(await backend.revokeConsent());await onRevoke();});
 createRightsControls({backend,document:doc});
 const moderationNotice=createOwnModerationNotice({backend,document:doc});
 return {screen,update,get state(){return current;},async refresh(){const s=await backend.privacyState();await moderationNotice.refresh();if(JSON.stringify(s)!==JSON.stringify(current))update(s);revoke.hidden=s.consent_status!=='active'&&s.consent_status!=='renewal_required';return s;}};
}
