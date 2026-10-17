-- ONLY staging, one committed synthetic principal for separate SQL sessions.
-- No passwords, real photo files or Storage operations. Teardown is mandatory.
begin;
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')
  or exists(select 1 from auth.users where id='fe330000-0000-4000-8000-000000000001')
  or exists(select 1 from public.venues where id::text like 'fe340000-%')
  or not exists(select 1 from spot_private.photo_cutover_control where phase='PAUSED'and canary_users='{}'and not execute_enabled and not scheduler_enabled and not cleanup_all)
 then raise exception 'CONCURRENCY_FIXTURE_UNSAFE';end if;
end$$;
select set_config('soma.fixture_control',(select to_jsonb(c)::text from spot_private.photo_cutover_control c),true);
update spot_private.photo_cutover_control set phase='CANARY',canary_users=array['fe330000-0000-4000-8000-000000000001'::uuid];
insert into auth.users(id,email,is_anonymous,raw_user_meta_data)values('fe330000-0000-4000-8000-000000000001','membership-030-concurrency@example.invalid',false,'{"synthetic":true,"task":"membership-030-concurrency"}');
insert into spot_private.account_eligibility(user_id,status,declared_age)values('fe330000-0000-4000-8000-000000000001','eligible',25);
insert into spot_private.validated_photos(photo_path,user_id,preview,canonical_sha,canonical_bytes,source_format,source_width,source_height)values('fe330000-0000-4000-8000-000000000001/fixture.jpg','fe330000-0000-4000-8000-000000000001','data:image/jpeg;base64,YQ==',repeat('a',64),1,'JPEG',1,1);
insert into spot_private.photo_lifecycle_sets(photo_path,user_id,state,writer,not_before)values('fe330000-0000-4000-8000-000000000001/fixture.jpg','fe330000-0000-4000-8000-000000000001','ready','settled',clock_timestamp()+interval '1 day');
insert into public.profiles(id,name,age,gender,preference,photo_path)values('fe330000-0000-4000-8000-000000000001','MEMBERSHIP CONCURRENCY SYNTHETIC',25,'M',null,'fe330000-0000-4000-8000-000000000001/fixture.jpg');
insert into public.venues(id,name,address)select ('fe340000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'MEMBERSHIP CONCURRENCY SYNTHETIC '||n,'No real location'from generate_series(1,4)n;
insert into spot_private.tribe_catalog(id,active,joinable)select id,true,true from public.venues where id::text like 'fe340000-%';
-- Deliberately synthetic age of configuration, to exercise post-grace cooldown.
insert into spot_private.tribe_account_state(user_id,configuration_state,configuration_started_at)values('fe330000-0000-4000-8000-000000000001','started',clock_timestamp()-interval '25 hours');
set local role authenticated;
select set_config('request.jwt.claim.sub','fe330000-0000-4000-8000-000000000001',true);
select public.join_tribe('fe340000-0000-4000-8000-000000000001');
select public.join_tribe('fe340000-0000-4000-8000-000000000002');
reset role;
update spot_private.photo_cutover_control set phase='PAUSED',canary_users='{}';
do $$begin if(select to_jsonb(c)from spot_private.photo_cutover_control c)<>current_setting('soma.fixture_control')::jsonb then raise exception 'PHOTO_CONTROL_CHANGED';end if;end$$;
commit;
select 'PASS: one synthetic concurrency fixture; 2 memberships; PHOTO controls restored; no Storage objects' evidence;
