begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or
 (current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'SPOT_STAGING_ONLY';end if;
 if exists(select 1 from spot_private.soma_v2_control where spot_enabled)or exists(select 1 from spot_private.ora_spot_policy where enabled)then raise exception 'SPOT_REQUIRES_OFF';end if;
end$$;
select spot_private.board_lock();
-- A separate ledger preserves historical multi-context rows byte-for-byte.
create table spot_private.spot_v2_intents(
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id)on delete cascade,
 recipient_id uuid not null references public.profiles(id)on delete cascade,
 origin_kind text not null check(origin_kind in('ora','tribe','legacy')),
 context_id uuid references public.venues(id)on delete set null,
 presence_id uuid references public.checkins(presence_id)on delete set null,
 membership_id uuid,
 exposure_id uuid references spot_private.discovery_exposures(id)on delete set null,
 created_at timestamptz not null,
 valid_until timestamptz not null,
 state text not null check(state in('pending','matched','expired','invalidated')),
 match_id uuid references public.matches(id)on delete set null,
 check(sender_id<>recipient_id),check(valid_until=created_at+interval '720 hours')
);
create unique index spot_v2_pending_direction on spot_private.spot_v2_intents(sender_id,recipient_id)where state='pending';
create index spot_v2_pair on spot_private.spot_v2_intents(sender_id,recipient_id,created_at);
create table spot_private.spot_v2_operations(
 sender_id uuid references public.profiles(id)on delete cascade,
 operation_id uuid,
 recipient_id uuid not null references public.profiles(id)on delete cascade,
 origin_kind text not null,
 exposure_id uuid,
 intent_id uuid references spot_private.spot_v2_intents(id)on delete cascade,
 result jsonb not null,
 created_at timestamptz not null default clock_timestamp(),
 primary key(sender_id,operation_id)
);
-- Existing global board lock is shared with moderation/retention/delete. This write fence
-- additionally makes stale REPEATABLE READ transactions abort, never commit stale eligibility.
create table spot_private.spot_v2_fence(singleton boolean primary key check(singleton),revision bigint not null default 0);
insert into spot_private.spot_v2_fence(singleton)values(true);
do $$declare t text;begin foreach t in array array['spot_v2_intents','spot_v2_operations','spot_v2_fence']loop
 execute format('alter table spot_private.%I enable row level security',t);
 execute format('revoke all on table spot_private.%I from public,anon,authenticated,service_role',t);
end loop;end$$;

create function spot_private.spot_v2_gate()returns void language plpgsql volatile security definer set search_path='' as $$begin
 if auth.uid()is null or not coalesce(spot_private.ora_eligible(auth.uid()),false)then raise exception 'SPOT_ACCOUNT'using errcode='42501';end if;
 perform 1 from spot_private.soma_v2_control where singleton and spot_enabled for share;
 if not found then raise exception 'SPOT_PAUSED'using errcode='42501';end if;
end$$;
create function public.my_ora_spot_budget()returns jsonb language plpgsql volatile security definer set search_path='' as $$declare
 me uuid:=auth.uid();stamp timestamptz:=clock_timestamp();day date;place uuid;p spot_private.ora_spot_policy;g integer;l integer;
begin
 perform spot_private.spot_v2_gate();select * into p from spot_private.ora_spot_policy where singleton;
 if p.enabled is distinct from true then raise exception 'SPOT_PAUSED'using errcode='42501';end if;
 day:=(stamp at time zone 'Europe/Rome')::date;
 select venue_id into place from public.checkins where user_id=me and expires_at>stamp;
 select used into g from spot_private.ora_spot_daily_quota where user_id=me and local_date=day;
 select used into l from spot_private.ora_spot_place_quota where user_id=me and place_id=place and local_date=day;
 return jsonb_build_object('remaining',greatest(0,least(5,p.daily_limit)-coalesce(g,0)),
 'place_remaining',case when place is not null then greatest(0,least(3,p.place_daily_limit)-coalesce(l,0))end);
end$$;
-- No caller-supplied sender, place, presence, dates, result or expiry.
create function public.send_spot_v2(target_user uuid,operation_id uuid,origin_kind text default 'ora',exposure_id uuid default null)
returns jsonb language plpgsql volatile security definer set search_path='' as $$declare
 me uuid:=auth.uid();stamp timestamptz;day date;place uuid;presence uuid;membership uuid;
 prior spot_private.spot_v2_operations;intent spot_private.spot_v2_intents;rev spot_private.spot_v2_intents;
 exp spot_private.discovery_exposures;result jsonb;matched uuid;pol spot_private.ora_spot_policy;old record;
begin
 if me is null or target_user is null or me=target_user or operation_id is null or origin_kind is null or origin_kind not in('ora','tribe')or(origin_kind='ora'and exposure_id is not null)then raise exception 'SPOT_INPUT'using errcode='22023';end if;
 perform spot_private.board_lock();perform spot_private.retention_pair_lock(me,target_user);
 perform spot_private.spot_v2_gate();
 update spot_private.spot_v2_fence set revision=revision+1 where singleton;
 if not coalesce(spot_private.ora_eligible(target_user),false)or exists(select 1 from public.blocks where(blocker_id=me and blocked_id=target_user)or(blocker_id=target_user and blocked_id=me))then raise exception 'SPOT_TARGET'using errcode='42501';end if;
 select * into prior from spot_private.spot_v2_operations o where o.sender_id=me and o.operation_id=send_spot_v2.operation_id;
 if found then
  if prior.recipient_id<>target_user or prior.origin_kind<>send_spot_v2.origin_kind or prior.exposure_id is distinct from send_spot_v2.exposure_id then raise exception 'SPOT_OPERATION_CONFLICT'using errcode='22023';end if;
  return prior.result;
 end if;
 stamp:=clock_timestamp();
 select id into matched from public.matches where user_a=least(me,target_user)and user_b=greatest(me,target_user);
 if matched is null then
  if origin_kind='ora'then
   perform 1 from spot_private.soma_v2_control where ora_enabled for share;
   if not found or not coalesce(spot_private.ora_can_discover(target_user),false)then raise exception 'SPOT_ORA_CONTEXT'using errcode='42501';end if;
   select c.venue_id,c.presence_id into place,presence from public.checkins c join public.venues v on v.id=c.venue_id where c.user_id=me and c.expires_at>stamp and v.active and v.ora_enabled for share of c,v;
   if place is null or presence is null or not exists(select 1 from public.checkins where user_id=target_user and venue_id=place and expires_at>stamp)then raise exception 'SPOT_ORA_CONTEXT'using errcode='42501';end if;
  else
   -- No directory authorization. Only a real current, ready, reciprocal exposure.
   if not exists(select 1 from spot_private.soma_v2_control where discovery_enabled)then raise exception 'SPOT_EXPOSURE_REQUIRED'using errcode='42501';end if;
   select e.* into exp from spot_private.discovery_exposures e join spot_private.discovery_windows w on w.id=e.window_id
   join spot_private.discovery_policy p on p.version=w.policy_version
   join spot_private.tribe_memberships a on a.membership_id=e.membership_a and a.user_id=e.user_a and a.venue_id=e.tribe_id
   join spot_private.tribe_memberships b on b.membership_id=e.membership_b and b.user_id=e.user_b and b.venue_id=e.tribe_id
   where e.id=send_spot_v2.exposure_id and e.user_a=least(me,target_user)and e.user_b=greatest(me,target_user)
   and w.state='ready'and w.starts_at<=stamp and w.ends_at>stamp and p.enabled and not p.paused;
   if not found then raise exception 'SPOT_EXPOSURE_REQUIRED'using errcode='42501';end if;
   if not exists(select 1 from public.profiles a join public.profiles b on b.id=target_user where a.id=me and(a.preference='ALL'or a.preference=b.gender))then raise exception 'SPOT_TARGET'using errcode='42501';end if;
   place:=exp.tribe_id;membership:=case when me=exp.user_a then exp.membership_a else exp.membership_b end;
  end if;
  update spot_private.spot_v2_intents set state='expired'where sender_id in(me,target_user)and recipient_id in(me,target_user)and state='pending'and valid_until<=stamp;
  -- Import only known, still-valid historical intents; never resurrect a direction
  -- once the new ledger already represents it. Historical rows are never updated.
  for old in select distinct on(i.sender_id,i.recipient_id)i.* from spot_private.interests i
   where i.sender_id in(me,target_user)and i.recipient_id in(me,target_user)
   and(i.logical_status is null or i.logical_status='pending')and i.invalidated_at is null and i.created_at<=stamp and i.created_at+interval '720 hours'>stamp
   and not exists(select 1 from spot_private.spot_v2_intents n where n.sender_id=i.sender_id and n.recipient_id=i.recipient_id)
   order by i.sender_id,i.recipient_id,i.created_at,i.venue_id
  loop
   insert into spot_private.spot_v2_intents(sender_id,recipient_id,origin_kind,context_id,created_at,valid_until,state)
   values(old.sender_id,old.recipient_id,'legacy',old.venue_id,old.created_at,old.created_at+interval '720 hours','pending');
  end loop;
  select * into intent from spot_private.spot_v2_intents where sender_id=me and recipient_id=target_user and state='pending';
  if intent.id is null then
   if origin_kind='ora'then
    select * into pol from spot_private.ora_spot_policy where singleton for share;
    if pol.enabled is distinct from true then raise exception 'SPOT_PAUSED'using errcode='42501';end if;
    day:=(stamp at time zone 'Europe/Rome')::date;
    insert into spot_private.ora_spot_daily_quota(user_id,local_date,used)values(me,day,1)
     on conflict(user_id,local_date)do update set used=ora_spot_daily_quota.used+1 where ora_spot_daily_quota.used<least(5,pol.daily_limit);
    if not found then raise exception 'SPOT_DAILY_QUOTA'using errcode='P0001';end if;
    insert into spot_private.ora_spot_place_quota(user_id,place_id,local_date,used)values(me,place,day,1)
     on conflict(user_id,place_id,local_date)do update set used=ora_spot_place_quota.used+1 where ora_spot_place_quota.used<least(3,pol.place_daily_limit);
    if not found then raise exception 'SPOT_PLACE_QUOTA'using errcode='P0001';end if;
   end if;
   insert into spot_private.spot_v2_intents(sender_id,recipient_id,origin_kind,context_id,presence_id,membership_id,exposure_id,created_at,valid_until,state)
    values(me,target_user,origin_kind,place,presence,membership,exposure_id,stamp,stamp+interval '720 hours','pending')returning * into intent;
  end if;
  select * into rev from spot_private.spot_v2_intents where sender_id=target_user and recipient_id=me and state='pending'and valid_until>stamp;
  if rev.id is not null then
   insert into public.matches(user_a,user_b,venue_id)values(least(me,target_user),greatest(me,target_user),place)on conflict(user_a,user_b)do nothing;
   select id into matched from public.matches where user_a=least(me,target_user)and user_b=greatest(me,target_user);
   update spot_private.spot_v2_intents set state='matched',match_id=matched where id in(intent.id,rev.id);
  end if;
 end if;
 result:=jsonb_build_object('spot_id',intent.id,'match_id',matched,'state',case when matched is not null then 'matched'else 'pending'end);
 insert into spot_private.spot_v2_operations(sender_id,operation_id,recipient_id,origin_kind,exposure_id,intent_id,result)
 values(me,operation_id,target_user,origin_kind,exposure_id,intent.id,result);
 return result;
end$$;
-- Before membership FK detach/cascade, invalidate only that sender's pending Tribe intent.
create function spot_private.spot_v2_membership_left()returns trigger language plpgsql security definer set search_path='' as $$begin
 update spot_private.spot_v2_intents set state='invalidated'where sender_id=old.user_id and membership_id=old.membership_id and origin_kind='tribe'and state='pending';
 return old;
end$$;
create trigger spot_v2_leave before delete on spot_private.tribe_memberships for each row execute function spot_private.spot_v2_membership_left();
-- Fence also covers an already-running old function body that resumes after DDL.
create function spot_private.spot_legacy_fence()returns trigger language plpgsql set search_path='' as $$begin
 raise exception 'SPOT_LEGACY_RETIRED'using errcode='42501';
end$$;
create trigger spot_legacy_insert_fence before insert on spot_private.interests for each row execute function spot_private.spot_legacy_fence();
revoke all on function spot_private.spot_legacy_fence()from public,anon,authenticated,service_role;
-- A cached/old client cannot bypass v2 invariants. Retire bodies AND privileges.
create or replace function public.send_spot(target_user uuid,place uuid)returns uuid language plpgsql security definer set search_path='' as $$begin raise exception 'SPOT_LEGACY_RETIRED'using errcode='42501';end$$;
create or replace function public.privacy_prior_send_spot(target_user uuid,place uuid)returns uuid language plpgsql security definer set search_path='' as $$begin raise exception 'SPOT_LEGACY_RETIRED'using errcode='42501';end$$;
create or replace function public.express_interest(target_user uuid)returns uuid language plpgsql security definer set search_path='' as $$begin raise exception 'SPOT_LEGACY_RETIRED'using errcode='42501';end$$;
revoke all on function public.send_spot(uuid,uuid),public.privacy_prior_send_spot(uuid,uuid),public.express_interest(uuid)from public,anon,authenticated,service_role;
revoke all on function spot_private.spot_v2_gate(),spot_private.spot_v2_membership_left()from public,anon,authenticated,service_role;
revoke all on function public.send_spot_v2(uuid,uuid,text,uuid),public.my_ora_spot_budget()from public,anon,authenticated,service_role;
grant execute on function public.send_spot_v2(uuid,uuid,text,uuid),public.my_ora_spot_budget()to authenticated;
-- RIGHTS includes only the sender's new intents, never received/hidden preferences or receipts.
alter function public.my_rights_page(text,text,integer)rename to spot_v2_prior_rights_page;
create function public.my_rights_page(section text,after_key text default '',page_size integer default 100)returns jsonb language plpgsql stable security definer set search_path='' as $$declare me uuid:=auth.uid();items jsonb;last_key text;more boolean;begin
 if section<>'spots'then return public.spot_v2_prior_rights_page(section,after_key,page_size);end if;
 if me is null or not exists(select 1 from auth.users where id=me)then raise exception 'RIGHTS_AUTH'using errcode='42501';end if;
 if page_size is null or page_size not between 1 and 100 or after_key is null or length(after_key)>200 then raise exception 'RIGHTS_INPUT';end if;
 with records as(
 select 'legacy/'||i.recipient_id::text||'/'||i.venue_id::text k,jsonb_build_object('sent_at',i.created_at,'venue_id',i.venue_id)value from spot_private.interests i where i.sender_id=me
 union all select 'v2/'||i.id::text,jsonb_build_object('id',i.id,'sent_at',i.created_at,'valid_until',i.valid_until,'state',i.state)from spot_private.spot_v2_intents i where i.sender_id=me),
 page as materialized(select * from records where k>after_key order by k limit page_size+1),shown as(select * from page order by k limit page_size)
 select coalesce((select jsonb_agg(jsonb_build_object('key',k,'data',value)order by k)from shown),'[]'),(select max(k)from shown),(select count(*)>page_size from page)into items,last_key,more;
 return jsonb_build_object('owner_id',me,'version','rights-staging-v1','section',section,'items',items,'next_key',case when more then last_key end);
end$$;
revoke all on function public.spot_v2_prior_rights_page(text,text,integer),public.my_rights_page(text,text,integer)from public,anon,authenticated,service_role;
grant execute on function public.my_rights_page(text,text,integer)to authenticated;
notify pgrst,'reload schema';commit;
