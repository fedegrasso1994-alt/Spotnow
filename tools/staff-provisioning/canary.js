// Local operator harness only. Never imported by the application.
import {STAGING,stagingAuthFetch}from'../staff-mfa/auth.js';
const reads=['admin_analytics_dashboard','ops_health','ops_recent','moderation_review_queue'];
export function staffCanaryFetch(fetcher){
 const auth=stagingAuthFetch(fetcher);
 return(input,init)=>{
  const u=new URL(typeof input==='string'?input:input.url);
  if(u.origin===STAGING&&!u.username&&!u.password&&/^\/rest\/v1\/rpc\//.test(u.pathname)){
   if((init?.method||'GET')!=='POST'||u.search||![...reads,'moderation_role_set'].includes(u.pathname.slice('/rest/v1/rpc/'.length)))throw Error('CANARY_RPC_DENIED');
   return fetcher(input,init);
  }
  return auth(input,init);
 };
}
export async function probe(client,role,mode){
 if(!['ADMIN','MODERATOR'].includes(role)||!['allowed','denied'].includes(mode))throw Error('CANARY_SCOPE');
 const checks=[];
 for(const name of reads){
  const shouldAllow=mode==='allowed'&&(role==='ADMIN'||name==='moderation_review_queue');
  const response=await client.rpc(name);
  const passed=shouldAllow?!response.error:response.error?.code==='42501';
  checks.push({operation:name,result:shouldAllow?'allowed':'denied',passed});
 }
 if(role==='MODERATOR'){
  // Invalid input cannot change any role even if authorization regresses.
  const r=await client.rpc('moderation_role_set',{target_user:null,new_role:'INVALID',operation_id:null});
  checks.push({operation:'role_management',result:'denied',passed:r.error?.code==='42501'});
 }
 return {checks,passed:checks.every(c=>c.passed)};
}
export const phases=['aal1','allowed','revoked','regranted_stale','restored','logout_stale'];
export function validateEvidence(body){
 if(!body||Object.keys(body).sort().join(',')!=='checks,passed,phase,role'||!['ADMIN','MODERATOR'].includes(body.role)||!phases.includes(body.phase)||typeof body.passed!=='boolean'||!Array.isArray(body.checks)||body.checks.length<4||body.checks.length>5)throw Error('INVALID_EVIDENCE');
 const allowed=new Set([...reads,'role_management']);
 for(const c of body.checks)if(Object.keys(c).sort().join(',')!=='operation,passed,result'||!allowed.has(c.operation)||!['allowed','denied'].includes(c.result)||typeof c.passed!=='boolean')throw Error('INVALID_EVIDENCE');
 if(new Set(body.checks.map(c=>c.operation)).size!==body.checks.length||body.passed!==body.checks.every(c=>c.passed))throw Error('INVALID_EVIDENCE');
 return body;
}
