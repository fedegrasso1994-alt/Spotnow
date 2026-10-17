-- Read-only fingerprints, never exports row contents, credentials or Auth secrets.
begin isolation level repeatable read read only;
do $$declare r record;n bigint;h text;v jsonb:='{}';begin
 for r in select schemaname,tablename from pg_tables where schemaname in('public','spot_private','storage')and tablename<>'account_onboarding'order by schemaname,tablename loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x)order by to_jsonb(x)::text)::text,''[]''))from %I.%I x',r.schemaname,r.tablename)into n,h;
  v:=v||jsonb_build_object(r.schemaname||'.'||r.tablename,jsonb_build_object('rows',n,'hash',h));
 end loop;
 perform set_config('soma.onboarding_integrity',v::text,true);
end$$;
select jsonb_build_object('tables',current_setting('soma.onboarding_integrity')::jsonb,
 'auth_count',(select count(*)from auth.users),
 'auth_identity_hash',(select md5(coalesce(jsonb_agg(jsonb_build_array(id,is_anonymous)order by id)::text,'[]'))from auth.users),
 'functions',(select md5(string_agg(pg_get_functiondef(p.oid),E'\n'order by p.oid))from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','spot_private')and p.prokind='f'and p.proname not in('enroll_profile_onboarding','my_onboarding_state','complete_onboarding','search_joinable_tribes')),
 'policies',(select md5(coalesce(jsonb_agg(to_jsonb(x)order by schemaname,tablename,policyname)::text,'[]'))from pg_policies x where schemaname in('public','spot_private','storage')),
 'table_security',(select md5(jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relrowsecurity,c.relacl)order by n.nspname,c.relname)::text)from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','spot_private','storage')and c.relkind='r'and c.relname<>'account_onboarding')) evidence;
rollback;
