-- Run only after all three synthetic users completed the normal delete-account flow.
begin;select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')
 or exists(select 1 from auth.users where id::text like 'fea47000-%')
 or exists(select 1 from profiles where id::text like 'fea47000-%')
 or exists(select 1 from storage.objects where bucket_id='profile-photos'and name like 'fea47000-%')
 or exists(select 1 from spot_private.tribe_memberships where user_id::text like 'fea47000-%'or venue_id::text like 'fea47000-%')
 or exists(select 1 from spot_private.board_posts where venue_id::text like 'fea47000-%'and coalesce(post_kind,'user')='user')
 or exists(select 1 from spot_private.qod_answer_claims where user_id::text like 'fea47000-%')then raise exception 'QOD_FIXTURE_DELETE_INCOMPLETE';end if;
 if exists(select 1 from spot_private.board_reports r join spot_private.board_posts p on p.id=r.post_id where p.venue_id::text like 'fea47000-%')then raise exception 'QOD_SYNTHETIC_REPORT_REVIEW_REQUIRED';end if;
end$$;
-- Only editorial fixture questions remain, with no peer author or active dependent data.
delete from spot_private.board_posts where venue_id in('fea47000-0000-4000-9000-000000000001','fea47000-0000-4000-9000-000000000002')and post_kind='system'and author_id is null;
delete from spot_private.tribe_catalog where id::text like 'fea47000-%';
delete from venues where id::text like 'fea47000-%'and name like 'SYNTHETIC QOD 047 %'and address='Synthetic isolated staging only';
update spot_private.soma_v2_control set system_posts_enabled=false where singleton;
commit;
select jsonb_build_object(
'accounts',(select count(*)from auth.users),'profiles',(select count(*)from profiles),'objects',(select count(*)from storage.objects),'posts',(select count(*)from spot_private.board_posts),
'fixture_auth',(select count(*)from auth.users where id::text like 'fea47000-%'),'fixture_profiles',(select count(*)from profiles where id::text like 'fea47000-%'),
'fixture_sessions',(select count(*)from auth.sessions where user_id::text like 'fea47000-%'),
'fixture_storage',(select count(*)from storage.objects where name like 'fea47000-%'),
'fixture_venues',(select count(*)from venues where id::text like 'fea47000-%'),
'fixture_posts',(select count(*)from spot_private.board_posts where venue_id::text like 'fea47000-%'),
'fixture_claims',(select count(*)from spot_private.qod_answer_claims where user_id::text like 'fea47000-%'),
'fixture_receipts',(select count(*)from spot_private.board_receipts where user_id::text like 'fea47000-%'),
'fixture_comment_quota',(select count(*)from spot_private.board_comment_quota where user_id::text like 'fea47000-%'),
'fixture_romantic_attempts',(select count(*)from spot_private.board_request_attempts where sender_id::text like 'fea47000-%'),
'legacy_quota_rows',(select count(*)from spot_private.board_quota),
'missing_current',(select count(*)from profiles p where p.photo_path is not null and not exists(select 1 from storage.objects s where s.bucket_id='profile-photos'and s.name=p.photo_path)),
'photo_receipts',(select jsonb_agg(jsonb_build_object('state',state,'writer',writer,'quota_reserved',reserved_bytes))from spot_private.photo_lifecycle_sets where user_id::text like 'fea47000-%'),
'qod_enabled',(select system_posts_enabled from spot_private.soma_v2_control),'discovery',(select discovery_enabled from spot_private.soma_v2_control),'jobs_paused',(select jobs_paused from spot_private.soma_v2_control),
'cleanup',(select execute_enabled from spot_private.photo_cutover_control),'scheduler',(select scheduler_enabled from spot_private.photo_cutover_control),'retention_paused',(select paused from spot_private.retention_control),
'rate_md5',md5(pg_get_functiondef('spot_private.spotted_rate()'::regprocedure)),'create_md5',md5(pg_get_functiondef('public.spotted_create_post(uuid,text,uuid)'::regprocedure))
) qod_postflight;
select jsonb_build_object(
'comments',(select count(*)from spot_private.board_comments where author_id::text like 'fea47000-%'),
'likes',(select count(*)from spot_private.board_likes where user_id::text like 'fea47000-%'),
'reports',(select count(*)from spot_private.board_reports where reporter_id::text like 'fea47000-%'),
'romantic_requests',(select count(*)from spot_private.board_romantic_requests where sender_id::text like 'fea47000-%'or recipient_id::text like 'fea47000-%'),
'romantic_guards',(select count(*)from spot_private.board_request_pair_guards where user_a::text like 'fea47000-%'or user_b::text like 'fea47000-%'),
'romantic_quota',(select count(*)from spot_private.board_request_quota where user_id::text like 'fea47000-%'),
'preferences',(select count(*)from spot_private.board_preferences where user_id::text like 'fea47000-%'),
'matches',(select count(*)from matches where user_a::text like 'fea47000-%'or user_b::text like 'fea47000-%'),
'messages',(select count(*)from messages where sender_id::text like 'fea47000-%'),
'memberships',(select count(*)from spot_private.tribe_memberships where user_id::text like 'fea47000-%'),
'validated_photos',(select count(*)from spot_private.validated_photos where user_id::text like 'fea47000-%')
) fixture_dependencies;
