begin;
-- Portable production/staging setup. No hardcoded secret, no implicit activation.
create extension if not exists pg_cron;create extension if not exists pg_net;
create function public.photo_cutover_scheduler_configure(project_ref text,enabled boolean default false) returns bigint language plpgsql security definer set search_path='' as $$
declare claims jsonb:=current_setting('request.jwt.claims',true)::jsonb;key text;secret_id uuid;job bigint;schedule_name text;secret_name text;command text;c spot_private.photo_cutover_control;
begin
 perform spot_private.photo_cutover_lock(true);select * into c from spot_private.photo_cutover_control where singleton for update;
 if claims->>'role' is distinct from 'service_role' or claims->>'ref' is distinct from project_ref or project_ref not in('qlucwdjcjomwyziegxrn','zjinjtkekmaqtxsuyvho') then raise exception 'PHOTO_SCHEDULER_AUTH';end if;
 if enabled and (c.phase<>'OPEN' or c.smoke_epoch is distinct from c.epoch or not c.execute_enabled) then raise exception 'PHOTO_SMOKE_REQUIRED';end if;
 key:=regexp_replace(current_setting('request.headers',true)::jsonb->>'authorization','^Bearer ','','i');if key is null then raise exception 'PHOTO_SCHEDULER_AUTH';end if;
 schedule_name:=case when project_ref='qlucwdjcjomwyziegxrn' then 'soma-photo02-production' else 'soma-photo02-cutover-staging' end;secret_name:=schedule_name||'-key';
 select id into secret_id from vault.secrets where name=secret_name;
 if secret_id is null then perform vault.create_secret(key,secret_name,'Existing verified server credential');else perform vault.update_secret(secret_id,key);end if;
 command:=format('select net.http_post(url:=%L,headers:=jsonb_build_object(''Content-Type'',''application/json'',''Authorization'',''Bearer ''||(select decrypted_secret from vault.decrypted_secrets where name=%L)),body:='' {"dry_run":false}''::jsonb,timeout_milliseconds:=60000);','https://'||project_ref||'.supabase.co/functions/v1/photo-lifecycle',secret_name);
 select jobid into job from cron.job where cron.job.jobname=schedule_name;
 if job is null then select cron.schedule(schedule_name,'* * * * *',command)into job;else perform cron.alter_job(job,command:=command);end if;
 perform cron.alter_job(job,active:=enabled);update spot_private.photo_cutover_control set scheduler_enabled=enabled where singleton;return job;
end$$;
revoke all on function public.photo_cutover_scheduler_configure(text,boolean) from public,anon,authenticated;grant execute on function public.photo_cutover_scheduler_configure(text,boolean) to service_role;
notify pgrst,'reload schema';commit;
