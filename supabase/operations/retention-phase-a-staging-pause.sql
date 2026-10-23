-- STAGING ONLY. Stop admission of new Phase A batches; in-flight batch stays atomic.
begin;
update spot_private.retention_phase_a_control set manual_enabled=false,scheduler_enabled=false where singleton;
select cron.alter_job(jobid,active:=false)from cron.job where jobname='soma-retention-phase-a-staging';
commit;
select public.retention_phase_a_status();
