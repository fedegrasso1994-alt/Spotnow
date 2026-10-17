-- Read-only post-027 gate. Does not create fixtures, call writers or enable features.
begin isolation level repeatable read read only;
do $$declare t text;r record;n integer;begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'NOT_STAGING';end if;
 if (select count(*)from spot_private.soma_v2_control)<>1 or exists(
  select 1 from spot_private.soma_v2_control where membership_enabled or ora_enabled or spot_enabled or discovery_enabled
  or comments_enabled or requests_enabled or system_posts_enabled or share_enabled or not jobs_paused
 )then raise exception 'FEATURE_NOT_OFF';end if;
 if (select count(*)from spot_private.discovery_policy)<>1 or exists(select 1 from spot_private.discovery_policy where enabled or not paused
  or morning_start is not null or afternoon_start is not null or nightly_end is not null
  or exposure_retention is not null or fairness_retention is not null or pair_memory_retention is not null)then raise exception 'POLICY_NOT_OFF';end if;
 foreach t in array array['soma_v2_control','tribe_catalog','tribe_account_state','tribe_rejoin_guards',
 'discovery_policy','discovery_windows','discovery_allocations','discovery_exposures','discovery_fairness_buckets','discovery_pair_memory',
 'board_comments','board_preferences','board_request_attempts','board_request_quota','board_comment_quota','board_romantic_requests','board_request_pair_guards']loop
  select c.oid,c.relrowsecurity into r from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='spot_private'and c.relname=t;
  if not found or not r.relrowsecurity then raise exception 'MISSING_OR_NO_RLS: %',t;end if;
  if exists(select 1 from pg_policy where polrelid=r.oid)then raise exception 'UNEXPECTED_POLICY: %',t;end if;
  if has_table_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   or has_table_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   or has_table_privilege('service_role',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  then raise exception 'UNEXPECTED_GRANT: %',t;end if;
  if t not in('soma_v2_control','discovery_policy')then
   execute format('select count(*)from spot_private.%I',t)into n;
   if n<>0 then raise exception 'UNEXPECTED_DATA: %',t;end if;
  end if;
 end loop;
 if exists(select 1 from public.venues where ora_enabled is not null or linked_tribe_id is not null)
  or exists(select 1 from spot_private.tribe_memberships where membership_id is not null or membership_source is not null)
  or exists(select 1 from public.checkins where presence_id is not null or presence_source is not null)
  or exists(select 1 from spot_private.interests where interest_id is not null or origin_kind is not null or origin_membership_id is not null
   or origin_presence_id is not null or origin_window_id is not null or logical_status is not null or invalidated_at is not null or invalidation_reason is not null or operation_id is not null)
  or exists(select 1 from spot_private.board_posts where post_kind is not null or editorial_key is not null)
  or exists(select 1 from spot_private.board_reactions where comment_id is not null)
  or exists(select 1 from spot_private.board_reports where comment_id is not null)
  or exists(select 1 from spot_private.board_audit where content_kind is not null or comment_id is not null or romantic_request_id is not null)
  or exists(select 1 from spot_private.board_evidence where content_kind is not null)
 then raise exception 'UNEXPECTED_BACKFILL';end if;
 if not exists(select 1 from pg_constraint where conrelid='public.checkins'::regclass and conname='checkins_check'and convalidated)
  or exists(select 1 from public.checkins where expires_at<>checked_in_at+interval '90 minutes')then raise exception 'LEGACY_CHECKIN';end if;
end$$;
select 'PASS: 17 private tables; 15 empty; two OFF configuration rows; no backfill' evidence;
rollback;
