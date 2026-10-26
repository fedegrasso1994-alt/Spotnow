/** Fixed first-party maintenance only. No PHOTO/product writer/feature activation. */
export const PHASE_A_PATHS=Object.freeze(['analytics','observability','dd','notifications']);
export async function retentionPhaseA(admin,{operation_id,dry_run=true,batch_limit=100,max_batches=4}){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operation_id||'')||typeof dry_run!=='boolean'||!Number.isInteger(batch_limit)||batch_limit<1||batch_limit>200||!Number.isInteger(max_batches)||max_batches<1||max_batches>8)throw Error('PHASE_A_INPUT');
 const started_at=new Date().toISOString(),runs=[],needs_followup=[];
 for(const path of PHASE_A_PATHS){for(let i=0;i<max_batches;i++){
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(operation_id+':'+path+':'+i)));
  bytes[6]=(bytes[6]&15)|0x40;bytes[8]=(bytes[8]&63)|0x80;
  const h=[...bytes.slice(0,16)].map(x=>x.toString(16).padStart(2,'0')).join(''),id=h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  let r;try{r=await admin.rpc('retention_phase_a_batch',{path,operation_id:id,dry_run,batch_limit});}catch{r={error:true};}
  if(r.error){runs.push({path,status:'failed',started_at:new Date().toISOString(),finished_at:new Date().toISOString(),eligible:0,deleted:0,protected:0,skipped:0,error_code:'DEPENDENCY'});break;}
  runs.push(r.data);if(!dry_run&&r.data.status==='completed'&&r.data.eligible>=batch_limit&&i===max_batches-1)needs_followup.push(path);if(dry_run||r.data.status!=='completed'||r.data.eligible<batch_limit)break;
 }}
 return {started_at,finished_at:new Date().toISOString(),status:runs.some(x=>x.status==='failed')?'failed':(needs_followup.length||runs.some(x=>x.status==='busy'))?'partial':runs.every(x=>x.status==='paused')?'paused':'completed',needs_followup,runs};
}
/** Verify role through a service-only RPC, never through decoded/unverified JWT claims. */
export async function retentionServiceAuthorized(token,{url,key,fetcher=fetch}){
 if(!token)return false;if(token===key)return !key.startsWith('sb_secret_');
 try{const r=await fetcher(url+'/rest/v1/rpc/retention_phase_a_status',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});if(!r.ok)return false;const d=await r.json();return typeof d?.control?.scheduler_enabled==='boolean'&&Array.isArray(d.runs);}catch{return false;}
}
