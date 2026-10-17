-- Post-backfill 027/028 structural + data gate; original pre-backfill checker remains unchanged.
begin isolation level repeatable read read only;
do $$declare t text;r record;n integer;begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'NOT_STAGING';end if;
 if(select count(*)from spot_private.soma_v2_control)<>1 or not exists(select 1 from spot_private.soma_v2_control
  where jobs_paused and not membership_enabled and not ora_enabled and not spot_enabled and not discovery_enabled
  and not comments_enabled and not requests_enabled and not system_posts_enabled and not share_enabled)
  or(select count(*)from spot_private.discovery_policy)<>1
  or exists(select 1 from spot_private.discovery_policy where enabled or not paused or morning_start is not null or afternoon_start is not null or nightly_end is not null
   or exposure_retention is not null or fairness_retention is not null or pair_memory_retention is not null)
 then raise exception 'BACKFILL_FEATURE_NOT_OFF';end if;
 foreach t in array array['soma_v2_control','tribe_catalog','tribe_account_state','tribe_rejoin_guards','discovery_policy',
  'discovery_windows','discovery_allocations','discovery_exposures','discovery_fairness_buckets','discovery_pair_memory',
  'board_comments','board_preferences','board_request_attempts','board_request_quota','board_comment_quota','board_romantic_requests','board_request_pair_guards',
  'ora_spot_policy','ora_spot_daily_quota','ora_spot_place_quota']loop
  select c.oid,c.relrowsecurity into r from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='spot_private'and c.relname=t;
  if not found or not r.relrowsecurity then raise exception 'MISSING_OR_NO_RLS: %',t;end if;
  if exists(select 1 from pg_policy where polrelid=r.oid)
   or has_table_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   or has_table_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   or has_table_privilege('service_role',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  then raise exception 'UNEXPECTED_GRANT: %',t;end if;
  if t not in('soma_v2_control','discovery_policy','tribe_catalog','tribe_account_state','ora_spot_policy')then
   execute format('select count(*)from spot_private.%I',t)into n;if n<>0 then raise exception 'UNEXPECTED_DATA: %',t;end if;
  end if;
 end loop;
 if(select count(*)from public.venues)<>2 or(select count(*)from spot_private.tribe_catalog)<>2
  or exists(select 1 from public.venues v left join spot_private.tribe_catalog c on c.id=v.id
   where c.id is null or not c.active or not c.joinable or v.linked_tribe_id is distinct from v.id or v.ora_enabled is not null)
  or(select count(*)from spot_private.tribe_memberships)<>2
  or exists(select 1 from spot_private.tribe_memberships where membership_id is distinct from md5('soma-staging-029:membership:'||user_id::text||':'||venue_id::text)::uuid
   or membership_source is distinct from 'legacy'or last_checkin_at is not null)
  or(select count(*)from spot_private.tribe_account_state)<>2
  or exists(select 1 from spot_private.tribe_account_state s where configuration_state<>'legacy_closed'or configuration_started_at is not null or revision<>0
   or not exists(select 1 from spot_private.tribe_memberships m where m.user_id=s.user_id))
 then raise exception 'TRIBE_BACKFILL';end if;
 if(select count(*)from public.checkins)<>2 or exists(select 1 from public.checkins where
  presence_id is distinct from md5('soma-staging-029:presence:'||user_id::text||':'||venue_id::text)::uuid or presence_source is distinct from 'legacy'
  or expires_at>now()or expires_at<>checked_in_at+interval '90 minutes')
  or not exists(select 1 from pg_constraint where conrelid='public.checkins'::regclass and conname='checkins_check'and convalidated)
 then raise exception 'PRESENCE_BACKFILL';end if;
 if(select count(*)from spot_private.interests)<>2 or exists(select 1 from spot_private.interests i where
  interest_id is distinct from md5('soma-staging-029:interest:'||sender_id::text||':'||recipient_id::text||':'||venue_id::text)::uuid
  or origin_kind is distinct from 'legacy'or logical_status is distinct from 'matched'
  or origin_membership_id is not null or origin_presence_id is not null or origin_window_id is not null
  or invalidated_at is not null or invalidation_reason is not null or operation_id is not null or sender_checkin is not null
  or not exists(select 1 from public.matches m where m.user_a=least(i.sender_id,i.recipient_id)and m.user_b=greatest(i.sender_id,i.recipient_id)and m.venue_id=i.venue_id))
  or(select count(*)from public.matches)<>1 or(select count(*)from public.messages)<>2
 then raise exception 'INTEREST_BACKFILL';end if;
end$$;
select 'PASS: 029 backfill; 2 catalog / 2 legacy states / 2 memberships / 2 expired presences / 2 matched legacy interests; features OFF' evidence;
rollback;
