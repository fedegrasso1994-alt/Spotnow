import test from'node:test';import assert from'node:assert/strict';import{PGlite}from'@electric-sql/pglite';
import{AUTH_TABLES,USER_COLUMNS,IDENTITY_COLUMNS,PROJECTIONS,projectionSelect,validateAuthColumns}from'../scripts/recovery/auth-durable.mjs';
import{EXCLUDED_DATA,makeContract,validateContract}from'../scripts/recovery/session-contract.mjs';
import{projectionSnapshotSql}from'../scripts/recovery/capture-staging.mjs';
const names=[...AUTH_TABLES,'spot_private.staff_revoked_sessions','public.profiles'];
const fk=(child,parent,child_columns=['user_id'],parent_columns=['id'])=>({child,parent,child_columns,parent_columns,name:'synthetic_fk'});
test('V3 projection readers use approved role and the identical read-only exported snapshot',()=>{
 for(const table of ['auth.users','auth.identities']){
  const sql=projectionSnapshotSql(table,'0001-0002-1');
  assert.ok(sql.startsWith("set role postgres;begin isolation level repeatable read read only;set transaction snapshot '0001-0002-1';copy ("));
  assert.ok(sql.includes(projectionSelect(table)));assert.ok(sql.endsWith('to stdout with(format csv);commit;'));
 }
 assert.throws(()=>projectionSnapshotSql('auth.sessions','0001-0002-1'),/PROJECTION_SCOPE/);
 assert.throws(()=>projectionSnapshotSql('auth.users',"x';commit;"),/SNAPSHOT_UNAVAILABLE/);
});
test('V3 Auth schema/field drift fails closed; projected policy tampering rejected',()=>{
 const c={'auth.users':USER_COLUMNS,'auth.identities':IDENTITY_COLUMNS};validateAuthColumns(c);
 assert.throws(()=>validateAuthColumns({...c,'auth.users':[...USER_COLUMNS,'new_runtime_token']}),/FIELD_CATALOG/);
 assert.throws(()=>makeContract([...names,'auth.new_provider_state'],[]),/UNKNOWN_AUTH_TABLE/);
 const contract=makeContract(names,[]);assert.equal(contract.version,3);
 assert.throws(()=>validateContract({...contract,auth_projection:{}}),/CONTRACT_VERSION/);
 for(const version of[1,2])assert.throws(()=>validateContract({...contract,version}),/CONTRACT_VERSION/);
});
test('V3 coherent SAML/OAuth/MFA exclusion closes graph without copying flows or factors',()=>{
 const c=makeContract(names,[fk('auth.saml_relay_states','auth.flow_state'),fk('auth.mfa_challenges','auth.mfa_factors'),fk('auth.identities','auth.users')]);
 for(const t of['auth.sessions','auth.refresh_tokens','auth.saml_relay_states','auth.flow_state','auth.oauth_authorizations','auth.oauth_client_states','auth.mfa_factors','auth.mfa_recovery_codes','auth.webauthn_credentials','spot_private.staff_revoked_sessions'])assert.ok(EXCLUDED_DATA.includes(t));
 assert.equal(c.tables.find(x=>x.table==='auth.users').action,'restore_projected');assert.equal(c.tables.find(x=>x.table==='auth.mfa_factors').action,'reconstruct_safely');
 assert.throws(()=>makeContract([...names,'public.factor_child'],[fk('public.factor_child','auth.mfa_factors')]),/UNCLASSIFIED_SESSION_DEPENDENCY/);
 assert.throws(()=>makeContract(names,[fk('auth.identities','auth.users',['user_id'],['confirmation_token'])]),/PROJECTED_FK_FIELD/);
 assert.throws(()=>makeContract(names,[{child:'auth.identities',parent:'auth.users'}]),/FK_CATALOG/);
});
test('V3 real SQL user projection retains identity/hash/restrictions but drops tokens, pending changes and metadata payload',async t=>{
 const d=new PGlite();t.after(()=>d.close());const types={id:'uuid',raw_app_meta_data:'jsonb',raw_user_meta_data:'jsonb',is_sso_user:'boolean',is_anonymous:'boolean'};
 const columns=[...new Set(PROJECTIONS['auth.users'].map(x=>x.column).concat(['confirmation_token','recovery_token','email_change','last_sign_in_at']))];
 await d.exec('create schema auth;create table auth.users('+columns.map(c=>'"'+c+'" '+(types[c]||'text')).join(',')+')');
 await d.query(`insert into auth.users(id,email,encrypted_password,role,banned_until,is_sso_user,is_anonymous,confirmation_token,recovery_token,email_change,raw_app_meta_data,raw_user_meta_data)values($1,'fixture@example.invalid','SYNTHETIC_BCRYPT','authenticated','2099-01-01',false,false,'SECRET_TRANSIENT','SECRET_TRANSIENT','pending@example.invalid',$2,$3)`,['10000000-0000-4000-8000-000000000001',JSON.stringify({provider:'email',providers:['email'],internal_token:'SECRET_TRANSIENT'}),JSON.stringify({access_token:'SECRET_TRANSIENT',name:'UNNECESSARY_COPY'})]);
 const row=(await d.query(projectionSelect('auth.users'))).rows[0];assert.equal(row.encrypted_password,'SYNTHETIC_BCRYPT');assert.equal(row.banned_until,'2099-01-01');assert.deepEqual(row.raw_user_meta_data,{});assert.deepEqual(row.raw_app_meta_data,{provider:'email',providers:['email']});
 for(const s of['SECRET_TRANSIENT','pending@example.invalid','UNNECESSARY_COPY','confirmation_token'])assert.ok(!JSON.stringify(row).includes(s));
 assert.throws(()=>projectionSelect('auth.sessions'),/PROJECTION_SCOPE/);
});
test('V3 identity projection retains provider linkage while excluding provider token/avatar metadata',async t=>{
 const d=new PGlite();t.after(()=>d.close());await d.exec('create schema auth;create table auth.identities(id uuid,user_id uuid,provider_id text,provider text,created_at timestamptz,updated_at timestamptz,identity_data jsonb)');
 await d.query('insert into auth.identities values($1,$1,$2,$3,now(),now(),$4)',['10000000-0000-4000-8000-000000000001','synthetic-provider-id','email',JSON.stringify({sub:'synthetic-provider-id',email:'fixture@example.invalid',email_verified:true,access_token:'SECRET_TRANSIENT',avatar_url:'PRIVATE_URL'})]);
 const row=(await d.query(projectionSelect('auth.identities'))).rows[0];assert.equal(row.identity_data.sub,'synthetic-provider-id');assert.equal(row.identity_data.email_verified,true);assert.ok(!JSON.stringify(row).includes('SECRET_TRANSIENT'));assert.ok(!JSON.stringify(row).includes('PRIVATE_URL'));
});
