-- Test fixtures exist only inside this transaction; nothing is committed.
begin;
insert into auth.users(id) values('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002'),('10000000-0000-0000-0000-000000000003');
insert into public.venues(id,name,address) values('20000000-0000-0000-0000-000000000001','TEST A','TEST'),('20000000-0000-0000-0000-000000000002','TEST B','TEST');
insert into spot_private.venue_codes(venue_id,qr_token) values('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001');
insert into storage.objects(bucket_id,name) select 'profile-photos',id::text || '/test.jpg' from auth.users where id in('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003');
insert into public.profiles(id,name,age,gender,preference,photo_path) select id,'TEST',24,case when id='10000000-0000-0000-0000-000000000001' then 'M' else 'F' end,'ALL',id::text || '/test.jpg' from auth.users where id in('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003');
insert into public.checkins(user_id,venue_id,checked_in_at,expires_at) select id,case when id='10000000-0000-0000-0000-000000000003' then '20000000-0000-0000-0000-000000000002'::uuid else '20000000-0000-0000-0000-000000000001'::uuid end,now(),now()+interval '1 hour' from public.profiles where name='TEST' and id in('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
set local role authenticated;
reset role;
insert into public.matches(user_a,user_b,venue_id,first_message_at) values('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',now());
select spot_private.suspend_profile('10000000-0000-0000-0000-000000000002','Fixture moderation');
set local role authenticated;
do $$ begin
 if public.my_account_status() then raise exception 'FAIL other account status leaked'; end if;
 if spot_private.can_view_profile('10000000-0000-0000-0000-000000000002') then raise exception 'FAIL suspended discovery'; end if;
 if exists(select 1 from public.matches) then raise exception 'FAIL suspended chat'; end if;
 begin perform spot_private.suspend_profile(auth.uid(),'Client write'); raise exception 'FAIL client admin'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin
 if not public.my_account_status() then raise exception 'FAIL own suspension status'; end if;
 if spot_private.can_view_profile('10000000-0000-0000-0000-000000000001') then raise exception 'FAIL suspended reader'; end if;
 begin perform public.check_in('30000000-0000-0000-0000-000000000001'); raise exception 'FAIL suspended checkin'; exception when raise_exception then if SQLERRM<>'Account sospeso' then raise; end if; end;
end $$;
reset role;
update spot_private.suspensions set revoked_at=now() where user_id='10000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$ begin
 if public.my_account_status() then raise exception 'FAIL revoked status'; end if;
 if not spot_private.can_view_profile('10000000-0000-0000-0000-000000000001') then raise exception 'FAIL revoke restores discovery'; end if;
 if not exists(select 1 from public.matches) then raise exception 'FAIL revoke restores chat'; end if;
end $$;
reset role;
select 'PASS: suspended discovery/read/chat/checkin denied, admin permissions, revocation restores access' as result;
rollback;
