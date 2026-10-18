/** Authorization transport only. Processing/publication/leases remain PHOTO-01/02 owned. */
export const PHOTO_REFERENCE_TTL=30;
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
export function profilePhotoHandler({admin}){return async request=>{
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(request.method==='OPTIONS')return reply({});if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  const token=request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)return reply({error:'Accedi per continuare'},401);
  const identity=await admin.auth.getUser(token);if(identity.error||!identity.data?.user||identity.data.user.is_anonymous)return reply({error:'Accedi per continuare'},401);
  // Bound even a chunked body before JSON parsing; no user data in logs/errors.
  const reader=request.body?.getReader();let size=0,parts=[];if(!reader)return reply({error:'Riferimenti non validi'},400);
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return reply({error:'Riferimenti non validi'},400);}parts.push(value);}
  const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}
  const body=JSON.parse(new TextDecoder().decode(bytes));if(!Array.isArray(body.refs)||body.refs.length>48||body.refs.some(r=>typeof r!=='string'||r.length>256))return reply({error:'Riferimenti non validi'},400);
  const refs=[...new Set(body.refs)],resolved=await admin.rpc('resolve_authorized_photos',{viewer:identity.data.user.id,refs});
  if(resolved.error)return reply({error:'Foto temporaneamente non disponibile'},503);
  const rows=resolved.data||[];if(!rows.length)return reply({photos:[],expires_in:PHOTO_REFERENCE_TTL});
  const signed=await admin.storage.from('profile-photos').createSignedUrls(rows.map(r=>r.object_name),PHOTO_REFERENCE_TTL);
  if(signed.error)return reply({error:'Foto temporaneamente non disponibile'},503);
  const urls=new Map(signed.data.filter(r=>!r.error).map(r=>[r.path,r.signedUrl]));
  return reply({photos:rows.filter(r=>urls.has(r.object_name)).map(r=>({ref:r.ref,url:urls.get(r.object_name)})),expires_in:PHOTO_REFERENCE_TTL});
 }catch{return reply({error:'Richiesta non valida o foto non disponibile'},400);}
};}
