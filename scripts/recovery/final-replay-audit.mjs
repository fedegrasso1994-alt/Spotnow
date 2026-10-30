/** Read-only final reconciliation; Auth login timestamps/MFA runtime are not durable identity state. */
import{replayPlan}from'./security-replay.mjs';
const stable=x=>JSON.stringify(x);
export function finalReplayAudit(before,source,target,completed){
 if(completed?.pass!==true||completed.checkpoint_id!=='28ec939f-9e37-4b91-9fe2-2cc1c9e252dc'||completed.auth_identity_absent!==true||completed.unrelated_auth_unchanged!==true)throw Error('RECOVERY_PRIOR_REPLAY_UNPROVEN');
 const planned=replayPlan(before,source),actual=replayPlan(before,target);
 if(planned.actions.length!==1||planned.actions[0].action!=='account.delete'||planned.actions[0].id!=='7c30c728-a439-4750-8f15-afdfbaa4894c'||stable(actual.actions)!==stable(planned.actions))throw Error('RECOVERY_FINAL_REPLAY_DELTA_REQUIRES_REVIEW');
 const deleted=planned.actions[0].id;
 for(const [key,id]of[['users','id'],['identities','user_id'],['roles','user_id'],['consents','user_id']]){
  const expected=before[key].filter(x=>x[id]!==deleted).map(x=>x[id]).sort(),seen=target[key].map(x=>x[id]).sort();
  if(stable(expected)!==stable(seen))throw Error('RECOVERY_FINAL_UNEXPECTED_SECURITY_ROWS');
 }
 return{pass:true,read_only:true,replay_engine_calls:0,source_deleted_identity_absent:true,durable_credentials_identities_roles_consents_unchanged:true,holds_and_moderation_unchanged:true,login_timestamps_excluded_by_existing_security_projection:true,mfa_proof:'SEPARATE_REAL_AUTH_GATE_REQUIRED'};
}
