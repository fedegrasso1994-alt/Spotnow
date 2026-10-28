/** Short-lived operator fixture capabilities only; never a checkpoint payload. */
import{mkdir,readFile,writeFile,rm,stat}from'node:fs/promises';
import{randomBytes,createCipheriv,createDecipheriv}from'node:crypto';
const root='.local/recovery-v3',keyPath=root+'/fixture.key',file=root+'/fixture.enc';
export async function savePrivate(state){
 process.umask(0o077);await mkdir(root,{recursive:true,mode:0o700});let key;try{key=await readFile(keyPath)}catch{key=randomBytes(32);await writeFile(keyPath,key,{flag:'wx',mode:0o600})}
 if((await stat(keyPath)).mode&0o077)throw Error('RECOVERY_PRIVATE_MODE');
 const nonce=randomBytes(12),c=createCipheriv('aes-256-gcm',key,nonce);const bytes=Buffer.from(JSON.stringify({...state,expires_at:state.expires_at||new Date(Date.now()+24*3600000).toISOString()}));
 await writeFile(file,Buffer.concat([nonce,c.update(bytes),c.final(),c.getAuthTag()]),{mode:0o600});bytes.fill(0);key.fill(0);
}
export async function loadPrivate(){const key=await readFile(keyPath),b=await readFile(file),d=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAuthTag(b.subarray(-16));const plain=Buffer.concat([d.update(b.subarray(12,-16)),d.final()]);key.fill(0);const state=JSON.parse(plain.toString());plain.fill(0);if(Date.parse(state.expires_at)<=Date.now())throw Error('RECOVERY_FIXTURE_EXPIRED');return state;}
export async function erasePrivate(){await rm(file,{force:true});await rm(keyPath,{force:true});}
