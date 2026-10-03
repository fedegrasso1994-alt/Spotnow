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
 begin perform 1 from spot_private.interests; raise exception 'FAIL interest privacy'; exception when insufficient_privilege then null; end;
 if public.express_interest('10000000-0000-0000-0000-000000000002') is not null then raise exception 'FAIL unilateral match'; end if;
 begin perform public.express_interest('10000000-0000-0000-0000-000000000003'); raise exception 'FAIL other venue interest'; exception when raise_exception then if SQLERRM like 'FAIL%' then raise; end if; end;
 begin insert into public.matches(user_a,user_b,venue_id) values(auth.uid(),'10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001'); raise exception 'FAIL client match insert'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ declare m uuid; begin
 m:=public.express_interest('10000000-0000-0000-0000-000000000001');
 if m is null or (select count(*) from public.my_matches())<>1 then raise exception 'FAIL reciprocal match'; end if;
 if public.express_interest('10000000-0000-0000-0000-000000000001')<>m then raise exception 'FAIL duplicate match'; end if;
 begin perform public.send_message(m,'   '); raise exception 'FAIL empty message'; exception when raise_exception then if SQLERRM like 'FAIL%' then raise; end if; end;
 perform public.send_message(m,'Ciao');
 if not exists(select 1 from public.matches where id=m and first_message_at is not null) then raise exception 'FAIL first message preservation'; end if;
end $$;
reset role;
select set_config('spot.test_match_id',(select id::text from public.matches where user_a='10000000-0000-0000-0000-000000000001' and user_b='10000000-0000-0000-0000-000000000002'),true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.matches)<>0 or (select count(*) from public.messages)<>0 or (select count(*) from public.my_matches())<>0 then raise exception 'FAIL third party isolation'; end if;
 begin perform public.send_message(current_setting('spot.test_match_id')::uuid,'Intruso'); raise exception 'FAIL unauthorized message'; exception when raise_exception then if SQLERRM like 'FAIL%' then raise; end if; end;
end $$;
reset role;
update public.matches set created_at=now()-interval '2 hours' where id=current_setting('spot.test_match_id')::uuid;
update public.checkins set checked_in_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where user_id in('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ declare m uuid; begin
 select id into m from public.matches limit 1;
 if m is null or (select count(*) from public.messages)<>1 then raise exception 'FAIL retained conversation'; end if;
 if (select count(*) from public.profiles)<>1 then raise exception 'FAIL discovery after checkout'; end if;
 if not spot_private.can_view_photo('10000000-0000-0000-0000-000000000002/test.jpg') then raise exception 'FAIL matched photo after checkout'; end if;
 perform public.send_message(m,'Messaggio dopo checkout');
end $$;
reset role;
insert into public.blocks(blocker_id,blocked_id) values('10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001');
set local role authenticated;
do $$ begin
 if (select count(*) from public.matches)<>0 or (select count(*) from public.messages)<>0 then raise exception 'FAIL reverse block chat'; end if;
 if spot_private.can_view_photo('10000000-0000-0000-0000-000000000002/test.jpg') then raise exception 'FAIL blocked matched photo'; end if;
end $$;
reset role;
delete from public.blocks where blocker_id='10000000-0000-0000-0000-000000000002';
-- An unanswered match expires exactly at one hour; clients cannot revive it by sending.
update public.matches set first_message_at=null,created_at=now()-interval '1 hour' where id=current_setting('spot.test_match_id')::uuid;
set local role authenticated;
do $$ begin
 if (select count(*) from public.my_matches())<>0 then raise exception 'FAIL exact expiry'; end if;
 begin perform public.send_message(current_setting('spot.test_match_id')::uuid,'Troppo tardi'); raise exception 'FAIL expired send'; exception when raise_exception then if SQLERRM like 'FAIL%' then raise; end if; end;
end $$;
reset role;
select 'PASS: reciprocity, duplicate protection, private interests, message preservation, other-user isolation, checkout, reverse blocks and exact expiry' as result;
rollback;
