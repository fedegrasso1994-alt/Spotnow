-- Explicit --project-ref zjinjtkekmaqtxsuyvho is mandatory. Read-only metadata/counts.
begin read only;
set local statement_timeout='30s';
select jsonb_build_object(
 'at',clock_timestamp(),
 'environment',(select environment from spot_private.privacy_environment where singleton),
 'platform',jsonb_build_object('postgres_version',current_setting('server_version'),
 'service_role_memberships',(select jsonb_agg(parent.rolname order by parent.rolname)from pg_auth_members m join pg_roles child on child.oid=m.member join pg_roles parent on parent.oid=m.roleid where child.rolname='service_role'),
 'public_defaults',(select jsonb_agg(jsonb_build_object('owner',r.rolname,'kind',a.defaclobjtype,'acl',a.defaclacl)order by r.rolname,a.defaclobjtype)from pg_default_acl a join pg_roles r on r.oid=a.defaclrole join pg_namespace n on n.oid=a.defaclnamespace where n.nspname='public')),
 'history',(select jsonb_agg(jsonb_build_object('version',version,'name',name,'statement_count',cardinality(statements),'statements_md5',md5(array_to_string(statements,E'\n')))order by version)from supabase_migrations.schema_migrations),
 'roles',(select jsonb_build_object('admins',count(*)filter(where active and role='ADMIN'),'moderators',count(*)filter(where active and role='MODERATOR'),'events', (select count(*)from spot_private.moderation_role_events))from spot_private.moderation_roles),
 'counts',jsonb_build_object('auth',(select count(*)from auth.users),'profiles',(select count(*)from profiles),'storage',(select count(*)from storage.objects),'matches',(select count(*)from matches),'messages',(select count(*)from messages)),
 'profile_fingerprint',(select md5(coalesce(string_agg(to_jsonb(p)::text,'|'order by id),''))from profiles p),
 'storage_fingerprint',(select md5(coalesce(string_agg(to_jsonb(o)::text,'|'order by bucket_id,name),''))from storage.objects o),
 'controls',jsonb_build_object('v2',(select to_jsonb(c)from spot_private.soma_v2_control c),'photo',(select jsonb_build_object('phase',phase,'execute',execute_enabled,'scheduler',scheduler_enabled)from spot_private.photo_cutover_control),'notifications',(select to_jsonb(c)from spot_private.notification_control c),'phase_a',(select to_jsonb(c)from spot_private.retention_phase_a_control c)),
 'jobs',(select jsonb_agg(jsonb_build_object('id',jobid,'name',jobname,'active',active,'schedule',schedule)order by jobid)from cron.job)
)as state;
rollback;
