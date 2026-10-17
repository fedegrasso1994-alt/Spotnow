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
do $$declare a jsonb;b jsonb;begin
 a:=public.join_tribe('fe310000-0000-4000-8000-000000000001');
 if(a->>'slots_used')::int<>1 or not(a->>'initial_grace_active')::boolean or a->>'membership_source'<>'manual'then raise exception 'FIRST_JOIN';end if;
 b:=public.join_tribe('fe310000-0000-4000-8000-000000000001');if a<>b then raise exception 'DUPLICATE';end if;
 perform public.join_tribe('fe310000-0000-4000-8000-000000000002');perform public.join_tribe('fe310000-0000-4000-8000-000000000003');
 begin perform public.join_tribe('fe310000-0000-4000-8000-000000000004');raise exception 'FOURTH_ALLOWED';exception when check_violation then if sqlerrm<>'TRIBE_LIMIT'then raise;end if;end;
 if(select count(*)from public.my_tribes())<>3 then raise exception 'MY_TRIBES';end if;
 perform public.leave_tribe('fe310000-0000-4000-8000-000000000001');perform public.join_tribe('fe310000-0000-4000-8000-000000000004');
 if not(public.join_tribe('fe310000-0000-4000-8000-000000000004')->>'initial_grace_active')::boolean then raise exception 'GRACE_RESET';end if;
 perform public.leave_tribe('fe310000-0000-4000-8000-000000000002');perform public.leave_tribe('fe310000-0000-4000-8000-000000000003');perform public.leave_tribe('fe310000-0000-4000-8000-000000000004');
 if(public.leave_tribe('fe310000-0000-4000-8000-000000000004')->>'left')::boolean then raise exception 'LEAVE_RETRY';end if;
end$$;
reset role;
do $$begin
 if exists(select 1 from spot_private.tribe_rejoin_guards where user_id='fe300000-0000-4000-8000-000000000001')then raise exception 'GRACE_GUARD';end if;
 if not exists(select 1 from spot_private.tribe_account_state where user_id='fe300000-0000-4000-8000-000000000001'and configuration_state='started'and configuration_started_at is not null)then raise exception 'LOST_ANCHOR';end if;
end$$;
-- Second synthetic account represents a legacy member, not a change to real legacy users.
insert into spot_private.tribe_account_state(user_id,configuration_state)values('fe300000-0000-4000-8000-000000000002','legacy_closed');
insert into spot_private.tribe_memberships(user_id,venue_id,membership_id,membership_source)values('fe300000-0000-4000-8000-000000000002','fe310000-0000-4000-8000-000000000001','fe320000-0000-4000-8000-000000000001','legacy');
set local role authenticated;
select set_config('request.jwt.claim.sub','fe300000-0000-4000-8000-000000000002',true);
do $$declare a jsonb;begin
 a:=public.join_tribe('fe310000-0000-4000-8000-000000000001');
 if(a->>'initial_grace_active')::boolean or a->>'membership_id'<>'fe320000-0000-4000-8000-000000000001'or a->>'membership_source'<>'legacy'then raise exception 'LEGACY_CHANGED';end if;
 perform public.leave_tribe('fe310000-0000-4000-8000-000000000001');
 perform public.leave_tribe('fe310000-0000-4000-8000-000000000001');
 begin perform public.join_tribe('fe310000-0000-4000-8000-000000000001');raise exception 'COOLDOWN_ALLOWED';exception when insufficient_privilege then if sqlerrm<>'TRIBE_COOLDOWN'then raise;end if;end;
 perform public.join_tribe('fe310000-0000-4000-8000-000000000002');
 if(select count(*)from public.my_tribes())<>1 then raise exception 'MY_TRIBES_LEGACY';end if;
 begin perform public.board_feed('fe310000-0000-4000-8000-000000000001');raise exception 'BOARD_AFTER_LEAVE';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if not exists(select 1 from spot_private.tribe_account_state where user_id='fe300000-0000-4000-8000-000000000002'and configuration_state='legacy_closed'and configuration_started_at is null)then raise exception 'LEGACY_GRACE';end if;
 if not exists(select 1 from spot_private.tribe_rejoin_guards where user_id='fe300000-0000-4000-8000-000000000002'and rejoin_not_before>clock_timestamp()+interval '719 hours')then raise exception 'MISSING_COOLDOWN';end if;
end$$;
rollback;
select 'PASS: membership join 1/2/3, fourth denied, duplicate, grace, leave, legacy cooldown, my_tribes, Board gate; rolled back' evidence,
 (select count(*)from auth.users where id::text like 'fe300000-%') residual_auth,
 (select count(*)from public.venues where id::text like 'fe310000-%') residual_venues;
