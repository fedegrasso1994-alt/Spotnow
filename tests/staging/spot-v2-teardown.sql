begin;
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'NOT_STAGING';end if;
 if exists(select 1 from auth.users where id::text like 'fea34000-%'and raw_user_meta_data->>'task'is distinct from 'spot-034')or exists(select 1 from public.venues where id::text like 'fea34100-%'and name not like 'SPOT SYNTHETIC %')or exists(select 1 from storage.objects where name like 'fea34000-%')then raise exception 'TEARDOWN_REVIEW';end if;
end$$;
delete from auth.users where id::text like 'fea34000-%';
delete from spot_private.photo_lifecycle_sets where user_id::text like 'fea34000-%';
delete from spot_private.photo_cutover_audit where owner_id::text like 'fea34000-%';
delete from public.venues where id::text like 'fea34100-%';
delete from spot_private.discovery_windows where id='fea34200-0000-4000-8000-000000000001';
commit;
select 'PASS teardown' evidence,(select count(*)from auth.users where id::text like 'fea34000-%')auth_residue,
(select count(*)from spot_private.spot_v2_intents where sender_id::text like 'fea34000-%'or recipient_id::text like 'fea34000-%')intent_residue,
(select count(*)from spot_private.spot_v2_operations where sender_id::text like 'fea34000-%'or recipient_id::text like 'fea34000-%')receipt_residue,
(select count(*)from spot_private.ora_spot_daily_quota where user_id::text like 'fea34000-%')quota_residue,
(select count(*)from storage.objects where name like 'fea34000-%')storage_residue;
