/** Checkpoint-only policy. Does not change Auth, staff grants or migration 055. */
export const CONTRACT_VERSION = 2;
export const EXCLUDED_DATA = Object.freeze([
 'auth.sessions','auth.refresh_tokens','auth.one_time_tokens','auth.flow_state',
 'auth.mfa_challenges','auth.mfa_amr_claims','spot_private.staff_revoked_sessions',
]);
export function classifyTables(tables, foreignKeys = []) {
 const names = tables.map(t => typeof t === 'string' ? t : t.schema+'.'+t.name);
 if (new Set(names).size !== names.length || !EXCLUDED_DATA.every(t => names.includes(t)))
  throw Error('RECOVERY_CONTRACT_CATALOG');
 const result = names.map(table => ({table, action: EXCLUDED_DATA.includes(table) ? 'deliberately_exclude' : 'restore_directly'}));
 for (const fk of foreignKeys) {
  if (EXCLUDED_DATA.includes(fk.parent) && names.includes(fk.child) && !EXCLUDED_DATA.includes(fk.child))
   throw Error('RECOVERY_UNCLASSIFIED_SESSION_DEPENDENCY');
 }
 return result.sort((a,b)=>a.table.localeCompare(b.table));
}
export function validateContract(contract) {
 if (contract?.version !== CONTRACT_VERSION || contract.session_barrier !== 'empty-auth-sessions-before-api'
  || JSON.stringify(contract.excluded_data) !== JSON.stringify(EXCLUDED_DATA))
  throw Error('RECOVERY_CONTRACT_VERSION');
 if (!Array.isArray(contract.tables) || !Array.isArray(contract.foreign_keys)) throw Error('RECOVERY_CONTRACT_CATALOG');
 const expected=classifyTables(contract.tables.map(t=>t.table),contract.foreign_keys);
 if(JSON.stringify(expected)!==JSON.stringify(contract.tables))throw Error('RECOVERY_TABLE_CLASSIFICATION');
 return contract;
}
export function makeContract(tables, foreignKeys) {
 return validateContract({version:CONTRACT_VERSION,session_barrier:'empty-auth-sessions-before-api',
  excluded_data:[...EXCLUDED_DATA],tables:classifyTables(tables,foreignKeys),foreign_keys:foreignKeys});
}
/** Run while restored DB is quarantined, before starting Auth/API. No mutations. */
export const SESSION_BARRIER_SQL = `do $$begin
 if exists(select 1 from auth.sessions) or exists(select 1 from auth.refresh_tokens)
  or exists(select 1 from auth.one_time_tokens) or exists(select 1 from auth.flow_state)
  or exists(select 1 from auth.mfa_challenges) or exists(select 1 from auth.mfa_amr_claims)
  or exists(select 1 from spot_private.staff_revoked_sessions)
 then raise exception 'RECOVERY_SESSION_BARRIER_NOT_EMPTY';end if;
 if not exists(select 1 from pg_constraint where conrelid='spot_private.staff_revoked_sessions'::regclass
  and confrelid='auth.sessions'::regclass and contype='f' and convalidated and confdeltype='c')
 then raise exception 'RECOVERY_SESSION_FK_MISSING';end if;
end$$;`;
