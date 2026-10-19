select jsonb_build_object(
'project','zjinjtkekmaqtxsuyvho',
'discovery_enabled',(select discovery_enabled from spot_private.soma_v2_control),
'fixture_accounts',(select count(*)from auth.users where id::text like 'fea37000-%'),
'fixture_storage',(select count(*)from storage.objects where bucket_id='profile-photos'and name like 'fea37000-%'),
'dd_rows',(select count(*)from spot_private.discovery_exposures),
'wall_clock_guard',strpos(pg_get_functiondef('spot_private.dd_exposure_authorized(uuid,uuid,uuid)'::regprocedure),'clock_timestamp()')>0,
'atomic_tribe_charge',strpos(pg_get_functiondef('public.send_spot_v2(uuid,uuid,text,uuid)'::regprocedure),'dd_charge_spot')>0,
'anon_rpc_execute',has_function_privilege('anon','public.my_daily_discovery()','execute'),
'authenticated_rpc_execute',has_function_privilege('authenticated','public.my_daily_discovery()','execute'),
'private_helper_execute',has_function_privilege('authenticated','spot_private.dd_build(uuid)','execute'),
'photo',(select jsonb_build_object('phase',phase,'epoch',epoch,'cleanup',execute_enabled,'scheduler',scheduler_enabled)from spot_private.photo_cutover_control))evidence;
