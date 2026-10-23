import {safeEvent,errorClass,requestId} from './operational-contract.js';
/** Boundary observation only: no request/response product body is serialized. */
export function operationalHandler(operation,handler,{record,job=false,summary=false,defer=typeof EdgeRuntime==='undefined'?null:task=>EdgeRuntime.waitUntil(task)}={record:null}){return async request=>{
 const id=requestId(request.headers.get('x-soma-request-id')),start=performance.now();let response;let thrown=false;
 try{response=await handler(request);}catch{thrown=true;response=new Response(JSON.stringify({error:'TEMPORARILY_UNAVAILABLE'}),{status:503,headers:{'Content-Type':'application/json'}});}
 const headers=new Headers(response.headers);headers.set('x-soma-request-id',id);headers.set('Access-Control-Expose-Headers','x-soma-request-id');
 if(request.method==='OPTIONS')headers.set('Access-Control-Allow-Headers',(headers.get('Access-Control-Allow-Headers')||'authorization,apikey,content-type,x-client-info')+',x-soma-request-id');
 if(request.method!=='OPTIONS'){
  let result=response.ok?'success':'failure';let kind=response.ok?null:errorClass(response.status);let op=operation;let isJob=job&&!(response.status>=400&&response.status<500);
  if(summary&&response.headers.get('Content-Type')?.includes('json'))try{const data=await response.clone().json();if(data.dry_run===true)isJob=false;if(data.code==='PAUSED'){result='expected_off';kind=null;}else if(Number(data.failed)>0||Number(data.uncertain)>0||Number(data.permanent)>0){result='failure';kind='dependency_error';}}catch{}
  try{const event=safeEvent(op,id,result,thrown?'internal_error':kind,performance.now()-start);const work=Promise.resolve().then(()=>record?.({...event,job:isJob})).catch(()=>{});if(defer){defer(work);}else{let timer;try{await Promise.race([work,new Promise(resolve=>{timer=setTimeout(resolve,1000);})]);}finally{clearTimeout(timer);}}}catch{/* Never change product outcome or expose collector errors. */}
 }
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
};}
/** Existing service client only; no new secrets, provider, identity or raw Error logging. */
export const operationalRecorder=admin=>async event=>{const query=admin.rpc('ops_record_server',event);const r=await(typeof query.abortSignal==='function'?query.abortSignal(AbortSignal.timeout(5000)):query);if(r.error)console.warn(JSON.stringify({tag:'SOMA_OPS',operation:event.operation,request_id:event.request_id,result:'collector_unavailable'}));else if(r.data===true)console.log(JSON.stringify({tag:'SOMA_OPS',...event}));};

/** Decoder workers reuse native fetch: no SDK import or image-buffer capture. */
export const operationalFetchRecorder=({url,serviceKey,fetcher=fetch})=>async event=>{if(new URL(url).hostname!=='zjinjtkekmaqtxsuyvho.supabase.co')return;try{const r=await fetcher(url+'/rest/v1/rpc/ops_record_server',{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},body:JSON.stringify(event),signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error();if(await r.json()===true)console.log(JSON.stringify({tag:'SOMA_OPS',...event}));}catch{console.warn(JSON.stringify({tag:'SOMA_OPS',operation:event.operation,request_id:event.request_id,result:'collector_unavailable'}));}};
