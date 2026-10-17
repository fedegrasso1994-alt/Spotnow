/** Only staging may wire the QR-independent onboarding. Server controls eligibility and membership. */
export function noQrOnboardingEnabled(env){
 if(env.VITE_ONBOARDING_NO_QR!=='true')return false;
 if(env.VITE_PRIVACY_PHASE1!=='true'||new URL(env.VITE_SUPABASE_URL).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')throw Error('Onboarding senza QR disponibile solo nello staging con privacy gates.');
 return true;
}
export function createOnboardingApi(client){
 const call=async(name,args={})=>{const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data;};
 return {state:()=>call('my_onboarding_state'),complete:()=>call('complete_onboarding'),search:(text='',offset=0)=>call('search_joinable_tribes',{search_text:text,page_offset:offset}),join:id=>call('join_tribe',{tribe_id:id})};
}
export const canConsumeQr=({enabled,explicitScan,complete})=>!enabled||Boolean(explicitScan&&complete);
export function onboardingError(error){
 const code=String(error?.message||'');
 if(code.includes('TRIBE_LIMIT'))return 'Hai già 3 Tribe. Le scelte già salvate restano confermate.';
 if(code.includes('TRIBE_COOLDOWN'))return 'Non puoi ancora rientrare in questa Tribe. Puoi sceglierne un’altra.';
 if(code.includes('TRIBE_UNAVAILABLE'))return 'Questa Tribe non è più disponibile. Cerca un’altra Tribe.';
 if(/ACCESS|ACCOUNT|AUTH/.test(code))return 'Accesso non consentito. Verifica lo stato del tuo account.';
 return 'Operazione non completata. Le scelte già salvate restano confermate. Riprova.';
}
