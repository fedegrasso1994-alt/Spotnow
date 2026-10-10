begin;
-- prepare.sql is a REQUIRED separate pre-017 step. Do not install a legacy bridge after schema switch.
do $$begin if to_regclass('spot_private.photo_cutover_control') is null then raise exception 'PHOTO_CUTOVER_PREPARE_REQUIRED';end if;end$$;
create function public.photo_cutover_runtime_ready() returns boolean language sql immutable security definer set search_path='' as $$select true$$;
create or replace function public.photo02_begin_photo_upload(target_user uuid,request_id uuid,input_sha text,legacy_path text default null) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 perform spot_private.photo_cutover_admit(target_user,'PHOTO02');perform set_config('soma.photo_protocol','PHOTO02',true);
 result:=public.begin_photo_upload(target_user,request_id,input_sha,legacy_path);
 if not coalesce((result->>'ready')::boolean,false) then update spot_private.photo_lifecycle_sets set evidence='INTENT_PROTOCOL_V1' where photo_path=result->>'photo_path' and user_id=target_user;end if;return result;
end$$;
create function public.photo02_begin_account_deletion(target_user uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform spot_private.photo_cutover_admit(target_user,'PHOTO02');perform set_config('soma.photo_protocol','PHOTO02',true);perform public.begin_account_deletion(target_user);
end$$;
create function spot_private.photo_cutover_cleanup_allowed(owner_id uuid,account_cleanup boolean default false) returns boolean language plpgsql security definer set search_path='' as $$declare c spot_private.photo_cutover_control;begin
 perform spot_private.photo_cutover_lock();select * into c from spot_private.photo_cutover_control where singleton;
 return (c.phase='OPEN' and c.smoke_epoch=c.epoch and (account_cleanup or c.cleanup_all or owner_id=any(c.canary_users)) or c.phase='CANARY' and owner_id=any(c.canary_users)) and (account_cleanup or c.execute_enabled);
end$$;
-- Insert gate BEFORE owner locks; existing publication/purge locks and proofs remain unchanged.
do $gate$ declare def text;begin
 def:=pg_get_functiondef('public.begin_photo_upload(uuid,uuid,text,text)'::regprocedure);
 execute replace(def,'perform spot_private.photo_owner_lock(target_user);','perform spot_private.photo_cutover_admit(target_user,coalesce(nullif(current_setting(''soma.photo_protocol'',true),''''),''LEGACY''));perform spot_private.photo_owner_lock(target_user);');
 def:=pg_get_functiondef('public.claim_photo_cleanup(text)'::regprocedure);
 if position('select * into s from spot_private.photo_lifecycle_sets where photo_path=path;' in def)=0 then raise exception 'PHOTO_GATE_SOURCE_CHANGED';end if;
 execute replace(def,'select * into s from spot_private.photo_lifecycle_sets where photo_path=path;','select * into s from spot_private.photo_lifecycle_sets where photo_path=path; if not spot_private.photo_cutover_cleanup_allowed(s.user_id) then return null;end if;');
 def:=pg_get_functiondef('public.claim_photo_account_cleanup(uuid)'::regprocedure);
 if position('perform spot_private.photo_owner_lock(target_user);' in def)=0 then raise exception 'PHOTO_GATE_SOURCE_CHANGED';end if;
 execute replace(def,'perform spot_private.photo_owner_lock(target_user);','if not spot_private.photo_cutover_cleanup_allowed(target_user,true) then return null;end if;perform spot_private.photo_owner_lock(target_user);');
end $gate$;
-- Scope BEFORE LIMIT: baseline candidates cannot starve or leak into a canary collector.
create or replace function public.photo_lifecycle_inventory() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('sets',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from (select s.* from spot_private.photo_lifecycle_sets s cross join spot_private.photo_cutover_control c where c.singleton and (c.cleanup_all or s.user_id=any(c.canary_users)) and s.state not in('current','purged','review') order by coalesce(s.last_attempt_at,s.created_at),s.photo_path limit 100) s),'accounts',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from (select a.* from spot_private.photo_cleanup_accounts a cross join spot_private.photo_cutover_control c where c.singleton and (c.cleanup_all or a.user_id=any(c.canary_users)) and a.state='pending' and (a.claim_until is null or a.claim_until<=clock_timestamp()) and not public.photo_deletion_barrier(a.user_id) order by a.created_at limit 20) a));
$$;
create or replace function public.photo_cleanup_candidates() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(s)),'[]') from (select s.photo_path from spot_private.photo_lifecycle_sets s cross join spot_private.photo_cutover_control c where c.singleton and (c.cleanup_all or s.user_id=any(c.canary_users)) and s.writer='settled' and s.state in('writing','ready','retired','failed','purging') and coalesce(s.not_before,'infinity')<=clock_timestamp() and (s.claim_until is null or s.claim_until<=clock_timestamp()) order by s.not_before,s.photo_path limit 20) s;
$$;
create function public.photo_cutover_execute_permit() returns boolean language sql stable security definer set search_path='' as $$select execute_enabled and (phase='CANARY' or phase='OPEN' and smoke_epoch=epoch) from spot_private.photo_cutover_control where singleton$$;
-- Current/unknown cutover metadata survives; concluded copies obey the existing 7-day policy.
alter function public.photo_metadata_purge() rename to photo02_metadata_purge_before_cutover;
revoke all on function public.photo02_metadata_purge_before_cutover() from public,anon,authenticated,service_role;
create function public.photo_metadata_purge() returns bigint language plpgsql security definer set search_path='' as $$declare n bigint;begin
 delete from spot_private.photo_cutover_audit a where a.created_at<clock_timestamp()-interval '7 days' and (
  a.path is not null and not exists(select 1 from public.profiles where photo_path=a.path) and not exists(select 1 from spot_private.photo_cutover_attempts where path=a.path and writer='unknown') and (exists(select 1 from spot_private.photo_lifecycle_sets s where s.photo_path=a.path and s.state='purged' and s.completed_at<clock_timestamp()-interval '7 days') or exists(select 1 from spot_private.photo_cutover_attempts t where t.path=a.path and t.writer='settled' and t.completed_at<clock_timestamp()-interval '7 days' and not exists(select 1 from auth.users u where u.id=t.user_id)))
  or a.path is null and a.owner_id is null and exists(select 1 from spot_private.photo_cutover_control where phase='OPEN' and smoke_epoch=epoch) and not exists(select 1 from spot_private.photo_cutover_attempts where writer='unknown') and not exists(select 1 from spot_private.photo_cutover_deletions where not completed));
 delete from spot_private.photo_cutover_deletions d where completed and created_at<clock_timestamp()-interval '7 days' and not exists(select 1 from auth.users where id=d.user_id);
 delete from spot_private.photo_cutover_attempts a where writer='settled' and completed_at<clock_timestamp()-interval '7 days' and (not exists(select 1 from auth.users where id=a.user_id) or exists(select 1 from spot_private.photo_lifecycle_sets s where s.photo_path=a.path and state='purged' and s.completed_at<clock_timestamp()-interval '7 days'));
 n:=public.photo02_metadata_purge_before_cutover();return n;
end$$;
revoke all on function spot_private.photo_cutover_cleanup_allowed(uuid,boolean) from public,anon,authenticated,service_role;
revoke all on function public.photo02_begin_photo_upload(uuid,uuid,text,text),public.photo02_begin_account_deletion(uuid),public.photo_cutover_execute_permit(),public.photo_cutover_runtime_ready(),public.photo_metadata_purge() from public,anon,authenticated;
grant execute on function public.photo02_begin_photo_upload(uuid,uuid,text,text),public.photo02_begin_account_deletion(uuid),public.photo_cutover_execute_permit(),public.photo_cutover_runtime_ready(),public.photo_metadata_purge() to service_role;
do $$begin if to_regprocedure('public.photo02_staging_scheduler(boolean)') is not null then execute 'revoke execute on function public.photo02_staging_scheduler(boolean) from public,anon,authenticated,service_role';end if;end$$;
notify pgrst,'reload schema';commit;
