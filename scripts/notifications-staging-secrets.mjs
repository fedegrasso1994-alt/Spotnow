// Creates NEW staging-only credentials, never reads existing provider credentials.
import{mkdir,writeFile,access,chmod}from'node:fs/promises';import{webcrypto,randomBytes}from'node:crypto';
const dir='.local/notifications-mvp',file=dir+'/staging-secrets.env';await mkdir(dir,{recursive:true,mode:0o700});await chmod(dir,0o700);
let exists=false;try{await access(file);exists=true;}catch{}
if(exists){console.log('Existing local staging notification credentials preserved; no rotation.');process.exit(0);}
const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const jwk=await webcrypto.subtle.exportKey('jwk',pair.privateKey),raw=Buffer.from(await webcrypto.subtle.exportKey('raw',pair.publicKey));
const publicKey=raw.toString('base64url');
await writeFile(file,`NOTIFICATIONS_VAPID_PUBLIC=${publicKey}\nNOTIFICATIONS_VAPID_PRIVATE=${jwk.d}\nNOTIFICATIONS_VAPID_SUBJECT=mailto:somadatingapp@gmail.com\nNOTIFICATIONS_DISPATCH_SECRET=${randomBytes(32).toString('hex')}\n`,{mode:0o600,flag:'wx'});
await writeFile(dir+'/public-build.env',`VITE_NOTIFICATIONS_MVP=true\nVITE_NOTIFICATIONS_VAPID_PUBLIC=${publicKey}\n`,{mode:0o600,flag:'wx'});
console.log('New staging-only credentials saved locally (0600); values not emitted.');
