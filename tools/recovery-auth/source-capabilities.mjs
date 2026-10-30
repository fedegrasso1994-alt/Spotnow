/** Shape checks only. GoTrue refresh tokens are opaque, not fixed-length JWTs.
 * Authenticity/identity must still be verified against source Auth by the caller.
 */
export function assertSourceCapabilities({access,refresh}={}){
 if(typeof access!=='string'||access.split('.').length!==3||access.split('.').some(x=>!x)||/\s/.test(access)||typeof refresh!=='string'||!refresh||/\s/.test(refresh))throw Error('SOURCE_CAPABILITIES_REQUIRED');
}
