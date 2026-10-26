-- Owner-approved credential transport only. Run after 056 + modern Edge smoke PASS.
begin;
do $$begin
 if not exists(select 1 from spot_private.server_transport_binding where project_ref='zjinjtkekmaqtxsuyvho')then raise exception 'STAGING_BINDING_REQUIRED';end if;
 if not exists(select 1 from vault.secrets where name='soma-modern-server-staging')then raise exception 'SERVER_TRANSPORT_CONFIG_REQUIRED';end if;
 if not exists(select 1 from cron.job where jobname='soma-retention-phase-a-staging'and active and schedule='0 3 * * *')then raise exception 'RETENTION_BASELINE_DRIFT';end if;
 if exists(select 1 from cron.job where active and jobname<>'soma-retention-phase-a-staging')then raise exception 'OTHER_ACTIVE_JOB';end if;
end$$;
select cron.alter_job(jobid,active:=false)from cron.job where jobname='soma-retention-phase-a-staging';
select cron.alter_job(jobid,command:=$command$select net.http_post(
 url := 'https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/operations',
 headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name='soma-modern-server-staging')),
 body := jsonb_build_object('action','phase_a_run','operation_id',('a1a154ff-0000-4000-8000-'||to_char(clock_timestamp()at time zone 'UTC','YYYYMMDD')||'0001')::uuid,'dry_run',false,'batch_limit',100,'max_batches',4),
 timeout_milliseconds := 60000)
where exists(select 1 from spot_private.retention_phase_a_control where manual_enabled and scheduler_enabled)$command$,active:=true)from cron.job where jobname='soma-retention-phase-a-staging';
commit;
select jobname,schedule,active from cron.job order by jobid;
