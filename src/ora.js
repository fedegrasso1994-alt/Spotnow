/** Staging-only API. Presence identity, source, time and eligibility belong to the server. */
export function oraEnabled(env){if(env.VITE_ORA_V2!=='true')return false;if(env.VITE_ONBOARDING_NO_QR!=='true'||env.VITE_PRIVACY_PHASE1!=='true'||new URL(env.VITE_SUPABASE_URL).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')throw Error('ORA v2 richiede onboarding/privacy nello staging.');return true;}
export function createOraApi(client){const call=async(name,args={})=>{const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data;};return {
 current:()=>call('my_presence'),search:(text='',offset=0)=>call('search_places',{search_text:text,page_offset:offset}),
 start:id=>call('start_ora_manual',{place_id:id}),qr:token=>call('start_ora_qr',{qr_token:token}),end:id=>call('end_ora',{presence_id:id}),
 async people(offset=0){const rows=await call('ora_people_page',{page_size:49,page_offset:offset});return {items:rows.slice(0,48),hasMore:rows.length>48,total:Number(rows[0]?.total_count||0)};}
};}
export function createPresenceClock(now=()=>performance.now()){let end=0;return {set(p){end=p?now()+Math.max(0,Date.parse(p.expires_at)-Date.parse(p.server_now)):0;},live:()=>end>now(),remaining:()=>Math.max(0,Math.ceil((end-now())/1000)),clear(){end=0;}};}
export function oraError(error){const s=String(error?.message||'');if(s.includes('QR'))return 'QR non valido o Place non disponibile. Scansiona un altro QR.';if(s.includes('PLACE'))return 'Questo Place non è disponibile.';if(s.includes('ACCOUNT'))return 'Per usare Ora verifica età, consenso e stato dell’account.';if(s.includes('PAUSED'))return 'Ora è temporaneamente non disponibile.';return 'Operazione non completata. Riprova.';}

// UX lifetime only, not QR authorization: the server validates every token.
export const pendingQrFresh=(draft,now=Date.now())=>Number.isFinite(draft?.savedAt)&&now>=draft.savedAt&&now-draft.savedAt<=3600000;
