import {PHOTO_LIMITS,PHOTO_MESSAGES,PhotoError} from './photo-contract.js';
/** Retries reuse a nonce for the immutable File; no Storage upload or raw fallback. */
export function createPhotoUpload(client,userId){const requests=new WeakMap();return async file=>{
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>PHOTO_LIMITS.bytes)throw new Error('Usa una foto JPG, PNG o WebP fino a 8 MB.');
 const id=await userId();let nonce=requests.get(file);if(!nonce){nonce=crypto.randomUUID();requests.set(file,nonce);}
 const response=await client.functions.invoke('photo-assets',{body:file,headers:{'Content-Type':'application/octet-stream','X-Photo-Request-Id':nonce}});
 if(response.error){let body;try{body=await response.error.context?.clone().json();}catch{}if(body?.code&&Object.hasOwn(PHOTO_MESSAGES,body.code))throw new PhotoError(body.code);throw new PhotoError('UPLOAD');}
 const result=response.data;if(result?.ready!==true||typeof result.photo_path!=='string'||!result.photo_path.startsWith(id+'/'))throw new PhotoError('UPLOAD');return result.photo_path;
 };}
