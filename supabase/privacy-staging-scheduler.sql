begin;
-- Explicit staging-only scheduler; reuse existing encrypted PHOTO scheduler credential, never inline it.
create function public.privacy_retention_schedule(enabled boolean,dry_run boolean default true)returns void language plpgsql security definer set search_path='' as $$
declare job bigint;command text;
begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'STAGING_ONLY';end if;
 if enabled is null or dry_run is null then raise exception 'SCHEDULER_INPUT';end if;
 select jobid into job from cron.job where jobname='soma-privacy-retention-staging';
 if not enabled then if job is not null then perform cron.alter_job(job,active:=false);end if;return;end if;
 if not exists(select 1 from vault.secrets where name='soma-photo02-cutover-staging-key')then raise exception 'SCHEDULER_CREDENTIAL_REQUIRED';end if;
 command:=format('select public.privacy_retention_dispatch(%L);',dry_run);
 if job is null then select cron.schedule('soma-privacy-retention-staging','* * * * *',command)into job;else perform cron.alter_job(job,command:=command);end if;
 perform cron.alter_job(job,active:=true);
end $$;
create function public.privacy_retention_dispatch(dry_run boolean default true)returns jsonb language plpgsql security definer set search_path='' as $$
declare key text;p record;op uuid;request bigint;dispatched integer:=0;
begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'STAGING_ONLY';end if;
 if not dry_run and(select paused from spot_private.retention_control)then return jsonb_build_object('paused',true,'dispatched',0);end if;
 select decrypted_secret into key from vault.decrypted_secrets where name='soma-photo02-cutover-staging-key';
 if key is null then raise exception 'SCHEDULER_CREDENTIAL_REQUIRED';end if;
 for p in select category from spot_private.retention_policies where enabled loop
 op:=md5(p.category||':'||floor(extract(epoch from now())/60)::text||':'||dry_run::text)::uuid;
 select net.http_post(url:='https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/privacy-retention',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||key),body:=jsonb_build_object('category',p.category,'operation_id',op,'dry_run',dry_run),timeout_milliseconds:=30000)into request;
 dispatched:=dispatched+1;
 end loop;return jsonb_build_object('dispatched',dispatched,'dry_run',dry_run);
end $$;
create function public.privacy_retention_scheduler_status()returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('active',coalesce((select active from cron.job where jobname='soma-privacy-retention-staging'),false),'runs',(select count(*)from cron.job_run_details where jobid in(select jobid from cron.job where jobname='soma-privacy-retention-staging')),'http200',(select count(*)from net._http_response where status_code=200 and content like '%policy_version%' and content like '%candidates%'),'latest200',(select max(created)from net._http_response where status_code=200 and content like '%policy_version%' and content like '%candidates%'));
$$;
revoke all on function public.privacy_retention_schedule(boolean,boolean),public.privacy_retention_dispatch(boolean),public.privacy_retention_scheduler_status()from public,anon,authenticated;
grant execute on function public.privacy_retention_schedule(boolean,boolean),public.privacy_retention_dispatch(boolean),public.privacy_retention_scheduler_status()to service_role;
notify pgrst,'reload schema';commit;
