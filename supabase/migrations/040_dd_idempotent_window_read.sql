begin;
set local lock_timeout='5s';set local statement_timeout='60s';
select spot_private.board_lock();
do $migration$
declare body text;
 old_fragment text:=$old$ insert into spot_private.discovery_windows(local_date,slot,policy_version,starts_at,ends_at)values(c.local_date,c.slot,2,c.starts_at,c.ends_at)on conflict(local_date,slot)do nothing;
 select * into w from spot_private.discovery_windows where local_date=c.local_date and slot=c.slot;$old$;
 new_fragment text:=$new$ -- Reuse the current window under the existing board lock before any INSERT.
 select * into w from spot_private.discovery_windows where local_date=c.local_date and slot=c.slot;
 if not found then
  insert into spot_private.discovery_windows(local_date,slot,policy_version,starts_at,ends_at)values(c.local_date,c.slot,2,c.starts_at,c.ends_at)on conflict(local_date,slot)do nothing;
  select * into w from spot_private.discovery_windows where local_date=c.local_date and slot=c.slot;
 end if;$new$;
begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')
 or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'DD_STAGING_ONLY';end if;
 if exists(select 1 from spot_private.soma_v2_control where discovery_enabled)
 or not exists(select 1 from spot_private.discovery_policy where version=2 and not enabled and paused)then raise exception 'DD_REQUIRES_OFF';end if;
 if strpos(pg_get_functiondef('spot_private.dd_current_projection()'::regprocedure),'outgoing_spot_pending')=0 then raise exception 'DD_039_REQUIRED';end if;
 body:=pg_get_functiondef('public.my_daily_discovery()'::regprocedure);
 if(length(body)-length(replace(body,old_fragment,'')))<>length(old_fragment)
 or strpos(body,'perform spot_private.board_lock();stamp:=clock_timestamp();')=0 then raise exception 'DD_IDEMPOTENT_WRAPPER_DEPENDENCY';end if;
 execute replace(body,old_fragment,new_fragment);
end$migration$;
notify pgrst,'reload schema';
commit;
