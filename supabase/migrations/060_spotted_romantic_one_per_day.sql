-- Only the global SPOTTED romantic initiative quota changes. No data rewrite.
begin;
set local lock_timeout='5s';set local statement_timeout='60s';
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or
 (current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'ROMANTIC_STAGING_ONLY';end if;
 if to_regclass('spot_private.server_transport_binding')is not null then
  if not exists(select 1 from spot_private.server_transport_binding where singleton and project_ref='zjinjtkekmaqtxsuyvho')then raise exception 'ROMANTIC_STAGING_BINDING';end if;
 end if;
 -- Never clamp/delete historical counters to install a tighter constraint.
 if exists(select 1 from spot_private.board_request_quota where used>1)then raise exception 'ROMANTIC_QUOTA_HISTORY_REVIEW_REQUIRED';end if;
end$$;
create function spot_private.spotted_romantic_daily_limit()returns integer
language sql immutable set search_path=''as $$select 1$$;
revoke all on function spot_private.spotted_romantic_daily_limit()from public,anon,authenticated,service_role;
alter table spot_private.board_request_quota drop constraint romantic_daily_cap;
alter table spot_private.board_request_quota add constraint romantic_daily_cap
 check(used<=spot_private.spotted_romantic_daily_limit());
do $patch$declare body text;needle text:='where board_request_quota.used<6';begin
 body:=pg_get_functiondef('public.spotted_romantic_submit(uuid,text,uuid)'::regprocedure);
 if(length(body)-length(replace(body,needle,'')))<>length(needle)or strpos(body,'if not charged then return')=0 then raise exception 'ROMANTIC_QUOTA_DEPENDENCY';end if;
 body:=replace(body,needle,'where board_request_quota.used<spot_private.spotted_romantic_daily_limit()');
 body:=replace(body,'replay of the six accepted attempts','replay of accepted attempts');
 execute body;
 body:=pg_get_functiondef('public.spotted_romantic_settings()'::regprocedure);
 needle:='greatest(0,6-coalesce';
 if(length(body)-length(replace(body,needle,'')))<>length(needle)then raise exception 'ROMANTIC_SETTINGS_DEPENDENCY';end if;
 execute replace(body,needle,'greatest(0,spot_private.spotted_romantic_daily_limit()-coalesce');
end$patch$;
notify pgrst,'reload schema';
commit;
