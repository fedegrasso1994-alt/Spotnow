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
 if (select count(*) from public.profiles)<>2 then raise exception 'FAIL same venue isolation'; end if;
 if not spot_private.can_view_photo('10000000-0000-0000-0000-000000000002/test.jpg') then raise exception 'FAIL same venue photo'; end if;
 if spot_private.can_view_photo('10000000-0000-0000-0000-000000000003/test.jpg') then raise exception 'FAIL other venue photo'; end if;
 begin update public.checkins set expires_at=now()+interval '2 hours'; raise exception 'FAIL client changed check-in'; exception when insufficient_privilege then null; end;
 begin update public.profiles set age=17 where id=auth.uid(); raise exception 'FAIL underage'; exception when check_violation then null; end;
 begin update public.profiles set photo_path=auth.uid()::text || '/missing.jpg' where id=auth.uid(); raise exception 'FAIL missing photo'; exception when insufficient_privilege then null; end;
 perform public.check_in('30000000-0000-0000-0000-000000000001');
 if not exists(select 1 from public.checkins where user_id=auth.uid() and expires_at=checked_in_at+interval '1 hour') then raise exception 'FAIL server duration'; end if;
end $$;
reset role;
insert into public.blocks(blocker_id,blocked_id) values('10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001');
set local role authenticated;
do $$ begin
 if (select count(*) from public.profiles)<>1 then raise exception 'FAIL reverse block'; end if;
 if spot_private.can_view_photo('10000000-0000-0000-0000-000000000002/test.jpg') then raise exception 'FAIL blocked photo'; end if;
end $$;
reset role;
-- Expire fixture A without touching other profiles.
update public.checkins set checked_in_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where user_id='10000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$ begin
 if (select count(*) from public.profiles)<>1 then raise exception 'FAIL expiry isolation'; end if;
end $$;
reset role;
select 'PASS: venue isolation, photo isolation, check-in protection, age, required photo, QR renewal, reverse block, expiry' as result;
rollback;