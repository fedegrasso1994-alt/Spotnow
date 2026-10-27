/** Operator-only transport. A secret is never a user identity or JWT. */
export function stagingRequestHeaders(publicKey,credential){
 return typeof credential==='string'&&credential.startsWith('sb_secret_')?{apikey:credential}:{apikey:publicKey,Authorization:'Bearer '+credential};
}
/** Historical fixture metadata may remain local; credentials come only from modern staging config. */
export async function stagingCredentials(metadata,{load=null}={}){
 if(metadata.url!=='https://zjinjtkekmaqtxsuyvho.supabase.co')throw Error('STAGING_ONLY');
 const read=load||((await import('node:fs/promises')).readFile);
 const c=JSON.parse(await read('.local/legacy-key-migration/config.json','utf8'));
 if(c.url!==metadata.url||!c.publicKey?.startsWith('sb_publishable_')||!c.serverKey?.startsWith('sb_secret_'))throw Error('MODERN_STAGING_CONFIG_REQUIRED');
 return {...metadata,publicKey:c.publicKey,serverKey:c.serverKey};
}
