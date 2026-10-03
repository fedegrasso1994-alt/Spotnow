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
do $$ begin
 begin perform public.report_profile(auth.uid(),'other','',false); raise exception 'FAIL self report'; exception when raise_exception then if SQLERRM='FAIL self report' then raise; end if; end;
 begin perform public.report_profile('10000000-0000-0000-0000-000000000003','other','',false); raise exception 'FAIL unseen report'; exception when raise_exception then if SQLERRM='FAIL unseen report' then raise; end if; end;
 begin perform public.report_profile('10000000-0000-0000-0000-000000000002','invalid','',false); raise exception 'FAIL invalid reason'; exception when raise_exception then if SQLERRM='FAIL invalid reason' then raise; end if; end;
 perform public.report_profile('10000000-0000-0000-0000-000000000002','other','Test details',false);
 if exists(select 1 from public.blocks where blocker_id=auth.uid()) then raise exception 'FAIL optional block'; end if;
 begin perform count(*) from spot_private.reports; raise exception 'FAIL private reports readable'; exception when insufficient_privilege then null; end;
 perform public.report_profile('10000000-0000-0000-0000-000000000002','harassment','',true);
 if spot_private.can_view_profile('10000000-0000-0000-0000-000000000002') then raise exception 'FAIL report block'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from spot_private.reports where reporter_id='10000000-0000-0000-0000-000000000001')<>2 then raise exception 'FAIL persisted reports'; end if;
end $$;
select 'PASS: self/unseen/invalid reports rejected, private access denied, optional block, atomic report and block' as result;
rollback;
