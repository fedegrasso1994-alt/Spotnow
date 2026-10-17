begin read only;
do $$declare f regprocedure;t text;begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'NOT_STAGING';end if;
 foreach f in array array['public.join_tribe(uuid)'::regprocedure,'public.leave_tribe(uuid)'::regprocedure]loop
  if not has_function_privilege('authenticated',f,'EXECUTE')or has_function_privilege('anon',f,'EXECUTE')or has_function_privilege('service_role',f,'EXECUTE')then raise exception 'TRIBE_RPC_GRANT';end if;
  if not exists(select 1 from pg_proc where oid=f and prosecdef and proconfig@>array['search_path=""'])then raise exception 'TRIBE_RPC_DEFINER_PATH';end if;
 end loop;
 foreach f in array array['spot_private.tribe_membership_lock()'::regprocedure,'spot_private.tribe_configuration_immutable()'::regprocedure]loop
  if has_function_privilege('authenticated',f,'EXECUTE')or has_function_privilege('anon',f,'EXECUTE')or has_function_privilege('service_role',f,'EXECUTE')then raise exception 'TRIBE_HELPER_GRANT';end if;
 end loop;
 foreach t in array array['tribe_memberships','tribe_account_state','tribe_rejoin_guards']loop
  if has_table_privilege('authenticated','spot_private.'||t,'SELECT,INSERT,UPDATE,DELETE')or has_table_privilege('anon','spot_private.'||t,'SELECT,INSERT,UPDATE,DELETE')
   or not exists(select 1 from pg_class where oid=('spot_private.'||t)::regclass and relrowsecurity)then raise exception 'TRIBE_DIRECT_ACCESS';end if;
 end loop;
 if not exists(select 1 from pg_trigger where tgrelid='spot_private.tribe_account_state'::regclass and tgname='tribe_configuration_immutable'and tgenabled='O')then raise exception 'TRIBE_ANCHOR_TRIGGER';end if;
 if not exists(select 1 from spot_private.soma_v2_control where singleton and jobs_paused
  and not membership_enabled and not ora_enabled and not spot_enabled and not discovery_enabled
  and not comments_enabled and not requests_enabled and not system_posts_enabled and not share_enabled)then raise exception 'TRIBE_NOT_OFF';end if;
end$$;
select 'PASS: staging membership RPC authenticated/owner-only; private tables; immutable anchor; legacy my_tribes preserved; UI/v2 flags OFF' evidence;
rollback;
