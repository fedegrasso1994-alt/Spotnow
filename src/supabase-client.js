import { boundedFetch } from './request.js';
import { createClient } from '@supabase/supabase-js';
import { createBackend } from './backend.js';

// Loaded by the future production bundle, never by the unconfigured static demo.
export function connectBackend({url,publicKey,storageKey}) {
  // Local load fixtures inject synthetic data; this branch is removed from production.
  if(import.meta.env.DEV&&globalThis.__SPOT_LOAD_TEST_BACKEND__)return globalThis.__SPOT_LOAD_TEST_BACKEND__;
  const parsed=new URL(url);
  if(parsed.protocol!=='https:' && !['localhost','127.0.0.1'].includes(parsed.hostname)) {
    throw new Error('Il backend deve usare HTTPS.');
  }
  if(!publicKey || publicKey.startsWith('sb_secret_'))throw new Error('Usa la chiave pubblica Supabase.');
  if(publicKey.split('.').length===3) {
    let payload;
    try {payload=JSON.parse(atob(publicKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}
    catch {throw new Error('Chiave pubblica non valida.');}
    if(payload.role!=='anon')throw new Error('Usa la chiave anon, non service_role.');
  } else if(!publicKey.startsWith('sb_publishable_'))throw new Error('Chiave pubblica non valida.');
  return createBackend(createClient(url,publicKey,{global:{fetch:boundedFetch()},auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,...(storageKey?{storageKey}:{})}}));
}
