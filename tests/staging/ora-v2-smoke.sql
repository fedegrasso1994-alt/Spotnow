-- Synthetic SQL/JWT rehearsal only, not browser Auth/MFA. Always ROLLBACK.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(select phase from spot_private.photo_cutover_control)<>'PAUSED'
 then raise exception 'ORA_SAFE_STAGE_REQUIRED';end if;
 if exists(select 1 from auth.users where id::text like 'fe320000-%')or exists(select 1 from public.venues where id::text like 'fe321000-%')then raise exception 'ORA_FIXTURE_COLLISION';end if;
end$$;
update spot_private.photo_cutover_control set phase='CANARY',canary_users=array['fe320000-0000-4000-8000-000000000001'::uuid,'fe320000-0000-4000-8000-000000000002'::uuid];
insert into auth.users(id,email,is_anonymous,raw_user_meta_data)select ('fe320000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'ora-032-'||n||'@example.invalid',false,'{"synthetic":true,"task":"ora-032"}'::jsonb from generate_series(1,2)n;
insert into spot_private.account_eligibility(user_id,status,declared_age)select id,'eligible',25 from auth.users where id::text like 'fe320000-%';
insert into spot_private.validated_photos(photo_path,user_id,preview,canonical_sha,canonical_bytes,source_format,source_width,source_height)select id::text||'/fixture.jpg',id,'data:image/jpeg;base64,YQ==',repeat('a',64),1,'JPEG',1,1 from auth.users where id::text like 'fe320000-%';
insert into spot_private.photo_lifecycle_sets(photo_path,user_id,state,writer,not_before)select id::text||'/fixture.jpg',id,'ready','settled',clock_timestamp()+interval '1 day'from auth.users where id::text like 'fe320000-%';
insert into public.profiles(id,name,age,gender,preference,photo_path)select id,'ORA SYNTHETIC',25,'M',null,id::text||'/fixture.jpg'from auth.users where id::text like 'fe320000-%';
insert into public.venues(id,name,address)select ('fe321000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'ORA SYNTHETIC '||n,'No real location'from generate_series(1,4)n;
insert into spot_private.tribe_catalog(id,active,joinable)select id,true,true from public.venues where id::text like 'fe321000-%';
update spot_private.soma_v2_control set ora_enabled=true;
update public.venues set ora_enabled=true,linked_tribe_id=id where id::text like 'fe321000-%';
insert into spot_private.venue_codes(venue_id,qr_token)values('fe321000-0000-4000-8000-000000000001','fe322000-0000-4000-8000-000000000001');
insert into spot_private.consent_state(user_id,status,version)select id,'active','dating-staging-v1'from auth.users where id::text like 'fe320000-%';
update public.profiles set preference='ALL'where id::text like 'fe320000-%';
set local role authenticated;
select set_config('request.jwt.claim.sub','fe320000-0000-4000-8000-000000000001',true);
do $$declare a jsonb;b jsonb;c jsonb;begin
 if(public.my_onboarding_state()->>'complete')::boolean then raise exception 'ENROLL';end if;
 perform public.complete_onboarding();
 a:=public.start_ora_qr('fe322000-0000-4000-8000-000000000001');
 if a->>'source'<>'qr'or(a->>'expires_at')::timestamptz<>(a->>'started_at')::timestamptz+interval '4 hours'then raise exception 'QR_OR_DURATION';end if;
 b:=public.start_ora_manual('fe321000-0000-4000-8000-000000000001');
 if a->>'presence_id'<>b->>'presence_id'or a->>'expires_at'<>b->>'expires_at'then raise exception 'RENEWAL';end if;
 c:=public.start_ora_manual('fe321000-0000-4000-8000-000000000002');
 perform public.end_ora((a->>'presence_id')::uuid);
 if public.my_presence()->>'presence_id'<>c->>'presence_id'then raise exception 'STALE_EXIT';end if;
 perform public.end_ora((c->>'presence_id')::uuid);perform public.end_ora((c->>'presence_id')::uuid);
 if public.my_presence()is not null then raise exception 'EXIT';end if;
 begin perform public.start_ora_qr('fe321000-0000-4000-8000-000000000003');raise exception 'ACCEPTED_CRAFTED';exception when insufficient_privilege then null;end;
 begin perform public.check_in('fe322000-0000-4000-8000-000000000001');raise exception 'LEGACY_ALLOWED';exception when insufficient_privilege then null;end;
 perform public.start_ora_manual('fe321000-0000-4000-8000-000000000001');
end$$;
select set_config('request.jwt.claim.sub','fe320000-0000-4000-8000-000000000002',true);
select public.complete_onboarding();select public.start_ora_qr('fe322000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','fe320000-0000-4000-8000-000000000001',true);
do $$begin if(select count(*)from public.ora_people_page())<>1 then raise exception 'PEOPLE';end if;
 if exists(select 1 from public.ora_people_page()p where to_jsonb(p)?'expires_at'or to_jsonb(p)?'checked_in_at')then raise exception 'PRIVACY';end if;
end$$;
reset role;
do $$begin
 if exists(select 1 from spot_private.tribe_memberships where user_id::text like 'fe320000-%')or exists(select 1 from spot_private.tribe_account_state where user_id::text like 'fe320000-%')then raise exception 'AUTOJOIN';end if;
 if exists(select 1 from spot_private.ora_spot_daily_quota)or exists(select 1 from spot_private.ora_spot_place_quota)or exists(select 1 from spot_private.ora_spot_policy where enabled)then raise exception 'QUOTA_NOT_OFF';end if;
end$$;
rollback;
select 'PASS: ORA A-F, 4h, manual/QR, pending after onboarding, no membership/grace, same retry, stale exit, people, legacy denied; ROLLBACK' evidence,
(select count(*)from auth.users where id::text like 'fe320000-%')residual_auth,
(select count(*)from public.venues where id::text like 'fe321000-%')residual_places;
