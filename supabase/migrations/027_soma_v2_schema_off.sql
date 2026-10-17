begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
-- Schema preparation ONLY. No backfill, product RPC, worker, trigger or scheduler.
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging') then
  raise exception 'SOMA_V2_STAGING_ONLY';
 end if;
 -- The environment row alone is insufficient on a real hosted database.
 if current_setting('supabase.project_ref',true) is not null
    and current_setting('supabase.project_ref',true) <> 'zjinjtkekmaqtxsuyvho' then
  raise exception 'SOMA_V2_PROJECT_MISMATCH';
 end if;
end$$;

create table spot_private.soma_v2_control (
 singleton boolean primary key default true check(singleton),
 membership_enabled boolean not null default false,
 ora_enabled boolean not null default false,
 spot_enabled boolean not null default false,
 discovery_enabled boolean not null default false,
 comments_enabled boolean not null default false,
 requests_enabled boolean not null default false,
 system_posts_enabled boolean not null default false,
 share_enabled boolean not null default false,
 jobs_paused boolean not null default true
);
insert into spot_private.soma_v2_control(singleton) values(true);

create table spot_private.tribe_catalog (
 id uuid primary key references public.venues(id) on delete cascade,
 active boolean not null default false,
 joinable boolean not null default false
);
create table spot_private.tribe_account_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 configuration_state text not null check(configuration_state in('unstarted','started','legacy_closed')),
 configuration_started_at timestamptz,
 revision bigint not null default 0 check(revision>=0),
 check((configuration_state='started')=(configuration_started_at is not null))
);
create table spot_private.tribe_rejoin_guards (
 user_id uuid references auth.users(id) on delete cascade,
 tribe_id uuid references spot_private.tribe_catalog(id) on delete cascade,
 rejoin_not_before timestamptz not null,
 primary key(user_id,tribe_id)
);

-- All appended legacy columns deliberately have no default and remain NULL.
alter table public.venues
 add column ora_enabled boolean,
 add column linked_tribe_id uuid references spot_private.tribe_catalog(id) on delete set null;
alter table spot_private.tribe_memberships
 add column membership_id uuid,
 add column membership_source text check(membership_source in('manual','qr','legacy'));
create unique index tribe_membership_identity_v2 on spot_private.tribe_memberships(membership_id);
alter table public.checkins
 add column presence_id uuid,
 add column presence_source text check(presence_source in('manual','qr','legacy','unknown'));
create unique index presence_identity_v2 on public.checkins(presence_id);
-- checkins_check (exactly 90 minutes) is intentionally untouched.

create table spot_private.discovery_policy (
 version bigint primary key check(version>0),
 enabled boolean not null default false,
 paused boolean not null default true,
 timezone text not null default 'Europe/Rome' check(timezone='Europe/Rome'),
 morning_start time,
 afternoon_start time,
 nightly_end time,
 recurrence_floor interval not null default interval '72 hours' check(recurrence_floor=interval '72 hours'),
 recurrence_target interval not null default interval '168 hours' check(recurrence_target>=recurrence_floor),
 exposure_retention interval check(exposure_retention>interval '0'),
 fairness_retention interval check(fairness_retention>interval '0'),
 pair_memory_retention interval check(pair_memory_retention>=recurrence_target)
);
insert into spot_private.discovery_policy(version) values(1);
create table spot_private.discovery_windows (
 id uuid primary key default gen_random_uuid(),
 local_date date not null,
 slot text not null check(slot in('morning','afternoon')),
 policy_version bigint not null references spot_private.discovery_policy(version),
 starts_at timestamptz not null,
 ends_at timestamptz not null check(ends_at>starts_at),
 state text not null default 'draft' check(state in('draft','building','ready','closed','failed')),
 generation_id uuid,
 lease_until timestamptz,
 unique(local_date,slot)
);
create table spot_private.discovery_allocations (
 window_id uuid references spot_private.discovery_windows(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 exposure_count integer not null default 0 check(exposure_count>=0),
 spots_used integer not null default 0 check(spots_used>=0),
 primary key(window_id,user_id)
);
create table spot_private.discovery_exposures (
 id uuid primary key default gen_random_uuid(),
 window_id uuid not null references spot_private.discovery_windows(id) on delete cascade,
 user_a uuid not null references auth.users(id) on delete cascade,
 user_b uuid not null references auth.users(id) on delete cascade,
 tribe_id uuid not null references spot_private.tribe_catalog(id) on delete cascade,
 membership_a uuid not null references spot_private.tribe_memberships(membership_id) on delete cascade,
 membership_b uuid not null references spot_private.tribe_memberships(membership_id) on delete cascade,
 check(user_a<user_b)
);
-- Pair/day uniqueness, degree caps and membership correspondence require the future engine.
create index discovery_exposure_window_a on spot_private.discovery_exposures(window_id,user_a);
create index discovery_exposure_window_b on spot_private.discovery_exposures(window_id,user_b);
create table spot_private.discovery_fairness_buckets (
 user_id uuid references auth.users(id) on delete cascade,
 bucket_date date,
 opportunities integer not null default 0 check(opportunities>=0),
 exposures integer not null default 0 check(exposures>=0),
 purge_after timestamptz not null,
 primary key(user_id,bucket_date)
);
create table spot_private.discovery_pair_memory (
 user_a uuid references auth.users(id) on delete cascade,
 user_b uuid references auth.users(id) on delete cascade,
 last_exposed_at timestamptz not null,
 purge_after timestamptz not null check(purge_after>last_exposed_at),
 primary key(user_a,user_b),check(user_a<user_b)
);

alter table spot_private.interests
 add column interest_id uuid,
 add column origin_kind text check(origin_kind in('ora','tribe','discovery','legacy','unknown')),
 add column origin_membership_id uuid references spot_private.tribe_memberships(membership_id) on delete set null,
 add column origin_presence_id uuid references public.checkins(presence_id) on delete set null,
 add column origin_window_id uuid references spot_private.discovery_windows(id) on delete set null,
 add column logical_status text check(logical_status in('pending','matched','expired','invalidated')),
 add column invalidated_at timestamptz,
 add column invalidation_reason text check(invalidation_reason in('membership_left','account_ineligible','safety','expired')),
 add column operation_id uuid;
create unique index interest_identity_v2 on spot_private.interests(interest_id);
-- No pending-pair unique index or new idempotency semantics in this phase.

create table spot_private.board_comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references spot_private.board_posts(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(body)>0 and body=btrim(body)),
 created_at timestamptz not null default clock_timestamp(),
 hidden boolean not null default false,
 removed_at timestamptz,
 revision bigint not null default 0 check(revision>=0)
);
create index board_comment_post_page on spot_private.board_comments(post_id,created_at,id);
create table spot_private.board_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 receive_romantic_requests boolean not null
);
create table spot_private.board_request_quota (
 user_id uuid references auth.users(id) on delete cascade,
 day date,
 used integer not null default 0 check(used>=0),
 primary key(user_id,day)
);
create table spot_private.board_comment_quota (
 user_id uuid references auth.users(id) on delete cascade,
 venue_id uuid references public.venues(id) on delete cascade,
 bucket_start timestamptz,
 used integer not null default 0 check(used>=0),
 primary key(user_id,venue_id,bucket_start)
);
create table spot_private.board_request_attempts (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 fingerprint text not null,
 origin_post_id uuid references spot_private.board_posts(id) on delete set null,
 origin_comment_id uuid references spot_private.board_comments(id) on delete set null,
 created_at timestamptz not null default clock_timestamp(),
 state text not null default 'queued' check(state in('queued','processing','completed','review','failed')),
 claim_token uuid,
 lease_until timestamptz,
 attempts integer not null default 0 check(attempts>=0),
 purge_after timestamptz not null,
 check(num_nonnulls(origin_post_id,origin_comment_id)<=1),
 unique(sender_id,operation_id)
);
create table spot_private.board_romantic_requests (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid unique references spot_private.board_request_attempts(id) on delete set null,
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 venue_id uuid references public.venues(id) on delete set null,
 origin_kind text not null check(origin_kind in('post','comment')),
 origin_post_id uuid references spot_private.board_posts(id) on delete set null,
 origin_comment_id uuid references spot_private.board_comments(id) on delete set null,
 created_at timestamptz not null,
 expires_at timestamptz not null check(expires_at>created_at),
 status text not null default 'pending' check(status in('pending','accepted','declined','expired','invalidated')),
 resolved_at timestamptz,
 purge_after timestamptz not null,
 check(sender_id<>recipient_id),
 check(num_nonnulls(origin_post_id,origin_comment_id)<=1)
);
create index board_request_inbox on spot_private.board_romantic_requests(recipient_id,created_at,id);
create index board_request_pair on spot_private.board_romantic_requests(sender_id,recipient_id);
create table spot_private.board_request_pair_guards (
 user_a uuid references auth.users(id) on delete cascade,
 user_b uuid references auth.users(id) on delete cascade,
 retry_not_before timestamptz not null,
 purge_after timestamptz not null check(purge_after>=retry_not_before),
 primary key(user_a,user_b),check(user_a<user_b)
);

alter table spot_private.board_posts
 add column post_kind text check(post_kind in('user','system')),
 add column editorial_key text;
-- author_id NOT NULL stays in place. No system post can be published yet.
alter table spot_private.board_reactions
 add column comment_id uuid references spot_private.board_comments(id) on delete cascade;
-- Existing (post_id,user_id) PK and all four emoji remain unchanged.
alter table spot_private.board_reports
 add column comment_id uuid references spot_private.board_comments(id) on delete cascade;
alter table spot_private.board_audit
 add column content_kind text check(content_kind in('post','comment','request')),
 add column comment_id uuid references spot_private.board_comments(id) on delete set null,
 add column romantic_request_id uuid references spot_private.board_romantic_requests(id) on delete set null;
alter table spot_private.board_evidence
 add column content_kind text check(content_kind in('post','comment','request'));
-- Existing post IDs use gen_random_uuid(): no share token, table or tracking chain.

-- No policies: even accidentally inherited schema USAGE grants cannot expose rows.
-- Service role receives NO new grants. Owner/admin DDL remains the only writer here.
do $$declare t text;begin
 foreach t in array array[
  'soma_v2_control','tribe_catalog','tribe_account_state','tribe_rejoin_guards',
  'discovery_policy','discovery_windows','discovery_allocations','discovery_exposures',
  'discovery_fairness_buckets','discovery_pair_memory',
  'board_comments','board_preferences','board_request_attempts','board_request_quota',
  'board_comment_quota','board_romantic_requests','board_request_pair_guards'
 ]loop
  execute format('alter table spot_private.%I enable row level security',t);
  execute format('revoke all on table spot_private.%I from public,anon,authenticated,service_role',t);
 end loop;
end$$;
commit;
