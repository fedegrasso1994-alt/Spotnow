/** Owner-only staging access/export; no server credentials or persistent export artifacts. */
export const RIGHTS_LABELS={account:'Account',profile:'Profilo',age:'Età dichiarata',age_history:'Conferme età conservate',consent:'Consenso dating',consent_history:'Scelte di consenso conservate',photos:'Foto e copie conservate',checkins:'Il tuo check-in attuale',tribes:'Le tue Tribe',spots:'Interessi inviati',matches:'Match',messages:'Messaggi scritti da te',blocks:'Blocchi effettuati',reports:'Segnalazioni inviate',moderation:'Stato moderazione'};
export const RIGHTS_SECTIONS=['account','profile','age','age_history','consent','consent_history','photos','checkins','tribes','spots','matches','messages','blocks','reports','moderation'];
export function rightsEnabled(env){
 if(env.VITE_RIGHTS_PHASE1!=='true')return false;
 if(new URL(env.VITE_SUPABASE_URL).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')throw Error('Diritti disponibili solo nello staging.');
 return true;
}
export function createRightsApi(client,{boardEnabled=false}={}){
 const sections=boardEnabled?[...RIGHTS_SECTIONS,'board_posts','board_reactions','board_reports']:RIGHTS_SECTIONS;
 return {sections,async page(section,after_key='',page_size=100){
  if(!sections.includes(section))throw Error('Sezione non valida.');
  const r=await client.rpc('my_rights_page',{section,after_key,page_size});
  if(r.error)throw Error('Dati non disponibili. Accedi o riprova.');return r.data;
 }};
}
export async function collectRights(api,{signal=undefined,onProgress=(_progress)=>{},maxRows=10000,maxBytes=8388608}={}){
 const sections={};let total=0,bytes=0,owner=null;
 for(const section of api.sections||RIGHTS_SECTIONS){
  const rows=[];let cursor='';const seen=new Set();
  do{
   if(signal?.aborted)throw Error('Export annullato.');
   const result=await api.page(section,cursor);
   if(result.section!==section||!Array.isArray(result.items)||typeof result.owner_id!=='string')throw Error('Risposta non valida.');
   owner??=result.owner_id;if(result.owner_id!==owner)throw Error('Account cambiato. Ripeti l’export.');
   bytes+=new TextEncoder().encode(JSON.stringify(result.items)).byteLength;if(bytes>maxBytes)throw Error('Export troppo grande: contatta assistenza per una richiesta completa.');
   total+=result.items.length;if(total>maxRows)throw Error('Export troppo grande: contatta assistenza per una richiesta completa.');
   rows.push(...result.items.map(item=>item.data));
   const next=result.next_key;
   if(next!==null&&(typeof next!=='string'||next<=cursor||seen.has(next)))throw Error('Paginazione non valida.');
   cursor=next;if(cursor)seen.add(cursor);onProgress({section,rows:rows.length});
  }while(cursor);
  sections[section]=rows;
 }
 const final=await api.page('account');if(signal?.aborted||final.owner_id!==owner)throw Error('Sessione cambiata o export annullato.');
 return {format:'soma-rights-staging-v1',generated_at:new Date().toISOString(),sections,limitations:['Non è uno snapshot transazionale tra pagine: ripetere se i dati cambiano.','Foto: metadati; i file canonicali sono scaricabili separatamente.','Dati safety/terzi e copie provider: richiesta manuale soggetta a verifica.']};
}
export function formatRightsText(data){return Object.keys(data.sections).map(section=>`${RIGHTS_LABELS[section]||({board_posts:'I tuoi post',board_reactions:'Le tue reactions',board_reports:'Le tue segnalazioni Bacheca'}[section])}\n${data.sections[section].length?JSON.stringify(data.sections[section],null,2):'Nessun dato conservato in questa sezione.'}`).join('\n\n');}
export function makeRightsDownload(data,urls=globalThis.URL){
 const url=urls.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 return {url,name:'soma-dati-personali.json',release:()=>urls.revokeObjectURL(url)};
}

export function createRightsControls({backend,document:doc=globalThis.document}){
 if(!backend.rights)return;
 const button=doc.createElement('button');button.className='backlink';button.textContent='I miei dati / export (staging)';
 const panel=doc.createElement('section');panel.hidden=true;panel.setAttribute('aria-label','Dati personali');
 const note=doc.createElement('p');note.textContent='Collaudo staging: solo dati propri. Foto in questo export: metadati. Informazioni protette e copie provider richiedono richiesta manuale.';
 const view=doc.createElement('button');view.className='backlink';view.textContent='Visualizza i miei dati';
 const download=doc.createElement('button');download.className='backlink';download.textContent='Scarica JSON';
 const close=doc.createElement('button');close.className='backlink';close.textContent='Chiudi';
 const status=doc.createElement('p');status.setAttribute('role','status');const output=doc.createElement('pre');output.style.whiteSpace='pre-wrap';
 const file=doc.createElement('a');file.className='backlink';file.hidden=true;file.textContent='Salva il file JSON';
 panel.append(note,view,download,file,close,status,output);let controller=null,artifact=null;
 const reset=()=>{controller?.abort();artifact?.release();artifact=null;file.hidden=true;file.removeAttribute('href');panel.hidden=true;output.textContent='';status.textContent='';};
 button.onclick=()=>{panel.hidden=!panel.hidden;if(panel.hidden)reset();};close.onclick=reset;
 const work=async save=>{controller?.abort();const c=new AbortController();controller=c;artifact?.release();artifact=null;file.hidden=true;file.removeAttribute('href');view.disabled=true;download.disabled=true;status.textContent='Preparazione dati…';output.textContent='';
 try{const data=await collectRights(backend.rights,{signal:c.signal});if(c.signal.aborted)return;if(save){artifact=makeRightsDownload(data);file.href=artifact.url;file.download=artifact.name;file.hidden=false;status.textContent='File pronto. Tocca Salva il file JSON. Nessuna copia conservata sul server.';}else{output.textContent=formatRightsText(data);status.textContent='Dati pronti. Nessun file export conservato sul server.';}}catch(error){if(!c.signal.aborted)status.textContent=error.message;}finally{view.disabled=false;download.disabled=false;}};
 view.onclick=()=>work(false);download.onclick=()=>work(true);
 doc.getElementById('privacy').append(button,panel);
 // Existing privacy screen is the single restricted-access entry; no navigation controller added.
 backend.onSessionChange?.(()=>reset());
 return {reset};
}
