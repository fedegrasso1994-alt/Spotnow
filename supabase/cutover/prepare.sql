begin;
set local lock_timeout='5s';
select pg_advisory_xact_lock(190219);
-- Atomic baseline capture: no admission/delete/publication can race trigger installation.
lock table auth.users,public.profiles,spot_private.account_deletions,spot_private.photo_upload_jobs in access exclusive mode;
-- Install on 016 BEFORE 017. Additive, safe default PAUSED. Existing 017/018 staging is supported, never downgraded.
create table spot_private.photo_cutover_control(singleton boolean primary key default true check(singleton),phase text not null check(phase in('LEGACY_OPEN','DRAINING','SCHEMA_LOCKED','CANARY','OPEN','PAUSED')),epoch bigint not null default 1,canary_users uuid[] not null default '{}',execute_enabled boolean not null default false,scheduler_enabled boolean not null default false,cleanup_all boolean not null default false,smoke_epoch bigint,release_sha text,changed_at timestamptz not null default clock_timestamp());
insert into spot_private.photo_cutover_control(singleton,phase) values(true,'PAUSED');
create table spot_private.photo_cutover_attempts(path text primary key,user_id uuid not null,lease uuid,protocol text not null,writer text not null check(writer in('unknown','settled')),manifest jsonb,evidence text,created_at timestamptz not null default clock_timestamp(),completed_at timestamptz);
create table spot_private.photo_cutover_deletions(user_id uuid primary key,completed boolean not null default false,created_at timestamptz not null default clock_timestamp());
create table spot_private.photo_cutover_audit(id uuid primary key default gen_random_uuid(),action text not null,owner_id uuid,path text,previous_path text,operator_id text,evidence_ref text,epoch bigint not null,created_at timestamptz not null default clock_timestamp());
alter table spot_private.photo_cutover_control enable row level security;alter table spot_private.photo_cutover_attempts enable row level security;alter table spot_private.photo_cutover_deletions enable row level security;alter table spot_private.photo_cutover_audit enable row level security;
revoke all on spot_private.photo_cutover_control,spot_private.photo_cutover_attempts,spot_private.photo_cutover_deletions,spot_private.photo_cutover_audit from public,anon,authenticated;
create index photo_cutover_attempt_owner on spot_private.photo_cutover_attempts(user_id,writer);
create function spot_private.photo_cutover_lock(exclusive boolean default false) returns void language plpgsql set search_path='' as $$begin if exclusive then perform pg_advisory_xact_lock(190219);else perform pg_advisory_xact_lock_shared(190219);end if;end$$;
create function spot_private.photo_cutover_admit(owner_id uuid,protocol text) returns void language plpgsql security definer set search_path='' as $$declare c spot_private.photo_cutover_control;begin
 perform spot_private.photo_cutover_lock();select * into c from spot_private.photo_cutover_control where singleton;
 if not found then raise exception 'PHOTO_PAUSED';end if;
 if c.phase='LEGACY_OPEN' and to_regclass('spot_private.photo_lifecycle_sets') is null and protocol in('LEGACY','BRIDGE01') then return;end if;
 if protocol='PHOTO02' and (c.phase='OPEN' or c.phase='CANARY' and owner_id=any(c.canary_users)) then return;end if;
 raise exception 'PHOTO_PAUSED';
end$$;
-- Immutable attempts survive nonce replacement and Auth cascade.
insert into spot_private.photo_cutover_attempts(path,user_id,lease,protocol,writer,evidence,completed_at)
 select j.photo_path,j.user_id,j.lease_token,case when to_regclass('spot_private.photo_lifecycle_sets') is null then 'LEGACY' else 'EXISTING' end,
 case when j.status='ready' and exists(select 1 from spot_private.validated_photos v where v.photo_path=j.photo_path) and (select count(*) from storage.objects where bucket_id='profile-photos' and name in(j.photo_path,j.photo_path||'.detail.jpg',j.photo_path||'.thumb.jpg'))=3 then 'settled' else 'unknown' end,
 case when j.status='ready' then 'READY_CONFIRMED' else 'UNCLASSIFIED_PREPARE' end,case when j.status='ready' then clock_timestamp() end from spot_private.photo_upload_jobs j;
insert into spot_private.photo_cutover_deletions(user_id) select user_id from spot_private.account_deletions;
create function spot_private.photo_cutover_job_guard() returns trigger language plpgsql security definer set search_path='' as $$declare protocol text:=coalesce(nullif(current_setting('soma.photo_protocol',true),''),'LEGACY');c spot_private.photo_cutover_control;settled boolean;begin
 perform spot_private.photo_cutover_lock();select * into c from spot_private.photo_cutover_control where singleton;
 if tg_op='INSERT' or new.photo_path<>old.photo_path or new.status='processing' and old.status<>'processing' then
  perform spot_private.photo_cutover_admit(new.user_id,protocol);
  insert into spot_private.photo_cutover_attempts(path,user_id,lease,protocol,writer) values(new.photo_path,new.user_id,new.lease_token,protocol,'unknown') on conflict(path) do nothing;
 elsif new.status='ready' and old.status<>'ready' then
  if (c.phase in('SCHEMA_LOCKED','CANARY','OPEN') or c.phase='PAUSED' and to_regclass('spot_private.photo_lifecycle_sets') is not null) and exists(select 1 from spot_private.photo_cutover_attempts a where a.path=new.photo_path and a.protocol in('LEGACY','BRIDGE01')) then raise exception 'PHOTO_PAUSED';end if;
  if not exists(select 1 from spot_private.validated_photos v where v.photo_path=new.photo_path) or (select count(*) from storage.objects where bucket_id='profile-photos' and name in(new.photo_path,new.photo_path||'.detail.jpg',new.photo_path||'.thumb.jpg'))<>3 then raise exception 'PHOTO_CUTOVER_EFFECTS';end if;
  update spot_private.photo_cutover_attempts set writer='settled',evidence='READY_CONFIRMED',completed_at=clock_timestamp() where path=new.photo_path and lease=new.lease_token;
 elsif new.status='failed' and to_regclass('spot_private.photo_lifecycle_sets') is not null then
  execute 'select writer=''settled'' from spot_private.photo_lifecycle_sets where photo_path=$1' into settled using new.photo_path;
  if settled then update spot_private.photo_cutover_attempts set writer='settled',evidence='PHOTO02_RECEIPT',completed_at=clock_timestamp() where path=new.photo_path and lease=new.lease_token;end if;
 end if;return new;
end$$;
create trigger aa_photo_cutover_job before insert or update on spot_private.photo_upload_jobs for each row execute function spot_private.photo_cutover_job_guard();
create function spot_private.photo_cutover_profile_guard() returns trigger language plpgsql security definer set search_path='' as $$declare c spot_private.photo_cutover_control;begin
 if tg_op='UPDATE' and new.photo_path=old.photo_path then return new;end if;
 perform spot_private.photo_cutover_lock();select * into c from spot_private.photo_cutover_control where singleton;
 if c.phase not in('LEGACY_OPEN','OPEN') and not(c.phase='CANARY' and new.id=any(c.canary_users)) then raise exception 'PHOTO_PAUSED';end if;
 insert into spot_private.photo_cutover_audit(action,owner_id,path,previous_path,epoch) values('PUBLISH',new.id,new.photo_path,case when tg_op='UPDATE' then old.photo_path end,c.epoch);return new;
end$$;
create trigger aa_photo_cutover_profile before insert or update of photo_path on public.profiles for each row execute function spot_private.photo_cutover_profile_guard();
create function spot_private.photo_cutover_delete_guard() returns trigger language plpgsql security definer set search_path='' as $$begin
 perform spot_private.photo_cutover_admit(new.user_id,coalesce(nullif(current_setting('soma.photo_protocol',true),''),'LEGACY'));
 insert into spot_private.photo_cutover_deletions(user_id)values(new.user_id)on conflict do nothing;return new;
end$$;
create trigger aa_photo_cutover_delete before insert on spot_private.account_deletions for each row execute function spot_private.photo_cutover_delete_guard();
create function spot_private.photo_cutover_auth_deleted() returns trigger language plpgsql security definer set search_path='' as $$begin
 perform spot_private.photo_cutover_lock();
 if not exists(select 1 from storage.objects where bucket_id='profile-photos' and split_part(name,'/',1)=old.id::text) and not exists(select 1 from spot_private.photo_cutover_attempts where user_id=old.id and writer='unknown') then update spot_private.photo_cutover_deletions set completed=true where user_id=old.id;end if;return old;
end$$;
create constraint trigger photo_cutover_auth_deleted after delete on auth.users deferrable initially deferred for each row execute function spot_private.photo_cutover_auth_deleted();
-- Early gate returns controlled PAUSED before legacy rate/busy checks.
do $early$ declare target regprocedure;def text;begin
 target:=coalesce(to_regprocedure('public.photo01_begin_photo_upload(uuid,uuid,text,text)'),to_regprocedure('public.begin_photo_upload(uuid,uuid,text,text)'));
 def:=pg_get_functiondef(target);
 if position('if not spot_private.photo_account_active(target_user)' in def)=0 then raise exception 'PHOTO_GATE_SOURCE_CHANGED';end if;
 execute replace(def,'if not spot_private.photo_account_active(target_user)','perform spot_private.photo_cutover_admit(target_user,coalesce(nullif(current_setting(''soma.photo_protocol'',true),''''),''LEGACY''));if not spot_private.photo_account_active(target_user)');
end $early$;
create function public.photo_cutover_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('phase',c.phase,'epoch',c.epoch,'execute_enabled',c.execute_enabled,'scheduler_enabled',c.scheduler_enabled,'smoke_approved',c.smoke_epoch=c.epoch,'release_sha',c.release_sha,'legacy_unknown',(select count(*) from spot_private.photo_cutover_attempts where protocol in('LEGACY','BRIDGE01') and writer='unknown'),'existing_unknown',(select count(*) from spot_private.photo_cutover_attempts where protocol='EXISTING' and writer='unknown'),'legacy_inflight',(select count(*) from spot_private.photo_upload_jobs j join spot_private.photo_cutover_attempts a on a.path=j.photo_path where a.protocol in('LEGACY','BRIDGE01') and j.status='processing'),'deletions_pending',(select count(*) from spot_private.photo_cutover_deletions where not completed),'attempts',(select coalesce(jsonb_agg(jsonb_build_object('protocol',protocol,'writer',writer,'age_seconds',extract(epoch from(clock_timestamp()-created_at))::bigint,'reason',evidence)),'[]') from spot_private.photo_cutover_attempts where writer='unknown')) from spot_private.photo_cutover_control c where singleton;
$$;
create function public.photo_cutover_assert_drained() returns void language plpgsql security definer set search_path='' as $$begin
 perform spot_private.photo_cutover_lock(true);
 if coalesce((select phase from spot_private.photo_cutover_control where singleton),'') not in('DRAINING','SCHEMA_LOCKED') or exists(select 1 from spot_private.photo_cutover_attempts where protocol in('LEGACY','BRIDGE01') and writer='unknown') or exists(select 1 from spot_private.photo_upload_jobs j join spot_private.photo_cutover_attempts a on a.path=j.photo_path where a.protocol in('LEGACY','BRIDGE01') and j.status='processing') or exists(select 1 from spot_private.photo_upload_jobs j where not exists(select 1 from spot_private.photo_cutover_attempts a where a.path=j.photo_path and a.lease=j.lease_token)) or exists(select 1 from spot_private.photo_cutover_deletions where not completed) then raise exception 'PHOTO_DRAIN_BLOCKED';end if;
 if exists(select 1 from spot_private.validated_photos v cross join lateral unnest(array[v.photo_path,v.photo_path||'.detail.jpg',v.photo_path||'.thumb.jpg'])p(path) where not exists(select 1 from storage.objects where bucket_id='profile-photos' and name=p.path)) then raise exception 'PHOTO_CUTOVER_EFFECTS';end if;
 if exists(select 1 from storage.objects o where bucket_id='profile-photos' and not exists(select 1 from spot_private.validated_photos v where o.name in(v.photo_path,v.photo_path||'.detail.jpg',v.photo_path||'.thumb.jpg')) and not exists(select 1 from spot_private.photo_cutover_attempts a where o.name in(a.path,a.path||'.detail.jpg',a.path||'.thumb.jpg'))) then raise exception 'PHOTO_CUTOVER_ORPHAN';end if;
 update spot_private.photo_cutover_control set phase='SCHEMA_LOCKED',execute_enabled=false,scheduler_enabled=false where singleton;
end$$;
create function public.photo_cutover_bridge_begin(target_user uuid,request_id uuid,input_sha text,legacy_path text default null) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform spot_private.photo_cutover_admit(target_user,'BRIDGE01');perform set_config('soma.photo_protocol','BRIDGE01',true);return public.begin_photo_upload(target_user,request_id,input_sha,legacy_path);
end$$;
create function public.photo_cutover_bridge_intent(target_user uuid,path text,lease uuid,write_manifest jsonb) returns void language plpgsql security definer set search_path='' as $$begin
 perform spot_private.photo_cutover_lock();
 if not exists(select 1 from spot_private.photo_cutover_attempts where photo_cutover_attempts.path=photo_cutover_bridge_intent.path and user_id=target_user and photo_cutover_attempts.lease=photo_cutover_bridge_intent.lease and protocol='BRIDGE01' and manifest is null) or not public.photo_upload_lease_active(target_user,(select request_id from spot_private.photo_upload_jobs where photo_path=path),lease) then raise exception 'PHOTO_LEASE';end if;
 if write_manifest is null or jsonb_typeof(write_manifest)<>'array' or jsonb_array_length(write_manifest)<>3 or (select count(distinct m->>'path') from jsonb_array_elements(write_manifest)m)<>3 or exists(select 1 from jsonb_array_elements(write_manifest)m where m->>'path' not in(path,path||'.detail.jpg',path||'.thumb.jpg') or coalesce((m->>'bytes')::bigint,-1) not between 1 and 4194304 or coalesce(m->>'sha','') !~ '^[0-9a-f]{64}$') then raise exception 'PHOTO_MANIFEST';end if;
 update spot_private.photo_cutover_attempts set manifest=write_manifest where photo_cutover_attempts.path=photo_cutover_bridge_intent.path;
end$$;
create function public.photo_cutover_bridge_receipt(target_user uuid,path text,lease uuid,terminal boolean) returns void language plpgsql security definer set search_path='' as $$begin
 perform spot_private.photo_cutover_lock();update spot_private.photo_cutover_attempts set writer=case when terminal then 'settled' else 'unknown' end,evidence=case when terminal then 'BRIDGE_TERMINAL_RECEIPTS' else 'UNCERTAIN_STORAGE' end,completed_at=case when terminal then clock_timestamp() end where photo_cutover_attempts.path=photo_cutover_bridge_receipt.path and user_id=target_user and photo_cutover_attempts.lease=photo_cutover_bridge_receipt.lease and protocol='BRIDGE01';
end$$;
create function public.photo_cutover_resolve(path text,lease uuid,operator_id text,evidence_code text,evidence_ref text) returns void language plpgsql security definer set search_path='' as $$begin
 perform spot_private.photo_cutover_lock(true);
 if coalesce(evidence_code,'') not in('TERMINAL_RECEIPTS_VERIFIED','ALL_IMMUTABLE_EFFECTS_VERIFIED') or coalesce(length(operator_id),0) not between 1 and 80 or coalesce(length(evidence_ref),0) not between 1 and 160 or evidence_ref ~* '^(age|timeout|absence|expired|ttl|elapsed)(:|$)' then raise exception 'PHOTO_EVIDENCE';end if;
 if not exists(select 1 from spot_private.photo_cutover_attempts a where a.path=photo_cutover_resolve.path and a.lease=photo_cutover_resolve.lease and a.protocol in('LEGACY','BRIDGE01')) then raise exception 'PHOTO_TARGET';end if;
 if exists(select 1 from spot_private.photo_upload_jobs j where j.photo_path=path and status='processing' and lease_until>clock_timestamp()) then raise exception 'PHOTO_ACTIVE_WRITER';end if;
 update spot_private.photo_cutover_attempts a set writer='settled',evidence=evidence_code,completed_at=clock_timestamp() where a.path=photo_cutover_resolve.path and a.writer='unknown';if found then update spot_private.photo_upload_jobs j set status='failed' where j.photo_path=photo_cutover_resolve.path and j.lease_token=photo_cutover_resolve.lease and j.status='processing';insert into spot_private.photo_cutover_audit(action,path,operator_id,evidence_ref,epoch) select 'RESOLVE',path,operator_id,evidence_ref,epoch from spot_private.photo_cutover_control where singleton;end if;
end$$;
create function spot_private.photo_cutover_stop_cron() returns void language plpgsql security definer set search_path='' as $$declare j bigint;begin
 if to_regclass('cron.job') is not null then for j in execute 'select jobid from cron.job where jobname in(''soma-photo02-production'',''soma-photo02-cutover-staging'',''soma-photo02-staging'')' loop execute 'select cron.alter_job($1,active:=false)' using j;end loop;end if;
end$$;
create function public.photo_cutover_set(action text,operator_id text,evidence_ref text,release_sha text default null,canary_users uuid[] default '{}') returns jsonb language plpgsql security definer set search_path='' as $$declare c spot_private.photo_cutover_control;u uuid;begin
 perform spot_private.photo_cutover_lock(true);select * into c from spot_private.photo_cutover_control where singleton for update;
 if coalesce(length(operator_id),0) not between 1 and 80 or coalesce(length(evidence_ref),0) not between 1 and 160 then raise exception 'PHOTO_EVIDENCE';end if;
 if action='legacy_open' then if to_regclass('spot_private.photo_lifecycle_sets') is not null then raise exception 'PHOTO_NO_LEGACY';end if;update spot_private.photo_cutover_control set phase='LEGACY_OPEN',execute_enabled=false,scheduler_enabled=false,smoke_epoch=null where singleton;
 elsif action in('close','pause') then update spot_private.photo_cutover_control set phase=case when action='close' and to_regclass('spot_private.photo_lifecycle_sets') is null then 'DRAINING' else 'PAUSED' end,epoch=epoch+1,smoke_epoch=null,execute_enabled=false,scheduler_enabled=false where singleton;perform spot_private.photo_cutover_stop_cron();
 elsif action='canary' then
  if to_regprocedure('public.photo_cutover_runtime_ready()') is null or to_regclass('spot_private.photo_review_audit') is null or coalesce(release_sha,'')!~'^[0-9a-f]{40}$' or cardinality(canary_users) not between 1 and 8 then raise exception 'PHOTO_CANARY';end if;
  foreach u in array canary_users loop if not exists(select 1 from auth.users a where a.id=u and to_jsonb(a)->'raw_user_meta_data'->>'photo02_fixture'='true') then raise exception 'PHOTO_CANARY_OWNER';end if;end loop;
  update spot_private.photo_cutover_control set phase='CANARY',cleanup_all=false,canary_users=photo_cutover_set.canary_users,release_sha=photo_cutover_set.release_sha,smoke_epoch=null,execute_enabled=false,scheduler_enabled=false where singleton;
 elsif action='approve_smoke' then
  if c.phase<>'CANARY' or c.release_sha is distinct from release_sha or not exists(select 1 from spot_private.photo_cutover_attempts where protocol='PHOTO02' and writer='settled' and user_id=any(c.canary_users)) or not exists(select 1 from spot_private.photo_cutover_audit a where a.action='PUBLISH' and owner_id=any(c.canary_users) and previous_path is not null and previous_path<>path and epoch=c.epoch) or not exists(select 1 from spot_private.photo_cutover_deletions d join spot_private.photo_cleanup_accounts q using(user_id) where d.completed and q.state='completed' and d.user_id=any(c.canary_users)) then raise exception 'PHOTO_SMOKE_REQUIRED';end if;
  update spot_private.photo_cutover_control set smoke_epoch=epoch where singleton;
 elsif action='open' then if c.phase<>'CANARY' or c.smoke_epoch is distinct from c.epoch then raise exception 'PHOTO_SMOKE_REQUIRED';end if;update spot_private.photo_cutover_control set phase='OPEN' where singleton;
 elsif action='execute_on' then if c.phase not in('CANARY','OPEN') or c.phase='OPEN' and c.smoke_epoch is distinct from c.epoch then raise exception 'PHOTO_SMOKE_REQUIRED';end if;update spot_private.photo_cutover_control set execute_enabled=true where singleton;
 elsif action='execute_all' then if c.phase<>'OPEN' or c.smoke_epoch is distinct from c.epoch then raise exception 'PHOTO_SMOKE_REQUIRED';end if;update spot_private.photo_cutover_control set cleanup_all=true,canary_users='{}' where singleton;
 elsif action='execute_off' then update spot_private.photo_cutover_control set execute_enabled=false,scheduler_enabled=false where singleton;perform spot_private.photo_cutover_stop_cron();
 else raise exception 'PHOTO_ACTION';end if;
 update spot_private.photo_cutover_control set changed_at=clock_timestamp() where singleton;
 insert into spot_private.photo_cutover_audit(action,operator_id,evidence_ref,epoch) select action,operator_id,evidence_ref,epoch from spot_private.photo_cutover_control where singleton;
 return public.photo_cutover_status();
end$$;
revoke all on function spot_private.photo_cutover_lock(boolean),spot_private.photo_cutover_admit(uuid,text),spot_private.photo_cutover_job_guard(),spot_private.photo_cutover_profile_guard(),spot_private.photo_cutover_delete_guard(),spot_private.photo_cutover_auth_deleted(),spot_private.photo_cutover_stop_cron() from public,anon,authenticated,service_role;
revoke all on function public.photo_cutover_status(),public.photo_cutover_assert_drained(),public.photo_cutover_bridge_begin(uuid,uuid,text,text),public.photo_cutover_bridge_intent(uuid,text,uuid,jsonb),public.photo_cutover_bridge_receipt(uuid,text,uuid,boolean),public.photo_cutover_resolve(text,uuid,text,text,text),public.photo_cutover_set(text,text,text,text,uuid[]) from public,anon,authenticated;
grant execute on function public.photo_cutover_status(),public.photo_cutover_assert_drained(),public.photo_cutover_bridge_begin(uuid,uuid,text,text),public.photo_cutover_bridge_intent(uuid,text,uuid,jsonb),public.photo_cutover_bridge_receipt(uuid,text,uuid,boolean),public.photo_cutover_resolve(text,uuid,text,text,text),public.photo_cutover_set(text,text,text,text,uuid[]) to service_role;
notify pgrst,'reload schema';commit;
