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
  attestAdult:(age,declared)=>call('attest_adult',{age,declared,statement_version:'adult-v1',operation_id:crypto.randomUUID()}),
  consentChallenge:()=>call('dating_consent_challenge'),
  acceptConsent:challenge=>call('accept_dating_consent',{challenge:challenge.token,operation_id:crypto.randomUUID()}),
  revokeConsent:()=>call('revoke_dating_consent',{operation_id:crypto.randomUUID()}),
 };
}
export function validDeclaredAge(value){return typeof value==='number'&&Number.isInteger(value)&&value>=18&&value<=120;}
export function createPrivacyControls({backend,onContinue,onRestricted,onRevoke,onDelete,onSignOut,onBack,document:doc=globalThis.document}){
 const screen=doc.createElement('section');screen.className='screen';screen.id='privacy';screen.dataset.screen='privacy';
 const heading=doc.createElement('h2');heading.className='disp';heading.textContent='Prima di iniziare';
 const note=doc.createElement('p');note.className='sub';note.textContent='Solo collaudo staging. I testi del consenso devono essere validati prima del pilot.';
 const label=doc.createElement('label');label.textContent='Età';const age=doc.createElement('input');age.type='number';age.min='0';age.max='120';age.step='1';age.inputMode='numeric';age.setAttribute('aria-label','Età dichiarata');
 const adultLabel=doc.createElement('label');const adult=doc.createElement('input');adult.type='checkbox';adultLabel.append(adult,doc.createTextNode(' Dichiaro di avere almeno 18 anni'));
 const ageButton=doc.createElement('button');ageButton.className='btn btn-primary';ageButton.textContent='Conferma età';
 const text=doc.createElement('p');text.className='sub';const consentLabel=doc.createElement('label');const consent=doc.createElement('input');consent.type='checkbox';consentLabel.append(consent,doc.createTextNode(' Acconsento esplicitamente all’uso delle preferenze dating (test staging)'));
 const accept=doc.createElement('button');accept.className='btn btn-primary';accept.textContent='Conferma consenso';
 const gateRevoke=doc.createElement('button');gateRevoke.className='backlink';gateRevoke.textContent='Revoca consenso dating';
 const support=doc.createElement('a');support.className='backlink';support.href='mailto:somadatingapp@gmail.com';support.textContent='Assistenza e privacy';
 const status=doc.createElement('p');status.setAttribute('role','status');
 const back=doc.createElement('button');back.className='backlink';back.textContent='Torna al profilo';back.onclick=onBack;
 const remove=doc.createElement('button');remove.className='backlink';remove.textContent='Elimina account';remove.onclick=onDelete;
 const signout=doc.createElement('button');signout.className='backlink';signout.textContent='Esci';signout.onclick=onSignOut;
 screen.append(heading,note,label,age,adultLabel,ageButton,text,consentLabel,accept,status,back,gateRevoke,support,remove,signout);doc.getElementById('phone').append(screen);
 let current=null;
 const update=(s,showAge=false)=>{current=s;age.value=s.declared_age||'';const eligible=s.age_status==='eligible';back.hidden=!eligible;gateRevoke.hidden=!['active','renewal_required'].includes(s.consent_status);text.textContent=s.consent_text||'Consenso non configurato.';ageButton.hidden=eligible&&!showAge;age.hidden=eligible&&!showAge;label.hidden=eligible&&!showAge;adultLabel.hidden=eligible&&!showAge;adult.checked=false;consentLabel.hidden=!eligible;accept.hidden=!eligible;consent.checked=false;status.textContent=s.age_status==='restricted'?'Soma è riservata ai maggiorenni. Puoi chiedere assistenza o eliminare l’account.':'';};
 async function work(button,fn){if(button.disabled)return;button.disabled=true;try{await fn();}catch{status.textContent='Conferma non completata. Controlla i dati o riprova.';}finally{button.disabled=false;}}
 ageButton.onclick=()=>work(ageButton,async()=>{const value=Number(age.value);if(age.value.trim()===''||!Number.isInteger(value)||value<0||value>120||!adult.checked){status.textContent='Inserisci un’età valida e conferma la dichiarazione.';return;}update(await backend.attestAdult(value,true));if(current.age_status!=='eligible')onRestricted?.();else if(current.consent_status==='active')await onContinue();});
 accept.onclick=()=>work(accept,async()=>{if(!consent.checked){status.textContent='Il consenso richiede una scelta esplicita.';return;}const challenge=await backend.consentChallenge();if(challenge.version!==current.required_version||challenge.text!==current.consent_text){update(await backend.privacyState());status.textContent='Il testo è cambiato. Leggilo prima di confermare.';return;}update(await backend.acceptConsent(challenge));await onContinue();});
 const settings=doc.createElement('button');settings.className='backlink';settings.textContent='Età e consenso preferenze dating';settings.onclick=()=>{update(current,true);onRestricted?.();};doc.getElementById('profileActions').append(settings);
 const revoke=doc.createElement('button');revoke.className='backlink';revoke.textContent='Revoca consenso dating';revoke.onclick=()=>work(revoke,async()=>{update(await backend.revokeConsent());await onRevoke();});doc.getElementById('profileActions').append(revoke);
 gateRevoke.onclick=()=>work(gateRevoke,async()=>{update(await backend.revokeConsent());await onRevoke();});
 return {screen,update,get state(){return current;},async refresh(){const s=await backend.privacyState();if(JSON.stringify(s)!==JSON.stringify(current))update(s);revoke.hidden=s.consent_status!=='active'&&s.consent_status!=='renewal_required';return s;}};
}
