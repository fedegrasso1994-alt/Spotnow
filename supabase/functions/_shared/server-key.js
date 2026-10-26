/** Explicit staging key selection. API keys authenticate servers, never end users. */
export function stagingServerKey(get){
 if(get('SUPABASE_URL')!=='https://zjinjtkekmaqtxsuyvho.supabase.co')throw Error('SERVER_KEY_STAGING_ONLY');
 let keys;try{keys=JSON.parse(get('SUPABASE_SECRET_KEYS')||'{}');}catch{throw Error('SERVER_KEY_CONFIG');}
 if(typeof keys.default!=='string'||!keys.default.startsWith('sb_secret_'))throw Error('SERVER_KEY_CONFIG');
 return keys.default;
}
export function serviceHeaders(key){return key.startsWith('sb_secret_')?{apikey:key}:{apikey:key,Authorization:'Bearer '+key};}
export function serverCredential(request,key){
 if(!key)return false;
 const supplied=key.startsWith('sb_secret_')?request.headers.get('apikey'):request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
 if(typeof supplied!=='string'||supplied.length!==key.length)return false;
 let difference=0;for(let i=0;i<key.length;i++)difference|=key.charCodeAt(i)^supplied.charCodeAt(i);
 return difference===0;
}
/** Strip only the SDK's API-key Bearer fallback; preserve real user JWTs. */
export function serverFetch(key,fetcher=fetch){return(input,init={})=>{
 const headers=new Headers(init.headers||(typeof Request!=='undefined'&&input instanceof Request?input.headers:undefined));
 if(headers.get('Authorization')==='Bearer '+key)headers.delete('Authorization');
 return fetcher(input,{...init,headers});
};}
/** @param {any} createClient @param {string} url @param {string} key @param {any} options */
export function stagingAdminClient(createClient,url,key,options={}){
 return createClient(url,key,{...options,global:{...options.global,fetch:serverFetch(key,options.global?.fetch||fetch)}});
}
