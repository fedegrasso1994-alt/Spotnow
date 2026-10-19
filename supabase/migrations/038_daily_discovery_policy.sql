begin;
set local lock_timeout='5s';set local statement_timeout='60s';
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'DD_STAGING_ONLY';end if;
 if exists(select 1 from spot_private.soma_v2_control where discovery_enabled)then raise exception 'DD_REQUIRES_OFF';end if;
 if exists(select 1 from spot_private.discovery_windows where ends_at>clock_timestamp()and state in('draft','building','ready'))then raise exception 'DD_ACTIVE_WINDOW';end if;
end$$;
select spot_private.board_lock();
-- Configuration only. No activation, scheduling, backfill or cleanup.
insert into spot_private.discovery_policy(version,enabled,paused,morning_start,afternoon_start,nightly_end,exposure_retention,fairness_retention,pair_memory_retention)
values(2,false,true,'08:00','16:00','00:00',interval '30 days',interval '30 days',interval '30 days');

-- Explicit local civil boundaries, converted individually to UTC: never add a fixed24h.
create function spot_private.dd_clock_at(stamp timestamptz)returns table(local_date date,slot text,starts_at timestamptz,ends_at timestamptz,next_window_starts_at timestamptz)
language sql stable security definer set search_path=''as $$
 with x as(select stamp at time zone 'Europe/Rome' local),p as(select * from spot_private.discovery_policy where version=2),c as(
 select x.local::date d,case when x.local::time<p.morning_start then null when x.local::time<p.afternoon_start then 'morning'else 'afternoon'end s,p.*from x cross join p)
 select d,s,case when s='morning'then(d+morning_start)at time zone 'Europe/Rome'when s='afternoon'then(d+afternoon_start)at time zone 'Europe/Rome'end,
 case when s='morning'then(d+afternoon_start)at time zone 'Europe/Rome'when s='afternoon'then((d+1)+nightly_end)at time zone 'Europe/Rome'end,
 case when s is null then(d+morning_start)at time zone 'Europe/Rome'when s='morning'then(d+afternoon_start)at time zone 'Europe/Rome'else((d+1)+morning_start)at time zone 'Europe/Rome'end from c;
$$;
create or replace function spot_private.dd_insert_pair()returns trigger language plpgsql security definer set search_path=''as $$declare w spot_private.discovery_windows;p spot_private.discovery_policy;u uuid;day_used bigint;stamp timestamptz:=clock_timestamp();memory spot_private.discovery_pair_memory;begin
 if current_setting('transaction_isolation')<>'read committed'then raise exception 'DD_ISOLATION'using errcode='25000';end if;
 perform spot_private.board_lock();select * into w from spot_private.discovery_windows where id=new.window_id;
 select * into p from spot_private.discovery_policy where version=w.policy_version;
 if (w.state is null or w.state not in('building','ready'))or w.starts_at>stamp or w.ends_at<=stamp or not p.enabled or p.paused or p.fairness_retention is null or p.pair_memory_retention is null then raise exception 'DD_PAIR_CONTEXT';end if;
 if not coalesce(spot_private.dd_pair_eligible(new.user_a,new.user_b,new.tribe_id),false)or not exists(select 1 from spot_private.tribe_memberships where membership_id=new.membership_a and user_id=new.user_a and venue_id=new.tribe_id)or not exists(select 1 from spot_private.tribe_memberships where membership_id=new.membership_b and user_id=new.user_b and venue_id=new.tribe_id)then raise exception 'DD_PAIR_CONTEXT';end if;
 select * into memory from spot_private.discovery_pair_memory where user_a=new.user_a and user_b=new.user_b;
 if memory.last_exposed_at>stamp-interval '72 hours'or(memory.last_exposed_at at time zone 'Europe/Rome')::date=w.local_date then raise exception 'DD_RECURRENCE';end if;
 foreach u in array array[new.user_a,new.user_b]loop
  select coalesce(sum(a.exposure_count),0)into day_used from spot_private.discovery_allocations a join spot_private.discovery_windows d on d.id=a.window_id where a.user_id=u and d.local_date=w.local_date;
  if day_used>=8 then raise exception 'DD_DAY_EXPOSURES';end if;
  update spot_private.discovery_allocations set exposure_count=exposure_count+1 where window_id=w.id and user_id=u and exposure_count<4;
  if not found then raise exception 'DD_WINDOW_EXPOSURES';end if;
  insert into spot_private.discovery_fairness_buckets(user_id,bucket_date,opportunities,exposures,purge_after)values(u,w.local_date,0,1,stamp+p.fairness_retention)
  on conflict(user_id,bucket_date)do update set exposures=discovery_fairness_buckets.exposures+1,purge_after=greatest(discovery_fairness_buckets.purge_after,excluded.purge_after);
 end loop;
 insert into spot_private.discovery_pair_memory(user_a,user_b,last_exposed_at,purge_after)values(new.user_a,new.user_b,stamp,stamp+p.pair_memory_retention)
 on conflict(user_a,user_b)do update set last_exposed_at=excluded.last_exposed_at,purge_after=excluded.purge_after;
 return new;
end$$;
create or replace function spot_private.dd_build(window_id uuid)returns void language plpgsql volatile security definer set search_path=''as $$declare
 w spot_private.discovery_windows;p spot_private.discovery_policy;person uuid;candidate record;phase integer;stamp timestamptz;remaining bigint;exhausted uuid[];new_users uuid[];initial boolean;
begin
 if current_setting('transaction_isolation')<>'read committed'then raise exception 'DD_ISOLATION'using errcode='25000';end if;
 perform spot_private.board_lock();stamp:=clock_timestamp();select * into w from spot_private.discovery_windows d where d.id=dd_build.window_id for update;
 initial:=w.state='draft';
 if w.state not in('draft','ready')or w.state is null or w.starts_at>stamp or w.ends_at<=stamp then raise exception 'DD_WINDOW_UNAVAILABLE';end if;
 perform 1 from spot_private.soma_v2_control where discovery_enabled for share;if not found then raise exception 'DD_PAUSED';end if;
 select * into p from spot_private.discovery_policy where version=w.policy_version for share;
 if p.enabled is distinct from true or p.paused or p.exposure_retention is null or p.fairness_retention is null or p.pair_memory_retention is null then raise exception 'DD_POLICY_INCOMPLETE';end if;
 if initial then update spot_private.discovery_windows set state='building',generation_id=coalesce(generation_id,gen_random_uuid())where id=w.id returning * into w;end if;
 -- Same sorted owner-lock order as Spot/retention; no profile row locks (avoids UPDATE-trigger inversion).
 for person in select distinct m.user_id from spot_private.tribe_memberships m join spot_private.tribe_catalog c on c.id=m.venue_id and c.active join public.venues v on v.id=c.id and v.active where spot_private.ora_eligible(m.user_id)order by m.user_id loop
  perform spot_private.photo_owner_lock(person);
 end loop;
 with admitted as(
 insert into spot_private.discovery_allocations(window_id,user_id)
 select w.id,m.user_id from spot_private.tribe_memberships m join spot_private.tribe_catalog c on c.id=m.venue_id and c.active join public.venues v on v.id=c.id and v.active where spot_private.ora_eligible(m.user_id)group by m.user_id
 on conflict do nothing returning user_id)
 select coalesce(array_agg(user_id),array[]::uuid[])into new_users from admitted;
 if cardinality(new_users)=0 then if initial then update spot_private.discovery_windows set state='ready',lease_until=null where id=w.id;end if;return;end if;
 insert into spot_private.discovery_fairness_buckets(user_id,bucket_date,opportunities,exposures,purge_after)
 select a.user_id,w.local_date,1,0,stamp+p.fairness_retention from spot_private.discovery_allocations a where a.window_id=w.id and a.user_id=any(new_users)
 on conflict(user_id,bucket_date)do update set opportunities=discovery_fairness_buckets.opportunities+1,purge_after=greatest(discovery_fairness_buckets.purge_after,excluded.purge_after);
 -- Tier1 >= target / unseen. Tier2 >=72h only after fresh reciprocal inventory is exhausted.
 for phase in 0..1 loop
  exhausted:=array[]::uuid[];
  loop
  select a.user_id into person from spot_private.discovery_allocations a left join lateral(select sum(f.exposures)load from spot_private.discovery_fairness_buckets f where f.user_id=a.user_id and f.purge_after>stamp)f on true where a.window_id=w.id and a.exposure_count<4 and not(a.user_id=any(exhausted)) order by coalesce(f.load,0),md5(w.generation_id::text||a.user_id::text)limit 1;
  exit when not found;
   select 8-coalesce(sum(a.exposure_count),0)into remaining from spot_private.discovery_allocations a join spot_private.discovery_windows d on d.id=a.window_id where a.user_id=person and d.local_date=w.local_date;
   if remaining<=0 then exhausted:=array_append(exhausted,person);continue;end if;
   select q.* into candidate from(
    select distinct on(other.user_id)other.user_id,own.venue_id,own.membership_id mine,other.membership_id theirs
    from spot_private.tribe_memberships own join spot_private.tribe_memberships other on other.venue_id=own.venue_id and other.user_id<>own.user_id
    join spot_private.tribe_catalog catalog on catalog.id=own.venue_id and catalog.active join public.venues venue on venue.id=catalog.id and venue.active
    where own.user_id=person and own.membership_id is not null and other.membership_id is not null order by other.user_id,own.venue_id
   )q join spot_private.discovery_allocations a on a.user_id=q.user_id and a.window_id=w.id and a.exposure_count<4
   left join spot_private.discovery_pair_memory memory on memory.user_a=least(person,q.user_id)and memory.user_b=greatest(person,q.user_id)
   left join lateral(select coalesce(sum(f.exposures),0)load from spot_private.discovery_fairness_buckets f where f.user_id=q.user_id and f.purge_after>stamp)fair on true
   where (person=any(new_users)or q.user_id=any(new_users))and spot_private.dd_pair_eligible(person,q.user_id,q.venue_id)
   and not exists(select 1 from spot_private.discovery_exposures e where e.window_id=w.id and e.user_a=least(person,q.user_id)and e.user_b=greatest(person,q.user_id))
   and coalesce((memory.last_exposed_at at time zone 'Europe/Rome')::date<>w.local_date,true)
   and (memory.last_exposed_at is null or memory.last_exposed_at<=stamp-case when phase=0 then p.recurrence_target else interval '72 hours'end)
   and (select coalesce(sum(x.exposure_count),0)from spot_private.discovery_allocations x join spot_private.discovery_windows d on d.id=x.window_id where x.user_id=q.user_id and d.local_date=w.local_date)<8
   order by fair.load,memory.last_exposed_at nulls first,
    (select count(*)from spot_private.discovery_exposures e where e.window_id=w.id and e.tribe_id=q.venue_id and person in(e.user_a,e.user_b)),
    md5(w.generation_id::text||least(person,q.user_id)::text||greatest(person,q.user_id)::text)
   limit 1;
   if found then
    insert into spot_private.discovery_exposures(window_id,user_a,user_b,tribe_id,membership_a,membership_b)
    values(w.id,least(person,candidate.user_id),greatest(person,candidate.user_id),candidate.venue_id,
     case when person<candidate.user_id then candidate.mine else candidate.theirs end,case when person<candidate.user_id then candidate.theirs else candidate.mine end);
   else exhausted:=array_append(exhausted,person);
   end if;
  end loop;
 end loop;
 if clock_timestamp()>=w.ends_at then raise exception 'DD_WINDOW_ELAPSED';end if;
 update spot_private.discovery_windows set state='ready',lease_until=null where id=w.id;
end$$;


-- Keep the proven projection private; no second authenticated bypass RPC remains.
alter function public.my_daily_discovery()set schema spot_private;
alter function spot_private.my_daily_discovery()rename to dd_current_projection;
revoke all on function spot_private.dd_current_projection()from public,anon,authenticated,service_role;
create function public.my_daily_discovery()returns jsonb language plpgsql volatile security definer set search_path=''as $$declare
 stamp timestamptz;c record;w spot_private.discovery_windows;r jsonb;timing jsonb;p spot_private.discovery_policy;
begin
 if current_setting('transaction_isolation')<>'read committed'then raise exception 'DD_ISOLATION'using errcode='25000';end if;
 if auth.uid()is null or not coalesce(spot_private.ora_eligible(auth.uid()),false)then raise exception 'DD_ACCOUNT'using errcode='42501';end if;
 perform spot_private.board_lock();stamp:=clock_timestamp();select * into c from spot_private.dd_clock_at(stamp);
 select * into p from spot_private.discovery_policy where version=2;
 if p.morning_start is distinct from time '08:00'or p.afternoon_start is distinct from time '16:00'or p.nightly_end is distinct from time '00:00'then raise exception 'DD_POLICY_CLOCK';end if;
 timing:=jsonb_build_object('server_now',stamp,'local_date',c.local_date,'starts_at',c.starts_at,'ends_at',c.ends_at,'current_window_end',c.ends_at,'next_window_starts_at',c.next_window_starts_at,'next_transition_at',coalesce(c.ends_at,c.next_window_starts_at));
 if not exists(select 1 from spot_private.soma_v2_control where discovery_enabled)or not p.enabled or p.paused then return jsonb_build_object('status','paused','profiles','[]'::jsonb)||timing;end if;
 if c.slot is null then return jsonb_build_object('status','waiting_window','profiles','[]'::jsonb)||timing;end if;
 if not exists(select 1 from spot_private.tribe_memberships m join spot_private.tribe_catalog t on t.id=m.venue_id and t.active join public.venues v on v.id=t.id and v.active where m.user_id=auth.uid())then return jsonb_build_object('status','tribe_required','profiles','[]'::jsonb)||timing;end if;
 insert into spot_private.discovery_windows(local_date,slot,policy_version,starts_at,ends_at)values(c.local_date,c.slot,2,c.starts_at,c.ends_at)on conflict(local_date,slot)do nothing;
 select * into w from spot_private.discovery_windows where local_date=c.local_date and slot=c.slot;
 if w.policy_version<>2 or w.starts_at<>c.starts_at or w.ends_at<>c.ends_at or w.state not in('draft','ready')then raise exception 'DD_POLICY_WINDOW_CONFLICT';end if;
 r:=spot_private.dd_current_projection();
 if clock_timestamp()>=c.ends_at then raise exception 'DD_WINDOW_ELAPSED';end if;
 return r||timing||jsonb_build_object('server_now',clock_timestamp());
end$$;
revoke all on function public.my_daily_discovery()from public,anon,authenticated,service_role;
grant execute on function public.my_daily_discovery()to authenticated;
revoke all on function spot_private.dd_clock_at(timestamptz)from public,anon,authenticated,service_role;

-- Retention readiness only: bounded, read-only preview. NO delete executor or scheduler.
create index discovery_window_retention on spot_private.discovery_windows(ends_at,id)where state in('ready','closed');
create index discovery_fairness_retention on spot_private.discovery_fairness_buckets(purge_after,user_id);
create index discovery_memory_retention on spot_private.discovery_pair_memory(purge_after,user_a,user_b);
create function spot_private.dd_retention_held(kind text,target text,people uuid[],window_id uuid default null)returns boolean language sql stable security definer set search_path=''as $$
 select spot_private.retention_held(kind,target)
 or(window_id is not null and spot_private.retention_held('dd_windows',window_id::text))
 or exists(select 1 from unnest(people)u where spot_private.retention_held('dd_account',u::text));
$$;
create function spot_private.dd_retention_preview(batch_limit integer default 100)returns jsonb language plpgsql volatile security definer set search_path=''as $$declare p spot_private.discovery_policy;stamp timestamptz;items jsonb;begin
 if batch_limit is null or batch_limit<1 or batch_limit>500 then raise exception 'DD_RETENTION_LIMIT';end if;
 perform spot_private.board_lock();perform pg_advisory_xact_lock(hashtextextended('privacy-retention',23));
 stamp:=clock_timestamp();select * into p from spot_private.discovery_policy where version=2;
 if p.exposure_retention is null or p.fairness_retention is null or p.pair_memory_retention is null then raise exception 'DD_POLICY_INCOMPLETE';end if;
 with candidates as(
 select 'dd_exposures'kind,e.id::text target,w.ends_at+p.exposure_retention due,
 spot_private.dd_retention_held('dd_exposures',e.id::text,array[e.user_a,e.user_b],w.id)held
 from spot_private.discovery_exposures e join spot_private.discovery_windows w on w.id=e.window_id where w.ends_at<=stamp-p.exposure_retention and w.state in('ready','closed')and w.lease_until is null
 union all
 select 'dd_allocations',a.window_id::text||'/'||a.user_id::text,w.ends_at+p.exposure_retention,
 spot_private.dd_retention_held('dd_allocations',a.window_id::text||'/'||a.user_id::text,array[a.user_id],w.id)
 or exists(select 1 from spot_private.discovery_exposures e where e.window_id=w.id and a.user_id in(e.user_a,e.user_b)and spot_private.dd_retention_held('dd_exposures',e.id::text,array[e.user_a,e.user_b],w.id))
 from spot_private.discovery_allocations a join spot_private.discovery_windows w on w.id=a.window_id where w.ends_at<=stamp-p.exposure_retention and w.state in('ready','closed')and w.lease_until is null
 union all
 select 'dd_windows',w.id::text,w.ends_at+p.exposure_retention,spot_private.retention_held('dd_windows',w.id::text)
 from spot_private.discovery_windows w where w.ends_at<=stamp-p.exposure_retention and w.state in('ready','closed')and w.lease_until is null
 and not exists(select 1 from spot_private.discovery_exposures e where e.window_id=w.id)and not exists(select 1 from spot_private.discovery_allocations a where a.window_id=w.id)
 union all
 select 'dd_pair_memory',m.user_a::text||'/'||m.user_b::text,m.last_exposed_at+p.pair_memory_retention,
 spot_private.dd_retention_held('dd_pair_memory',m.user_a::text||'/'||m.user_b::text,array[m.user_a,m.user_b])
 from spot_private.discovery_pair_memory m where m.last_exposed_at<=stamp-p.pair_memory_retention and m.purge_after<=stamp
 union all
 select 'dd_fairness',f.user_id::text||'/'||f.bucket_date::text,f.purge_after,
 spot_private.dd_retention_held('dd_fairness',f.user_id::text||'/'||f.bucket_date::text,array[f.user_id])
 from spot_private.discovery_fairness_buckets f where f.purge_after<=stamp
 ),limited as(select *from candidates order by due,kind,target limit batch_limit)
 select coalesce(jsonb_agg(jsonb_build_object('category',kind,'held',held,'count',n)),'[]'::jsonb)into items from(select kind,held,count(*)n from limited group by kind,held order by kind,held)x;
 return jsonb_build_object('dry_run',true,'purge_executor_installed',false,'batch_limit',batch_limit,'counts',items,'jobs_paused',(select jobs_paused from spot_private.soma_v2_control),'retention_paused',(select paused from spot_private.retention_control),'review_windows',(select count(*)from(select 1 from spot_private.discovery_windows where ends_at<=stamp-p.exposure_retention and(state in('building','failed')or lease_until is not null)limit batch_limit)x));
end$$;
revoke all on function spot_private.dd_retention_held(text,text,uuid[],uuid),spot_private.dd_retention_preview(integer)from public,anon,authenticated,service_role;
notify pgrst,'reload schema';commit;
