/** Opaque content intent only. No sender/Tribe identity, content text or tracking. */
export const shareToken=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value)?value:null;
export const pendingShare=location=>shareToken(new URLSearchParams(location.search||'').get('s'));
export const shareUnavailable='Questo contenuto non è più disponibile.';
export function shareUrl(origin,token){
 if(!shareToken(token))throw Error('SHARE_INVALID');const url=new URL('/',origin);
 if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('SHARE_ORIGIN');
 url.searchParams.set('s',token);return url.href;
}
export function createShareApi(call){return{create:(content_id,content_kind)=>call('spotted_share',{content_id,content_kind}),resolve:reference=>call('spotted_resolve_share',{reference})};}
/** Only a generic title and opaque URL enter the native sheet or clipboard. */
export async function shareContent(url,{navigator:nav=globalThis.navigator}={}){
 const data={title:'Soma — SPOTTED',url};
 if(typeof nav?.share==='function'){
  try{await nav.share(data);return 'shared';}catch(error){if(error?.name==='AbortError')return 'cancelled';if(error?.name!=='NotSupportedError')throw error;}
 }
 if(typeof nav?.clipboard?.writeText!=='function')throw Error('SHARE_COPY_UNAVAILABLE');
 await nav.clipboard.writeText(url);return 'copied';
}
/** Retain the URL through Auth/onboarding; no private data stored and no auto-join. */
export function createShareIntent(location){let token=pendingShare(location)||(new URLSearchParams(location.search||'').has('s')?'invalid':null),consumed=false;return{token:()=>token,ready:()=>Boolean(token&&!consumed),consume(){consumed=true;},reset(){consumed=false;},clear(){token=null;consumed=true;}};}
