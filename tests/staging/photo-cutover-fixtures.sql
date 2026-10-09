-- Temporary controls: staging-only verified service JWT; synthetic allowlisted owners only.
begin;
create table spot_private.photo_cutover_fixture_owners(user_id uuid primary key);
alter table spot_private.photo_cutover_fixture_owners enable row level security;
revoke all on spot_private.photo_cutover_fixture_owners from public,anon,authenticated;
create function public.photo_cutover_fixture(action text,target_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare c jsonb:=current_setting('request.jwt.claims',true)::jsonb;v uuid;q uuid;begin
 if c->>'ref' is distinct from 'zjinjtkekmaqtxsuyvho' or c->>'role' is distinct from 'service_role' then raise exception 'STAGING_ONLY';end if;
 if not exists(select 1 from auth.users where id=target_user and raw_user_meta_data->>'photo02_fixture'='true') and not exists(select 1 from spot_private.photo_cutover_fixture_owners where user_id=target_user) then raise exception 'FIXTURE_ONLY';end if;
 insert into spot_private.photo_cutover_fixture_owners values(target_user) on conflict do nothing;
 if action='state' then return jsonb_build_object('profile',(select photo_path from public.profiles where id=target_user),'sets',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from spot_private.photo_lifecycle_sets s where user_id=target_user),'objects',(select coalesce(jsonb_agg(name),'[]') from storage.objects where bucket_id='profile-photos' and split_part(name,'/',1)=target_user::text),'queue',(select to_jsonb(a) from spot_private.photo_cleanup_accounts a where user_id=target_user));
 elsif action='expire_grace' then update spot_private.photo_lifecycle_sets set not_before=clock_timestamp()-interval '1 second' where user_id=target_user and state='retired';
 elsif action='venue' then v:=gen_random_uuid();q:=gen_random_uuid();insert into public.venues(id,name,address)values(v,'CUTOVER SYNTHETIC','Staging fixture');insert into spot_private.venue_codes values(v,q);return jsonb_build_object('venue',v,'qr',q);
 elsif action='expiry' then update public.checkins set checked_in_at=now()-interval '91 minutes',expires_at=now()-interval '1 minute' where user_id=target_user;
 elsif action='scheduler' then return jsonb_build_object('active',(select coalesce(bool_or(active),false) from cron.job where jobname='soma-photo02-cutover-staging'),'runs',(select count(*) from cron.job_run_details where jobid in(select jobid from cron.job where jobname='soma-photo02-cutover-staging')),'latestHttp200',(select max(created) from net._http_response where status_code=200 and content::jsonb ? 'metadata_removed'),'http200',(select count(*) from net._http_response where status_code=200 and content::jsonb ? 'metadata_removed'),'httpFailed',(select count(*) from net._http_response where (content like '%metadata_removed%' or error_msg is not null) and (status_code<>200 or timed_out)));
 else raise exception 'FIXTURE_ACTION';end if;return '{}'::jsonb;
end$$;
revoke all on function public.photo_cutover_fixture(text,uuid) from public,anon,authenticated;grant execute on function public.photo_cutover_fixture(text,uuid) to service_role;
notify pgrst,'reload schema';commit;
