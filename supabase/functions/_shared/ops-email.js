/** Fixed staging operational recipient. One durable attempt; no automatic send retries. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** @param {any} admin @param {any} body @param {{key?:string,fetcher?:typeof fetch}} options */
export async function dispatchOpsEmail(admin,body,{key,fetcher=fetch}={}){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['action','operation','request_id'].includes(k))||!UUID.test(body.request_id||'')||typeof body.operation!=='string'||body.operation.length>40) return {status:400,result:'invalid_input'};
 if(typeof key!=='string'||!/^re_[a-zA-Z0-9_-]+$/.test(key))return {status:503,result:'configuration_error'};
 const r=await admin.rpc('ops_email_claim',{operation:body.operation,request_id:body.request_id});
 if(r.error)return {status:503,result:'claim_error'};if(!r.data)return {status:200,result:'not_claimed'};
 const i=r.data;
 if(!UUID.test(i.id)||!UUID.test(i.claim)||!['edge','job'].includes(i.source)||!['three_failures','error_spike','job_failure'].includes(i.rule)||!/^\w+(\.\w+)+$/.test(i.operation))return {status:503,result:'claim_error'};
 let outcome='unknown',provider_id=null,failure='timeout';
 try{
  const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'soma-staging-ops/'+i.id},signal:AbortSignal.timeout(5000),body:JSON.stringify({from:'SOMA Alerts <onboarding@resend.dev>',to:['somadatingapp@gmail.com'],subject:'[SOMA OPS] Staging synthetic incident',text:['SOMA staging — synthetic operational canary.','No user data is included.','Incident: '+i.id,'Operation: '+i.operation,'Source: '+i.source,'Rule: '+i.rule].join('\n')})});
  // Raw provider bodies/errors are never logged or persisted.
  if(!response.ok){outcome='failed';failure='provider_error';}
  else{const data=await response.json();if(UUID.test(data?.id||'')){outcome='accepted';provider_id=data.id;failure=null;}else{failure='receipt_error';}}
 }catch{/* Ambiguous external send: terminal unknown, never automatic resend. */}
 const saved=await admin.rpc('ops_email_finish',{incident_id:i.id,claim_id:i.claim,outcome,provider_id,failure});
 if(saved.error||saved.data!==true)return {status:503,result:'receipt_error',incident_id:i.id};
 return {status:outcome==='accepted'?200:503,result:outcome,incident_id:i.id,provider_id};
}
