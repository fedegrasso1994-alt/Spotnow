/** Proof scopes are explicit: target-only USER is never mislabeled as restored or source. */
import{READS}from'./policy.mjs';
export function finalRecoveryAuthGate(localUser,evidence){
 const src=x=>x?.pass===true&&x.source_session_verified===true&&[401,403].includes(x.auth_status)&&x.rest_status===401&&[400,401,403].includes(x.refresh_status);
 const user=localUser?.pass===true&&localUser.claims_recovered_identity===false&&localUser.cleanup_pass===true&&localUser.existing_accounts_unchanged===true&&src(evidence?.USER?.source);
 function staff(role){const r=evidence?.[role];if(!src(r?.source)||r.source.source_aal!=='aal2'||r.aal1?.pass!==true||r.aal1.aal!=='aal1'||r.allowed?.pass!==true||r.allowed.aal!=='aal2'||r.logout?.pass!==true)return false;
  for(const name of READS){const before=r.aal1.checks.find(x=>x.operation===name),after=r.allowed.checks.find(x=>x.operation===name),logout=r.logout.checks.find(x=>x.operation===name);if(before?.pass!==true||before.expected!=='denied'||after?.pass!==true||after.expected!==(role==='ADMIN'||name==='moderation_review_queue'?'allowed':'denied')||logout?.denied!==true)return false;}
  if(role==='MODERATOR'&&!r.allowed.checks.some(x=>x.operation==='role_management'&&x.expected==='denied'&&x.pass===true))return false;return true;
 }
 const admin=staff('ADMIN'),moderator=staff('MODERATOR');return{pass:user&&admin&&moderator,user,admin,moderator,user_password_proof:'RECOVERY-ONLY; NOT HISTORICAL ACCOUNT',source_token_rejection:'SEPARATE REAL SOURCE CAPABILITY REQUIRED'};
}
