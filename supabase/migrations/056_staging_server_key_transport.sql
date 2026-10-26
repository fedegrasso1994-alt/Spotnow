-- STAGING ONLY: owner-installed binding; no credential values or product-data changes.
begin;
create table spot_private.server_transport_binding (
 singleton boolean primary key default true check(singleton),
 project_ref text not null check(project_ref='zjinjtkekmaqtxsuyvho'),
 secret_name text not null check(secret_name='soma-modern-server-staging')
);
insert into spot_private.server_transport_binding values(true,'zjinjtkekmaqtxsuyvho','soma-modern-server-staging');
alter table spot_private.server_transport_binding enable row level security;
revoke all on spot_private.server_transport_binding from public,anon,authenticated,service_role;
create function spot_private.require_staging_server_transport(target_ref text)returns void
language plpgsql security definer set search_path='' as $$
begin
 if current_setting('role',true) is distinct from 'service_role'
 or coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role'
 then raise exception 'SERVER_TRANSPORT_AUTH';end if;
 if target_ref is distinct from 'zjinjtkekmaqtxsuyvho'
 or not exists(select 1 from spot_private.server_transport_binding where singleton and project_ref=target_ref)
 then raise exception 'STAGING_BINDING_REQUIRED';end if;
end$$;
create function spot_private.require_staging_server_secret()returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from vault.secrets where name='soma-modern-server-staging')then raise exception 'SERVER_TRANSPORT_CONFIG_REQUIRED';end if;
end$$;
revoke all on function spot_private.require_staging_server_transport(text),spot_private.require_staging_server_secret()from public,anon,authenticated,service_role;
create or replace function public.photo_cutover_scheduler_configure(project_ref text,enabled boolean default false) returns bigint language plpgsql security definer set search_path='' as $$
declare claims jsonb:=current_setting('request.jwt.claims',true)::jsonb;key text;secret_id uuid;job bigint;schedule_name text;secret_name text;command text;c spot_private.photo_cutover_control;
begin
 perform spot_private.photo_cutover_lock(true);select * into c from spot_private.photo_cutover_control where singleton for update;
 perform spot_private.require_staging_server_transport(project_ref);
 if enabled and (c.phase<>'OPEN' or c.smoke_epoch is distinct from c.epoch or not c.execute_enabled) then raise exception 'PHOTO_SMOKE_REQUIRED';end if;
 schedule_name:='soma-photo02-cutover-staging';secret_name:='soma-modern-server-staging';
 perform spot_private.require_staging_server_secret();
 command:=format('select net.http_post(url:=%L,headers:=jsonb_build_object(''Content-Type'',''application/json'',''apikey'',(select decrypted_secret from vault.decrypted_secrets where name=%L)),body:='' {"dry_run":false}''::jsonb,timeout_milliseconds:=60000);','https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/photo-lifecycle',secret_name);
 select jobid into job from cron.job where cron.job.jobname=schedule_name;
 if job is null then select cron.schedule(schedule_name,'* * * * *',command)into job;else perform cron.alter_job(job,command:=command);end if;
 perform cron.alter_job(job,active:=enabled);update spot_private.photo_cutover_control set scheduler_enabled=enabled,execute_enabled=case when enabled then execute_enabled else false end where singleton;return job;
end$$;
revoke all on function public.photo_cutover_scheduler_configure(text,boolean) from public,anon,authenticated;grant execute on function public.photo_cutover_scheduler_configure(text,boolean) to service_role;
create or replace function public.photo02_staging_scheduler(enable boolean default false)returns bigint
language plpgsql security definer set search_path='' as $$
declare job bigint;
begin
 perform spot_private.require_staging_server_transport('zjinjtkekmaqtxsuyvho');
 perform spot_private.require_staging_server_secret();
 select jobid into job from cron.job where jobname='soma-photo02-staging';
 if job is null then select cron.schedule('soma-photo02-staging','* * * * *',$command$select net.http_post(url:='https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/photo-lifecycle',headers:=jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name='soma-modern-server-staging')),body:='{"dry_run":false}'::jsonb,timeout_milliseconds:=60000);$command$)into job;
 else perform cron.alter_job(job,command:=$command$select net.http_post(url:='https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/photo-lifecycle',headers:=jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name='soma-modern-server-staging')),body:='{"dry_run":false}'::jsonb,timeout_milliseconds:=60000);$command$);end if;
 perform cron.alter_job(job,active:=enable);return job;
end$$;
revoke all on function public.photo02_staging_scheduler(boolean)from public,anon,authenticated;
grant execute on function public.photo02_staging_scheduler(boolean)to service_role;
notify pgrst,'reload schema';
commit;
