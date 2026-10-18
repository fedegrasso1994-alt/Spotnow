-- ONLY staging, one committed synthetic principal for separate SQL sessions.
-- No passwords, real photo files or Storage operations. Teardown is mandatory.
begin;
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')
  or exists(select 1 from auth.users where id='fe323000-0000-4000-8000-000000000001')
  or exists(select 1 from public.venues where id::text like 'fe324000-%')
  or not exists(select 1 from spot_private.photo_cutover_control where phase='PAUSED'and canary_users='{}'and not execute_enabled and not scheduler_enabled and not cleanup_all)
 then raise exception 'CONCURRENCY_FIXTURE_UNSAFE';end if;
end$$;
select set_config('soma.fixture_control',(select to_jsonb(c)::text from spot_private.photo_cutover_control c),true);
update spot_private.photo_cutover_control set phase='CANARY',canary_users=array['fe323000-0000-4000-8000-000000000001'::uuid];
insert into auth.users(id,email,is_anonymous,raw_user_meta_data)values('fe323000-0000-4000-8000-000000000001','ora-032-concurrency@example.invalid',false,'{"synthetic":true,"task":"ora-032-concurrency"}');
insert into spot_private.account_eligibility(user_id,status,declared_age)values('fe323000-0000-4000-8000-000000000001','eligible',25);
insert into spot_private.validated_photos(photo_path,user_id,preview,canonical_sha,canonical_bytes,source_format,source_width,source_height)values('fe323000-0000-4000-8000-000000000001/fixture.jpg','fe323000-0000-4000-8000-000000000001','data:image/jpeg;base64,YQ==',repeat('a',64),1,'JPEG',1,1);
insert into spot_private.photo_lifecycle_sets(photo_path,user_id,state,writer,not_before)values('fe323000-0000-4000-8000-000000000001/fixture.jpg','fe323000-0000-4000-8000-000000000001','ready','settled',clock_timestamp()+interval '1 day');
insert into public.profiles(id,name,age,gender,preference,photo_path)values('fe323000-0000-4000-8000-000000000001','ORA CONCURRENCY SYNTHETIC',25,'M',null,'fe323000-0000-4000-8000-000000000001/fixture.jpg');
insert into public.venues(id,name,address)select ('fe324000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'ORA CONCURRENCY SYNTHETIC '||n,'No real location'from generate_series(1,4)n;
insert into spot_private.tribe_catalog(id,active,joinable)select id,true,true from public.venues where id::text like 'fe324000-%';
update public.venues set ora_enabled=true where id::text like 'fe324000-%';
insert into spot_private.venue_codes(venue_id,qr_token)values('fe324000-0000-4000-8000-000000000002','fe325000-0000-4000-8000-000000000001');
insert into spot_private.consent_state(user_id,status,version)values('fe323000-0000-4000-8000-000000000001','active','dating-staging-v1');
update public.profiles set preference='ALL'where id='fe323000-0000-4000-8000-000000000001';
update spot_private.soma_v2_control set ora_enabled=true where singleton;
update spot_private.photo_cutover_control set phase='PAUSED',canary_users='{}';
commit;
select 'PASS: one synthetic ORA concurrency fixture, no Storage writes' evidence;
