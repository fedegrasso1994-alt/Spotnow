/** Staging-only scheduler entry. No arbitrary target ids, SQL or personal payloads. */
export async function privacyRetentionHandler(request,{admin,serviceKey,url}){
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 if(new URL(url).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')return reply({error:'STAGING_ONLY'},503);
 if(request.method!=='POST')return reply({error:'METHOD'},405);
 if(!serviceKey||request.headers.get('Authorization')!==`Bearer ${serviceKey}`)return reply({error:'AUTH'},403);
 let body;try{body=await request.json();}catch{return reply({error:'INPUT'},400);}
 if(typeof body.dry_run!=='boolean'||typeof body.category!=='string'||!/^[0-9a-f-]{36}$/i.test(body.operation_id||''))return reply({error:'INPUT'},400);
 const result=await admin.rpc('privacy_retention_run',{category:body.category,operation_id:body.operation_id,dry_run:body.dry_run});
 if(result.error)return reply({error:'RETENTION_FAILED'},503);
 return reply(result.data);
}
