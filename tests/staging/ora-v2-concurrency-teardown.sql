begin;
select spot_private.board_lock();select spot_private.photo_owner_lock('fe323000-0000-4000-8000-000000000001');
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'NOT_STAGING';end if;
 if exists(select 1 from auth.users where id='fe323000-0000-4000-8000-000000000001'and raw_user_meta_data->>'task'is distinct from 'ora-032-concurrency')
  or exists(select 1 from public.venues where id::text like 'fe324000-%'and name not like 'ORA CONCURRENCY SYNTHETIC %')
  or exists(select 1 from storage.objects where bucket_id='profile-photos'and name like 'fe323000-0000-4000-8000-000000000001/%')
 then raise exception 'CONCURRENCY_TEARDOWN_REVIEW';end if;
end$$;
-- Only this named synthetic principal and the metadata created by setup.
delete from auth.users where id='fe323000-0000-4000-8000-000000000001';
delete from spot_private.photo_lifecycle_sets where user_id='fe323000-0000-4000-8000-000000000001';
delete from spot_private.photo_cutover_audit where owner_id='fe323000-0000-4000-8000-000000000001';
delete from public.venues where id::text like 'fe324000-%';
update spot_private.soma_v2_control set ora_enabled=false where singleton;
commit;
select 'PASS: concurrency fixture removed' evidence,
 (select count(*)from auth.users where id='fe323000-0000-4000-8000-000000000001')residual_auth,
 (select count(*)from spot_private.tribe_memberships where user_id='fe323000-0000-4000-8000-000000000001')residual_memberships,
 (select count(*)from spot_private.tribe_account_state where user_id='fe323000-0000-4000-8000-000000000001')residual_state,
 (select count(*)from spot_private.tribe_rejoin_guards where user_id='fe323000-0000-4000-8000-000000000001')residual_guards;
