import{operationalFetch,operationalEnabled}from './operational.js';
/// <reference types="vite/client" />
import{createClient}from'@supabase/supabase-js';
import{boundedFetch}from'./request.js';
import{dashboardEnabled,createDashboardApi,metricText,dashboardSections}from'./analytics-dashboard-api.js';
import './admin.css';
import './analytics-dashboard.css';
if(!dashboardEnabled(import.meta.env))throw Error('Dashboard disabled');
const client=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLIC_KEY,{global:{fetch:operationalFetch(boundedFetch(),{url:import.meta.env.VITE_SUPABASE_URL,publicKey:import.meta.env.VITE_SUPABASE_PUBLIC_KEY,enabled:operationalEnabled(import.meta.env)})},auth:{storageKey:'soma-analytics-admin-staging',persistSession:true}});
const read=createDashboardApi(client),root=document.getElementById('phone');
root.replaceChildren();root.classList.add('admin-panel','analytics-dashboard');
const el=(tag,text='')=>{const e=document.createElement(tag);e.textContent=text;return e;};
const title=el('h1','Soma · Analytics'),status=el('p','Accedi con un account ADMIN dedicato e verifica MFA.');status.setAttribute('role','status');
const form=el('form'),email=el('input'),password=el('input'),login=el('button','Accedi');
email.placeholder='Email ADMIN';email.type='email';email.required=true;email.autocomplete='username';email.setAttribute('aria-label','Email ADMIN');
password.placeholder='Password ADMIN';password.type='password';password.required=true;password.autocomplete='current-password';password.setAttribute('aria-label','Password ADMIN');form.append(email,password,login);
const code=el('input');code.placeholder='Codice MFA TOTP';code.inputMode='numeric';code.autocomplete='one-time-code';code.setAttribute('aria-label','Codice MFA TOTP');
const mfa=el('button','Verifica MFA'),exit=el('button','Esci'),period=el('select'),refresh=el('button','Aggiorna'),body=el('div');
period.setAttribute('aria-label','Settimana conclusa');for(let n=0;n<=10;n++){const o=el('option',n===0?'Ultima settimana conclusa':`${n} settimane prima`);o.value=String(n);period.append(o);}
const controls=el('div');controls.className='dashboard-controls';controls.append(period,refresh);
for(const label of['Tribe','Place']){const s=el('select');s.disabled=true;s.setAttribute('aria-label',label);s.append(el('option',`${label}: non misurato`));controls.append(s);}
root.append(title,status,form,code,mfa,exit,controls,body);
let generation=0;
const showLogin=()=>{form.hidden=false;code.hidden=false;mfa.hidden=false;};
const clear=()=>{generation++;body.replaceChildren();showLogin();};
function render(data){
 form.hidden=true;code.hidden=true;mfa.hidden=true;body.replaceChildren();body.append(el('p',`${data.period.start} → ${data.period.end_exclusive} escluso · Europe/Rome`),el('p',data.collection_enabled?'Raccolta attiva':'Raccolta OFF · nessun evento generato da questa pagina'),el('p','Conteggi per difetto a decine. Celle sotto soglia protette; dato assente non significa zero. Filtri Tribe/Place non disponibili: riferimenti non raccolti.'));
 for(const [title,items]of dashboardSections){const section=el('section');section.append(el('h2',title));const grid=el('div');grid.className='dashboard-grid';for(const[label,key]of items){const card=el('article');card.className='moderation-card';card.append(el('h3',label),el('p',metricText(key?data.metrics[key]:{status:'unmeasured'})));grid.append(card);}section.append(grid);body.append(section);}
 const retention=el('section');retention.append(el('h2','Retention · coorte di registrazione osservata'));
 for(const key of['d1','d7','d30'])retention.append(el('p',`${key.toUpperCase()}: ${metricText(data.retention[key])}`));
 retention.append(el('p','Numeratore e denominatore arrotondati separatamente: nessuna percentuale ricostruita dal client. Account cancellati esclusi.'));
 body.append(retention);
 const fair=el('section');fair.append(el('h2','Fairness · assegnazioni, non visualizzazioni'));
 if(data.fairness.status!=='available')fair.append(el('p','Distribuzione protetta: almeno una classe sotto soglia. Nessun totale complementare esposto.'));
 else{for(const b of data.fairness.distribution)fair.append(el('p',`Media assegnazioni/finestra nella classe ${b.bucket}: ≥ ${b.accounts_lower_bound} account`));}
 fair.append(el('p','Classi della media per account arrotondata per difetto. Nessuna coppia o segmentazione dating. Non misura tutta la popolazione eleggibile.'));body.append(fair);
 const trend=el('section');trend.append(el('h2','Trend · account attivi per settimana conclusa'));for(const p of data.trend)trend.append(el('p',`${p.start}: ${metricText(p.active)}`));body.append(trend);
}
async function load(){const own=++generation;body.replaceChildren();status.textContent='Verifica accesso e caricamento…';refresh.disabled=true;try{const data=await read(Number(period.value));if(own!==generation)return;render(data);status.textContent='Sola lettura · ADMIN e MFA verificati dal server.';}catch(e){if(own===generation){body.replaceChildren();showLogin();status.textContent=e.message;}}finally{if(own===generation)refresh.disabled=false;}}
form.onsubmit=async e=>{e.preventDefault();clear();login.disabled=true;try{const r=await client.auth.signInWithPassword({email:email.value,password:password.value});form.reset();if(r.error)throw Error();await load();}catch{status.textContent='Accesso non completato.';}finally{login.disabled=false;}};
mfa.onclick=async()=>{clear();mfa.disabled=true;try{const f=await client.auth.mfa.listFactors();const factor=f.data?.totp.find(x=>x.status==='verified');if(!factor)throw Error();const r=await client.auth.mfa.challengeAndVerify({factorId:factor.id,code:code.value});code.value='';if(r.error)throw Error();await load();}catch{status.textContent='MFA non completata.';}finally{mfa.disabled=false;}};
exit.onclick=async()=>{clear();form.reset();code.value='';const r=await client.auth.signOut();status.textContent=r.error?'Uscita non confermata: riprova. Dati rimossi dalla pagina.':'Sessione chiusa.';};
client.auth.onAuthStateChange((_event,session)=>{clear();refresh.disabled=false;if(session){status.textContent='Sessione aggiornata. Verifica accesso…';queueMicrotask(()=>void load());}else status.textContent='Accedi con un account ADMIN dedicato e verifica MFA.';});
window.addEventListener('pagehide',clear);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')clear();});
refresh.onclick=load;period.onchange=load;
