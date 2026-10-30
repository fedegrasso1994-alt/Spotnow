/** SDK text can mention service_role; only actual credential values are disallowed. */
export function assertPublicArtifact(text){
 if(text.includes('qlucwdjcjomwyziegxrn')||/sb_secret_[A-Za-z0-9_-]+/.test(text)||/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(text))throw Error('UNSAFE_ARTIFACT');
 for(const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]){let claims;try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));}catch{continue;}if(claims.role==='service_role'||claims.ref&&claims.ref!=='zjinjtkekmaqtxsuyvho')throw Error('UNSAFE_ARTIFACT_JWT');}
}
