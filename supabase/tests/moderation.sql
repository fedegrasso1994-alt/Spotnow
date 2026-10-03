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
 if public.is_moderator() then raise exception 'FAIL nonadmin role'; end if;
 begin perform public.moderation_reports(); raise exception 'FAIL nonadmin read'; exception when insufficient_privilege then null; end;
 begin perform public.moderate_report(gen_random_uuid(),'suspend','test'); raise exception 'FAIL nonadmin action'; exception when insufficient_privilege then null; end;
 begin insert into spot_private.moderators(user_id) values(auth.uid()); raise exception 'FAIL self grant'; exception when insufficient_privilege then null; end;
 perform public.report_profile('10000000-0000-0000-0000-000000000002','other','Fixture',false);
end $$;
reset role;
insert into spot_private.moderators(user_id) values('10000000-0000-0000-0000-000000000001');
set local role authenticated;
do $$ declare report_id uuid; begin
 if not public.is_moderator() then raise exception 'FAIL admin role'; end if;
 select (r->>'id')::uuid into report_id from jsonb_array_elements(public.moderation_reports()) r where r->>'target_id'='10000000-0000-0000-0000-000000000002';
 if report_id is null then raise exception 'FAIL admin read'; end if;
 perform public.moderate_report(report_id,'suspend','Fixture decision');
 if spot_private.can_view_profile('10000000-0000-0000-0000-000000000002') then raise exception 'FAIL suspend action'; end if;
 perform public.moderate_report(report_id,'revoke','Fixture revoke');
 if not spot_private.can_view_profile('10000000-0000-0000-0000-000000000002') then raise exception 'FAIL revoke action'; end if;
 perform public.moderate_report(report_id,'dismiss','Fixture dismissal');
end $$;
reset role;
do $$ begin
 if (select count(*) from spot_private.moderation_audit where actor_id='10000000-0000-0000-0000-000000000001')<>3 then raise exception 'FAIL audit'; end if;
end $$;
select 'PASS: nonadmin read/action/self-grant denied; moderator read/suspend/revoke/dismiss and audit' as result;
rollback;
