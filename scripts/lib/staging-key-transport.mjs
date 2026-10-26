/** Operator-only transport. A secret is never a user identity or JWT. */
export function stagingRequestHeaders(publicKey,credential){
 return typeof credential==='string'&&credential.startsWith('sb_secret_')?{apikey:credential}:{apikey:publicKey,Authorization:'Bearer '+credential};
}
