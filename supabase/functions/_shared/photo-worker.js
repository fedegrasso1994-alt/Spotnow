import {PhotoError,PHOTO_MESSAGES} from '../../../src/photo-contract.js';
import {readPhotoBody,base64} from './photo-processing.js';
/** Internal normalizers accept only the existing service credential, never an end-user token. */
/** @param {any} processor @param {{serviceKey:string,authorize?:(token:string)=>Promise<boolean>,read?:typeof readPhotoBody}} options */
export function photoWorker(processor,{serviceKey,authorize,read=readPhotoBody}){let active=false;return async request=>{
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!serviceKey||!token)return reply({error:'Non autorizzato'},403);if(token!==serviceKey){let allowed=false;try{allowed=await authorize?.(token)===true;}catch{}if(!allowed)return reply({error:'Non autorizzato'},403);}
 if(active)return reply({code:'BUSY',error:PHOTO_MESSAGES.BUSY},503);active=true;
 try{processor.admitInput?.();const bytes=await read(request),asset=await processor.process(bytes);return reply({...asset,detail:base64(asset.detail),thumbnail:base64(asset.thumbnail)});}catch(error){return reply({code:error instanceof PhotoError?error.code:'INVALID',error:error instanceof PhotoError?error.message:PHOTO_MESSAGES.INVALID},error instanceof PhotoError?error.status:422);}finally{active=false;}
 };}
