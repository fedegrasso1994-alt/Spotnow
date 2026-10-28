/** Real local DB logins and authenticator SET ROLE path; not an Auth/JWT login test. */
import {writeFile} from 'node:fs/promises';
import {targetSql} from './local-target.mjs';
import {RETRY_DATABASE} from './restore-bootstrap.mjs';
import {runtimeSql} from './local-runtime-connection.mjs';
const query=(sql,role)=>role==='postgres'?targetSql('begin read only;'+sql+';rollback;',{database:RETRY_DATABASE}):runtimeSql('begin read only;'+sql+';rollback;',role);
export async function runtimeRoleSmoke(){
 const result={database:RETRY_DATABASE,scope:'actual PostgreSQL role sessions; JWT login not claimed'};
 for(const [label,role,table]of[['auth','supabase_auth_admin','auth.users'],['storage','supabase_storage_admin','storage.objects']]){
  const r=JSON.parse(await query(`select jsonb_build_object('role',current_user,'readable_rows',(select count(*)from ${table}))`,role));
  if(r.role!==role)throw Error('RECOVERY_SERVICE_ROLE_BOUNDARY');
  let denied=false;try{await query('select count(*)from spot_private.moderation_roles',role)}catch(e){if(e.sqlstate!=='42501')throw e;denied=true}if(!denied)throw Error('RECOVERY_SERVICE_ROLE_BOUNDARY');
  result[label]={role:r.role,own_service_table_read:true,private_staff_table_read:false,transport:'TCP with actual service credential'};
 }
 const ids=JSON.parse(await query("select json_agg(id)from(select id from public.profiles order by id limit 2)p",'postgres'));
 if(!Array.isArray(ids)||ids.length!==2||ids.some(x=>!/^[a-f0-9-]{36}$/.test(x)))throw Error('RECOVERY_RLS_FIXTURE_MISSING');
 const own=JSON.parse(await query(`set local role authenticated;select set_config('request.jwt.claims','{"sub":"${ids[0]}","role":"authenticated"}',true) is not null;select jsonb_build_object('own',(select count(*)from public.profiles where id='${ids[0]}'),'other',(select count(*)from public.profiles where id='${ids[1]}'))`,'authenticator').then(x=>x.trim().split('\n').at(-1)));
 if(own.own!==1||own.other!==0)throw Error('RECOVERY_RLS_ISOLATION');result.authenticated={via:'authenticator SET LOCAL ROLE authenticated',own_row:1,other_row:0,claims:'DB-context-only, not an Auth proof'};
 for(const [label,sql]of[['anon','set local role anon;select count(*)from public.profiles'],['authenticator','select count(*)from public.profiles']]){
  let denied=false;try{await query(sql,'authenticator')}catch(e){if(e.sqlstate!=='42501')throw e;denied=true}if(!denied)throw Error('RECOVERY_UNAUTHORIZED_TABLE_READ');result[label]={direct_profile_read:'DENIED'};
 }
 const service=Number((await query('set local role service_role;select count(*)from public.profiles','authenticator')).trim());if(!Number.isSafeInteger(service)||service<2)throw Error('RECOVERY_SERVICE_ROLE');result.service_role={via:'authenticator SET LOCAL ROLE service_role',bypass_rls_read:true};
 result.pass=true;return result;
}
if(process.argv[2]==='--verify-recovered-db-roles'){
 try{const result=await runtimeRoleSmoke();await writeFile('.local/recovery-v3/runtime-role-result.json',JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify(result));}
 catch(error){console.error(JSON.stringify({pass:false,code:/^[A-Z_]+$/.test(error.message)?error.message:'RECOVERY_ROLE_SMOKE_FAILED'}));process.exitCode=1;}
}
