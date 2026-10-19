begin;select spot_private.board_lock();
update spot_private.discovery_windows set state='closed'where id='fea37300-0000-4000-8000-000000000001';
update spot_private.tribe_catalog set active=false where id<>'fea37100-0000-4000-8000-000000000001';
delete from spot_private.tribe_memberships where user_id::text like 'fea37000-%'and user_id not in('fea37000-0000-4000-8000-000000000001','fea37000-0000-4000-8000-000000000002');
insert into spot_private.discovery_windows(id,local_date,slot,policy_version,starts_at,ends_at)values('fea37300-0000-4000-8000-000000000002',(clock_timestamp()at time zone 'Europe/Rome')::date,'afternoon',1,clock_timestamp()-interval '1 minute',clock_timestamp()+interval '20 minutes');
set local role authenticated;select set_config('request.jwt.claim.sub','fea37000-0000-4000-8000-000000000001',true);
select jsonb_build_object('case','two-person-undersized','result',public.my_daily_discovery())evidence;
rollback;