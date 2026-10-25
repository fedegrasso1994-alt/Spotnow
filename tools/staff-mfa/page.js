import {createClient} from '@supabase/supabase-js';
import {validateConfig,createStaffSetup,stagingAuthFetch,safeError} from './auth.js';

const $=id=>document.getElementById(id),message=$('status');
const config=validateConfig(await (await fetch('/config.json',{cache:'no-store'})).json());
const results=new Map();let setup=null,busy=false,session=false,secondLogin=false,stopped=false,repairComplete=false;
let stage='READY';
$('repair').hidden=!config.repair;$('enroll').hidden=Boolean(config.repair);
if(config.repair){document.title='SOMA — riparazione MFA ADMIN · un tentativo';$('heading').textContent='Riparazione MFA — solo ADMIN staging';$('intro').textContent='Custode: Federico. Solo ADMIN autorizzato; MODERATOR escluso. Nessun ruolo viene assegnato.';$('directions').textContent='Chiudi la vecchia scheda. Login ADMIN → riparazione mirata → scansione privata → Verifica MFA → Esci → nuovo login ADMIN → Verifica MFA → Esci. Non ricaricare mentre il QR è attivo. In caso di errore enrollment: STOP, nessun nuovo tentativo.';}
for(const a of config.accounts){const option=document.createElement('option');option.value=a.id;option.textContent=a.label+' — '+a.id;$('account').append(option);}
function clearQr(){$('qr').removeAttribute('src');$('qr').hidden=true;$('code').value='';}
function render(){
 $('account').disabled=busy||session;$('login').hidden=session;
 $('login-button').disabled=busy;$('code').disabled=busy||!session;
 $('enroll').disabled=busy||!session||stopped;$('repair').disabled=busy||!session||stopped||repairComplete;
 $('verify-button').disabled=busy||!session||stopped;$('logout').disabled=busy||!session;
 const rows=config.accounts.map(a=>{
  const result=results.get(a.id);return `${a.label}: ${result?.first?'MFA AAL2 verificato':'da verificare'} · nuovo login ${result?.again?'verificato':'da verificare'}`;
 });$('summary').textContent=rows.join('\n');
}
async function action(work,{stop=false}={}){if(busy)return;busy=true;render();try{await work();}catch(error){
 if(stop)stopped=true;
 clearQr();message.textContent=`${stop?'STOP — nessun nuovo tentativo. ':''}${stage}: ${safeError(error)}. Non condividere screenshot, QR, codici o dati della sessione.`;
}finally{busy=false;render();}}
$('login').onsubmit=event=>{event.preventDefault();void action(async()=>{
 const account=$('account').value;const client=createClient(config.url,config.publicKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'soma-local-staff-mfa'},global:{fetch:stagingAuthFetch(window.fetch.bind(window))}});
 setup=createStaffSetup(client,account,{repair:config.repair,claimEnrollment:async()=>{
  const response=await fetch('/repair/claim',{method:'POST'});
  if(response.status!==201)throw Error('ENROLLMENT_ATTEMPT_ALREADY_USED');
 }});
 stage='LOGIN';
 let state;try{state=await setup.login($('email').value,$('password').value);}finally{$('password').value='';}
 session=true;secondLogin=Boolean(results.get(account)?.first);
 $('email').value='';clearQr();message.textContent=state.verified?'Login verificato. Inserisci il codice del fattore esistente e premi Verifica MFA.':config.repair?'ADMIN corretto: usa il pulsante di riparazione mirata. È consentito un solo nuovo enrollment.':'Login verificato sul corretto UID. Premi Attiva MFA e scansiona privatamente il QR.';
 });};
function showQr(svg){$('qr').src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);$('qr').hidden=false;}
$('repair').onclick=()=>void action(async()=>{
 if(stopped)throw Error('ENROLLMENT_ATTEMPT_ALREADY_USED');
 stage='CHECK_ATTEMPT';const response=await fetch('/repair/status',{cache:'no-store'});
 if(response.status!==200||(await response.json()).used)throw Error('ENROLLMENT_ATTEMPT_ALREADY_USED');
 stage='REMOVE_INCOMPLETE_FACTOR';await setup.removeIncompleteFactor();
 stage='ENROLL_ADMIN';showQr(await setup.enroll());repairComplete=true;
 message.textContent='Solo fattore incompleto rimosso; nuovo enrollment prodotto. Scansiona privatamente il QR e verifica MFA. Non ripremere riparazione.';
},{stop:true});
$('enroll').onclick=()=>void action(async()=>{
 clearQr();stage='ENROLL';const svg=await setup.enroll();showQr(svg);
 message.textContent='Scansiona il QR con il tuo autenticatore. Inserisci il codice qui sotto, mai in chat. Non fotografare o condividere questa pagina.';
});
$('verify').onsubmit=event=>{event.preventDefault();void action(async()=>{
 stage='VERIFY_MFA';
 let result;try{result=await setup.verify($('code').value.trim());}finally{$('code').value='';}
 clearQr();const previous=results.get(result.id)||{};results.set(result.id,{first:true,again:previous.again||secondLogin});
 message.textContent=secondLogin?'Nuovo login + challenge MFA verificati: AAL2. Esci prima di passare all’altro account.':'MFA verificato: AAL2. Premi Esci, poi effettua un nuovo login e verifica nuovamente il codice.';
 });};
$('logout').onclick=()=>void action(async()=>{
 try{await setup.logout();}finally{session=false;setup=null;secondLogin=false;clearQr();}
 message.textContent='Sessione locale chiusa. Puoi verificare un nuovo login o passare al secondo account.';
});
if(config.repair){const state=await fetch('/repair/status',{cache:'no-store'});if(state.status!==200)throw Error('ATTEMPT_STATUS_UNAVAILABLE');repairComplete=(await state.json()).used;}
render();
message.textContent=repairComplete?'Tentativo enrollment già riservato: nessun nuovo enrollment consentito. Se il fattore è già verified puoi fare login e Verifica MFA; altrimenti STOP.':'Solo staging. Scegli l’account, poi inserisci le sue credenziali. Nessun ruolo verrà assegnato.';
