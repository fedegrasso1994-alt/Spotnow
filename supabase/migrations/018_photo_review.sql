begin;
-- PHOTO-02 only. Review is a quarantine, never evidence of a terminal writer.
alter table spot_private.photo_lifecycle_sets add column review_reason text,add column review_since timestamptz,add column review_operator text,add column review_evidence text,add column review_quota_exempt boolean not null default false,add column reconcile_attempts integer not null default 0;
create table spot_private.photo_review_audit(operation_id uuid primary key,path text not null,lease uuid,action text not null,payload jsonb not null,actor text not null,created_at timestamptz not null default clock_timestamp());
alter table spot_private.photo_review_audit enable row level security;
revoke all on spot_private.photo_review_audit from public,anon,authenticated;
create index photo_review_audit_path on spot_private.photo_review_audit(path,created_at);
create function public.photo_review_hold(path text,expected_lease uuid,operation_id uuid,reason text,evidence_ref text,operator_id text,exempt_quota boolean default false) returns text language plpgsql security definer set search_path='' as $$
declare s spot_private.photo_lifecycle_sets;args jsonb;prior spot_private.photo_review_audit;
begin
 args:=jsonb_build_object('path',path,'lease',expected_lease,'reason',reason,'evidence',evidence_ref,'operator',operator_id,'exempt',exempt_quota);
 perform pg_advisory_xact_lock(hashtextextended(operation_id::text,18));
 select * into prior from spot_private.photo_review_audit a where a.operation_id=photo_review_hold.operation_id;
 if found then if prior.action<>'HOLD' or prior.payload<>args then raise exception 'PHOTO_OPERATION_CONFLICT';end if;return 'review';end if;
 if coalesce(reason,'') not in('LEGACY_SYNTHETIC_RESIDUE','UNRESOLVED_STORAGE_EFFECTS','RETRY_EXHAUSTED') or coalesce(length(evidence_ref),0) not between 1 and 160 or coalesce(length(operator_id),0) not between 1 and 80 then raise exception 'PHOTO_REVIEW_EVIDENCE';end if;
 select * into s from spot_private.photo_lifecycle_sets where photo_path=path;if not found then raise exception 'PHOTO_REVIEW_TARGET';end if;
 perform spot_private.photo_owner_lock(s.user_id);select * into s from spot_private.photo_lifecycle_sets where photo_path=path for update;
 if s.lease_token is distinct from expected_lease or s.state in('current','purging','purged','ready') or exists(select 1 from public.profiles where photo_path=path) or exists(select 1 from spot_private.photo_upload_jobs j where j.photo_path=path and j.status='processing' and j.lease_until>clock_timestamp()) then raise exception 'PHOTO_REVIEW_TARGET';end if;
 if exempt_quota then
  -- Only grandfathered, independently attributed synthetic PRE017 attempts. No new writer may gain this exception.
  if reason<>'LEGACY_SYNTHETIC_RESIDUE' or s.error_code is distinct from 'PRE017' or s.manifest is not null
   or not exists(select 1 from auth.users u where u.id=s.user_id and u.raw_user_meta_data->>'synthetic'='true' and u.raw_user_meta_data->>'purpose'='PHOTO-01 staging only')
   or exists(select 1 from storage.objects o where o.bucket_id='profile-photos' and o.name in(path,path||'.detail.jpg',path||'.thumb.jpg'))
   or exists(select 1 from spot_private.validated_photos where photo_path=path)
   or exists(select 1 from spot_private.photo_assets a where path in(a.photo_path,a.detail_path,a.thumbnail_path))
   or exists(select 1 from spot_private.photo_legacy where photo_path=path)
   or (select count(*) from spot_private.photo_lifecycle_sets where user_id=s.user_id and review_quota_exempt and photo_path<>path)>=3 then raise exception 'PHOTO_REVIEW_EXEMPTION';end if;
 end if;
 update spot_private.photo_lifecycle_sets set state='review',review_reason=reason,review_since=coalesce(review_since,clock_timestamp()),review_operator=operator_id,review_evidence=evidence_ref,review_quota_exempt=exempt_quota,claim_token=null,claim_until=null where photo_path=path;
 insert into spot_private.photo_review_audit values(operation_id,path,expected_lease,'HOLD',args,operator_id,clock_timestamp());return 'review';
end $$;
-- Prevent the old service-only reconcile entry from silently bypassing review.
alter function public.reconcile_photo_writer(text,uuid,text) rename to photo02_reconcile_writer_before_review;
revoke all on function public.photo02_reconcile_writer_before_review(text,uuid,text) from public,anon,authenticated,service_role;
create function public.reconcile_photo_writer(path text,lease uuid,evidence_code text) returns void language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 select user_id into owner_id from spot_private.photo_lifecycle_sets where photo_path=path;
 perform spot_private.photo_owner_lock(owner_id);
 if exists(select 1 from spot_private.photo_lifecycle_sets where photo_path=path and state='review') then raise exception 'PHOTO_REVIEW';end if;
 perform public.photo02_reconcile_writer_before_review(path,lease,evidence_code);
end $$;
create function public.photo_review_resolve(path text,expected_lease uuid,operation_id uuid,evidence_code text,evidence_ref text,operator_id text) returns text language plpgsql security definer set search_path='' as $$
declare s spot_private.photo_lifecycle_sets;args jsonb;prior spot_private.photo_review_audit;
begin
 args:=jsonb_build_object('path',path,'lease',expected_lease,'code',evidence_code,'evidence',evidence_ref,'operator',operator_id);
 perform pg_advisory_xact_lock(hashtextextended(operation_id::text,18));
 select * into prior from spot_private.photo_review_audit a where a.operation_id=photo_review_resolve.operation_id;
 if found then if prior.action<>'RESOLVE' or prior.payload<>args then raise exception 'PHOTO_OPERATION_CONFLICT';end if;return 'resolved';end if;
 if coalesce(length(evidence_ref),0) not between 1 and 160 or coalesce(length(operator_id),0) not between 1 and 80 or evidence_ref ~* '^(age|timeout|absence|expired|ttl|elapsed)(:|$)' or coalesce(evidence_code,'') not in('ALL_IMMUTABLE_OBJECTS_CONFIRMED','TERMINAL_STORAGE_RESPONSES_CONFIRMED','NO_WRITE_INTENT_FENCED') then raise exception 'PHOTO_REVIEW_EVIDENCE';end if;
 select * into s from spot_private.photo_lifecycle_sets where photo_path=path;if not found then raise exception 'PHOTO_REVIEW_TARGET';end if;
 perform spot_private.photo_owner_lock(s.user_id);select * into s from spot_private.photo_lifecycle_sets where photo_path=path for update;
 if s.state<>'review' or s.lease_token is distinct from expected_lease then raise exception 'PHOTO_REVIEW_TARGET';end if;
 if s.writer='unknown' then perform public.photo02_reconcile_writer_before_review(path,expected_lease,evidence_code);
 else if evidence_code<>'TERMINAL_STORAGE_RESPONSES_CONFIRMED' then raise exception 'PHOTO_REVIEW_EVIDENCE';end if;update spot_private.photo_lifecycle_sets set state='failed',not_before=clock_timestamp() where photo_path=path;end if;
 update spot_private.photo_lifecycle_sets set review_quota_exempt=false,review_operator=operator_id,review_evidence=evidence_ref where photo_path=path;
 insert into spot_private.photo_review_audit values(operation_id,path,expected_lease,'RESOLVE',args,operator_id,clock_timestamp());return 'resolved';
end $$;
create or replace function public.photo_reconciliation_checked(path text) returns void language sql security definer set search_path='' as $$
 update spot_private.photo_lifecycle_sets set last_attempt_at=clock_timestamp(),reconcile_attempts=reconcile_attempts+1 where photo_path=path and writer='unknown' and state<>'review';
$$;
create function public.photo_reconciliation_pending(path text) returns boolean language plpgsql security definer set search_path='' as $$
declare s spot_private.photo_lifecycle_sets;
begin
 select * into s from spot_private.photo_lifecycle_sets where photo_path=path;
 if not found or s.writer<>'unknown' or s.state='review' or s.reconcile_attempts<10 then return false;end if;
 if exists(select 1 from spot_private.photo_upload_jobs j where j.photo_path=path and j.status='processing' and j.lease_until>clock_timestamp()) then return false;end if;
 perform public.photo_review_hold(path,s.lease_token,gen_random_uuid(),'UNRESOLVED_STORAGE_EFFECTS','ten-incomplete-reconciliation-attempts','scheduler',false);return true;
end $$;
create or replace function public.photo_lifecycle_inventory() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('sets',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from (select * from spot_private.photo_lifecycle_sets where state not in('current','purged','review') order by coalesce(last_attempt_at,created_at),photo_path limit 100) s),'accounts',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from (select * from spot_private.photo_cleanup_accounts where state='pending' and (claim_until is null or claim_until<=clock_timestamp()) and not public.photo_deletion_barrier(user_id) order by created_at limit 20) a));
$$;
create function public.photo_review_inventory() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('total',(select count(*) from spot_private.photo_lifecycle_sets where state='review'),'items',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select photo_path,user_id,writer,review_reason,created_at,review_since,extract(epoch from(clock_timestamp()-created_at))::bigint age_seconds,extract(epoch from(clock_timestamp()-review_since))::bigint review_age_seconds,last_attempt_at,reconcile_attempts,retries,review_operator,review_evidence,review_quota_exempt,reserved_bytes,case when review_quota_exempt then coalesce((select sum(coalesce((to_jsonb(o)->'metadata'->>'size')::bigint,9437184)) from storage.objects o where o.bucket_id='profile-photos' and o.name in(s.photo_path,s.photo_path||'.detail.jpg',s.photo_path||'.thumb.jpg')),0) else reserved_bytes+32000 end charged_bytes,(select max(a.created_at) from spot_private.photo_review_audit a where a.path=s.photo_path) last_manual_event_at,(select count(*) from storage.objects o where o.bucket_id='profile-photos' and o.name in(s.photo_path,s.photo_path||'.detail.jpg',s.photo_path||'.thumb.jpg')) object_count from spot_private.photo_lifecycle_sets s where state='review' order by review_since,photo_path limit 100) r));
$$;
create or replace function public.begin_photo_upload(target_user uuid,request_id uuid,input_sha text,legacy_path text default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
  if (select coalesce(sum(case when state='review' and review_quota_exempt then coalesce((select sum(coalesce((to_jsonb(o)->'metadata'->>'size')::bigint,9437184)) from storage.objects o where o.bucket_id='profile-photos' and o.name in(s.photo_path,s.photo_path||'.detail.jpg',s.photo_path||'.thumb.jpg')),0) else reserved_bytes+32000 end),0) from spot_private.photo_lifecycle_sets s where s.user_id=target_user and s.state<>'purged')+9469184+(select coalesce(sum(coalesce((to_jsonb(o)->'metadata'->>'size')::bigint,9437184)),0) from storage.objects o where o.bucket_id='profile-photos' and split_part(o.name,'/',1)=target_user::text and not exists(select 1 from spot_private.photo_lifecycle_sets s where o.name in(s.photo_path,s.photo_path||'.detail.jpg',s.photo_path||'.thumb.jpg'))) >134217728 then raise exception 'PHOTO_QUOTA';end if;
  if (select count(*) from spot_private.photo_lifecycle_sets where user_id=target_user and state='ready')>=2 then raise exception 'PHOTO_DRAFTS';end if;
 end if;
 result:=public.photo01_begin_photo_upload(target_user,request_id,input_sha,legacy_path);
 if coalesce((result->>'ready')::boolean,false) then return result;end if;
 if existing.photo_path is not null then update spot_private.photo_lifecycle_sets set state='failed',not_before=clock_timestamp() where photo_path=existing.photo_path and state='writing' and writer='settled';end if;
 insert into spot_private.photo_lifecycle_sets(photo_path,user_id,request_id,lease_token,state,not_before) values(result->>'photo_path',target_user,request_id,(result->>'lease_token')::uuid,'writing',clock_timestamp()+interval '24 hours');
 return result;
end $$;
-- Audit has no short TTL while an investigation is open. Concluded audits follow the existing 7-day technical policy.
alter function public.photo_metadata_purge() rename to photo02_metadata_purge_before_review;
revoke all on function public.photo02_metadata_purge_before_review() from public,anon,authenticated,service_role;
create function public.photo_metadata_purge() returns bigint language plpgsql security definer set search_path='' as $$
declare n bigint;
begin
 delete from spot_private.photo_review_audit a where a.created_at<clock_timestamp()-interval '7 days' and (a.action='ORPHAN_REMOVED' or exists(select 1 from spot_private.photo_lifecycle_sets s where s.photo_path=a.path and s.state='purged' and s.completed_at<clock_timestamp()-interval '7 days'));
 n:=public.photo02_metadata_purge_before_review();return n;
end $$;
revoke all on function public.photo_review_hold(text,uuid,uuid,text,text,text,boolean),public.photo_review_resolve(text,uuid,uuid,text,text,text),public.photo_reconciliation_pending(text),public.photo_review_inventory(),public.reconcile_photo_writer(text,uuid,text),public.photo_metadata_purge() from public,anon,authenticated;
grant execute on function public.photo_review_hold(text,uuid,uuid,text,text,text,boolean),public.photo_review_resolve(text,uuid,uuid,text,text,text),public.photo_reconciliation_pending(text),public.photo_review_inventory(),public.reconcile_photo_writer(text,uuid,text),public.photo_metadata_purge() to service_role;
create function public.photo_orphan_candidate(path text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('path',path,'owner',split_part(path,'/',1),'current_path',(select photo_path from public.profiles where id=split_part(path,'/',1)::uuid),'profile_fingerprint',(select md5(to_jsonb(p)::text) from public.profiles p where id=split_part(path,'/',1)::uuid),'account_fingerprint',(select md5(to_jsonb(u)::text) from auth.users u where id=split_part(path,'/',1)::uuid),'object',(select jsonb_build_object('bytes',(o.metadata->>'size')::bigint,'created_at',o.created_at,'updated_at',o.updated_at) from storage.objects o where o.bucket_id='profile-photos' and o.name=path),'folder_objects',(select coalesce(jsonb_agg(name order by name),'[]') from storage.objects where bucket_id='profile-photos' and split_part(name,'/',1)=split_part(path,'/',1)),'references',
 (select count(*) from public.profiles p where path in(p.photo_path,p.photo_path||'.detail.jpg',p.photo_path||'.thumb.jpg'))+
 (select count(*) from spot_private.photo_assets a where path in(a.photo_path,a.detail_path,a.thumbnail_path))+
 (select count(*) from spot_private.validated_photos v where path in(v.photo_path,v.photo_path||'.detail.jpg',v.photo_path||'.thumb.jpg'))+
 (select count(*) from spot_private.photo_legacy where photo_path=path)+
 (select count(*) from spot_private.photo_upload_jobs j where path in(j.photo_path,j.photo_path||'.detail.jpg',j.photo_path||'.thumb.jpg',j.legacy_path))+
 (select count(*) from spot_private.photo_lifecycle_sets s where path in(s.photo_path,s.photo_path||'.detail.jpg',s.photo_path||'.thumb.jpg') or s.manifest @>jsonb_build_array(jsonb_build_object('path',path))),
 'publishable',spot_private.can_publish_photo(split_part(path,'/',1)::uuid,path));
$$;
create function public.photo_orphan_removed(path text,operation_id uuid,evidence_ref text,operator_id text) returns text language plpgsql security definer set search_path='' as $$
declare snapshot jsonb;args jsonb;prior spot_private.photo_review_audit;
begin
 args:=jsonb_build_object('path',path,'evidence',evidence_ref,'operator',operator_id);
 perform pg_advisory_xact_lock(hashtextextended(operation_id::text,18));
 select * into prior from spot_private.photo_review_audit a where a.operation_id=photo_orphan_removed.operation_id;
 if found then if prior.action<>'ORPHAN_REMOVED' or prior.payload<>args then raise exception 'PHOTO_OPERATION_CONFLICT';end if;return 'removed';end if;
 if coalesce(length(evidence_ref),0) not between 1 and 160 or coalesce(length(operator_id),0) not between 1 and 80 then raise exception 'PHOTO_REVIEW_EVIDENCE';end if;
 snapshot:=public.photo_orphan_candidate(path);
 if snapshot->'object'<>'null'::jsonb or (snapshot->>'references')::bigint<>0 or (snapshot->>'publishable')::boolean then raise exception 'PHOTO_ORPHAN_REFERENCED';end if;
 insert into spot_private.photo_review_audit values(operation_id,path,null,'ORPHAN_REMOVED',args,operator_id,clock_timestamp());return 'removed';
end $$;
revoke all on function public.photo_orphan_candidate(text),public.photo_orphan_removed(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.photo_orphan_candidate(text),public.photo_orphan_removed(text,uuid,text,text) to service_role;
notify pgrst,'reload schema';
commit;
