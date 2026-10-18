-- Invoke only through the explicitly selected staging connection/URL. Hosted SQL
-- currently has no supabase.project_ref GUC; reject mismatches whenever supplied.
-- Explicit staging-only activation. No discovery, Spot, membership flag or scheduler activation.
begin;
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho') then raise exception 'ORA_ENABLE_WRONG_PROJECT';end if;
 if to_regprocedure('public.start_ora_manual(uuid)')is null or has_function_privilege('authenticated','public.check_in(uuid)','EXECUTE')then raise exception 'ORA_ENABLE_UNSAFE';end if;
 if exists(select 1 from spot_private.soma_v2_control where not jobs_paused or spot_enabled or discovery_enabled or membership_enabled or comments_enabled or requests_enabled or system_posts_enabled or share_enabled)then raise exception 'FUTURE_NOT_OFF';end if;
end$$;
update spot_private.soma_v2_control set ora_enabled=true where singleton;
commit;
select 'PASS: ORA staging enabled only; all subsequent mechanics/jobs remain OFF' evidence;
