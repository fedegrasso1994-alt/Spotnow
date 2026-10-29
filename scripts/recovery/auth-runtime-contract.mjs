/** Recovery-only service configuration. Never used by the application or source. */
import{TARGET}from'./local-target.mjs';
import{RETRY_DATABASE}from'./restore-bootstrap.mjs';
export const RECOVERY_ORIGIN='http://127.0.0.1:4297';
export function recoveredEnvironment(service,env){
 const fields={auth:['GOTRUE_DB_DATABASE_URL','supabase_auth_admin'],rest:['PGRST_DB_URI','authenticator']};
 if(!fields[service])throw Error('RECOVERY_SERVICE_SCOPE');
 const[field,role]=fields[service],u=new URL(env[field]);
 if(u.hostname!==TARGET.db||u.username!==role||u.pathname!=='/postgres')throw Error('RECOVERY_RUNTIME_SCOPE');
 u.pathname='/'+RETRY_DATABASE;const out={...env,[field]:u.toString()};
 if(service==='auth'){
  out.API_EXTERNAL_URL=RECOVERY_ORIGIN+'/auth/v1';out.GOTRUE_SITE_URL=RECOVERY_ORIGIN;
  out.GOTRUE_JWT_ISSUER=RECOVERY_ORIGIN+'/auth/v1';out.GOTRUE_URI_ALLOW_LIST=RECOVERY_ORIGIN+'/**';
  out.GOTRUE_DISABLE_SIGNUP='true';out.GOTRUE_MFA_TOTP_ENROLL_ENABLED='true';out.GOTRUE_MFA_TOTP_VERIFY_ENABLED='true';out.LOG_LEVEL='error';
  for(const k of Object.keys(out))if(/^GOTRUE_EXTERNAL_.*_ENABLED$/.test(k)&&k!=='GOTRUE_EXTERNAL_EMAIL_ENABLED')out[k]='false';
 }else{out.PGRST_LOG_LEVEL='error';out.PGRST_DB_SCHEMAS='public';}
 for(const[k,v]of Object.entries(out))if(!/^[A-Z_][A-Z0-9_]*$/.test(k)||/[\r\n\0]/.test(v)||v.includes('zjinjtkekmaqtxsuyvho')||v.includes('qlucwdjcjomwyziegxrn'))throw Error('RECOVERY_RUNTIME_ENV');
 return out;
}
