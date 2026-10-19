-- Read-only after applying 041 on Soma Staging. No activation, fixtures or writes.
select jsonb_build_object(
 'environment',(select environment from spot_private.privacy_environment limit 1),
 'controlled_admission',(select dd_controlled_admission from spot_private.soma_v2_control),
 'allowlist_count',(select count(*)from spot_private.dd_admission_accounts),
 'discovery',(select discovery_enabled from spot_private.soma_v2_control),
 'jobs_paused',(select jobs_paused from spot_private.soma_v2_control),
 'policy2',(select jsonb_build_object('enabled',enabled,'paused',paused)from spot_private.discovery_policy where version=2),
 'photo',(select jsonb_build_object('phase',phase,'epoch',epoch,'cleanup',execute_enabled,'scheduler',scheduler_enabled)from spot_private.photo_cutover_control),
 'accounts',(select count(*)from auth.users),'profiles',(select count(*)from profiles),
 'objects',(select count(*)from storage.objects where bucket_id='profile-photos'),
 'matches',(select count(*)from matches),'messages',(select count(*)from messages),
 'windows',(select count(*)from spot_private.discovery_windows),
 'allocations',(select count(*)from spot_private.discovery_allocations),
 'exposures',(select count(*)from spot_private.discovery_exposures),
 'profiles_digest',(select md5(coalesce(string_agg(to_jsonb(p)::text,''order by p.id),''))from profiles p),
 'allowlist_RLS',(select relrowsecurity from pg_class where oid='spot_private.dd_admission_accounts'::regclass),
 'authenticated_read',has_table_privilege('authenticated','spot_private.dd_admission_accounts','SELECT'),
 'service_write',has_table_privilege('service_role','spot_private.dd_admission_accounts','INSERT'),
 'private_gate_public',has_function_privilege('authenticated','spot_private.dd_admitted(uuid)','EXECUTE'),
 'functions',(select jsonb_object_agg(p.oid::regprocedure::text,md5(p.prosrc))from pg_proc p where p.oid in('spot_private.dd_build(uuid)'::regprocedure,'spot_private.dd_pair_eligible(uuid,uuid,uuid)'::regprocedure,'public.my_daily_discovery()'::regprocedure,'spot_private.dd_current_projection()'::regprocedure)),
 'builder_sources_gated',(select (length(prosrc)-length(replace(prosrc,'spot_private.dd_admitted(m.user_id)','')))/length('spot_private.dd_admitted(m.user_id)')=2 from pg_proc where oid='spot_private.dd_build(uuid)'::regprocedure)
) evidence;
