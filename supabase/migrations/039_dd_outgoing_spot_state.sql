begin;
set local lock_timeout='5s';set local statement_timeout='60s';
select spot_private.board_lock();
do $migration$
declare body text;needle text:='''exposure_id'',e.id)';enriched text;
begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')
 or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'DD_STAGING_ONLY';end if;
 if exists(select 1 from spot_private.soma_v2_control where discovery_enabled)
 or not exists(select 1 from spot_private.discovery_policy where version=2 and not enabled and paused)then raise exception 'DD_REQUIRES_OFF';end if;
 body:=pg_get_functiondef('spot_private.dd_current_projection()'::regprocedure);
 if strpos(body,'outgoing_spot_pending')>0
 or(length(body)-length(replace(body,needle,'')))<>length(needle)then raise exception 'DD_OUTGOING_PROJECTION_DEPENDENCY';end if;
 -- Enrich only already-authorized profiles. No incoming lookup, origin filter,
 -- timestamps, intent IDs, new authorization path, or Spot writes.
 enriched:=replace(body,needle,
 '''exposure_id'',e.id,''outgoing_spot_pending'',exists(select 1 from spot_private.spot_v2_intents outgoing where outgoing.sender_id=me and outgoing.recipient_id=p.id and outgoing.state=''pending'' and outgoing.valid_until>clock_timestamp()))');
 execute enriched;
end$migration$;
notify pgrst,'reload schema';
commit;
