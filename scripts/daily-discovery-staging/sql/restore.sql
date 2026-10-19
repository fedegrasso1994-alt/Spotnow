begin;select spot_private.board_lock();
do $$begin if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'STAGING_ONLY';end if;if exists(select 1 from auth.users where id::text like 'fea37000-%')then raise exception 'FIXTURE_ACCOUNTS_REMAIN';end if;end$$;
update spot_private.soma_v2_control set discovery_enabled=false;
update spot_private.discovery_policy set enabled=false,paused=true,exposure_retention=null,fairness_retention=null,pair_memory_retention=null where version=1;
delete from spot_private.discovery_windows where id in('fea37300-0000-4000-8000-000000000001','fea37300-0000-4000-8000-000000000002');
delete from spot_private.tribe_catalog where id='fea37100-0000-4000-8000-000000000001';
delete from public.venues where id='fea37100-0000-4000-8000-000000000001';
commit;select 'Restored original disabled policy; synthetic windows and catalog removed' evidence;
