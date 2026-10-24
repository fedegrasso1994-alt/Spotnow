import {createClient} from '@supabase/supabase-js';
import {validateConfig,createStaffSetup,stagingAuthFetch} from './auth.js';

const $=id=>document.getElementById(id),message=$('status');
const config=validateConfig(await (await fetch('/config.json',{cache:'no-store'})).json());
const results=new Map();let setup=null,busy=false,session=false,secondLogin=false;
for(const a of config.accounts){const option=document.createElement('option');option.value=a.id;option.textContent=a.label+' — '+a.id;$('account').append(option);}
function clearQr(){$('qr').removeAttribute('src');$('qr').hidden=true;$('code').value='';}
function render(){
 $('account').disabled=busy||session;$('login').hidden=session;
 $('login-button').disabled=busy;$('code').disabled=busy||!session;
 $('enroll').disabled=busy||!session;$('verify-button').disabled=busy||!session;$('logout').disabled=busy||!session;
 const rows=config.accounts.map(a=>{
  const result=results.get(a.id);return `${a.label}: ${result?.first?'MFA AAL2 verificato':'da verificare'} · nuovo login ${result?.again?'verificato':'da verificare'}`;
 });$('summary').textContent=rows.join('\n');
}
async function action(work){if(busy)return;busy=true;render();try{await work();}catch{
 clearQr();message.textContent='Operazione non completata. Verifica account selezionato, credenziali/codice e connessione. Se esiste già un fattore, usa Verifica MFA. Non condividere screenshot del setup.';
}finally{busy=false;render();}}
$('login').onsubmit=event=>{event.preventDefault();void action(async()=>{
 const account=$('account').value;const client=createClient(config.url,config.publicKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'soma-local-staff-mfa'},global:{fetch:stagingAuthFetch(window.fetch.bind(window))}});
 setup=createStaffSetup(client,account);
 let state;try{state=await setup.login($('email').value,$('password').value);}finally{$('password').value='';}
 session=true;secondLogin=Boolean(results.get(account)?.first);
 $('email').value='';clearQr();message.textContent=state.verified?'Login verificato. Inserisci il codice del fattore esistente e premi Verifica MFA.':'Login verificato sul corretto UID. Premi Attiva MFA e scansiona privatamente il QR.';
 });};
$('enroll').onclick=()=>void action(async()=>{
 clearQr();const svg=await setup.enroll();$('qr').src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);$('qr').hidden=false;
 message.textContent='Scansiona il QR con il tuo autenticatore. Inserisci il codice qui sotto, mai in chat. Non fotografare o condividere questa pagina.';
});
$('verify').onsubmit=event=>{event.preventDefault();void action(async()=>{
 let result;try{result=await setup.verify($('code').value.trim());}finally{$('code').value='';}
 clearQr();const previous=results.get(result.id)||{};results.set(result.id,{first:true,again:previous.again||secondLogin});
 message.textContent=secondLogin?'Nuovo login + challenge MFA verificati: AAL2. Esci prima di passare all’altro account.':'MFA verificato: AAL2. Premi Esci, poi effettua un nuovo login e verifica nuovamente il codice.';
 });};
$('logout').onclick=()=>void action(async()=>{
 try{await setup.logout();}finally{session=false;setup=null;secondLogin=false;clearQr();}
 message.textContent='Sessione locale chiusa. Puoi verificare un nuovo login o passare al secondo account.';
});
render();
message.textContent='Solo staging. Scegli l’account, poi inserisci le sue credenziali. Nessun ruolo verrà assegnato.';
