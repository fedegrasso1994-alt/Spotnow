/** Canonical inert state for deliberately omitted V3 fields. Never copy source tokens. */
import{validateContract,EXCLUDED_DATA}from'./session-contract.mjs';
export const INERT_AUTH_FIELDS=Object.freeze(['confirmation_token','recovery_token','email_change_token_new','email_change']);
export const INERT_AUTH_POLICY=Object.freeze({version:1,table:'auth.users',classification:'TRANSIENT AUTH STATE',payload:'excluded',reconstruction:'canonical empty string',fields:INERT_AUTH_FIELDS});
export function authTransientSql(contract,ids){
 validateContract(contract);
 if(INERT_AUTH_FIELDS.some(f=>contract.auth_projection['auth.users'].columns.includes(f)))throw Error('RECOVERY_INERT_FIELD_INCLUDED');
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(x=>typeof x!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x)))throw Error('RECOVERY_INERT_ID_SCOPE');
 const ordered=[...ids].sort(),array='array['+ordered.map(x=>"'"+x+"'::uuid").join(',')+']';
 const remove=INERT_AUTH_FIELDS.map(x=>"-'"+x+"'").join('');
 const fingerprint=`md5(jsonb_build_array((select jsonb_agg(to_jsonb(u)${remove} order by id)from auth.users u),(select jsonb_agg(to_jsonb(i)order by id)from auth.identities i))::text)`;
 const emptied=EXCLUDED_DATA.filter(x=>!['auth.users','auth.identities'].includes(x));
 return `do $inert$ declare before_state text; after_state text; begin
 lock table auth.users in access exclusive mode;
 if (select array_agg(id order by id)from auth.users) is distinct from ${array} then raise exception 'RECOVERY_INERT_ID_SET';end if;
 ${emptied.map(t=>`if exists(select 1 from ${t})then raise exception 'RECOVERY_INERT_RUNTIME_NOT_EMPTY';end if;`).join('\n')}
 if exists(select 1 from auth.users where ${INERT_AUTH_FIELDS.map(f=>`("${f}" is not null and "${f}"<>'')`).join(' or ')})then raise exception 'RECOVERY_INERT_NONEMPTY';end if;
 select ${fingerprint} into before_state;
 update auth.users set ${INERT_AUTH_FIELDS.map(f=>`"${f}"=''`).join(',')} where ${INERT_AUTH_FIELDS.map(f=>`"${f}" is null`).join(' or ')};
 select ${fingerprint} into after_state;
 if before_state is distinct from after_state then raise exception 'RECOVERY_INERT_DURABLE_CHANGED';end if;
 if exists(select 1 from auth.users where ${INERT_AUTH_FIELDS.map(f=>`("${f}" is null or "${f}"<>'')`).join(' or ')})then raise exception 'RECOVERY_INERT_NOT_CANONICAL';end if;
 end $inert$;`;
}
