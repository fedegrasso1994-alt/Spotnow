begin;
set local lock_timeout='5s';set local statement_timeout='60s';
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'DD_STAGING_ONLY';end if;
 if exists(select 1 from spot_private.soma_v2_control where discovery_enabled)then raise exception 'DD_REQUIRES_OFF';end if;
end$$;
select spot_private.board_lock();
-- Existing two slots/day + per-window caps bound totals; explicit daily checks remain defense in depth.
alter table spot_private.discovery_allocations add constraint discovery_degree_cap check(exposure_count between 0 and 4),add constraint discovery_spot_cap check(spots_used between 0 and 2);
create unique index discovery_pair_once_window on spot_private.discovery_exposures(window_id,user_a,user_b);
create index discovery_allocation_owner on spot_private.discovery_allocations(user_id,window_id);
create index discovery_windows_interval on spot_private.discovery_windows(starts_at,ends_at);

create function spot_private.dd_pair_eligible(a uuid,b uuid,tribe uuid)returns boolean language sql stable security definer set search_path=''as $$
 select a<>b and spot_private.ora_eligible(a)and spot_private.ora_eligible(b)
 and exists(select 1 from public.profiles p join public.profiles q on q.id=b where p.id=a and(p.preference='ALL'or p.preference=q.gender)and(q.preference='ALL'or q.preference=p.gender))
 and exists(select 1 from spot_private.tribe_catalog c join public.venues v on v.id=c.id where c.id=tribe and c.active and v.active)
 and exists(select 1 from spot_private.tribe_memberships where user_id=a and venue_id=tribe)
 and exists(select 1 from spot_private.tribe_memberships where user_id=b and venue_id=tribe)
 and not exists(select 1 from public.blocks where(blocker_id=a and blocked_id=b)or(blocker_id=b and blocked_id=a))
 and not exists(select 1 from public.matches where user_a=least(a,b)and user_b=greatest(a,b));
$$;
create function spot_private.dd_exposure_authorized(exposure uuid,viewer uuid,target uuid)returns boolean language sql stable security definer set search_path=''as $$
 select exists(select 1 from spot_private.soma_v2_control where discovery_enabled)
 and exists(select 1 from spot_private.discovery_exposures e
 join spot_private.discovery_windows w on w.id=e.window_id
 join spot_private.discovery_policy p on p.version=w.policy_version and p.enabled and not p.paused
 join spot_private.tribe_memberships a on a.membership_id=e.membership_a and a.user_id=e.user_a and a.venue_id=e.tribe_id
 join spot_private.tribe_memberships b on b.membership_id=e.membership_b and b.user_id=e.user_b and b.venue_id=e.tribe_id
 where e.id=exposure and e.user_a=least(viewer,target)and e.user_b=greatest(viewer,target)
 and w.state='ready'and w.starts_at<=statement_timestamp()and w.ends_at>statement_timestamp()
 and spot_private.dd_pair_eligible(viewer,target,e.tribe_id));
$$;
-- Match remains authorized independently through the existing Match branch.
create or replace function spot_private.profile_dd_authorized(target uuid)returns boolean language sql stable security definer set search_path=''as $$
 select exists(select 1 from spot_private.discovery_exposures e where(e.user_a=auth.uid()and e.user_b=target or e.user_b=auth.uid()and e.user_a=target)and spot_private.dd_exposure_authorized(e.id,auth.uid(),target));
$$;
create function spot_private.dd_window_guard()returns trigger language plpgsql security definer set search_path=''as $$begin
 perform spot_private.board_lock();
 if new.local_date<>(new.starts_at at time zone 'Europe/Rome')::date or new.ends_at>((new.local_date+1)::timestamp at time zone 'Europe/Rome')then raise exception 'DD_WINDOW_DAY';end if;
 if exists(select 1 from spot_private.discovery_windows w where w.id<>new.id and w.starts_at<new.ends_at and w.ends_at>new.starts_at and w.state in('draft','building','ready')and new.state in('draft','building','ready'))then raise exception 'DD_WINDOW_OVERLAP';end if;
 if tg_op='UPDATE'and old.state in('ready','closed')and(new.local_date<>old.local_date or new.starts_at<>old.starts_at or new.ends_at<>old.ends_at or new.policy_version<>old.policy_version or new.generation_id is distinct from old.generation_id or new.state not in('ready','closed')or(old.state='closed'and new.state<>'closed'))then raise exception 'DD_WINDOW_IMMUTABLE';end if;
 return new;
end$$;
create trigger discovery_window_guard before insert or update on spot_private.discovery_windows for each row execute function spot_private.dd_window_guard();

create function spot_private.dd_insert_pair()returns trigger language plpgsql security definer set search_path=''as $$declare w spot_private.discovery_windows;p spot_private.discovery_policy;u uuid;day_used bigint;stamp timestamptz:=clock_timestamp();memory spot_private.discovery_pair_memory;begin
 if current_setting('transaction_isolation')<>'read committed'then raise exception 'DD_ISOLATION'using errcode='25000';end if;
 perform spot_private.board_lock();select * into w from spot_private.discovery_windows where id=new.window_id;
 select * into p from spot_private.discovery_policy where version=w.policy_version;
 if w.state is distinct from 'building'or w.starts_at>stamp or w.ends_at<=stamp or not p.enabled or p.paused or p.fairness_retention is null or p.pair_memory_retention is null then raise exception 'DD_PAIR_CONTEXT';end if;
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
create trigger discovery_insert_pair before insert on spot_private.discovery_exposures for each row execute function spot_private.dd_insert_pair();

-- Whole-window snapshot. Ready is a terminal allocation: new members / safety removals never refill it.
create function spot_private.dd_build(window_id uuid)returns void language plpgsql volatile security definer set search_path=''as $$declare
 w spot_private.discovery_windows;p spot_private.discovery_policy;person uuid;candidate record;phase integer;stamp timestamptz;remaining bigint;exhausted uuid[];
begin
 if current_setting('transaction_isolation')<>'read committed'then raise exception 'DD_ISOLATION'using errcode='25000';end if;
 perform spot_private.board_lock();stamp:=clock_timestamp();select * into w from spot_private.discovery_windows d where d.id=dd_build.window_id for update;
 if w.state='ready'then return;end if;
 if w.state is distinct from 'draft'or w.starts_at>stamp or w.ends_at<=stamp then raise exception 'DD_WINDOW_UNAVAILABLE';end if;
 perform 1 from spot_private.soma_v2_control where discovery_enabled for share;if not found then raise exception 'DD_PAUSED';end if;
 select * into p from spot_private.discovery_policy where version=w.policy_version for share;
 if p.enabled is distinct from true or p.paused or p.exposure_retention is null or p.fairness_retention is null or p.pair_memory_retention is null then raise exception 'DD_POLICY_INCOMPLETE';end if;
 update spot_private.discovery_windows set state='building',generation_id=coalesce(generation_id,gen_random_uuid())where id=w.id returning * into w;
 -- Same sorted owner-lock order as Spot/retention; no profile row locks (avoids UPDATE-trigger inversion).
 for person in select distinct m.user_id from spot_private.tribe_memberships m join spot_private.tribe_catalog c on c.id=m.venue_id and c.active join public.venues v on v.id=c.id and v.active where spot_private.ora_eligible(m.user_id)order by m.user_id loop
  perform spot_private.photo_owner_lock(person);
 end loop;
 insert into spot_private.discovery_allocations(window_id,user_id)
 select w.id,m.user_id from spot_private.tribe_memberships m join spot_private.tribe_catalog c on c.id=m.venue_id and c.active join public.venues v on v.id=c.id and v.active where spot_private.ora_eligible(m.user_id)group by m.user_id;
 insert into spot_private.discovery_fairness_buckets(user_id,bucket_date,opportunities,exposures,purge_after)
 select a.user_id,w.local_date,1,0,stamp+p.fairness_retention from spot_private.discovery_allocations a where a.window_id=w.id
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
   where spot_private.dd_pair_eligible(person,q.user_id,q.venue_id)
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

create function spot_private.dd_charge_spot(window_id uuid)returns void language plpgsql volatile security definer set search_path=''as $$declare d date;used bigint;begin
 -- Called inside send_spot_v2 only for an actually NEW intent, after its global/pair locks.
 select w.local_date into d from spot_private.discovery_windows w where w.id=dd_charge_spot.window_id;
 if d is distinct from(clock_timestamp()at time zone 'Europe/Rome')::date then raise exception 'DD_WINDOW_UNAVAILABLE';end if;
 select coalesce(sum(a.spots_used),0)into used from spot_private.discovery_allocations a join spot_private.discovery_windows w on w.id=a.window_id where a.user_id=auth.uid()and w.local_date=d;
 if used>=4 then raise exception 'DD_DAY_SPOTS';end if;
 update spot_private.discovery_allocations a set spots_used=a.spots_used+1 where a.window_id=dd_charge_spot.window_id and a.user_id=auth.uid()and a.spots_used<2;
 if not found then raise exception 'DD_WINDOW_SPOTS';end if;
end$$;
-- Narrow patch at existing atomic NEW-intent branch. ORA/idempotency/Match remain unchanged.
do $$declare body text;old text;begin
 body:=pg_get_functiondef('public.send_spot_v2(uuid,uuid,text,uuid)'::regprocedure);
 old:='if not exists(select 1 from public.profiles a join public.profiles b on b.id=target_user where a.id=me and(a.preference=''ALL''or a.preference=b.gender))then';
 if strpos(body,old)=0 or strpos(body,E'   end if;\n   insert into spot_private.spot_v2_intents')=0 then raise exception 'DD_SPOT_DEPENDENCY';end if;
 body:=replace(body,old,'if not spot_private.dd_exposure_authorized(exp.id,me,target_user)then');
 body:=replace(body,E'   end if;\n   insert into spot_private.spot_v2_intents',E'   else\n    perform spot_private.dd_charge_spot(exp.window_id);\n   end if;\n   insert into spot_private.spot_v2_intents');
 execute body;
end$$;

create function public.my_daily_discovery()returns jsonb language plpgsql volatile security definer set search_path=''as $$declare
 me uuid:=auth.uid();w spot_private.discovery_windows;stamp timestamptz;data jsonb;daily_exposures bigint;daily_spots bigint;mine spot_private.discovery_allocations;next_at timestamptz;
begin
 if current_setting('transaction_isolation')<>'read committed'then raise exception 'DD_ISOLATION'using errcode='25000';end if;
 if me is null or not coalesce(spot_private.ora_eligible(me),false)then raise exception 'DD_ACCOUNT'using errcode='42501';end if;
 perform spot_private.board_lock();stamp:=clock_timestamp();
 if not exists(select 1 from spot_private.soma_v2_control where discovery_enabled)or not exists(select 1 from spot_private.discovery_policy where enabled and not paused)then return jsonb_build_object('status','paused','server_now',stamp,'profiles','[]'::jsonb);end if;
 if not exists(select 1 from spot_private.tribe_memberships m join spot_private.tribe_catalog c on c.id=m.venue_id and c.active join public.venues v on v.id=c.id and v.active where m.user_id=me)then return jsonb_build_object('status','tribe_required','server_now',stamp,'profiles','[]'::jsonb);end if;
 select * into w from spot_private.discovery_windows where starts_at<=stamp and ends_at>stamp and state in('draft','ready')order by starts_at limit 1;
 select min(starts_at)into next_at from spot_private.discovery_windows where starts_at>stamp and state='draft';
 if w.id is null then return jsonb_build_object('status','waiting_window','server_now',stamp,'next_transition_at',next_at,'profiles','[]'::jsonb);end if;
 perform spot_private.dd_build(w.id);
 select * into mine from spot_private.discovery_allocations where window_id=w.id and user_id=me;
 select coalesce(sum(a.exposure_count),0),coalesce(sum(a.spots_used),0)into daily_exposures,daily_spots from spot_private.discovery_allocations a join spot_private.discovery_windows d on d.id=a.window_id where a.user_id=me and d.local_date=w.local_date;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'age',p.age,'gender',p.gender,'occupation',p.occupation,'photo_path',p.photo_path,'thumbnail_path',p.thumbnail_path,'detail_path',p.detail_path,'tribe_id',e.tribe_id,'tribe_name',v.name,'exposure_id',e.id)order by e.id),'[]'::jsonb)into data
 from spot_private.discovery_exposures e join public.venues v on v.id=e.tribe_id
 cross join lateral public.authorized_profile(case when e.user_a=me then e.user_b else e.user_a end)p
 where e.window_id=w.id and me in(e.user_a,e.user_b)and spot_private.dd_exposure_authorized(e.id,me,p.id);
 return jsonb_build_object('status',case when mine.user_id is null then 'waiting_next_window'when jsonb_array_length(data)=0 then 'empty'when jsonb_array_length(data)<4 then 'partial'else 'ready'end,
 'server_now',stamp,'window_id',w.id,'starts_at',w.starts_at,'ends_at',w.ends_at,'next_transition_at',least(w.ends_at,next_at),'profiles',data,
 'window_spots_remaining',case when mine.user_id is null then 0 else greatest(0,2-mine.spots_used)end,'window_allocated',coalesce(mine.exposure_count,0),'day_spots_remaining',greatest(0,4-daily_spots),
 'day_exposures_remaining',greatest(0,8-daily_exposures));
end$$;
create function public.send_tribe_spot(target_user uuid,operation_id uuid)returns jsonb language plpgsql volatile security definer set search_path=''as $$declare prior spot_private.spot_v2_operations;e uuid;matched uuid;begin
 if current_setting('transaction_isolation')<>'read committed'then raise exception 'DD_ISOLATION'using errcode='25000';end if;
 perform spot_private.board_lock();perform spot_private.spot_v2_gate();
 select * into prior from spot_private.spot_v2_operations where sender_id=auth.uid()and spot_v2_operations.operation_id=send_tribe_spot.operation_id;
 if found then if prior.recipient_id<>target_user or prior.origin_kind<>'tribe'then raise exception 'SPOT_OPERATION_CONFLICT';end if;return public.send_spot_v2(target_user,operation_id,'tribe',prior.exposure_id);end if;
 select e1.id into e from spot_private.discovery_exposures e1 where e1.user_a=least(auth.uid(),target_user)and e1.user_b=greatest(auth.uid(),target_user)and spot_private.dd_exposure_authorized(e1.id,auth.uid(),target_user)order by e1.id limit 1;
 if e is null and not exists(select 1 from public.matches where user_a=least(auth.uid(),target_user)and user_b=greatest(auth.uid(),target_user))then raise exception 'SPOT_EXPOSURE_REQUIRED'using errcode='42501';end if;
 return public.send_spot_v2(target_user,operation_id,'tribe',e);
end$$;
revoke all on function spot_private.dd_pair_eligible(uuid,uuid,uuid),spot_private.dd_exposure_authorized(uuid,uuid,uuid),spot_private.dd_window_guard(),spot_private.dd_insert_pair(),spot_private.dd_build(uuid),spot_private.dd_charge_spot(uuid)from public,anon,authenticated,service_role;
revoke all on function public.my_daily_discovery(),public.send_tribe_spot(uuid,uuid)from public,anon,authenticated,service_role;
grant execute on function public.my_daily_discovery(),public.send_tribe_spot(uuid,uuid)to authenticated;
notify pgrst,'reload schema';commit;
