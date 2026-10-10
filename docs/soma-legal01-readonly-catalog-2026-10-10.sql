begin read only;
select jsonb_build_object(
'checked_at',clock_timestamp(),
'rls',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'rls',c.relrowsecurity,'anon_select',has_table_privilege('anon',c.oid,'select'),'auth_select',has_table_privilege('authenticated',c.oid,'select'))) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in('public','spot_private')),
'policies',(select jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'policy',policyname,'command',cmd,'roles',roles,'qual',qual,'check',with_check)) from pg_policies where schemaname in('public','spot_private') or schemaname='storage' and tablename='objects'),
'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'definer',p.prosecdef,'config',p.proconfig,'anon_execute',has_function_privilege('anon',p.oid,'execute'),'auth_execute',has_function_privilege('authenticated',p.oid,'execute'),'hash',md5(pg_get_functiondef(p.oid)))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','spot_private') and p.prokind='f'),
'checkin_constraint',(select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.checkins'::regclass and contype='c'),
'profile_checks',(select jsonb_agg(pg_get_constraintdef(oid)) from pg_constraint where conrelid='public.profiles'::regclass and contype='c'),
'checkins',(select count(*) from public.checkins),
'expired_checkins',(select count(*) from public.checkins where expires_at<=now()),
'memberships',(select count(*) from spot_private.tribe_memberships),
'activity_window',(select activity_window::text from spot_private.tribe_settings),
'accounts',(select count(*) from auth.users),'profiles',(select count(*) from public.profiles),
'photos',(select count(*) from storage.objects where bucket_id='profile-photos'),
'legacy_photos',(select count(*) from spot_private.photo_legacy),
'control',public.photo_cutover_status(),
'bucket',(select jsonb_build_object('private',not public,'limit',file_size_limit,'mime',allowed_mime_types) from storage.buckets where id='profile-photos'),
'auth_metadata_columns',(select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type)) from information_schema.columns where table_schema='auth' and table_name in('users','identities','sessions','audit_log_entries','refresh_tokens') and column_name~'email|phone|meta|provider|ip|agent|payload|created|updated|token|name|login'),
'discovery_definitions',(select jsonb_object_agg(p.proname,pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('location_people','location_people_page','visible_profiles','my_tribes','venue_preview','prepare_account_deletion','moderation_reports')),
'fk',(select jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,'target',confrelid::regclass::text,'definition',pg_get_constraintdef(oid))) from pg_constraint where contype='f' and connamespace in('public'::regnamespace,'spot_private'::regnamespace))
) legal01_catalog;
rollback;
