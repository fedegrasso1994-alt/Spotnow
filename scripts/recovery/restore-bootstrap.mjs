/** Local recovery authority. This does not grant roles or change the archive. */
import {createHash} from 'node:crypto';
export const IMPORT_ROLE='supabase_admin';
export const DATABASE_OWNER='postgres';
export const RETRY_DATABASE='soma_recovery_v3_retry_20261028';
export const EXPECTED_IMAGE='sha256:b15d862126dd2dac02da524696ccfde2dcce2ceaee0a58973b2727befe492706';
const tuples=[
 ...['anon','authenticated','service_role'].map(r=>['authenticator',r,false,false,true]),
 ...['pg_read_all_settings','pg_read_all_stats','pg_stat_scan_tables'].map(r=>['pg_monitor',r,false,true,true]),
 ...['anon','authenticated','authenticator','pg_create_subscription','pg_monitor','pg_read_all_data','pg_signal_backend','service_role'].map(r=>['postgres',r,true,true,true]),
 ...['supabase_functions_admin','supabase_privileged_role'].map(r=>['postgres',r,false,true,true]),
 ...['supabase_etl_admin','supabase_read_only_user'].flatMap(m=>['pg_monitor','pg_read_all_data',...(m==='supabase_etl_admin'?['supabase_privileged_role']:[])].map(r=>[m,r,false,true,true])),
 ['supabase_storage_admin','authenticator',false,false,true]
];
export const EXPECTED_MEMBERSHIP=Object.freeze(tuples.map(([member,role,admin,inherit,set])=>({member,role,admin,inherit,set})));
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const ordered=x=>x.map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export const EXPECTED_ROLES=Object.freeze([
 ['anon',false,false,false,true,false,false,false],['authenticated',false,false,false,true,false,false,false],
 ['authenticator',false,false,true,false,false,false,false],['dashboard_user',false,false,false,true,true,true,true],
 ['pgbouncer',false,false,true,true,false,false,false],['postgres',false,true,true,true,true,true,true],
 ['service_role',false,true,false,true,false,false,false],['supabase_admin',true,true,true,true,true,true,true],
 ['supabase_auth_admin',false,false,true,false,true,false,false],['supabase_etl_admin',false,true,true,true,false,false,true],
 ['supabase_functions_admin',false,false,true,false,true,false,false],['supabase_privileged_role',false,false,false,true,false,false,false],
 ['supabase_read_only_user',false,true,true,true,false,false,false],['supabase_replication_admin',false,false,true,true,false,false,true],
 ['supabase_storage_admin',false,false,true,false,true,false,false]
].map(([role,superuser,bypassrls,login,inherit,createrole,createdb,replication])=>({role,superuser,bypassrls,login,inherit,createrole,createdb,replication})));
export function assertPreflight(meta){
 if(meta.version!=='17.11'||meta.image!==EXPECTED_IMAGE)throw Error('RECOVERY_PLATFORM_DRIFT');
 if(meta.sourceDatabaseOwner!==DATABASE_OWNER||meta.sourcePublicOwner!=='pg_database_owner')throw Error('RECOVERY_DATABASE_OWNER_UNPROVEN');
 if(meta.localDatabaseOwner!==DATABASE_OWNER||meta.localPublicOwner!=='pg_database_owner')throw Error('RECOVERY_DATABASE_OWNER_DRIFT');
 if(JSON.stringify(ordered(meta.membership))!==JSON.stringify(ordered(EXPECTED_MEMBERSHIP)))throw Error('RECOVERY_MEMBERSHIP_DRIFT');
 if(JSON.stringify(ordered(meta.roles.filter(x=>!x.role.startsWith('pg_'))))!==JSON.stringify(ordered(EXPECTED_ROLES)))throw Error('RECOVERY_ROLE_ATTRIBUTE_DRIFT');
 const roles=new Map(meta.roles.map(x=>[x.role,x]));
 if(!roles.get(IMPORT_ROLE)?.superuser||!roles.get(IMPORT_ROLE)?.bypassrls||!roles.get(IMPORT_ROLE)?.login||roles.get('postgres')?.superuser)throw Error('RECOVERY_IMPORT_AUTHORITY');
 for(const role of ['pg_database_owner','postgres','supabase_admin','supabase_auth_admin','supabase_storage_admin'])if(!roles.has(role))throw Error('RECOVERY_OWNER_ROLE_MISSING');
 for(const service of meta.services)if(service.role===IMPORT_ROLE||!['supabase_auth_admin','authenticator','supabase_storage_admin'].includes(service.role)||service.database===RETRY_DATABASE)throw Error('RECOVERY_WRITER_NOT_QUARANTINED');
 return {pass:true,membership_sha256:hash(ordered(meta.membership)),database_owner:DATABASE_OWNER,public_owner:'pg_database_owner',import_role:IMPORT_ROLE};
}
/** Metadata-only pg_dump output; never called on data sections or Auth CSV. */
export function schemaSecurity(sql){
 const parts=sql.split(/(?=^-- Name: .*; Type: .*; Schema: .*; Owner: .*$)/m),objects=[];
 for(const part of parts){
  const h=/^-- Name: (.*); Type: (.*); Schema: (.*); Owner: (.*)$/m.exec(part);if(!h)continue;
  const [name,type,schema,owner]=h.slice(1),record={name,type,schema,owner};
  if(type==='FUNCTION')record.definer=/\bSECURITY DEFINER\b/.test(part);
  if(['ACL','DEFAULT ACL','POLICY','ROW SECURITY'].includes(type))record.sql=part.split('\n').filter(x=>x.trim()&&!x.startsWith('--')&&!x.startsWith('\\restrict')&&!x.startsWith('\\unrestrict')).map(x=>x.trim()).join('\n');
  objects.push(record);
 }
 const security=objects.filter(x=>['SCHEMA','TABLE','SEQUENCE','TYPE','FUNCTION','ACL','DEFAULT ACL','POLICY','ROW SECURITY'].includes(x.type));
 return ordered(security);
}
export function assertDumpContract(records){
 const count=type=>records.filter(x=>x.type===type).length;
 if(count('TABLE')!==137||count('FUNCTION')!==316||count('ROW SECURITY')!==125||count('POLICY')!==12||count('ACL')!==343||count('DEFAULT ACL')!==15)throw Error('RECOVERY_DUMP_SECURITY_DRIFT');
 if(records.filter(x=>x.type==='FUNCTION'&&x.definer&&x.owner==='postgres').length!==273||records.filter(x=>x.type==='FUNCTION'&&x.definer&&x.owner==='supabase_admin').length!==1)throw Error('RECOVERY_DEFINER_DRIFT');
 if(records.some(x=>x.owner!=='-'&&!['postgres','supabase_admin','supabase_auth_admin','supabase_storage_admin','pg_database_owner'].includes(x.owner)))throw Error('RECOVERY_UNEXPECTED_OWNER');
 return {pass:true,tables:count('TABLE'),functions:count('FUNCTION'),rls:count('ROW SECURITY'),policies:count('POLICY'),acls:count('ACL'),default_acls:count('DEFAULT ACL'),security_sha256:hash(records)};
}
export function assertSecurityEquivalent(expected,actual){
 if(JSON.stringify(expected)!==JSON.stringify(actual)){
  const key=x=>x.type+' '+x.schema+'.'+x.name,e=new Map(expected.map(x=>[key(x),JSON.stringify(x)])),a=new Map(actual.map(x=>[key(x),JSON.stringify(x)]));
  const changed=[...new Set([...e.keys(),...a.keys()])].filter(k=>e.get(k)!==a.get(k));
  const error=Error('RECOVERY_SECURITY_CATALOG_MISMATCH');error.changed=changed;throw error;
 }
 return {pass:true,security_sha256:hash(actual)};
}
export function createRetryDatabaseSql(){return `create database ${RETRY_DATABASE} owner ${DATABASE_OWNER} template template0;`;}
