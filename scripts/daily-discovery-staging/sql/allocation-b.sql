begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','fea37000-0000-4000-8000-000000000002',true);
select jsonb_build_object('pid',pg_backend_pid(),'started',statement_timestamp(),'finished',clock_timestamp(),'result',public.my_daily_discovery())evidence;
commit;
