create table spot_private.photo02_fixture_owners(user_id uuid primary key);
alter table spot_private.photo02_fixture_owners enable row level security;
revoke all on spot_private.photo02_fixture_owners from public,anon,authenticated;
-- TEMPORARY STAGING-ONLY test controls. Deploy only to isolated staging, remove after tests.
create function public.photo02_fixture_control(action text,target_user uuid,path text default null,amount bigint default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;venue uuid;qr uuid;
begin
 if not exists(select 1 from auth.users where id=target_user and raw_user_meta_data->>'photo02_fixture'='true') and not exists(select 1 from spot_private.photo02_fixture_owners where user_id=target_user) then raise exception 'FIXTURE_ONLY';end if;
 insert into spot_private.photo02_fixture_owners values(target_user) on conflict do nothing;
 perform spot_private.photo_owner_lock(target_user);
 if action='expire_lease' then update spot_private.photo_upload_jobs set lease_until=clock_timestamp()-interval '1 second' where user_id=target_user;
 elsif action='expire_draft' then update spot_private.photo_lifecycle_sets set not_before=clock_timestamp()-interval '1 second' where user_id=target_user and state='ready' and photo_path=path;
 elsif action='expire_grace' then update spot_private.photo_lifecycle_sets set not_before=clock_timestamp()-interval '1 second' where user_id=target_user and state='retired';
 elsif action='expire_claim' then update spot_private.photo_lifecycle_sets set claim_until=clock_timestamp()-interval '1 second' where user_id=target_user and photo_path=path;
 elsif action='age_metadata' then update spot_private.photo_lifecycle_sets set completed_at=clock_timestamp()-make_interval(days=>amount::integer) where user_id=target_user and state='purged';
 elsif action='quota' then update spot_private.photo_lifecycle_sets set reserved_bytes=amount where user_id=target_user and state='current';
 elsif action='restore_quota' then update spot_private.photo_lifecycle_sets set reserved_bytes=9437184 where user_id=target_user and state='current';
 elsif action='venue' then venue:=gen_random_uuid();qr:=gen_random_uuid();insert into public.venues(id,name,address) values(venue,'PHOTO02 SYNTHETIC','Fixture staging');insert into spot_private.venue_codes values(venue,qr);return jsonb_build_object('venue',venue,'qr',qr);
 elsif action='expiry' then update public.checkins set checked_in_at=clock_timestamp()-interval '91 minutes',expires_at=clock_timestamp()-interval '1 minute' where user_id=target_user;
 elsif action='state' then return jsonb_build_object('sets',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from spot_private.photo_lifecycle_sets s where user_id=target_user),'profile',(select photo_path from public.profiles where id=target_user),'objects',(select coalesce(jsonb_agg(name),'[]') from storage.objects where bucket_id='profile-photos' and split_part(name,'/',1)=target_user::text),'queue',(select to_jsonb(a) from spot_private.photo_cleanup_accounts a where user_id=target_user));
 else raise exception 'INVALID_FIXTURE_ACTION';end if;return '{}'::jsonb;
end $$;
create function public.photo02_fixture_race(target_user uuid,request_id uuid,input_sha text,quota_only boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare j jsonb;
begin
 if not exists(select 1 from auth.users where id=target_user and raw_user_meta_data->>'photo02_fixture'='true') then raise exception 'FIXTURE_ONLY';end if;
 perform spot_private.photo_owner_lock(target_user);perform pg_sleep(0.4);
 j:=public.photo02_begin_photo_upload(target_user,request_id,input_sha);
 if quota_only then perform public.photo_write_receipt(target_user,j->>'photo_path',(j->>'lease_token')::uuid,true);perform public.fail_photo_upload(target_user,request_id,(j->>'lease_token')::uuid);end if;
 return j;
end $$;
revoke all on function public.photo02_fixture_control(text,uuid,text,bigint),public.photo02_fixture_race(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.photo02_fixture_control(text,uuid,text,bigint),public.photo02_fixture_race(uuid,uuid,text,boolean) to service_role;
