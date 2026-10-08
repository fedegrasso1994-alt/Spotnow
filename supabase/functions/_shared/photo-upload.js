import {inspectPhoto,PhotoError,PHOTO_MESSAGES,rejectPhoto} from '../../../src/photo-contract.js';
import {readPhotoBody,unbase64} from './photo-processing.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function photoSha(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-photo-request-id','Access-Control-Allow-Methods':'POST, OPTIONS'};
function rpcError(error){const text=String(error?.message||'');if(text.includes('PHOTO_BUSY'))return new PhotoError('BUSY',409);if(/PHOTO_RATE|PHOTO_RETRIES/.test(text))return new PhotoError('RATE',429);if(/PHOTO_ACCOUNT|PHOTO_OWNERSHIP|PHOTO_LEASE/.test(text))return new PhotoError('INVALID',403);return new PhotoError('UPLOAD',503);}
/** No raw persistence. Server-authenticated codec → private canonical objects → validation registry. */
/** @param {{admin:any,url:string,serviceKey:string,fetcher?:typeof fetch,read?:typeof readPhotoBody,memory?:()=>{heapTotal:number,external:number},normalizeLegacy?:boolean}} options */
export function photoUploadHandler({admin,url,serviceKey,fetcher=fetch,read=readPhotoBody,memory=()=>({heapTotal:0,external:0}),normalizeLegacy=false}){let busy=false;return async request=>{
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors});if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(busy)return reply({code:'BUSY',error:PHOTO_MESSAGES.BUSY},503);const usage=memory();if(usage.heapTotal+usage.external>128*1048576)return reply({code:'BUSY',error:PHOTO_MESSAGES.BUSY},503);busy=true;
 let job=null,id=null,requestId=null;
 try{
  const token=request.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)return reply({error:'Accedi per continuare'},401);
  let isAdmin=token===serviceKey;let legacyPath=null,bytes;
  if(request.headers.get('Content-Type')?.split(';')[0]==='application/json'){
   const small=await read(request,1024);let body;try{body=JSON.parse(new TextDecoder().decode(small));}catch{rejectPhoto();}
   if(body.backfill===true){if(!normalizeLegacy)return reply({error:'Normalizzazione legacy non abilitata'},409);if(!isAdmin){try{const verification=await fetcher(url+'/rest/v1/rpc/photo_processing_authorized',{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});isAdmin=verification.ok&&(await verification.json())===true;}catch{isAdmin=false;}}if(!isAdmin)return reply({error:'Non autorizzato'},403);const pending=await admin.rpc('pending_photo_normalization');if(pending.error)throw rpcError(pending.error);if(!pending.data?.length)return reply({ready:true,remaining:0});id=pending.data[0].user_id;legacyPath=pending.data[0].photo_path;}
   else{if(isAdmin)return reply({error:'Non autorizzato'},403);const auth=await admin.auth.getUser(token);if(auth.error||!auth.data.user||auth.data.user.is_anonymous)return reply({error:'Sessione non valida'},401);id=auth.data.user.id;legacyPath=body.photo_path;}
   if(typeof legacyPath!=='string'||legacyPath.length>250||!legacyPath.startsWith(id+'/')||legacyPath.split('/').length!==2)rejectPhoto('INVALID',403);
   const profile=await admin.from('profiles').select('photo_path').eq('id',id).maybeSingle();if(profile.error||profile.data?.photo_path!==legacyPath)rejectPhoto('INVALID',403);
   // A canonical is already registered. Compatibility callers can use its existing assets.
   const legacy=await admin.rpc('photo_needs_normalization',{target_user:id,path:legacyPath});if(legacy.error)throw rpcError(legacy.error);if(!legacy.data||!normalizeLegacy)return reply({ready:true,photo_path:legacyPath,legacy_normalization_skipped:legacy.data===true});
   const response=await fetcher(url+'/storage/v1/object/authenticated/profile-photos/'+legacyPath.split('/').map(encodeURIComponent).join('/'),{headers:{Authorization:'Bearer '+serviceKey,apikey:serviceKey},signal:AbortSignal.timeout(15000)});if(!response.ok)throw new PhotoError('UPLOAD',503);bytes=await read(response);
   // Same current legacy content is idempotent across owners/admin callers.
   const digest=await photoSha(new TextEncoder().encode(id+'\0'+legacyPath));requestId=digest.slice(0,8)+'-'+digest.slice(8,12)+'-4'+digest.slice(13,16)+'-8'+digest.slice(17,20)+'-'+digest.slice(20,32);
  }else{
   if(isAdmin)return reply({error:'Non autorizzato'},403);const auth=await admin.auth.getUser(token);if(auth.error||!auth.data.user||auth.data.user.is_anonymous)return reply({error:'Sessione non valida'},401);id=auth.data.user.id;requestId=request.headers.get('X-Photo-Request-Id');if(!requestId||!UUID.test(requestId))rejectPhoto();bytes=await read(request);
  }
  const inputSha=await photoSha(bytes);const started=await admin.rpc('begin_photo_upload',{target_user:id,request_id:requestId,input_sha:inputSha,legacy_path:legacyPath});if(started.error)throw rpcError(started.error);job=started.data;
  if(job.ready){if(legacyPath){const published=await admin.rpc('publish_normalized_photo',{target_user:id,request_id:requestId,previous_path:legacyPath});if(published.error)throw rpcError(published.error);return reply({...job,published:published.data});}return reply(job);}
  const h=inspectPhoto(bytes);
  const worker=h.format==='JPEG'?'jpeg':h.format==='PNG'?'png':'webp';const response=await fetcher(url+'/functions/v1/photo-normalize-'+worker,{method:'POST',headers:{Authorization:'Bearer '+serviceKey,apikey:serviceKey,'Content-Type':'application/octet-stream'},body:bytes,signal:AbortSignal.timeout(20000)});
  // Bounded worker response, including the error body. A worker 546/timeout never publishes an asset.
  const encoded=await read(response,8*1048576);let result;try{result=JSON.parse(new TextDecoder().decode(encoded));}catch{throw new PhotoError('UPLOAD',503);}
  if(!response.ok)throw new PhotoError(Object.hasOwn(PHOTO_MESSAGES,result.code)?result.code:response.status===546?'MEMORY':'UPLOAD',response.status===429?429:422);
  const detail=unbase64(result.detail),thumbnail=unbase64(result.thumbnail,1048576);if(typeof result.preview!=='string'||result.preview.length>16000||!result.preview.startsWith('data:image/jpeg;base64,'))rejectPhoto();const preview=unbase64(result.preview.slice(23),11000);
  for(const [image,side]of [[detail,1600],[thumbnail,480],[preview,120]]){const info=inspectPhoto(image);if(info.format!=='JPEG'||info.orientation!==1||info.width>side||info.height>side)rejectPhoto();}
  const alive=await admin.rpc('photo_upload_lease_active',{target_user:id,request_id:requestId,lease_token:job.lease_token});if(alive.error||alive.data!==true)throw new PhotoError('UPLOAD',503);
  const storage=admin.storage.from('profile-photos'),uploads=await Promise.all([[job.photo_path,detail],[job.photo_path+'.detail.jpg',detail],[job.photo_path+'.thumb.jpg',thumbnail]].map(async ([path,data])=>storage.upload(path,data,{contentType:'image/jpeg',upsert:false,cacheControl:'3600'})));if(uploads.some(r=>r.error))throw new PhotoError('UPLOAD',503);
  const saved=await admin.rpc('finish_photo_upload',{target_user:id,request_id:requestId,lease_token:job.lease_token,preview_text:result.preview,canonical_sha:await photoSha(detail),canonical_bytes:detail.length,source_format:h.format,source_width:h.width,source_height:h.height});if(saved.error)throw rpcError(saved.error);
  let published;if(legacyPath){const p=await admin.rpc('publish_normalized_photo',{target_user:id,request_id:requestId,previous_path:legacyPath});if(p.error)throw rpcError(p.error);published=p.data;}
  return reply({ready:true,photo_path:saved.data,preview:result.preview,...(legacyPath?{published}:{})});
 }catch(error){if(job?.lease_token&&id&&requestId){try{await admin.rpc('fail_photo_upload',{target_user:id,request_id:requestId,lease_token:job.lease_token});}catch{}}const e=error instanceof PhotoError?error:new PhotoError('UPLOAD',503);return reply({code:e.code,error:e.message},e.status);}finally{busy=false;}
 };}
