-- STAGING ONLY. Project guard is enforced by setup RPC; no literal key in this file.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create function public.photo02_staging_scheduler(enable boolean default false) returns bigint language plpgsql security definer set search_path='' as $$
declare key text; job bigint; secret_id uuid;
begin
 key:=regexp_replace(current_setting('request.headers',true)::jsonb->>'authorization','^Bearer ','','i');
 if key is null or current_setting('request.jwt.claims',true)::jsonb->>'role'<>'service_role' then raise exception 'NOT_AUTHORIZED';end if;
 -- Verify project identity from caller JWT; this helper cannot configure production.
 if convert_from(decode(translate(split_part(key,'.',2),'-_','+/')||repeat('=',(4-length(split_part(key,'.',2))%4)%4),'base64'),'UTF8')::jsonb->>'ref'<>'zjinjtkekmaqtxsuyvho' then raise exception 'STAGING_ONLY';end if;
 select id into secret_id from vault.secrets where name='photo02_staging_scheduler_key';
 if secret_id is null then perform vault.create_secret(key,'photo02_staging_scheduler_key','Existing staging service credential; never emit value');else perform vault.update_secret(secret_id,key);end if;
 select jobid into job from cron.job where jobname='soma-photo02-staging';
 if job is null then select cron.schedule('soma-photo02-staging','* * * * *',$q$select net.http_post(url:='https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/photo-lifecycle',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='photo02_staging_scheduler_key')),body:='{"dry_run":false}'::jsonb,timeout_milliseconds:=60000);$q$) into job;end if;
 perform cron.alter_job(job,active:=enable);return job;
end $$;
revoke all on function public.photo02_staging_scheduler(boolean) from public,anon,authenticated;
grant execute on function public.photo02_staging_scheduler(boolean) to service_role;
