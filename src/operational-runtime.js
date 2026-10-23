import{operationalEnabled}from'./operational.js';
import{safeEvent}from'../supabase/functions/_shared/operational-contract.js';
export function setupOperationalRuntime(env,{window:win=globalThis.window,storage=globalThis.sessionStorage,fetcher=globalThis.fetch}={}){
 if(!operationalEnabled(env))return;let sent=0;
 const send=(operation,result,kind)=>{if(sent++>=10)return;const value=safeEvent(operation,crypto.randomUUID(),result,kind);void fetcher(env.VITE_SUPABASE_URL+'/rest/v1/rpc/ops_observe',{method:'POST',headers:{apikey:env.VITE_SUPABASE_PUBLIC_KEY,'Content-Type':'application/json'},body:JSON.stringify(value),signal:AbortSignal.timeout(3000)}).catch(()=>{});};
 win.addEventListener('error',()=>send('runtime.bootstrap','failure','internal_error'));win.addEventListener('unhandledrejection',()=>send('runtime.navigation','failure','internal_error'));
 try{if(storage.getItem('soma-offline-fallback')==='1'){storage.removeItem('soma-offline-fallback');send('runtime.offline','failure','dependency_error');}}catch{}
 const params=new URLSearchParams(win.location.search),hash=new URLSearchParams(win.location.hash.slice(1));if(['error','error_code','error_description'].some(k=>params.has(k)||hash.has(k)))send('auth.callback','failure','authorization_error');
}
