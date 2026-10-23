/** Closed technical vocabulary. Never serialize an Error, request, URL or product args. */
export const OPS=Object.freeze(['auth.login','auth.callback','auth.bootstrap','photo.upload','photo.canonical','photo.save','photo.sign','photo.cleanup','dd.allocate','dd.read','tribe.spot','ora.start','ora.end','ora.read','ora.spot','spotted.post','spotted.comment','spotted.request','spotted.decide','spotted.share','match.create','chat.write','chat.read','notifications.subscribe','notifications.dispatch','notifications.prune','analytics.ingest','analytics.purge','moderation.report','moderation.action','moderation.audit','runtime.bootstrap','runtime.navigation','runtime.offline','privacy.retention','ops.purge']);
export const CLASSES=Object.freeze(['validation_error','authorization_error','conflict_error','dependency_error','timeout_error','internal_error']);
export function errorClass(status,code=''){
 if(['PGRST202','PGRST205'].includes(code))return 'dependency_error';
 if(['DD_WINDOW_OVERLAP','DD_POLICY_INCOMPLETE'].includes(code))return 'internal_error';
 if(code==='DD_WINDOW_ELAPSED')return 'conflict_error';
 if(/^(XX|42|PGRST5)/.test(code)&&code!=='42501')return 'internal_error';
 if(status===0)return 'dependency_error';if(status===408||status===504||code==='TIMEOUT')return 'timeout_error';
 if(status===401||status===403||code==='42501')return 'authorization_error';
 if(status===409||code==='23505'||code==='40001')return 'conflict_error';
 if(status===400||status===404||status===413||status===415||status===422||status===429||code==='22023')return 'validation_error';
 return status===502||status===503?'dependency_error':'internal_error';
}
export const requestId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?value:crypto.randomUUID();
export function safeEvent(operation,id,result,error_class=null,duration=0){
 if(!OPS.includes(operation)||!['success','failure','expected_off','cancelled'].includes(result)||error_class!==null&&!CLASSES.includes(error_class))throw Error('OPS_INPUT');
 return {operation,request_id:requestId(id),result,error_class:result==='failure'?error_class||'internal_error':null,duration_ms:Math.min(60000,Math.max(0,Math.round(Number(duration)||0)))};
}
