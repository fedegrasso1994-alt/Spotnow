-- Synthetic SQL/JWT rehearsal only, not browser Auth/MFA. Always ROLLBACK.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(select phase from spot_private.photo_cutover_control)<>'PAUSED'
 then raise exception 'MEMBERSHIP_SAFE_STAGE_REQUIRED';end if;
 if exists(select 1 from auth.users where id::text like 'fe300000-%')or exists(select 1 from public.venues where id::text like 'fe310000-%')then raise exception 'MEMBERSHIP_FIXTURE_COLLISION';end if;
end$$;
update spot_private.photo_cutover_control set phase='CANARY',canary_users=array['fe300000-0000-4000-8000-000000000001'::uuid,'fe300000-0000-4000-8000-000000000002'::uuid];
insert into auth.users(id,email,is_anonymous,raw_user_meta_data)select ('fe300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'membership-030-'||n||'@example.invalid',false,'{"synthetic":true,"task":"membership-030"}'::jsonb from generate_series(1,2)n;
insert into spot_private.account_eligibility(user_id,status,declared_age)select id,'eligible',25 from auth.users where id::text like 'fe300000-%';
insert into spot_private.validated_photos(photo_path,user_id,preview,canonical_sha,canonical_bytes,source_format,source_width,source_height)select id::text||'/fixture.jpg',id,'data:image/jpeg;base64,YQ==',repeat('a',64),1,'JPEG',1,1 from auth.users where id::text like 'fe300000-%';
insert into spot_private.photo_lifecycle_sets(photo_path,user_id,state,writer,not_before)select id::text||'/fixture.jpg',id,'ready','settled',clock_timestamp()+interval '1 day'from auth.users where id::text like 'fe300000-%';
insert into public.profiles(id,name,age,gender,preference,photo_path)select id,'MEMBERSHIP SYNTHETIC',25,'M',null,id::text||'/fixture.jpg'from auth.users where id::text like 'fe300000-%';
insert into public.venues(id,name,address)select ('fe310000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'MEMBERSHIP SYNTHETIC '||n,'No real location'from generate_series(1,4)n;
insert into spot_private.tribe_catalog(id,active,joinable)select id,true,true from public.venues where id::text like 'fe310000-%';
set local role authenticated;
select set_config('request.jwt.claim.sub','fe300000-0000-4000-8000-000000000001',true);
do $$declare s jsonb;begin
 s:=public.my_onboarding_state();if(s->>'complete')::boolean then raise exception 'STEP_MISSING';end if;
 perform * from public.search_joinable_tribes('MEMBERSHIP SYNTHETIC');
 if not(public.complete_onboarding()->>'complete')::boolean then raise exception 'SKIP_FAILED';end if;
end$$;
reset role;
do $$begin
 if exists(select 1 from spot_private.tribe_account_state where user_id='fe300000-0000-4000-8000-000000000001')
 or exists(select 1 from spot_private.tribe_memberships where user_id='fe300000-0000-4000-8000-000000000001')
 or exists(select 1 from public.checkins where user_id::text like 'fe300000-%')then raise exception 'SKIP_CREATED_PRODUCT_DATA';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','fe300000-0000-4000-8000-000000000002',true);
do $$declare j jsonb;begin
 j:=public.join_tribe('fe310000-0000-4000-8000-000000000001');if j->>'membership_source'<>'manual'then raise exception 'SOURCE';end if;
 perform public.join_tribe('fe310000-0000-4000-8000-000000000002');perform public.join_tribe('fe310000-0000-4000-8000-000000000003');
 begin perform public.join_tribe('fe310000-0000-4000-8000-000000000004');raise exception 'FOURTH_ALLOWED';exception when check_violation then if sqlerrm<>'TRIBE_LIMIT'then raise;end if;end;
 if(public.my_onboarding_state()->>'complete')::boolean then raise exception 'PREMATURE_COMPLETE';end if;
 if not(public.complete_onboarding()->>'complete')::boolean then raise exception 'COMPLETE_FAILED';end if;
 if jsonb_array_length(public.my_onboarding_state()->'tribes')<>3 then raise exception 'LOST_MEMBERSHIPS';end if;
end$$;
select set_config('request.jwt.claim.sub','fe300000-0000-4000-8000-000000000001',true);
do $$begin if not(public.my_onboarding_state()->>'complete')::boolean or jsonb_array_length(public.my_onboarding_state()->'tribes')<>0 then raise exception 'RETURNING_OR_ISOLATION';end if;end$$;
reset role;
rollback;
select 'PASS: no QR/profile enrollment, skip zero Tribe/grace/presence, manual 1/2/3, fourth denied, resume/isolation; ROLLBACK' evidence,
 (select count(*)from auth.users where id::text like 'fe300000-%')residual_auth,
 (select count(*)from spot_private.account_onboarding where user_id::text like 'fe300000-%')residual_onboarding;
