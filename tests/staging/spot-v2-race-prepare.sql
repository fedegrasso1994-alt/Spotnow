-- Prepend: begin; set local soma.spot_race='place|global|retry|reciprocal|existing';
-- Only known disposable fixture principals. All real rows are out of scope.
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or
 (select count(*)from auth.users where id::text like 'fea34000-%'and raw_user_meta_data->>'task'='spot-034')<>12
 or current_setting('soma.spot_race')not in('place','global','retry','reciprocal','existing')then raise exception 'RACE_FIXTURE_SCOPE';end if;
end$$;
delete from public.matches where user_a::text like 'fea34000-%'and user_b::text like 'fea34000-%';
delete from spot_private.spot_v2_intents where sender_id::text like 'fea34000-%'and recipient_id::text like 'fea34000-%';
delete from spot_private.spot_v2_operations where sender_id::text like 'fea34000-%';
delete from spot_private.ora_spot_daily_quota where user_id::text like 'fea34000-%';
do $$declare u uuid;n integer;mode text:=current_setting('soma.spot_race');begin
 for u in select id from auth.users where id::text like 'fea34000-%'loop perform set_config('request.jwt.claim.sub',u::text,true);perform public.start_ora_manual('fea34100-0000-4000-8000-000000000001');end loop;
 perform set_config('request.jwt.claim.sub','fea34000-0000-4000-8000-000000000001',true);
 if mode in('place','global')then
  for n in 2..case when mode='global'then 4 else 3 end loop perform public.send_spot_v2(('fea34000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,gen_random_uuid());end loop;
 end if;
 if mode='global'then
  for n in 5..7 loop perform set_config('request.jwt.claim.sub',('fea34000-0000-4000-8000-'||lpad(n::text,12,'0')),true);perform public.start_ora_manual('fea34100-0000-4000-8000-000000000002');end loop;
  perform set_config('request.jwt.claim.sub','fea34000-0000-4000-8000-000000000001',true);perform public.start_ora_manual('fea34100-0000-4000-8000-000000000002');perform public.send_spot_v2('fea34000-0000-4000-8000-000000000005',gen_random_uuid());
 end if;
 if mode='existing'then perform public.send_spot_v2('fea34000-0000-4000-8000-000000000002',gen_random_uuid());perform set_config('request.jwt.claim.sub','fea34000-0000-4000-8000-000000000002',true);perform public.send_spot_v2('fea34000-0000-4000-8000-000000000001',gen_random_uuid());end if;
end$$;
commit;
select 'PASS race baseline '||current_setting('soma.spot_race',true)evidence;
