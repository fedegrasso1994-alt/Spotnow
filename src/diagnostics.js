/** Bounded, local diagnostics: event type/time only, never request payloads or user text. */
export function setupDiagnostics(){
 const events=[];const record=(type)=>{events.push({type,at:new Date().toISOString()});if(events.length>30)events.shift();};
 window.addEventListener('error',()=>record('runtime_error'));
 window.addEventListener('unhandledrejection',()=>record('unhandled_request'));
 window.addEventListener('offline',()=>record('offline'));window.addEventListener('online',()=>record('online'));
 const banner=document.createElement('div');banner.className='network-banner';banner.setAttribute('role','status');banner.textContent='Sei offline. Le nuove azioni richiedono una connessione.';
 const update=()=>{banner.hidden=navigator.onLine!==false;};update();window.addEventListener('online',update);window.addEventListener('offline',update);document.getElementById('phone')?.append(banner);
 return {snapshot:()=>events.map(event=>({...event}))};
}
