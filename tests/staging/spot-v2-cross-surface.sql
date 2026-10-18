-- Session B alongside ORA A->B. Context enabled ONLY within this transaction;
-- global discovery state is restored before COMMIT. No allocation engine or ordinary UI.
begin;
set local statement_timeout='45s';
select set_config('soma.cross_started',clock_timestamp()::text,true);
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or
 (select count(*)from auth.users where id in('fea34000-0000-4000-8000-000000000001','fea34000-0000-4000-8000-000000000002')and raw_user_meta_data->>'task'='spot-034')<>2
 or exists(select 1 from spot_private.discovery_windows where id='fea34200-0000-4000-8000-000000000001')
 or exists(select 1 from spot_private.discovery_windows where local_date=(clock_timestamp()at time zone 'Europe/Rome')::date and slot='morning')then raise exception 'CROSS_FIXTURE_SCOPE';end if;
end$$;
select set_config('soma.saved_discovery',(select discovery_enabled::text from spot_private.soma_v2_control),true);
select set_config('soma.saved_policy',(select jsonb_build_object('enabled',enabled,'paused',paused)::text from spot_private.discovery_policy where version=1),true);
insert into spot_private.tribe_catalog(id,active,joinable)values('fea34100-0000-4000-8000-000000000001',true,true)on conflict do nothing;
select set_config('request.jwt.claim.sub','fea34000-0000-4000-8000-000000000001',true);select public.join_tribe('fea34100-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','fea34000-0000-4000-8000-000000000002',true);select public.join_tribe('fea34100-0000-4000-8000-000000000001');
insert into spot_private.discovery_windows(id,local_date,slot,policy_version,starts_at,ends_at,state)values('fea34200-0000-4000-8000-000000000001',(clock_timestamp()at time zone 'Europe/Rome')::date,'morning',1,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour','ready');
insert into spot_private.discovery_exposures(id,window_id,user_a,user_b,tribe_id,membership_a,membership_b)select 'fea34300-0000-4000-8000-000000000001','fea34200-0000-4000-8000-000000000001',a.user_id,b.user_id,a.venue_id,a.membership_id,b.membership_id from spot_private.tribe_memberships a join spot_private.tribe_memberships b on b.venue_id=a.venue_id where a.user_id='fea34000-0000-4000-8000-000000000001'and b.user_id='fea34000-0000-4000-8000-000000000002'and a.venue_id='fea34100-0000-4000-8000-000000000001';
update spot_private.soma_v2_control set discovery_enabled=true where singleton;
update spot_private.discovery_policy set enabled=true,paused=false where version=1;
set local role authenticated;
do $$declare r jsonb;begin
 r:=public.send_spot_v2('fea34000-0000-4000-8000-000000000001',gen_random_uuid(),'tribe','fea34300-0000-4000-8000-000000000001');
 if r->>'state'<>'matched'or r->>'match_id'is null then raise exception 'CROSS_MATCH';end if;
 perform set_config('soma.cross_result',r::text,true);
end$$;
reset role;
update spot_private.soma_v2_control set discovery_enabled=current_setting('soma.saved_discovery')::boolean where singleton;
update spot_private.discovery_policy set enabled=(current_setting('soma.saved_policy')::jsonb->>'enabled')::boolean,paused=(current_setting('soma.saved_policy')::jsonb->>'paused')::boolean where version=1;
select 'PASS cross-surface concurrent ORA/TRIBE' evidence,current_setting('soma.cross_result')result,pg_backend_pid()pid,
 extract(epoch from clock_timestamp()-current_setting('soma.cross_started')::timestamptz)elapsed_seconds;
commit;
