/** Fail-closed post-cutoff reconciliation. No role promotion or hold auto-release. */
export const SECURITY_SNAPSHOT_SQL=`select jsonb_build_object(
 'users',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'credential_digest',md5(jsonb_build_array(u.email,u.encrypted_password,u.email_confirmed_at,u.phone,u.phone_confirmed_at,u.is_sso_user,u.is_anonymous)::text),'banned_until',u.banned_until,'deleted_at',u.deleted_at)order by u.id),'[]')from auth.users u),
 'identities',(select coalesce(jsonb_agg(to_jsonb(i)order by user_id),'[]')from(select user_id,md5(jsonb_agg(jsonb_build_array(id,provider,provider_id,identity_data->'sub',identity_data->'email',identity_data->'email_verified')order by id)::text)digest from auth.identities group by user_id)i),
 'roles',(select coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'role',role,'active',active)order by user_id),'[]')from spot_private.moderation_roles),
 'consents',(select coalesce(jsonb_agg(to_jsonb(c)order by user_id),'[]')from spot_private.consent_state c),
 'holds',(select md5(coalesce(jsonb_agg(to_jsonb(h)order by id)::text,''))from spot_private.safety_holds h),
 'suspensions',(select md5(coalesce(jsonb_agg(to_jsonb(s)order by user_id)::text,''))from spot_private.suspensions s),
 'moderation',(select md5(coalesce(jsonb_agg(to_jsonb(a)order by id)::text,''))from spot_private.moderation_audit a)
 )::text;`;
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
export function replayPlan(before,after){
 if(!before||!after||!Array.isArray(before.users)||!Array.isArray(after.users))throw Error('RECOVERY_REPLAY_SNAPSHOT');
 for(const key of['holds','suspensions','moderation'])if(before[key]!==after[key])throw Error('RECOVERY_SECURITY_DELTA_REQUIRES_REVIEW');
 const current=new Map(after.users.map(x=>[x.id,x])),deleted=new Set(),actions=[];
 for(const u of before.users){if(!uuid(u.id))throw Error('RECOVERY_REPLAY_ID');const n=current.get(u.id);if(!n){deleted.add(u.id);actions.push({action:'account.delete',id:u.id});continue;}
  if(u.credential_digest!==n.credential_digest)throw Error('RECOVERY_CREDENTIAL_DELTA_REQUIRES_REVIEW');
  if(u.banned_until!==n.banned_until||u.deleted_at!==n.deleted_at)throw Error('RECOVERY_AUTH_RESTRICTION_REQUIRES_REVIEW');
 }
 const identities=new Map(after.identities.map(x=>[x.user_id,x.digest]));
 for(const i of before.identities)if(!deleted.has(i.user_id)&&identities.get(i.user_id)!==i.digest)throw Error('RECOVERY_IDENTITY_DELTA_REQUIRES_REVIEW');
 for(const i of after.identities)if(before.users.some(u=>u.id===i.user_id)&&!before.identities.some(b=>b.user_id===i.user_id))throw Error('RECOVERY_IDENTITY_DELTA_REQUIRES_REVIEW');
 const roles=new Map(after.roles.map(x=>[x.user_id,x]));
 for(const r of before.roles){if(deleted.has(r.user_id))continue;const n=roles.get(r.user_id);if(!n||!n.active){if(r.active)actions.push({action:'role.revoke',id:r.user_id});}else if(n.role!==r.role||!r.active)throw Error('RECOVERY_ROLE_CHANGE_REQUIRES_REVIEW');}
 const consents=new Map(after.consents.map(x=>[x.user_id,x]));
 for(const c of before.consents){if(deleted.has(c.user_id))continue;const n=consents.get(c.user_id);if(!n)throw Error('RECOVERY_CONSENT_DELTA_REQUIRES_REVIEW');
  if(JSON.stringify(c)!==JSON.stringify(n)){if(n.status!=='revoked'||n.revision<c.revision)throw Error('RECOVERY_CONSENT_DELTA_REQUIRES_REVIEW');actions.push({action:'consent.revoke',id:c.user_id,state:n});}
 }
 return {version:3,actions,identity_reconciliation:'surviving-users-unchanged',hold_auto_release:false,role_promotion:false};
}
