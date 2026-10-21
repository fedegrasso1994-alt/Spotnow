import{pendingShare}from './spotted-share.js';
/** Auth Preview checks and copy; no session, token or credential storage. */
export const WELCOME_VALUE='Trova le tue crush nella tua università.';
export function authRedirect(location,pendingQr){
 const origin=new URL(location.origin);if(origin.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('AUTH_REDIRECT_INVALID');
 const url=new URL(location.pathname||'/',origin);if(url.origin!==origin.origin)throw Error('AUTH_REDIRECT_INVALID');
 if(pendingQr)url.searchParams.set('venue',pendingQr);const share=pendingShare(location);if(new URLSearchParams(location.search||'').has('s'))url.searchParams.set('s',share||'invalid');return url.href;
}
export function authReturnError(href){
 const url=new URL(href),hash=new URLSearchParams(url.hash.slice(1));
 const has=['error','error_code','error_description'].some(k=>url.searchParams.has(k)||hash.has(k));if(!has)return null;
 const description=url.searchParams.get('error_description')||hash.get('error_description')||'';
 const code=url.searchParams.get('error_code')||hash.get('error_code')||url.searchParams.get('error')||hash.get('error')||'';
 for(const key of ['error','error_code','error_description'])url.searchParams.delete(key);url.searchParams.delete('code');url.hash='';
 return {url:url.href,message:/already linked|already exists/i.test(description)?'Questo Google è già collegato a un account Soma. Usa Continua con Google per accedere a quello esistente.':/expired|invalid|otp/i.test(code)?'Il link di accesso è scaduto o è già stato usato. Richiedi una nuova email di accesso a Soma.':'Accesso non completato. Richiedi una nuova email di accesso a Soma oppure riprova con Google.'};
}
export function createGoogleReadiness({url,publicKey,fetcher}){
 if(new URL(url).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')throw Error('AUTH_PREVIEW_STAGING_ONLY');
 return async()=>{let response;try{response=await fetcher(url+'/auth/v1/settings',{headers:{apikey:publicKey},cache:'no-store'});}catch{throw Error('AUTH_CONFIG_UNAVAILABLE');}
 if(!response.ok)throw Error('AUTH_CONFIG_UNAVAILABLE');const settings=await response.json();if(settings.external?.google!==true)throw Error('AUTH_GOOGLE_UNAVAILABLE');};
}

export function emailCodeEnabled(env){if(env.VITE_AUTH_EMAIL_OTP!=='true')return false;if(new URL(env.VITE_SUPABASE_URL).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')throw Error('AUTH_PREVIEW_STAGING_ONLY');return true;}
