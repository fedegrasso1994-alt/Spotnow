-- Explicitly authorized operational activation; NOT a migration. STAGING ONLY.
-- Only Phase A. Does not enable legacy retention, PHOTO, DD or delivery.
begin;
do $$begin
 if exists(select 1 from cron.job where jobname='soma-retention-phase-a-staging')then raise exception 'JOB_ALREADY_EXISTS_REVIEW_REQUIRED';end if;
 if md5((select prosrc from pg_proc where oid='public.retention_phase_a_batch(text,uuid,boolean,integer)'::regprocedure))<>'88c94cfe3e98384129f97399a6ea2ebf' then raise exception 'EXECUTOR_DRIFT';end if;
 if current_setting('cron.timezone',true) not in ('GMT','UTC') then raise exception 'CRON_TIMEZONE_GATE';end if;
 if exists(select 1 from cron.job where jobname <> 'soma-retention-phase-a-staging' and active)then raise exception 'OTHER_CRON_ACTIVE';end if;
 if (select discovery_enabled from spot_private.soma_v2_control) or (select delivery_enabled from spot_private.notification_control) or (select execute_enabled or scheduler_enabled from spot_private.photo_cutover_control)then raise exception 'FEATURE_GATE';end if;
 if (select count(*)from vault.secrets where name='soma-modern-server-staging')<>1 then raise exception 'CREDENTIAL_PRESENCE_GATE';end if;
end$$;
select cron.schedule('soma-retention-phase-a-staging','0 3 * * *',$command$select net.http_post(
 url := 'https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/operations',
 headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name='soma-modern-server-staging')),
 body := jsonb_build_object('action','phase_a_run','operation_id',('a1a154ff-0000-4000-8000-'||to_char(clock_timestamp()at time zone 'UTC','YYYYMMDD')||'0001')::uuid,'dry_run',false,'batch_limit',100,'max_batches',4),
 timeout_milliseconds := 60000)
where exists(select 1 from spot_private.retention_phase_a_control where manual_enabled and scheduler_enabled)$command$);
update spot_private.retention_phase_a_control set manual_enabled=true,scheduler_enabled=true where singleton;
commit;
select jsonb_build_object('control',(select to_jsonb(c)from spot_private.retention_phase_a_control c),'jobs',(select jsonb_agg(jsonb_build_object('jobid',jobid,'name',jobname,'schedule',schedule,'active',active))from cron.job));
