-- Staging only, approved transport-only patch; no job/state/policy changes.
begin;
create or replace function public.privacy_retention_dispatch(dry_run boolean default true)returns jsonb language plpgsql security definer set search_path='' as $$
declare key text;p record;op uuid;request bigint;dispatched integer:=0;
begin
 perform spot_private.require_staging_server_transport('zjinjtkekmaqtxsuyvho');
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'STAGING_ONLY';end if;
 if not dry_run and(select paused from spot_private.retention_control)then return jsonb_build_object('paused',true,'dispatched',0);end if;
 select decrypted_secret into key from vault.decrypted_secrets where name='soma-modern-server-staging';
 if key is null then raise exception 'SCHEDULER_CREDENTIAL_REQUIRED';end if;
 for p in select category from spot_private.retention_policies where enabled loop
 op:=md5(p.category||':'||floor(extract(epoch from now())/60)::text||':'||dry_run::text)::uuid;
 select net.http_post(url:='https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/privacy-retention',headers:=jsonb_build_object('Content-Type','application/json','apikey',key),body:=jsonb_build_object('category',p.category,'operation_id',op,'dry_run',dry_run),timeout_milliseconds:=30000)into request;
 dispatched:=dispatched+1;
 end loop;return jsonb_build_object('dispatched',dispatched,'dry_run',dry_run);
end $$;
revoke all on function public.privacy_retention_dispatch(boolean)from public,anon,authenticated;
grant execute on function public.privacy_retention_dispatch(boolean)to service_role;
notify pgrst,'reload schema';
commit;
