begin;
-- Mandatory server fence; never migrate while unclassified PHOTO-01 effects remain.
select public.photo_cutover_assert_drained();
-- PHOTO-02: private durable lifecycle; survives Auth cascade until confirmed purge.
create table spot_private.photo_lifecycle_sets (
 photo_path text primary key,user_id uuid not null,request_id uuid,lease_token uuid,
 state text not null check(state in('writing','ready','current','retired','failed','purging','purged','review')),
 writer text not null default 'unknown' check(writer in('settled','unknown')),
 reserved_bytes bigint not null default 9437184 check(reserved_bytes>=0),
 created_at timestamptz not null default clock_timestamp(),not_before timestamptz,
 completed_at timestamptz,claim_token uuid,claim_until timestamptz,
 retries integer not null default 0,error_code text,evidence text,manifest jsonb,
 check(photo_path like user_id::text||'/%')
);
create table spot_private.photo_cleanup_accounts(user_id uuid primary key,state text not null default 'pending' check(state in('pending','review','completed')),created_at timestamptz not null default clock_timestamp(),completed_at timestamptz,error_code text);
alter table spot_private.photo_lifecycle_sets enable row level security;
alter table spot_private.photo_cleanup_accounts enable row level security;
revoke all on spot_private.photo_lifecycle_sets,spot_private.photo_cleanup_accounts from public,anon,authenticated;
create index photo_lifecycle_due on spot_private.photo_lifecycle_sets(state,not_before);
create index photo_lifecycle_owner on spot_private.photo_lifecycle_sets(user_id,state);
insert into spot_private.photo_lifecycle_sets(photo_path,user_id,state,writer,reserved_bytes,not_before)
 select v.photo_path,v.user_id,case when exists(select 1 from public.profiles p where p.photo_path=v.photo_path) then 'current' else 'ready' end,'settled',9437184,clock_timestamp()+interval '24 hours' from spot_private.validated_photos v;
insert into spot_private.photo_lifecycle_sets(photo_path,user_id,request_id,lease_token,state,writer,not_before,error_code)
 select j.photo_path,j.user_id,j.request_id,j.lease_token,case when j.status='ready' then 'ready' else 'failed' end,case when j.status='ready' or exists(select 1 from spot_private.photo_cutover_attempts a where a.path=j.photo_path and a.lease=j.lease_token and a.writer='settled') then 'settled' else 'unknown' end,clock_timestamp()+interval '24 hours','PRE017' from spot_private.photo_upload_jobs j on conflict(photo_path) do update set request_id=excluded.request_id,lease_token=excluded.lease_token;
create function spot_private.photo_owner_lock(owner_id uuid) returns void language sql volatile set search_path='' as $$select pg_advisory_xact_lock(hashtextextended(owner_id::text,17));$$;
alter function public.begin_photo_upload(uuid,uuid,text,text) rename to photo01_begin_photo_upload;
alter function public.finish_photo_upload(uuid,uuid,uuid,text,text,integer,text,integer,integer) rename to photo01_finish_photo_upload;
-- Rebind PL/pgSQL implicit function-label references after rename.
do $m$ begin
 execute replace(pg_get_functiondef('public.photo01_begin_photo_upload(uuid,uuid,text,text)'::regprocedure),'begin_photo_upload.','photo01_begin_photo_upload.');
 execute replace(pg_get_functiondef('public.photo01_finish_photo_upload(uuid,uuid,uuid,text,text,integer,text,integer,integer)'::regprocedure),'finish_photo_upload.','photo01_finish_photo_upload.');
end $m$;
revoke all on function public.photo01_begin_photo_upload(uuid,uuid,text,text),public.photo01_finish_photo_upload(uuid,uuid,uuid,text,text,integer,text,integer,integer) from public,anon,authenticated,service_role;
create function public.begin_photo_upload(target_user uuid,request_id uuid,input_sha text,legacy_path text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;existing spot_private.photo_lifecycle_sets;
begin
 perform spot_private.photo_owner_lock(target_user);
 if exists(select 1 from spot_private.photo_cleanup_accounts where user_id=target_user and state<>'completed') then raise exception 'PHOTO_ACCOUNT';end if;
 select s.* into existing from spot_private.photo_lifecycle_sets s where s.user_id=target_user and s.request_id=begin_photo_upload.request_id order by s.created_at desc limit 1;
 if found and (existing.state in('purging','purged','retired','review') or existing.state='ready' and existing.not_before<=clock_timestamp()) then raise exception 'PHOTO_EXPIRED';end if;
 if exists(select 1 from spot_private.photo_upload_jobs j where j.user_id=target_user and j.request_id=begin_photo_upload.request_id and (j.input_sha is distinct from begin_photo_upload.input_sha or j.legacy_path is distinct from begin_photo_upload.legacy_path)) then raise exception 'PHOTO_CONFLICT';end if;
 if existing.photo_path is not null and existing.writer='unknown' then raise exception 'PHOTO_BUSY';end if;
 if existing.state in('ready','current') and (select count(distinct name) from storage.objects where bucket_id='profile-photos' and name in(existing.photo_path,existing.photo_path||'.detail.jpg',existing.photo_path||'.thumb.jpg'))<>3 then raise exception 'PHOTO_EXPIRED';end if;
 if existing.photo_path is null or existing.state not in('ready','current') then
  if (select coalesce(sum(reserved_bytes+32000),0) from spot_private.photo_lifecycle_sets where user_id=target_user and state<>'purged')+9469184+(select coalesce(sum(coalesce((to_jsonb(o)->'metadata'->>'size')::bigint,9437184)),0) from storage.objects o where o.bucket_id='profile-photos' and split_part(o.name,'/',1)=target_user::text and not exists(select 1 from spot_private.photo_lifecycle_sets s where o.name in(s.photo_path,s.photo_path||'.detail.jpg',s.photo_path||'.thumb.jpg'))) >134217728 then raise exception 'PHOTO_QUOTA';end if;
  if (select count(*) from spot_private.photo_lifecycle_sets where user_id=target_user and state='ready')>=2 then raise exception 'PHOTO_DRAFTS';end if;
 end if;
 result:=public.photo01_begin_photo_upload(target_user,request_id,input_sha,legacy_path);
 if coalesce((result->>'ready')::boolean,false) then return result;end if;
 if existing.photo_path is not null then update spot_private.photo_lifecycle_sets set state='failed',not_before=clock_timestamp() where photo_path=existing.photo_path and state='writing' and writer='settled';end if;
 insert into spot_private.photo_lifecycle_sets(photo_path,user_id,request_id,lease_token,state,not_before) values(result->>'photo_path',target_user,request_id,(result->>'lease_token')::uuid,'writing',clock_timestamp()+interval '24 hours');
 return result;
end $$;
create or replace function public.fail_photo_upload(target_user uuid,request_id uuid,lease_token uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform spot_private.photo_owner_lock(target_user);
 update spot_private.photo_upload_jobs j set status='failed' where j.user_id=target_user and j.request_id=fail_photo_upload.request_id and j.lease_token=fail_photo_upload.lease_token and j.status='processing';
 update spot_private.photo_lifecycle_sets s set state='failed',not_before=clock_timestamp() where s.user_id=target_user and s.request_id=fail_photo_upload.request_id and s.lease_token=fail_photo_upload.lease_token and s.state='writing';
end $$;
create function public.photo02_begin_photo_upload(target_user uuid,request_id uuid,input_sha text,legacy_path text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=public.begin_photo_upload(target_user,request_id,input_sha,legacy_path);
 if not coalesce((result->>'ready')::boolean,false) then update spot_private.photo_lifecycle_sets set evidence='INTENT_PROTOCOL_V1' where photo_path=result->>'photo_path' and user_id=target_user;end if;return result;
end $$;
revoke all on function public.photo02_begin_photo_upload(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.photo02_begin_photo_upload(uuid,uuid,text,text) to service_role;
create function public.photo_write_intent(target_user uuid,path text,lease uuid,write_manifest jsonb default null) returns void language plpgsql security definer set search_path='' as $$
begin
 perform spot_private.photo_owner_lock(target_user);
 if not spot_private.photo_account_active(target_user) or not exists(select 1 from spot_private.photo_lifecycle_sets where photo_path=path and user_id=target_user and lease_token=lease and state='writing' and manifest is null) or not exists(select 1 from spot_private.photo_upload_jobs j where j.user_id=target_user and j.photo_path=path and j.lease_token=lease and j.status='processing' and j.lease_until>clock_timestamp()) then raise exception 'PHOTO_LEASE';end if;
 if write_manifest is null or jsonb_array_length(write_manifest)<>3 then raise exception 'PHOTO_MANIFEST';end if;
 if exists(select 1 from jsonb_array_elements(write_manifest) m where m->>'path' not in(path,path||'.detail.jpg',path||'.thumb.jpg') or coalesce((m->>'bytes')::bigint,-1) not between 1 and 4194304 or coalesce(m->>'sha','') !~ '^[0-9a-f]{64}$') or (select count(distinct m->>'path') from jsonb_array_elements(write_manifest) m)<>3 then raise exception 'PHOTO_MANIFEST';end if;
 update spot_private.photo_lifecycle_sets set writer='unknown',manifest=write_manifest where photo_path=path;
end $$;
create function public.photo_write_receipt(target_user uuid,path text,lease uuid,terminal boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 perform spot_private.photo_owner_lock(target_user);
 update spot_private.photo_lifecycle_sets set writer=case when terminal then 'settled' else 'unknown' end where photo_path=path and user_id=target_user and lease_token=lease and state='writing';
end $$;
create function public.finish_photo_upload(target_user uuid,request_id uuid,lease_token uuid,preview_text text,canonical_sha text,canonical_bytes integer,source_format text,source_width integer,source_height integer) returns text language plpgsql security definer set search_path='' as $$
declare path text;
begin
 perform spot_private.photo_owner_lock(target_user);
 if not exists(select 1 from spot_private.photo_lifecycle_sets s where s.user_id=target_user and s.request_id=finish_photo_upload.request_id and s.lease_token=finish_photo_upload.lease_token and s.state='writing' and s.writer='settled') then raise exception 'PHOTO_LEASE';end if;
 path:=public.photo01_finish_photo_upload(target_user,request_id,lease_token,preview_text,canonical_sha,canonical_bytes,source_format,source_width,source_height);
 update spot_private.photo_lifecycle_sets set state='ready',not_before=clock_timestamp()+interval '24 hours',reserved_bytes=canonical_bytes::bigint*2+1048576 where photo_path=path;
 return path;
end $$;
create function spot_private.photo_lifecycle_publish() returns trigger language plpgsql security definer set search_path='' as $$
declare s spot_private.photo_lifecycle_sets;
begin
 perform spot_private.photo_owner_lock(new.id);
 if exists(select 1 from spot_private.photo_cleanup_accounts where user_id=new.id and state<>'completed') then raise exception 'PHOTO_ACCOUNT';end if;
 select * into s from spot_private.photo_lifecycle_sets where photo_path=new.photo_path;
 if found then
  if s.user_id<>new.id or s.state not in('ready','current') or s.writer<>'settled' or s.state='ready' and s.not_before<=clock_timestamp() then raise exception 'PHOTO_EXPIRED';end if;
 else
  if not spot_private.can_publish_photo(new.id,new.photo_path) then raise exception 'PHOTO_LEASE';end if;
  insert into spot_private.photo_lifecycle_sets(photo_path,user_id,state,writer,not_before) values(new.photo_path,new.id,'current','settled',null);
 end if;
 if tg_op='UPDATE' and old.photo_path<>new.photo_path then update spot_private.photo_lifecycle_sets set state='retired',not_before=clock_timestamp()+interval '5 minutes' where photo_path=old.photo_path and state='current';end if;
 update spot_private.photo_lifecycle_sets set state='current',not_before=null where photo_path=new.photo_path;
 return new;
end $$;
create trigger lifecycle_publication before insert or update of photo_path on public.profiles for each row execute function spot_private.photo_lifecycle_publish();
create or replace function public.begin_account_deletion(target_user uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform spot_private.photo_owner_lock(target_user);
 insert into spot_private.account_deletions(user_id) values(target_user) on conflict do nothing;
 insert into spot_private.photo_cleanup_accounts(user_id) values(target_user) on conflict do nothing;
end $$;
create or replace function public.photo_deletion_barrier(target_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from spot_private.photo_lifecycle_sets where user_id=target_user and writer='unknown') or exists(select 1 from spot_private.photo_upload_jobs where user_id=target_user and status in('processing','failed') and lease_until>clock_timestamp());
$$;
alter table spot_private.photo_cleanup_accounts add column claim_token uuid,add column claim_until timestamptz,add column retries integer not null default 0;
alter table spot_private.photo_lifecycle_sets add column last_attempt_at timestamptz;
create function public.photo_reconciliation_checked(path text) returns void language sql security definer set search_path='' as $$
 update spot_private.photo_lifecycle_sets set last_attempt_at=clock_timestamp() where photo_path=path and writer='unknown';
$$;
revoke all on function public.photo_reconciliation_checked(text) from public,anon,authenticated;
grant execute on function public.photo_reconciliation_checked(text) to service_role;
create function public.photo_lifecycle_inventory() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('sets',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from (select * from spot_private.photo_lifecycle_sets where state not in('current','purged') order by coalesce(last_attempt_at,created_at),photo_path limit 100) s),'accounts',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from (select * from spot_private.photo_cleanup_accounts where state='pending' and (claim_until is null or claim_until<=clock_timestamp()) and not public.photo_deletion_barrier(user_id) order by created_at limit 20) a));
$$;
create function public.claim_photo_cleanup(path text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s spot_private.photo_lifecycle_sets;token uuid:=gen_random_uuid();
begin
 select * into s from spot_private.photo_lifecycle_sets where photo_path=path; if not found then return null;end if;
 perform spot_private.photo_owner_lock(s.user_id);
 select * into s from spot_private.photo_lifecycle_sets where photo_path=path for update;
 if s.writer<>'settled' or s.state='purged' or exists(select 1 from public.profiles where photo_path=path) then return null;end if;
 if s.state='purging' and s.claim_until>clock_timestamp() then return null;end if;
 if s.state not in('ready','retired','failed','writing','purging') or s.state<>'purging' and s.not_before>clock_timestamp() then return null;end if;
 if exists(select 1 from spot_private.photo_upload_jobs where photo_path=path and status='processing' and lease_until>clock_timestamp()) then return null;end if;
 update spot_private.photo_lifecycle_sets set state='purging',claim_token=token,claim_until=clock_timestamp()+interval '2 minutes',retries=retries+1 where photo_path=path;
 return jsonb_build_object('photo_path',path,'user_id',s.user_id,'token',token);
end $$;
create function public.finish_photo_cleanup(path text,token uuid) returns void language plpgsql security definer set search_path='' as $$
declare s spot_private.photo_lifecycle_sets;
begin
 select * into s from spot_private.photo_lifecycle_sets where photo_path=path;perform spot_private.photo_owner_lock(s.user_id);
 if not exists(select 1 from spot_private.photo_lifecycle_sets where photo_path=path and state='purging' and writer='settled' and claim_token=token and claim_until>clock_timestamp()) or exists(select 1 from public.profiles where photo_path=path) then raise exception 'PHOTO_PURGE_LEASE';end if;
 if exists(select 1 from storage.objects where bucket_id='profile-photos' and name in(path,path||'.detail.jpg',path||'.thumb.jpg')) then raise exception 'PHOTO_REMAINS';end if;
 delete from spot_private.photo_assets where photo_path=path;
 delete from spot_private.validated_photos where photo_path=path;
 delete from spot_private.photo_legacy where photo_path=path;
 delete from spot_private.photo_upload_jobs where photo_path=path;
 update spot_private.photo_lifecycle_sets set state='purged',reserved_bytes=0,completed_at=clock_timestamp(),manifest=null,claim_token=null,claim_until=null,error_code=null where photo_path=path;
end $$;
create function public.reconcile_photo_writer(path text,lease uuid,evidence_code text) returns void language plpgsql security definer set search_path='' as $$
declare s spot_private.photo_lifecycle_sets;
begin
 if evidence_code not in('ALL_IMMUTABLE_OBJECTS_CONFIRMED','TERMINAL_STORAGE_RESPONSES_CONFIRMED','NO_WRITE_INTENT_FENCED') then raise exception 'PHOTO_EVIDENCE';end if;
 select * into s from spot_private.photo_lifecycle_sets where photo_path=path;perform spot_private.photo_owner_lock(s.user_id);
 if s.lease_token<>lease or s.writer<>'unknown' then raise exception 'PHOTO_RECONCILE';end if;
 if evidence_code<>'NO_WRITE_INTENT_FENCED' and exists(select 1 from spot_private.photo_upload_jobs j where j.photo_path=path and j.status='processing' and j.lease_until>clock_timestamp()) then raise exception 'PHOTO_ACTIVE_WRITER';end if;
 if evidence_code='NO_WRITE_INTENT_FENCED' and (s.manifest is not null or s.evidence is distinct from 'INTENT_PROTOCOL_V1' or exists(select 1 from spot_private.photo_upload_jobs j where j.photo_path=path and j.lease_until>clock_timestamp())) then raise exception 'PHOTO_EVIDENCE';end if;
 if evidence_code='ALL_IMMUTABLE_OBJECTS_CONFIRMED' and (select count(distinct name) from storage.objects where bucket_id='profile-photos' and name in(path,path||'.detail.jpg',path||'.thumb.jpg'))<>3 then raise exception 'PHOTO_EVIDENCE';end if;
 update spot_private.photo_lifecycle_sets set writer='settled',state='failed',not_before=clock_timestamp(),evidence=evidence_code where photo_path=path;
end $$;
create function public.photo_metadata_purge() returns bigint language plpgsql security definer set search_path='' as $$
declare n bigint;
begin
 delete from spot_private.photo_lifecycle_sets where state='purged' and completed_at<clock_timestamp()-interval '7 days';get diagnostics n=row_count;
 delete from spot_private.photo_cleanup_accounts where state='completed' and completed_at<clock_timestamp()-interval '7 days';
 update spot_private.photo_upload_accounts a set starts=array(select t from unnest(a.starts) t where t>clock_timestamp()-interval '1 hour') where exists(select 1 from unnest(a.starts) t where t<=clock_timestamp()-interval '1 hour');
 return n;
end $$;

create function public.photo_cleanup_candidates() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(s)),'[]') from (select photo_path from spot_private.photo_lifecycle_sets where writer='settled' and state in('writing','ready','retired','failed','purging') and coalesce(not_before,'infinity')<=clock_timestamp() and (claim_until is null or claim_until<=clock_timestamp()) order by not_before,photo_path limit 20) s;
$$;
create function public.photo_cleanup_failure(path text,token uuid,code text) returns void language sql security definer set search_path='' as $$
 update spot_private.photo_lifecycle_sets set state=case when retries>=10 then 'review' else 'purging' end,error_code=case when code in('STORAGE','MISSING','OWNERSHIP','LEASE') then code else 'STORAGE' end,claim_until=clock_timestamp()+interval '1 minute' where photo_path=path and state='purging' and claim_token=token;
$$;
create function public.claim_photo_account_cleanup(target_user uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare token uuid:=gen_random_uuid();
begin
 perform spot_private.photo_owner_lock(target_user);
 if public.photo_deletion_barrier(target_user) then return null;end if;
 update spot_private.photo_cleanup_accounts set claim_token=token,claim_until=clock_timestamp()+interval '2 minutes',retries=retries+1 where user_id=target_user and state='pending' and (claim_until is null or claim_until<=clock_timestamp());
 if not found then return null;end if;return token;
end $$;
create function public.finish_photo_account_cleanup(target_user uuid,token uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform spot_private.photo_owner_lock(target_user);
 if not exists(select 1 from spot_private.photo_cleanup_accounts where user_id=target_user and state='pending' and claim_token=token and claim_until>clock_timestamp()) or public.photo_deletion_barrier(target_user) or exists(select 1 from auth.users where id=target_user) or exists(select 1 from storage.objects where bucket_id='profile-photos' and split_part(name,'/',1)=target_user::text) then raise exception 'PHOTO_REMAINS';end if;
 update spot_private.photo_lifecycle_sets set state='purged',reserved_bytes=0,manifest=null,writer='settled',completed_at=clock_timestamp(),claim_until=null,claim_token=null where user_id=target_user and state<>'purged';
 update spot_private.photo_cleanup_accounts set state='completed',completed_at=clock_timestamp(),claim_until=null,claim_token=null,error_code=null where user_id=target_user;
end $$;
create function public.fail_photo_account_cleanup(target_user uuid,token uuid,code text) returns void language sql security definer set search_path='' as $$
 update spot_private.photo_cleanup_accounts set error_code='STORAGE',claim_until=clock_timestamp()+interval '1 minute' where user_id=target_user and claim_token=token and state='pending';
$$;
-- No new signed URLs for retired objects. Already issued bearer URLs are not revocable here.
alter function spot_private.can_view_photo(text) rename to photo01_can_view_photo;
create function spot_private.can_view_photo(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select spot_private.photo01_can_view_photo(object_name) and not exists(select 1 from spot_private.photo_lifecycle_sets s where object_name in(s.photo_path,s.photo_path||'.thumb.jpg',s.photo_path||'.detail.jpg') and s.state not in('ready','current'));
$$;
-- Existing Storage policy dependencies remain bound to the renamed function OID.
alter policy photos_read_allowed on storage.objects using(bucket_id='profile-photos' and spot_private.can_view_photo(name));
revoke all on function spot_private.can_view_photo(text) from public,anon;
grant execute on function spot_private.can_view_photo(text) to authenticated;
revoke all on function spot_private.photo01_can_view_photo(text) from public,anon,authenticated;
revoke all on function public.photo_cleanup_candidates(),public.photo_cleanup_failure(text,uuid,text),public.claim_photo_account_cleanup(uuid),public.finish_photo_account_cleanup(uuid,uuid),public.fail_photo_account_cleanup(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.photo_cleanup_candidates(),public.photo_cleanup_failure(text,uuid,text),public.claim_photo_account_cleanup(uuid),public.finish_photo_account_cleanup(uuid,uuid),public.fail_photo_account_cleanup(uuid,uuid,text) to service_role;


create table spot_private.photo_lifecycle_anomalies(path text primary key,code text not null check(code in('UNTRACKED','MISSING')),first_seen timestamptz not null default clock_timestamp(),resolved_at timestamptz);
alter table spot_private.photo_lifecycle_anomalies enable row level security;
revoke all on spot_private.photo_lifecycle_anomalies from public,anon,authenticated;
create function public.scan_photo_lifecycle() returns jsonb language plpgsql security definer set search_path='' as $$
declare unknown_count bigint;missing_count bigint;
begin
 insert into spot_private.photo_lifecycle_anomalies(path,code)
 select o.name,'UNTRACKED' from storage.objects o where o.bucket_id='profile-photos'
 and not exists(select 1 from spot_private.photo_lifecycle_sets s where o.name in(s.photo_path,s.photo_path||'.detail.jpg',s.photo_path||'.thumb.jpg'))
 and not exists(select 1 from public.profiles p where o.name in(p.photo_path,p.photo_path||'.detail.jpg',p.photo_path||'.thumb.jpg'))
 and not exists(select 1 from spot_private.photo_assets a where o.name in(a.photo_path,a.thumbnail_path,a.detail_path))
 and not exists(select 1 from spot_private.photo_upload_jobs j where o.name in(j.photo_path,j.photo_path||'.detail.jpg',j.photo_path||'.thumb.jpg'))
 and not exists(select 1 from spot_private.photo_lifecycle_anomalies a where a.path=o.name)
 order by o.name limit 100 on conflict do nothing;
 insert into spot_private.photo_lifecycle_anomalies(path,code)
 select paths.path,'MISSING' from spot_private.validated_photos v cross join lateral unnest(array[v.photo_path,v.photo_path||'.detail.jpg',v.photo_path||'.thumb.jpg']) paths(path)
 where not exists(select 1 from storage.objects o where o.bucket_id='profile-photos' and o.name=paths.path)
 and not exists(select 1 from spot_private.photo_lifecycle_anomalies a where a.path=paths.path)
 order by paths.path limit 100 on conflict do nothing;
 update spot_private.photo_lifecycle_anomalies a set resolved_at=clock_timestamp() where resolved_at is null and (code='UNTRACKED' and not exists(select 1 from storage.objects o where o.bucket_id='profile-photos' and o.name=a.path) or code='MISSING' and (exists(select 1 from storage.objects o where o.bucket_id='profile-photos' and o.name=a.path) or not exists(select 1 from spot_private.validated_photos v where a.path in(v.photo_path,v.photo_path||'.detail.jpg',v.photo_path||'.thumb.jpg'))));
 select count(*) filter(where code='UNTRACKED'),count(*) filter(where code='MISSING') into unknown_count,missing_count from spot_private.photo_lifecycle_anomalies where resolved_at is null;
 delete from spot_private.photo_lifecycle_anomalies where resolved_at<clock_timestamp()-interval '7 days';
 return jsonb_build_object('untracked',unknown_count,'missing',missing_count);
end $$;
revoke all on function public.scan_photo_lifecycle() from public,anon,authenticated;
grant execute on function public.scan_photo_lifecycle() to service_role;
-- All operational entrypoints are server-only; private state is never exposed to peers.
revoke all on function spot_private.photo_owner_lock(uuid),spot_private.photo_lifecycle_publish() from public,anon,authenticated;
revoke all on function public.begin_photo_upload(uuid,uuid,text,text),public.finish_photo_upload(uuid,uuid,uuid,text,text,integer,text,integer,integer),public.photo_write_intent(uuid,text,uuid,jsonb),public.photo_write_receipt(uuid,text,uuid,boolean),public.photo_lifecycle_inventory(),public.claim_photo_cleanup(text),public.finish_photo_cleanup(text,uuid),public.reconcile_photo_writer(text,uuid,text),public.photo_metadata_purge() from public,anon,authenticated;
grant execute on function public.begin_photo_upload(uuid,uuid,text,text),public.finish_photo_upload(uuid,uuid,uuid,text,text,integer,text,integer,integer),public.photo_write_intent(uuid,text,uuid,jsonb),public.photo_write_receipt(uuid,text,uuid,boolean),public.photo_lifecycle_inventory(),public.claim_photo_cleanup(text),public.finish_photo_cleanup(text,uuid),public.reconcile_photo_writer(text,uuid,text),public.photo_metadata_purge() to service_role;
notify pgrst,'reload schema';
commit;
