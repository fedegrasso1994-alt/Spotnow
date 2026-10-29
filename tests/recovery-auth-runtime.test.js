import test from'node:test';import assert from'node:assert/strict';
import{recoveredEnvironment,RECOVERY_ORIGIN}from'../scripts/recovery/auth-runtime-contract.mjs';import{TARGET}from'../scripts/recovery/local-target.mjs';
test('Recovered Auth/REST use their original restricted identities and local trust only',()=>{
 const a={GOTRUE_DB_DATABASE_URL:'postgres://supabase_auth_admin:SYNTHETIC@'+TARGET.db+'/postgres',GOTRUE_JWT_SECRET:'SYNTHETIC_LOCAL',GOTRUE_EXTERNAL_GOOGLE_ENABLED:'true'};
 const result=recoveredEnvironment('auth',a);assert.equal(new URL(result.GOTRUE_DB_DATABASE_URL).pathname,'/soma_recovery_v3_retry_20261028');assert.equal(result.GOTRUE_JWT_SECRET,a.GOTRUE_JWT_SECRET);assert.equal(result.GOTRUE_JWT_ISSUER,RECOVERY_ORIGIN+'/auth/v1');assert.equal(result.GOTRUE_EXTERNAL_GOOGLE_ENABLED,'false');assert.equal(result.GOTRUE_DISABLE_SIGNUP,'true');assert.equal(result.GOTRUE_MFA_TOTP_ENROLL_ENABLED,'true');
 const r=recoveredEnvironment('rest',{PGRST_DB_URI:'postgres://authenticator:SYNTHETIC@'+TARGET.db+'/postgres'});assert.equal(new URL(r.PGRST_DB_URI).username,'authenticator');
 for(const url of[a.GOTRUE_DB_DATABASE_URL.replace('supabase_auth_admin','supabase_admin'),a.GOTRUE_DB_DATABASE_URL.replace(TARGET.db,'outside.invalid')])assert.throws(()=>recoveredEnvironment('auth',{...a,GOTRUE_DB_DATABASE_URL:url}),/RUNTIME_SCOPE/);
 assert.throws(()=>recoveredEnvironment('auth',{...a,EXTRA:'a\nb'}),/RUNTIME_ENV/);
});
