begin read only;
do $$declare f regprocedure;begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'NOT_STAGING';end if;
 foreach f in array array['public.check_in(uuid)'::regprocedure,'public.privacy_prior_check_in(uuid)'::regprocedure]loop
 if has_function_privilege('authenticated',f,'EXECUTE')or has_function_privilege('anon',f,'EXECUTE')or has_function_privilege('service_role',f,'EXECUTE')then raise exception 'LEGACY_GRANT';end if;
 if position('ORA_LEGACY_RETIRED'in(select prosrc from pg_proc where oid=f))=0 then raise exception 'LEGACY_BODY';end if;
 end loop;
 foreach f in array array['public.start_ora_manual(uuid)'::regprocedure,'public.start_ora_qr(uuid)'::regprocedure,'public.my_presence()'::regprocedure,'public.end_ora(uuid)'::regprocedure,'public.search_places(text,integer)'::regprocedure,'public.ora_people_page(integer,integer)'::regprocedure]loop
 if not has_function_privilege('authenticated',f,'EXECUTE')or has_function_privilege('anon',f,'EXECUTE')or has_function_privilege('service_role',f,'EXECUTE')then raise exception 'ORA_GRANT';end if;
 if not exists(select 1 from pg_proc where oid=f and prosecdef and proconfig @> array['search_path=""'])then raise exception 'ORA_DEFINER_PATH';end if;
 end loop;
 if has_table_privilege('authenticated','public.checkins','INSERT,UPDATE,DELETE')then raise exception 'DIRECT_PRESENCE_WRITE';end if;
 if exists(select 1 from spot_private.soma_v2_control where not jobs_paused or membership_enabled or spot_enabled or discovery_enabled or comments_enabled or requests_enabled or system_posts_enabled or share_enabled)then raise exception 'FUTURE_ENABLED';end if;
 if exists(select 1 from spot_private.ora_spot_policy where enabled)or exists(select 1 from spot_private.ora_spot_daily_quota)or exists(select 1 from spot_private.ora_spot_place_quota)then raise exception 'QUOTA_NOT_OFF';end if;
 if exists(select 1 from auth.users where id::text like 'fe32%')or exists(select 1 from public.venues where id::text like 'fe32%')then raise exception 'FIXTURE_REMAINS';end if;
 if not exists(select 1 from spot_private.photo_cutover_control where phase='PAUSED'and not execute_enabled and not scheduler_enabled and not cleanup_all and canary_users='{}')then raise exception 'PHOTO_CONTROL';end if;
end$$;
select 'PASS: ORA grants, retired legacy bodies, no direct writes, quotas OFF/empty, scheduler paused, zero named fixtures' evidence;
rollback;
