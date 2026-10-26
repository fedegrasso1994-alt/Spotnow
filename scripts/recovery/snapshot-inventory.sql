-- READ ONLY. Run inside the SAME exported snapshot used by pg_dump.
select jsonb_build_object(
 'snapshot_at',transaction_timestamp(),
 'server_version',current_setting('server_version'),
 'profiles',(select count(*) from public.profiles),
 'current_required',(select coalesce(jsonb_agg(x.path order by x.path),'[]') from (
   select distinct unnest(array[p.photo_path,p.photo_path||'.detail.jpg',p.photo_path||'.thumb.jpg']) path
   from public.profiles p where p.photo_path is not null) x),
 'objects',(select coalesce(jsonb_agg(jsonb_build_object(
   'bucket',o.bucket_id,'storage_key',o.name,
   'size',(o.metadata->>'size')::bigint,'mime',o.metadata->>'mimetype',
   'referenced',exists(select 1 from public.profiles p where o.name in(p.photo_path,p.photo_path||'.detail.jpg',p.photo_path||'.thumb.jpg'))
      or exists(select 1 from spot_private.photo_assets a where o.name in(a.photo_path,a.thumbnail_path,to_jsonb(a)->>'detail_path'))
      or exists(select 1 from spot_private.photo_lifecycle_sets s where s.state in('ready','current','retired') and s.writer='settled' and o.name in(s.photo_path,s.photo_path||'.detail.jpg',s.photo_path||'.thumb.jpg')),
   'expected_sha',coalesce((select m->>'sha' from spot_private.photo_lifecycle_sets s cross join lateral jsonb_array_elements(coalesce(s.manifest,'[]')) m where m->>'path'=o.name limit 1),
      (select v.canonical_sha from spot_private.validated_photos v where v.photo_path=o.name))
 ) order by o.name),'[]') from storage.objects o where o.bucket_id='profile-photos'),
 'other_bucket_objects',(select count(*) from storage.objects where bucket_id<>'profile-photos'),
 'migrations',(select coalesce(jsonb_agg(version order by version),'[]') from supabase_migrations.schema_migrations),
 'tables',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'rls',c.relrowsecurity) order by n.nspname,c.relname)
   from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in('r','p') and n.nspname in('public','spot_private')),
 'functions',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'definition_hash',md5(pg_get_functiondef(p.oid))) order by n.nspname,p.proname,p.oid)
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','spot_private') and p.prokind in('f','p')),
 'policies',(select coalesce(jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',policyname,'command',cmd,'roles',roles) order by schemaname,tablename,policyname),'[]') from pg_policies where schemaname in('public','spot_private','storage')),
 'extensions',(select jsonb_agg(jsonb_build_object('name',extname,'version',extversion) order by extname) from pg_extension)
)::text;
