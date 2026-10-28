import test from 'node:test';import assert from 'node:assert/strict';
import {runtimeConnection} from '../scripts/recovery/local-runtime-connection.mjs';
import {TARGET} from '../scripts/recovery/local-target.mjs';
test('recovery role smoke uses actual service identity, TCP and recovered database only',()=>{
 const env={GOTRUE_DB_DATABASE_URL:'postgres://supabase_auth_admin:SYNTHETIC%21@'+TARGET.db+':5432/postgres'};
 assert.deepEqual(runtimeConnection('supabase_auth_admin',env),{role:'supabase_auth_admin',password:'SYNTHETIC!',database:'soma_recovery_v3_retry_20261028'});
 for(const role of ['postgres','supabase_admin','anon','service_role'])assert.throws(()=>runtimeConnection(role,env),/RUNTIME_ROLE/);
 for(const url of [env.GOTRUE_DB_DATABASE_URL.replace(TARGET.db,'outside.example.invalid'),env.GOTRUE_DB_DATABASE_URL.replace('supabase_auth_admin','supabase_admin'),env.GOTRUE_DB_DATABASE_URL.replace('SYNTHETIC%21','bad%0Avalue')])assert.throws(()=>runtimeConnection('supabase_auth_admin',{GOTRUE_DB_DATABASE_URL:url}),/RUNTIME_SCOPE/);
});
