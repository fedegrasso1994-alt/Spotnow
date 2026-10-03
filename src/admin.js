import { connectBackend } from './supabase-client.js';
import { userMessage } from './errors.js';
import { singleFlight, stableList } from './ui-refresh.js';
import './admin.css';
const backend=connectBackend({url:import.meta.env.VITE_SUPABASE_URL,publicKey:import.meta.env.VITE_SUPABASE_PUBLIC_KEY,storageKey:'spot-now-moderator-session'});
const phone=document.getElementById('phone');phone.replaceChildren();phone.classList.add('admin-panel');
document.title='Spot Now — Moderazione';
function element(tag,text,className){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
const title=element('h1','Moderazione','disp');const note=element('p','Accesso riservato ai gestori autorizzati. Le azioni vengono registrate.','sub');
const login=element('button','Accedi con Google','btn btn-primary');
const refresh=element('button','Aggiorna segnalazioni','btn btn-ghost');refresh.hidden=true;
const logout=element('button','Esci dal pannello','backlink');logout.hidden=true;
const status=element('p','','sub');status.setAttribute('role','status');
const list=element('div','');phone.append(title,note,login,refresh,logout,status,list);
let epoch=0,writing=false;const notes=new Map();
login.onclick=async()=>{login.disabled=true;status.textContent='Apertura di Google…';try{await backend.adminGoogleLogin(location.origin+location.pathname+'?admin=1');}catch(error){status.textContent=userMessage(error);}finally{login.disabled=false;}};
logout.onclick=async()=>{logout.disabled=true;try{await backend.signOut();location.reload();}catch(error){status.textContent=userMessage(error);logout.disabled=false;}};
refresh.onclick=()=>void load();
const reasons={harassment:'Molestie',fake_profile:'Profilo falso',underage:'Persona minorenne',inappropriate:'Contenuti inappropriati',other:'Altro'};
const reportStates={pending:'Da verificare',reviewed:'Verificata',dismissed:'Archiviata'};
function card(report){
 const card=element('article','','moderation-card');card.append(element('h2',report.target_name),element('p',`${reasons[report.reason]||'Altro'} · ${reportStates[report.status]||'Da verificare'} · ${new Date(report.created_at).toLocaleString('it-IT')}`),element('p',report.details||'Nessun dettaglio aggiunto.'),element('p',report.suspended?'Account sospeso':'Account attivo'));
 const input=element('textarea','');input.maxLength=1000;input.value=notes.get(report.id)||'';input.placeholder='Nota di revisione (obbligatoria per sospendere)';input.setAttribute('aria-label',`Nota per ${report.target_name}`);input.oninput=()=>notes.set(report.id,input.value);card.append(input);
 const feedback=element('p','');feedback.setAttribute('role','status');const buttons=[];
 for(const [action,label] of [['review','Segna come verificata'],['dismiss','Archivia'],[report.suspended?'revoke':'suspend',report.suspended?'Revoca sospensione':'Sospendi profilo']]){
  const button=element('button',label,'btn btn-ghost');buttons.push(button);button.onclick=async()=>{
   if(writing)return;
   if(action==='suspend'&&!input.value.trim()){feedback.textContent='Inserisci il motivo della sospensione.';input.focus();return;}
   const generation=epoch;writing=true;refresh.disabled=true;buttons.forEach(b=>b.disabled=true);feedback.textContent='Salvataggio…';
   try{await backend.moderateReport(report.id,action,input.value.trim());if(generation!==epoch)return;notes.delete(report.id);writing=false;await load();}
   catch(error){if(generation===epoch)feedback.textContent=userMessage(error)+' La nota è conservata.';}
   finally{if(generation===epoch){writing=false;refresh.disabled=false;buttons.forEach(b=>b.disabled=false);}}
  };card.append(button);
 }
 card.append(feedback);return card;
}
const read=singleFlight(async generation=>{
 refresh.disabled=true;if(!list.children.length)status.textContent='Caricamento…';
 try{
  const session=await backend.session();if(generation!==epoch)return;login.hidden=Boolean(session);logout.hidden=!session;
  if(!session){list.replaceChildren();refresh.hidden=true;status.textContent='Accedi con il tuo account gestore.';return;}
  const moderator=await backend.isModerator();if(generation!==epoch)return;
  if(!moderator){list.replaceChildren();refresh.hidden=true;status.textContent='Questo account non ha accesso alla moderazione.';return;}
  const reports=await backend.moderationReports();if(generation!==epoch)return;refresh.hidden=false;status.textContent=reports.length===1?'1 segnalazione recente':reports.length?`${reports.length} segnalazioni recenti`:'Nessuna segnalazione.';
  stableList(list,reports,{key:r=>r.id,signature:r=>JSON.stringify([r.status,r.suspended,r.target_name,r.reason,r.details]),create:card});
 }catch(error){if(generation===epoch)status.textContent=userMessage(error);}
 finally{if(generation===epoch)refresh.disabled=writing;}
});
const load=()=>writing?Promise.resolve():read(epoch);
backend.onSessionChange((event)=>{if(event==='SIGNED_OUT'){epoch++;notes.clear();list.replaceChildren();setTimeout(()=>void load(),0);}});
await load();
