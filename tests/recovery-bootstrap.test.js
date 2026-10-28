import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPECTED_ROLES,EXPECTED_MEMBERSHIP,EXPECTED_IMAGE,IMPORT_ROLE,assertPreflight,schemaSecurity,assertSecurityEquivalent,createRetryDatabaseSql} from '../scripts/recovery/restore-bootstrap.mjs';
const fixture=()=>({version:'17.11',image:EXPECTED_IMAGE,sourceDatabaseOwner:'postgres',sourcePublicOwner:'pg_database_owner',localDatabaseOwner:'postgres',localPublicOwner:'pg_database_owner',roles:[...structuredClone(EXPECTED_ROLES),{role:'pg_database_owner'}],membership:structuredClone(EXPECTED_MEMBERSHIP),services:[{role:'supabase_auth_admin',database:'postgres'},{role:'authenticator',database:'postgres'},{role:'supabase_storage_admin',database:'postgres'}]});
test('bootstrap authority and implicit public owner are explicit, without role mutation',()=>{
 assert.equal(IMPORT_ROLE,'supabase_admin');assert.equal(assertPreflight(fixture()).pass,true);
 assert.match(createRetryDatabaseSql(),/ owner postgres template template0;/);
 assert.doesNotMatch(createRetryDatabaseSql(),/grant|alter role|drop|no-owner/i);
 const f=fixture();f.membership=f.membership.reverse().map(x=>Object.fromEntries(Object.entries(x).reverse()));assert.equal(assertPreflight(f).pass,true);
});
test('bootstrap preflight rejects platform, owner, role, membership or active-writer drift',()=>{
 for(const change of [x=>x.version='17.12',x=>x.image='other',x=>x.sourceDatabaseOwner='supabase_admin',x=>x.localPublicOwner='postgres',x=>x.roles.find(r=>r.role==='postgres').superuser=true,x=>x.roles.find(r=>r.role==='authenticator').bypassrls=true,x=>x.membership.push({member:'postgres',role:'supabase_admin',admin:false,inherit:true,set:true}),x=>x.services[0].role='supabase_admin',x=>x.services[0].database='soma_recovery_v3_retry_20261028']){
  const f=fixture();change(f);assert.throws(()=>assertPreflight(f),/RECOVERY_/);
 }
});
test('ownership, RLS, policy and ACL comparison retains SECURITY DEFINER ownership',()=>{
 const sql=`-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin\nCREATE SCHEMA auth;\nALTER SCHEMA auth OWNER TO supabase_admin;\n-- Name: guard(); Type: FUNCTION; Schema: public; Owner: postgres\nCREATE FUNCTION public.guard()RETURNS void LANGUAGE sql SECURITY DEFINER AS 'select';\n-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres\nALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;\n-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres\nREVOKE ALL ON TABLE public.profiles FROM PUBLIC;\nGRANT SELECT ON TABLE public.profiles TO authenticated;\n\\unrestrict random\n`;
 const records=schemaSecurity(sql);assert.equal(records.find(x=>x.type==='FUNCTION').definer,true);assert.equal(assertSecurityEquivalent(records,schemaSecurity(sql.replace('random','different'))).pass,true);
 for(const next of [sql.replace('Owner: postgres','Owner: supabase_admin'),sql.replace('SECURITY DEFINER','SECURITY INVOKER'),sql.replace('ENABLE ROW','DISABLE ROW'),sql.replace('GRANT SELECT','GRANT ALL')])assert.throws(()=>assertSecurityEquivalent(records,schemaSecurity(next)),/CATALOG_MISMATCH/);
});
