begin read only;
do $$declare f regprocedure;begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'NOT_STAGING';end if;
 if not exists(select 1 from pg_class where oid='spot_private.account_onboarding'::regclass and relrowsecurity)
 or exists(select 1 from pg_policy where polrelid='spot_private.account_onboarding'::regclass)
 or has_table_privilege('anon','spot_private.account_onboarding','SELECT,INSERT,UPDATE,DELETE')
 or has_table_privilege('authenticated','spot_private.account_onboarding','SELECT,INSERT,UPDATE,DELETE')
 or has_table_privilege('service_role','spot_private.account_onboarding','SELECT,INSERT,UPDATE,DELETE')then raise exception 'ONBOARDING_TABLE_ACCESS';end if;
 foreach f in array array['public.my_onboarding_state()'::regprocedure,'public.complete_onboarding()'::regprocedure,'public.search_joinable_tribes(text,integer)'::regprocedure]loop
  if not has_function_privilege('authenticated',f,'EXECUTE')or has_function_privilege('anon',f,'EXECUTE')or has_function_privilege('service_role',f,'EXECUTE')then raise exception 'ONBOARDING_RPC_GRANT';end if;
  if not exists(select 1 from pg_proc where oid=f and prosecdef and proconfig@>array['search_path=""'])then raise exception 'ONBOARDING_DEFINER_PATH';end if;
 end loop;
 if has_function_privilege('authenticated','spot_private.enroll_profile_onboarding()','EXECUTE')then raise exception 'ONBOARDING_HELPER_GRANT';end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.profiles'::regclass and tgname='enroll_profile_onboarding'and tgenabled='O')then raise exception 'ONBOARDING_TRIGGER';end if;
 if exists(select 1 from spot_private.account_onboarding)then raise exception 'UNEXPECTED_ONBOARDING_FIXTURE_OR_BACKFILL';end if;
 if not exists(select 1 from spot_private.soma_v2_control where singleton and jobs_paused and not membership_enabled and not ora_enabled and not spot_enabled and not discovery_enabled and not comments_enabled and not requests_enabled and not system_posts_enabled and not share_enabled)then raise exception 'FEATURE_NOT_OFF';end if;
end$$;
select 'PASS: 031 staging schema/RLS/grants; zero onboarding backfill/fixtures; all v2 discovery flags OFF' evidence;
rollback;
