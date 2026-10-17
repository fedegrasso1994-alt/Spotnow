-- Run A and B through two DISTINCT SQL sessions; B starts while A sleeps.
-- Requires the named concurrency fixture; no real users. No new functions.
-- SESSION A: JOIN
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','fe330000-0000-4000-8000-000000000001',true);
select public.join_tribe('fe340000-0000-4000-8000-000000000003');
select pg_sleep(10);
select jsonb_build_object('session',pg_backend_pid(),'case','join-A','result','PASS: third membership')evidence;
commit;
-- SESSION B: JOIN
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','fe330000-0000-4000-8000-000000000001',true);
select set_config('soma.race_started',clock_timestamp()::text,true);
do $$begin
 begin perform public.join_tribe('fe340000-0000-4000-8000-000000000004');raise exception 'FOURTH_ALLOWED';
 exception when check_violation then if sqlerrm<>'TRIBE_LIMIT'then raise;end if;end;
end$$;
select jsonb_build_object('session',pg_backend_pid(),'case','join-B','result','PASS: fourth denied',
 'elapsed_ms',round(extract(epoch from(clock_timestamp()-current_setting('soma.race_started')::timestamptz))*1000))evidence;
commit;
-- SESSION A: LEAVE
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','fe330000-0000-4000-8000-000000000001',true);
select public.leave_tribe('fe340000-0000-4000-8000-000000000001');
select pg_sleep(10);
reset role;
select jsonb_build_object('session',pg_backend_pid(),'case','leave-A','result','PASS: actual leave',
 'guard',(select rejoin_not_before from spot_private.tribe_rejoin_guards where user_id='fe330000-0000-4000-8000-000000000001'and tribe_id='fe340000-0000-4000-8000-000000000001'))evidence;
commit;
-- SESSION B: LEAVE
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','fe330000-0000-4000-8000-000000000001',true);
select set_config('soma.race_started',clock_timestamp()::text,true);
do $$begin
 if(public.leave_tribe('fe340000-0000-4000-8000-000000000001')->>'left')::boolean then raise exception 'DUPLICATE_LEAVE';end if;
 begin perform public.join_tribe('fe340000-0000-4000-8000-000000000001');raise exception 'COOLDOWN_ALLOWED';
 exception when insufficient_privilege then if sqlerrm<>'TRIBE_COOLDOWN'then raise;end if;end;
end$$;
reset role;
select jsonb_build_object('session',pg_backend_pid(),'case','leave-B','result','PASS: leave no-op and cooldown denied',
 'guard',(select rejoin_not_before from spot_private.tribe_rejoin_guards where user_id='fe330000-0000-4000-8000-000000000001'and tribe_id='fe340000-0000-4000-8000-000000000001'),
 'elapsed_ms',round(extract(epoch from(clock_timestamp()-current_setting('soma.race_started')::timestamptz))*1000))evidence;
commit;
-- SESSION A: DUPLICATE
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','fe330000-0000-4000-8000-000000000001',true);
select set_config('soma.member_result',public.join_tribe('fe340000-0000-4000-8000-000000000002')::text,true);
select pg_sleep(10);
select jsonb_build_object('session',pg_backend_pid(),'case','duplicate-A','member',current_setting('soma.member_result')::jsonb)evidence;
commit;
-- SESSION B: DUPLICATE
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','fe330000-0000-4000-8000-000000000001',true);
select set_config('soma.race_started',clock_timestamp()::text,true);
select jsonb_build_object('session',pg_backend_pid(),'case','duplicate-B','member',public.join_tribe('fe340000-0000-4000-8000-000000000002'),
 'elapsed_ms',round(extract(epoch from(clock_timestamp()-current_setting('soma.race_started')::timestamptz))*1000))evidence;
commit;
-- Before the REPEATABLE READ pair only, expire the named SYNTHETIC fixture guard.
-- Do not run against any real account. This is not an application RPC.
-- Verify raw_user_meta_data.task='membership-030-concurrency' first, then:
-- update spot_private.tribe_rejoin_guards set rejoin_not_before=clock_timestamp()-interval '1 millisecond'
-- where user_id='fe330000-0000-4000-8000-000000000001'and tribe_id='fe340000-0000-4000-8000-000000000001';
-- SESSION A: STRICT
begin isolation level repeatable read;
set local role authenticated;
select set_config('request.jwt.claim.sub','fe330000-0000-4000-8000-000000000001',true);
select public.join_tribe('fe340000-0000-4000-8000-000000000004');
select pg_sleep(10);
select jsonb_build_object('session',pg_backend_pid(),'case','strict-A','result','PASS: third membership')evidence;
commit;
-- SESSION B: STRICT
begin isolation level repeatable read;
set local role authenticated;
select set_config('request.jwt.claim.sub','fe330000-0000-4000-8000-000000000001',true);
select set_config('soma.race_started',clock_timestamp()::text,true);
do $$begin
 begin perform public.join_tribe('fe340000-0000-4000-8000-000000000001');raise exception 'STRICT_FOURTH_ALLOWED';
 exception when serialization_failure then perform set_config('soma.strict_result','40001',true);end;
end$$;
select jsonb_build_object('session',pg_backend_pid(),'case','strict-B','result',current_setting('soma.strict_result'),
 'elapsed_ms',round(extract(epoch from(clock_timestamp()-current_setting('soma.race_started')::timestamptz))*1000))evidence;
commit;
