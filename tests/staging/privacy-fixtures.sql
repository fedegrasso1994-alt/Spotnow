begin;
-- TEMPORARY synthetic-only test API. Remove at the end with privacy-fixtures-teardown.sql.
create table spot_private.privacy_fixture_owners(user_id uuid primary key);
revoke all on spot_private.privacy_fixture_owners from public,anon,authenticated;
alter table spot_private.privacy_fixture_owners enable row level security;
create function public.privacy_stage_fixture(owner uuid,action text)returns jsonb language plpgsql security definer set search_path='' as $$
declare v uuid;q uuid;m public.matches;
begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging') then raise exception 'STAGING_ONLY';end if;
 if action='deleted' then
 if not exists(select 1 from spot_private.privacy_fixture_owners where user_id=privacy_stage_fixture.owner)then raise exception 'FIXTURE_ONLY';end if;
 if exists(select 1 from auth.users where id=privacy_stage_fixture.owner)or exists(select 1 from public.profiles where id=privacy_stage_fixture.owner)or exists(select 1 from spot_private.account_eligibility where user_id=privacy_stage_fixture.owner)or exists(select 1 from spot_private.age_events where user_id=privacy_stage_fixture.owner)or exists(select 1 from spot_private.consent_state where user_id=privacy_stage_fixture.owner)or exists(select 1 from spot_private.consent_events where user_id=privacy_stage_fixture.owner)or exists(select 1 from spot_private.consent_challenges where user_id=privacy_stage_fixture.owner)or exists(select 1 from storage.objects where bucket_id='profile-photos'and split_part(name,'/',1)=privacy_stage_fixture.owner::text)then raise exception 'FIXTURE_RESIDUAL';end if;
 return jsonb_build_object('deleted',true);
 end if;
 if not exists(select 1 from auth.users where id=privacy_stage_fixture.owner and raw_user_meta_data->>'privacy_fixture'='true')then raise exception 'FIXTURE_ONLY';end if;
 insert into spot_private.privacy_fixture_owners values(privacy_stage_fixture.owner)on conflict do nothing;
 if action='venue' then
 v:=gen_random_uuid();q:=gen_random_uuid();insert into public.venues(id,name,address)values(v,'PRIVACY SYNTHETIC','Staging test only');insert into spot_private.venue_codes values(v,q);return jsonb_build_object('venue',v,'qr',q);
 elsif action='expire' then update public.checkins set checked_in_at=now()-interval '2 days',expires_at=now()-interval '2 days'+interval '90 minutes'where user_id=privacy_stage_fixture.owner;
 elsif action='renew_slow' then
 perform spot_private.photo_owner_lock(privacy_stage_fixture.owner);perform pg_sleep(1);update public.checkins set checked_in_at=now(),expires_at=now()+interval '90 minutes'where user_id=privacy_stage_fixture.owner;
 elsif action='revoke_slow' then
 perform spot_private.photo_owner_lock(privacy_stage_fixture.owner);perform pg_sleep(1);perform set_config('request.jwt.claim.sub',privacy_stage_fixture.owner::text,true);perform public.revoke_dating_consent(gen_random_uuid());
 elsif action='moderator' then insert into spot_private.moderators(user_id)values(privacy_stage_fixture.owner)on conflict do nothing;
 elsif action in('age_chat','message_slow') then
 select * into m from public.matches where privacy_stage_fixture.owner in(user_a,user_b)and exists(select 1 from auth.users a where a.id=case when user_a=privacy_stage_fixture.owner then user_b else user_a end and a.raw_user_meta_data->>'privacy_fixture'='true')limit 1;
 if not found then raise exception 'FIXTURE_MATCH';end if;
 if action='age_chat' then update public.messages set created_at=now()-interval '13 months'where match_id=m.id;
 else perform spot_private.retention_pair_lock(m.user_a,m.user_b);perform pg_sleep(1);perform set_config('request.jwt.claim.sub',privacy_stage_fixture.owner::text,true);perform public.send_message(m.id,'SYNTHETIC RACE MESSAGE',gen_random_uuid());end if;
 elsif action='photo_state' then return jsonb_build_object('current',(select photo_path from public.profiles where id=privacy_stage_fixture.owner),'sets',(select jsonb_agg(jsonb_build_object('state',state,'writer',writer))from spot_private.photo_lifecycle_sets where user_id=privacy_stage_fixture.owner),'quota',(select sum(reserved_bytes)from spot_private.photo_lifecycle_sets where user_id=privacy_stage_fixture.owner and state<>'purged'));
 elsif action='metadata' then return jsonb_build_object('visits',(select count(*)from spot_private.tribe_memberships where user_id=privacy_stage_fixture.owner and last_checkin_at is not null),'spot_timestamps',(select count(*)from spot_private.interests where sender_id=privacy_stage_fixture.owner and sender_checkin is not null));
 else raise exception 'FIXTURE_ACTION';end if;return '{}'::jsonb;
end $$;
revoke all on function public.privacy_stage_fixture(uuid,text)from public,anon,authenticated;
grant execute on function public.privacy_stage_fixture(uuid,text)to service_role;
notify pgrst,'reload schema';commit;
