begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
-- Data-only, snapshot-specific staging migration. No runtime activation or DDL.
do $$declare
 t text;before_data jsonb;after_data jsonb;changes jsonb:='{}';n integer;
 places uuid[]:=array['29484f62-7716-4d61-9f24-d8e54e04e876'::uuid,'dbaab572-ad0e-4928-ab68-bb371cef9381'::uuid];
begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'BACKFILL_STAGING_ONLY';end if;
 if current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho'then raise exception 'BACKFILL_PROJECT_MISMATCH';end if;
 -- Match the established Board/retention lock ordering, then exclude legacy writes.
 perform spot_private.board_lock();
 lock table auth.users,public.profiles,public.venues,public.checkins,spot_private.tribe_memberships,
  spot_private.interests,public.matches,public.messages,public.blocks in share row exclusive mode;
 foreach t in array array['soma_v2_control','tribe_catalog','tribe_account_state','tribe_rejoin_guards',
  'discovery_policy','discovery_windows','discovery_allocations','discovery_exposures','discovery_fairness_buckets','discovery_pair_memory',
  'board_posts','board_reactions','board_reports','board_quota','board_receipts','board_audit','board_evidence',
  'board_comments','board_preferences','board_request_attempts','board_request_quota','board_comment_quota','board_romantic_requests','board_request_pair_guards',
  'ora_spot_policy','ora_spot_daily_quota','ora_spot_place_quota','reports','suspensions','safety_holds']loop
  execute format('lock table spot_private.%I in share row exclusive mode',t);
 end loop;
 if not exists(select 1 from spot_private.soma_v2_control where singleton and jobs_paused
  and not membership_enabled and not ora_enabled and not spot_enabled and not discovery_enabled
  and not comments_enabled and not requests_enabled and not system_posts_enabled and not share_enabled)
  or(select count(*)from spot_private.soma_v2_control)<>1
  or(select count(*)from spot_private.discovery_policy)<>1
  or exists(select 1 from spot_private.discovery_policy where enabled or not paused or morning_start is not null or afternoon_start is not null or nightly_end is not null)
  or(select count(*)from spot_private.ora_spot_policy)<>1
  or not exists(select 1 from spot_private.ora_spot_policy where not enabled and timezone='Europe/Rome'and daily_limit=5 and place_daily_limit=3 and quota_retention is null)
 then raise exception 'BACKFILL_FEATURE_NOT_OFF';end if;
 foreach t in array array['tribe_rejoin_guards','discovery_windows','discovery_allocations','discovery_exposures','discovery_fairness_buckets','discovery_pair_memory',
  'board_posts','board_reactions','board_reports','board_quota','board_receipts','board_audit','board_evidence',
  'board_comments','board_preferences','board_request_attempts','board_request_quota','board_comment_quota','board_romantic_requests','board_request_pair_guards',
  'ora_spot_daily_quota','ora_spot_place_quota','reports','suspensions','safety_holds']loop
  execute format('select count(*)from spot_private.%I',t)into n;
  if n<>0 then raise exception 'BACKFILL_UNEXPECTED_DATA: %',t;end if;
 end loop;
 if(select count(*)from auth.users)<>3 or(select count(*)from public.profiles)<>3
  or(select count(*)from public.venues)<>2 or(select count(*)from public.venues where id=any(places)and active)<>2
  or(select count(*)from spot_private.tribe_memberships)<>2
  or(select count(distinct user_id)from spot_private.tribe_memberships)<>2
  or exists(select 1 from spot_private.tribe_memberships where venue_id<>places[2]or last_checkin_at is not null)
  or(select count(*)from public.checkins)<>2
  or exists(select 1 from public.checkins where expires_at>now()or expires_at<>checked_in_at+interval '90 minutes'or venue_id<>places[2])
  or(select count(*)from spot_private.interests)<>2 or(select count(*)from public.matches)<>1
  or(select count(*)from public.messages)<>2 or exists(select 1 from public.blocks)
  or exists(select 1 from spot_private.account_deletions)
 then raise exception 'BACKFILL_SNAPSHOT_DRIFT';end if;
 if exists(select 1 from public.checkins c where not exists(select 1 from spot_private.tribe_memberships m where m.user_id=c.user_id and m.venue_id=c.venue_id))
  or exists(select 1 from spot_private.interests i where i.sender_checkin is not null or i.venue_id<>places[2]
   or not exists(select 1 from spot_private.interests r where r.sender_id=i.recipient_id and r.recipient_id=i.sender_id and r.venue_id=i.venue_id)
   or not exists(select 1 from public.matches m where m.user_a=least(i.sender_id,i.recipient_id)and m.user_b=greatest(i.sender_id,i.recipient_id)and m.venue_id=i.venue_id))
 then raise exception 'BACKFILL_RELATION_DRIFT';end if;
 -- Existing populated values must be exactly this backfill, never silently replaced.
 if(select count(*)from spot_private.tribe_catalog)not in(0,2)or(select count(*)from spot_private.tribe_account_state)not in(0,2)
  or exists(select 1 from public.venues where ora_enabled is not null or(linked_tribe_id is not null and linked_tribe_id<>id))
  or exists(select 1 from spot_private.tribe_catalog where id<>all(places)or not active or not joinable)
  or exists(select 1 from spot_private.tribe_account_state s where configuration_state<>'legacy_closed'or configuration_started_at is not null or revision<>0
   or not exists(select 1 from spot_private.tribe_memberships m where m.user_id=s.user_id))
  or exists(select 1 from spot_private.tribe_memberships where
   (membership_id is not null and membership_id<>md5('soma-staging-029:membership:'||user_id::text||':'||venue_id::text)::uuid)
   or(membership_source is not null and membership_source<>'legacy'))
  or exists(select 1 from public.checkins where
   (presence_id is not null and presence_id<>md5('soma-staging-029:presence:'||user_id::text||':'||venue_id::text)::uuid)
   or(presence_source is not null and presence_source<>'legacy'))
  or exists(select 1 from spot_private.interests where
   (interest_id is not null and interest_id<>md5('soma-staging-029:interest:'||sender_id::text||':'||recipient_id::text||':'||venue_id::text)::uuid)
   or(origin_kind is not null and origin_kind<>'legacy')or(logical_status is not null and logical_status<>'matched')
   or origin_membership_id is not null or origin_presence_id is not null or origin_window_id is not null
   or invalidated_at is not null or invalidation_reason is not null or operation_id is not null)
 then raise exception 'BACKFILL_VALUE_CONFLICT';end if;
 select jsonb_build_object(
  'profiles',(select jsonb_agg(to_jsonb(p)order by id)from public.profiles p),
  'venues',(select jsonb_agg(to_jsonb(v)-'linked_tribe_id'order by id)from public.venues v),
  'memberships',(select jsonb_agg(to_jsonb(m)-'membership_id'-'membership_source'order by user_id,venue_id)from spot_private.tribe_memberships m),
  'checkins',(select jsonb_agg(to_jsonb(c)-'presence_id'-'presence_source'order by user_id)from public.checkins c),
  'interests',(select jsonb_agg(to_jsonb(i)-'interest_id'-'origin_kind'-'logical_status'order by sender_id,recipient_id,venue_id)from spot_private.interests i),
  'matches',(select jsonb_agg(to_jsonb(m)order by id)from public.matches m),
  'messages',(select jsonb_agg(to_jsonb(m)order by id)from public.messages m)
 )into before_data;

 insert into spot_private.tribe_catalog(id,active,joinable)select id,true,true from public.venues where id=any(places)on conflict(id)do nothing;
 get diagnostics n=row_count;changes:=changes||jsonb_build_object('catalog_inserted',n);
 update public.venues set linked_tribe_id=id where id=any(places)and linked_tribe_id is null;
 get diagnostics n=row_count;changes:=changes||jsonb_build_object('venues_updated',n);
 update spot_private.tribe_memberships set membership_id=coalesce(membership_id,md5('soma-staging-029:membership:'||user_id::text||':'||venue_id::text)::uuid),membership_source='legacy'
  where membership_id is null or membership_source is null;
 get diagnostics n=row_count;changes:=changes||jsonb_build_object('memberships_updated',n);
 insert into spot_private.tribe_account_state(user_id,configuration_state)select distinct user_id,'legacy_closed'from spot_private.tribe_memberships on conflict(user_id)do nothing;
 get diagnostics n=row_count;changes:=changes||jsonb_build_object('account_states_inserted',n);
 update public.checkins set presence_id=coalesce(presence_id,md5('soma-staging-029:presence:'||user_id::text||':'||venue_id::text)::uuid),presence_source='legacy'
  where presence_id is null or presence_source is null;
 get diagnostics n=row_count;changes:=changes||jsonb_build_object('presences_updated',n);
 update spot_private.interests set interest_id=coalesce(interest_id,md5('soma-staging-029:interest:'||sender_id::text||':'||recipient_id::text||':'||venue_id::text)::uuid),origin_kind='legacy',logical_status='matched'
  where interest_id is null or origin_kind is null or logical_status is null;
 get diagnostics n=row_count;changes:=changes||jsonb_build_object('interests_updated',n);

 if(select count(*)from spot_private.tribe_catalog)<>2 or(select count(*)from spot_private.tribe_account_state)<>2
  or(select count(*)from public.venues where linked_tribe_id=id)<>2
  or(select count(*)from spot_private.tribe_memberships where membership_id is not null and membership_source='legacy')<>2
  or(select count(*)from public.checkins where presence_id is not null and presence_source='legacy'and expires_at<=now())<>2
  or(select count(*)from spot_private.interests where interest_id is not null and origin_kind='legacy'and logical_status='matched')<>2
 then raise exception 'BACKFILL_POST_ASSERT';end if;
 select jsonb_build_object(
  'profiles',(select jsonb_agg(to_jsonb(p)order by id)from public.profiles p),
  'venues',(select jsonb_agg(to_jsonb(v)-'linked_tribe_id'order by id)from public.venues v),
  'memberships',(select jsonb_agg(to_jsonb(m)-'membership_id'-'membership_source'order by user_id,venue_id)from spot_private.tribe_memberships m),
  'checkins',(select jsonb_agg(to_jsonb(c)-'presence_id'-'presence_source'order by user_id)from public.checkins c),
  'interests',(select jsonb_agg(to_jsonb(i)-'interest_id'-'origin_kind'-'logical_status'order by sender_id,recipient_id,venue_id)from spot_private.interests i),
  'matches',(select jsonb_agg(to_jsonb(m)order by id)from public.matches m),
  'messages',(select jsonb_agg(to_jsonb(m)order by id)from public.messages m)
 )into after_data;
 if before_data is distinct from after_data then raise exception 'BACKFILL_LEGACY_CHANGED';end if;
 perform set_config('soma.backfill029_result',changes::text,true);
end$$;
select current_setting('soma.backfill029_result')::jsonb backfill_changes;
commit;
