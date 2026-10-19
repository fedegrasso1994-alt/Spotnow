select jsonb_build_object(
'lifecycle_purged',(select count(*)from spot_private.photo_lifecycle_sets where user_id::text like 'fea37000-%'and state='purged'),
'cleanup_completed',(select count(*)from spot_private.photo_cleanup_accounts where user_id::text like 'fea37000-%'and state='completed'),
'cutover_attempts',(select count(*)from spot_private.photo_cutover_attempts where user_id::text like 'fea37000-%'),
'cutover_deletions',(select count(*)from spot_private.photo_cutover_deletions where user_id::text like 'fea37000-%'),
'cutover_audit',(select count(*)from spot_private.photo_cutover_audit where owner_id::text like 'fea37000-%'),
'account_deletions',(select count(*)from spot_private.account_deletions where user_id::text like 'fea37000-%'),
'validated',(select count(*)from spot_private.validated_photos where user_id::text like 'fea37000-%'),
'assets',(select count(*)from spot_private.photo_assets where user_id::text like 'fea37000-%'),
'fixture_places',(select count(*)from venues where id='fea37100-0000-4000-8000-000000000001'),
'fixture_codes',(select count(*)from spot_private.venue_codes where venue_id='fea37100-0000-4000-8000-000000000001'),
'fixture_catalog',(select count(*)from spot_private.tribe_catalog where id='fea37100-0000-4000-8000-000000000001')
) evidence;
