/** V3 isolated trust / fresh MFA. Source Auth and migration055 never mutated. */
import{AUTH_TABLES,AUTH_PROJECTED,AUTH_RECONSTRUCT,authFieldPolicy,PROJECTIONS}from'./auth-durable.mjs';
export const CONTRACT_VERSION=3;
export const EXCLUDED_DATA=Object.freeze([...AUTH_TABLES.filter(x=>x!=='auth.schema_migrations'),'spot_private.staff_revoked_sessions']);
const emptied=EXCLUDED_DATA.filter(x=>!AUTH_PROJECTED.includes(x));
export function classifyTables(tables,foreignKeys=[]){
 const names=tables.map(t=>typeof t==='string'?t:t.schema+'.'+t.name);
 if(new Set(names).size!==names.length||!EXCLUDED_DATA.every(t=>names.includes(t)))throw Error('RECOVERY_CONTRACT_CATALOG');
 if(names.some(x=>x.startsWith('auth.')&&!AUTH_TABLES.includes(x)))throw Error('RECOVERY_UNKNOWN_AUTH_TABLE');
 const result=names.map(table=>({table,action:AUTH_PROJECTED.includes(table)?'restore_projected':AUTH_RECONSTRUCT.includes(table)?'reconstruct_safely':emptied.includes(table)?'deliberately_exclude':'restore_directly'}));
 for(const fk of foreignKeys){
  if(!fk||typeof fk.name!=='string'||typeof fk.child!=='string'||typeof fk.parent!=='string'||!Array.isArray(fk.child_columns)||!Array.isArray(fk.parent_columns)||!fk.child_columns.length||fk.child_columns.length!==fk.parent_columns.length)throw Error('RECOVERY_FK_CATALOG');
  if(names.includes(fk.child)&&!emptied.includes(fk.child)&&(!names.includes(fk.parent)||emptied.includes(fk.parent)))throw Error('RECOVERY_UNCLASSIFIED_SESSION_DEPENDENCY');
  for(const[t,cols]of[[fk.child,fk.child_columns],[fk.parent,fk.parent_columns]])if(AUTH_PROJECTED.includes(t)&&Array.isArray(cols)&&cols.some(c=>!PROJECTIONS[t].some(p=>p.column===c)))throw Error('RECOVERY_PROJECTED_FK_FIELD');
 }
 return result.sort((a,b)=>a.table.localeCompare(b.table));
}
export function validateContract(c){
 if(c?.version!==3||c.session_barrier!=='isolated-target-trust-empty-runtime-and-fresh-mfa'||JSON.stringify(c.excluded_data)!==JSON.stringify(EXCLUDED_DATA)||JSON.stringify(c.auth_projection)!==JSON.stringify(authFieldPolicy())||c.mfa_recovery!=='verified-identity-reenrollment'||c.replay!=='post-cutoff-security-reconciliation-required')throw Error('RECOVERY_CONTRACT_VERSION');
 if(!Array.isArray(c.tables)||!Array.isArray(c.foreign_keys))throw Error('RECOVERY_CONTRACT_CATALOG');
 if(JSON.stringify(classifyTables(c.tables.map(t=>t.table),c.foreign_keys))!==JSON.stringify(c.tables))throw Error('RECOVERY_TABLE_CLASSIFICATION');return c;
}
export function makeContract(tables,foreignKeys){return validateContract({version:3,session_barrier:'isolated-target-trust-empty-runtime-and-fresh-mfa',mfa_recovery:'verified-identity-reenrollment',replay:'post-cutoff-security-reconciliation-required',excluded_data:[...EXCLUDED_DATA],auth_projection:authFieldPolicy(),tables:classifyTables(tables,foreignKeys),foreign_keys:foreignKeys});}
export const SESSION_BARRIER_SQL=`do $$begin
 ${emptied.map(x=>`if exists(select 1 from ${x})then raise exception 'RECOVERY_SESSION_BARRIER_NOT_EMPTY';end if;`).join('\n')}
 if exists(select 1 from auth.users where coalesce(confirmation_token,'')<>''or coalesce(recovery_token,'')<>''or coalesce(email_change_token_new,'')<>''or coalesce(email_change_token_current,'')<>''or coalesce(phone_change_token,'')<>''or coalesce(reauthentication_token,'')<>'')then raise exception 'RECOVERY_AUTH_TRANSIENT_FIELD';end if;
 if not exists(select 1 from pg_constraint where conrelid='spot_private.staff_revoked_sessions'::regclass and confrelid='auth.sessions'::regclass and contype='f'and convalidated and confdeltype='c')then raise exception 'RECOVERY_SESSION_FK_MISSING';end if;
 if exists(select 1 from pg_constraint where contype='f'and not convalidated)then raise exception 'RECOVERY_UNVALIDATED_FK';end if;
end$$;`;
