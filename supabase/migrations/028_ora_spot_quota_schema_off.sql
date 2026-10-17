begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
-- ORA counters only. No existing table, function, policy, writer or data changes.
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging') then
  raise exception 'ORA_QUOTA_STAGING_ONLY';
 end if;
 if current_setting('supabase.project_ref',true) is not null
    and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho' then
  raise exception 'ORA_QUOTA_PROJECT_MISMATCH';
 end if;
 if not exists(select 1 from spot_private.soma_v2_control where singleton
  and not membership_enabled and not ora_enabled and not spot_enabled
  and not discovery_enabled and not comments_enabled and not requests_enabled
  and not system_posts_enabled and not share_enabled and jobs_paused) then
  raise exception 'ORA_QUOTA_REQUIRES_SCHEMA_OFF';
 end if;
end$$;

create table spot_private.ora_spot_policy (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 timezone text not null default 'Europe/Rome' check(timezone='Europe/Rome'),
 daily_limit integer not null default 5 check(daily_limit>0),
 place_daily_limit integer not null default 3 check(place_daily_limit>0 and place_daily_limit<=daily_limit),
 quota_retention interval check(quota_retention>interval '0')
);
insert into spot_private.ora_spot_policy(singleton) values(true);

create table spot_private.ora_spot_daily_quota (
 user_id uuid references auth.users(id) on delete cascade,
 local_date date,
 used integer not null default 0 check(used>=0),
 primary key(user_id,local_date)
);
create table spot_private.ora_spot_place_quota (
 user_id uuid,
 place_id uuid references public.venues(id) on delete cascade,
 local_date date,
 used integer not null default 0 check(used>=0),
 primary key(user_id,place_id,local_date),
 foreign key(user_id,local_date) references spot_private.ora_spot_daily_quota(user_id,local_date) on delete cascade
);
create index ora_spot_place_account_day on spot_private.ora_spot_place_quota(user_id,local_date);

-- No product policies or service grants until an explicitly authorized writer exists.
alter table spot_private.ora_spot_policy enable row level security;
alter table spot_private.ora_spot_daily_quota enable row level security;
alter table spot_private.ora_spot_place_quota enable row level security;
revoke all on table spot_private.ora_spot_policy,spot_private.ora_spot_daily_quota,
 spot_private.ora_spot_place_quota from public,anon,authenticated,service_role;
-- No upper cap CHECK: future atomic writer reads the mutable private policy.
-- No receipts, click history, retention default, RPC, trigger, scheduler or backfill.
commit;
