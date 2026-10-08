begin;
-- Frozen compatibility snapshot: clients cannot add or restore legacy exceptions.
create table spot_private.photo_legacy(user_id uuid not null references auth.users(id) on delete cascade,photo_path text primary key);
insert into spot_private.photo_legacy select id,photo_path from public.profiles;
create table spot_private.photo_upload_accounts(user_id uuid primary key references auth.users(id) on delete cascade,starts timestamptz[] not null default '{}');
create table spot_private.photo_upload_jobs(user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,input_sha text not null check(input_sha ~ '^[0-9a-f]{64}$'),photo_path text not null,lease_token uuid not null,lease_until timestamptz not null,status text not null check(status in('processing','failed','ready')),attempts integer not null default 1,legacy_path text,primary key(user_id,request_id));
create table spot_private.validated_photos(photo_path text primary key,user_id uuid not null references auth.users(id) on delete cascade,preview text not null check(length(preview)<=16000 and preview ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'),canonical_sha text not null check(canonical_sha ~ '^[0-9a-f]{64}$'),canonical_bytes integer not null check(canonical_bytes between 1 and 4194304),source_format text not null check(source_format in('JPEG','PNG','WebP')),source_width integer not null check(source_width between 1 and 8192),source_height integer not null check(source_height between 1 and 8192),normalizer_version integer not null default 1 check(normalizer_version=1),check(source_width::bigint*source_height<=case when source_format='WebP' then 6000000 else 12000000 end),check(photo_path like user_id::text||'/%'));
alter table spot_private.photo_legacy enable row level security;
alter table spot_private.photo_upload_accounts enable row level security;
alter table spot_private.photo_upload_jobs enable row level security;
alter table spot_private.validated_photos enable row level security;
revoke all on spot_private.photo_legacy,spot_private.photo_upload_accounts,spot_private.photo_upload_jobs,spot_private.validated_photos from public,anon,authenticated;
create function spot_private.photo_account_active(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=target and not u.is_anonymous) and not exists(select 1 from spot_private.account_deletions d where d.user_id=target) and not exists(select 1 from spot_private.suspensions s where s.user_id=target and s.revoked_at is null);
$$;
create function spot_private.can_publish_photo(target uuid,path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from spot_private.validated_photos a where a.user_id=target and a.photo_path=path) or exists(select 1 from spot_private.photo_legacy l join public.profiles p on p.id=l.user_id and p.photo_path=l.photo_path where l.user_id=target and l.photo_path=path);
$$;
create function spot_private.enforce_photo_publication() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not spot_private.can_publish_photo(new.id,new.photo_path) then raise exception 'Foto non validata' using errcode='42501';end if;return new;
end $$;
create trigger enforce_photo_publication before insert or update of photo_path,id on public.profiles for each row execute function spot_private.enforce_photo_publication();
create function spot_private.attach_validated_photo() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into spot_private.photo_assets(photo_path,user_id,preview,thumbnail_path,detail_path) select a.photo_path,a.user_id,a.preview,a.photo_path||'.thumb.jpg',a.photo_path||'.detail.jpg' from spot_private.validated_photos a where a.photo_path=new.photo_path and a.user_id=new.id on conflict(photo_path) do update set preview=excluded.preview,thumbnail_path=excluded.thumbnail_path,detail_path=excluded.detail_path,updated_at=now();return new;
end $$;
create trigger attach_validated_photo after insert or update of photo_path on public.profiles for each row execute function spot_private.attach_validated_photo();
alter policy profiles_insert on public.profiles with check(id=auth.uid() and spot_private.can_write_profile() and spot_private.can_publish_photo(id,photo_path));
alter policy profiles_update on public.profiles with check(id=auth.uid() and spot_private.can_write_profile() and spot_private.can_publish_photo(id,photo_path));
alter policy photos_insert_own on storage.objects with check(false);
revoke execute on function public.save_my_photo_preview(text,text) from authenticated;
-- TECHNICAL LIMIT: 10 distinct uploads/hour/account, max 3 retries of same content.
-- Row lock serializes accounts; ready retries neither process nor count again.
create function public.begin_photo_upload(target_user uuid,request_id uuid,input_sha text,legacy_path text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare j spot_private.photo_upload_jobs; a spot_private.photo_upload_accounts; stamp timestamptz:=clock_timestamp(); lease uuid:=gen_random_uuid(); path text; recent timestamptz[];
begin
 if not spot_private.photo_account_active(target_user) then raise exception 'PHOTO_ACCOUNT' using errcode='42501';end if;
 if input_sha is null or input_sha !~ '^[0-9a-f]{64}$' or request_id is null then raise exception 'PHOTO_INVALID';end if;
 if legacy_path is not null and not exists(select 1 from public.profiles p join spot_private.photo_legacy l on l.user_id=p.id and l.photo_path=p.photo_path where p.id=target_user and p.photo_path=legacy_path) then raise exception 'PHOTO_OWNERSHIP' using errcode='42501';end if;
 insert into spot_private.photo_upload_accounts(user_id) values(target_user) on conflict do nothing;
 select * into a from spot_private.photo_upload_accounts where user_id=target_user for update;
 select * into j from spot_private.photo_upload_jobs where user_id=target_user and photo_upload_jobs.request_id=begin_photo_upload.request_id;
 if found then
  if j.input_sha<>begin_photo_upload.input_sha or j.legacy_path is distinct from begin_photo_upload.legacy_path then raise exception 'PHOTO_CONFLICT';end if;
  if j.status='ready' then return (select jsonb_build_object('ready',true,'photo_path',v.photo_path,'preview',v.preview) from spot_private.validated_photos v where v.photo_path=j.photo_path);end if;
  if j.status='processing' and j.lease_until>stamp or j.status='failed' and j.lease_until>stamp then raise exception 'PHOTO_BUSY';end if;
  if j.attempts>=3 then raise exception 'PHOTO_RETRIES';end if;
 end if;
 if exists(select 1 from spot_private.photo_upload_jobs x where x.user_id=target_user and x.status='processing' and x.lease_until>stamp) then raise exception 'PHOTO_BUSY';end if;
 select coalesce(array_agg(t),'{}'::timestamptz[]) into recent from unnest(a.starts) t where t>stamp-interval '1 hour';
 if j.request_id is null then
  if cardinality(recent)>=10 then raise exception 'PHOTO_RATE';end if;
  recent:=array_append(recent,stamp);
 end if;
 path:=target_user::text||'/'||lease::text||'.jpg';
 update spot_private.photo_upload_accounts set starts=recent where user_id=target_user;
 insert into spot_private.photo_upload_jobs(user_id,request_id,input_sha,photo_path,lease_token,lease_until,status,legacy_path) values(target_user,request_id,input_sha,path,lease,stamp+interval '45 seconds','processing',legacy_path)
 on conflict on constraint photo_upload_jobs_pkey do update set photo_path=excluded.photo_path,lease_token=excluded.lease_token,lease_until=excluded.lease_until,status='processing',attempts=photo_upload_jobs.attempts+1;
 return jsonb_build_object('ready',false,'photo_path',path,'lease_token',lease);
end $$;
create function public.fail_photo_upload(target_user uuid,request_id uuid,lease_token uuid) returns void language sql security definer set search_path='' as $$
 update spot_private.photo_upload_jobs set status='failed' where user_id=target_user and photo_upload_jobs.request_id=fail_photo_upload.request_id and photo_upload_jobs.lease_token=fail_photo_upload.lease_token and status='processing';
$$;
create function public.finish_photo_upload(target_user uuid,request_id uuid,lease_token uuid,preview_text text,canonical_sha text,canonical_bytes integer,source_format text,source_width integer,source_height integer) returns text language plpgsql security definer set search_path='' as $$
declare j spot_private.photo_upload_jobs;
begin
 select * into j from spot_private.photo_upload_jobs where user_id=target_user and photo_upload_jobs.request_id=finish_photo_upload.request_id for update;
 if not found or j.status<>'processing' or j.lease_token<>finish_photo_upload.lease_token or j.lease_until<=clock_timestamp() or not spot_private.photo_account_active(target_user) then raise exception 'PHOTO_LEASE' using errcode='42501';end if;
 if (select count(distinct name) from storage.objects where bucket_id='profile-photos' and name in(j.photo_path,j.photo_path||'.thumb.jpg',j.photo_path||'.detail.jpg'))<>3 then raise exception 'PHOTO_OBJECTS';end if;
 insert into spot_private.validated_photos(photo_path,user_id,preview,canonical_sha,canonical_bytes,source_format,source_width,source_height) values(j.photo_path,target_user,preview_text,canonical_sha,canonical_bytes,source_format,source_width,source_height);
 update spot_private.photo_upload_jobs set status='ready' where user_id=target_user and photo_upload_jobs.request_id=finish_photo_upload.request_id;
 return j.photo_path;
end $$;
create function public.publish_normalized_photo(target_user uuid,request_id uuid,previous_path text) returns boolean language plpgsql security definer set search_path='' as $$
declare path text; changed boolean;
begin
 select j.photo_path into path from spot_private.photo_upload_jobs j where j.user_id=target_user and j.request_id=publish_normalized_photo.request_id and j.status='ready' and j.legacy_path=previous_path;
 if path is null or not spot_private.photo_account_active(target_user) then raise exception 'PHOTO_LEASE' using errcode='42501';end if;
 update public.profiles set photo_path=path,updated_at=now() where id=target_user and photo_path=previous_path;changed:=found;return changed;
end $$;
create function public.pending_photo_normalization() returns table(user_id uuid,photo_path text,total_count bigint) language sql stable security definer set search_path='' as $$
 select p.id,p.photo_path,count(*) over() from public.profiles p join spot_private.photo_legacy l on l.user_id=p.id and l.photo_path=p.photo_path where spot_private.photo_account_active(p.id) order by p.id limit 1;
$$;
revoke all on function spot_private.photo_account_active(uuid),spot_private.enforce_photo_publication(),spot_private.attach_validated_photo(),spot_private.can_publish_photo(uuid,text) from public,anon,authenticated;
grant execute on function spot_private.can_publish_photo(uuid,text) to authenticated;
revoke all on function public.begin_photo_upload(uuid,uuid,text,text),public.fail_photo_upload(uuid,uuid,uuid),public.finish_photo_upload(uuid,uuid,uuid,text,text,integer,text,integer,integer),public.publish_normalized_photo(uuid,uuid,text),public.pending_photo_normalization() from public,anon,authenticated;
grant execute on function public.begin_photo_upload(uuid,uuid,text,text),public.fail_photo_upload(uuid,uuid,uuid),public.finish_photo_upload(uuid,uuid,uuid,text,text,integer,text,integer,integer),public.publish_normalized_photo(uuid,uuid,text),public.pending_photo_normalization() to service_role;
create function public.photo_needs_normalization(target_user uuid,path text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from spot_private.photo_legacy l join public.profiles p on p.id=l.user_id and p.photo_path=l.photo_path where l.user_id=target_user and l.photo_path=path); $$;
revoke all on function public.photo_needs_normalization(uuid,text) from public,anon,authenticated;
grant execute on function public.photo_needs_normalization(uuid,text) to service_role;
create function public.photo_upload_lease_active(target_user uuid,request_id uuid,lease_token uuid) returns boolean language sql stable security definer set search_path='' as $$ select spot_private.photo_account_active(target_user) and exists(select 1 from spot_private.photo_upload_jobs j where j.user_id=target_user and j.request_id=photo_upload_lease_active.request_id and j.lease_token=photo_upload_lease_active.lease_token and j.status='processing' and j.lease_until>clock_timestamp()); $$;
create function public.photo_deletion_barrier(target_user uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from spot_private.photo_upload_jobs j where j.user_id=target_user and j.status in('processing','failed') and j.lease_until>clock_timestamp()); $$;
revoke all on function public.photo_upload_lease_active(uuid,uuid,uuid),public.photo_deletion_barrier(uuid) from public,anon,authenticated;
grant execute on function public.photo_upload_lease_active(uuid,uuid,uuid),public.photo_deletion_barrier(uuid) to service_role;
create function public.photo_processing_authorized() returns boolean language sql immutable security invoker set search_path='' as $$select true;$$;
revoke all on function public.photo_processing_authorized() from public,anon,authenticated;
grant execute on function public.photo_processing_authorized() to service_role;
notify pgrst,'reload schema';
commit;
