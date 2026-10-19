select jsonb_build_object(
'windows',(select count(*)from spot_private.discovery_windows),
'allocations',(select count(*)from spot_private.discovery_allocations),
'pair_rows',(select count(*)from spot_private.discovery_exposures),
'baseline_users_allocated',(select count(*)from spot_private.discovery_allocations where user_id::text not like 'fea37000-%'),
'asymmetric_counts',(select count(*)from spot_private.discovery_allocations a where exposure_count<>(select count(*)from spot_private.discovery_exposures e where e.window_id=a.window_id and a.user_id in(e.user_a,e.user_b))),
'over_window_degree',(select count(*)from spot_private.discovery_allocations where exposure_count>4),
'over_day_degree',(select count(*)from(select user_id,sum(exposure_count)n from spot_private.discovery_allocations group by user_id having sum(exposure_count)>8)x),
'over_window_spots',(select count(*)from spot_private.discovery_allocations where spots_used>2),
'over_day_spots',(select count(*)from(select user_id,sum(spots_used)n from spot_private.discovery_allocations group by user_id having sum(spots_used)>4)x),
'a_spots',(select sum(spots_used)from spot_private.discovery_allocations where user_id='fea37000-0000-4000-8000-000000000001'),
'duplicate_pairs',(select count(*)from(select window_id,user_a,user_b from spot_private.discovery_exposures group by window_id,user_a,user_b having count(*)>1)x),
'auth_private_read',has_table_privilege('authenticated','spot_private.discovery_exposures','select'),
'photo',(select jsonb_build_object('phase',phase,'epoch',epoch,'cleanup',execute_enabled,'scheduler',scheduler_enabled)from spot_private.photo_cutover_control)
)evidence;
