begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'TRIBE_STAGING_ONLY';end if;
 if current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho'then raise exception 'TRIBE_PROJECT_MISMATCH';end if;
 if not exists(select 1 from spot_private.soma_v2_control where singleton and jobs_paused
  and not membership_enabled and not ora_enabled and not spot_enabled and not discovery_enabled
  and not comments_enabled and not requests_enabled and not system_posts_enabled and not share_enabled)
 then raise exception 'TRIBE_FEATURE_NOT_OFF';end if;
end$$;
-- Reuse the Board/delete/retention ordering and the same account lock used by
-- check_in, eligibility, consent, moderation and PHOTO. No PHOTO code changes.
create function spot_private.tribe_membership_lock()returns uuid
language plpgsql security definer set search_path='' as $$declare me uuid:=auth.uid();begin
 if me is null then raise exception 'TRIBE_AUTH'using errcode='42501';end if;
 perform spot_private.board_lock();
 perform spot_private.photo_owner_lock(me);
 if not coalesce(spot_private.board_eligible(me),false)then raise exception 'TRIBE_ACCOUNT'using errcode='42501';end if;
 return me;
end$$;
-- No historical events table: keep one immutable global configuration anchor.
create function spot_private.tribe_configuration_immutable()returns trigger
language plpgsql set search_path='' as $$begin
 if old.configuration_state in('started','legacy_closed')and
  (new.configuration_state is distinct from old.configuration_state or new.configuration_started_at is distinct from old.configuration_started_at)
 then raise exception 'TRIBE_CONFIGURATION_IMMUTABLE';end if;
 return new;
end$$;
create trigger tribe_configuration_immutable before update on spot_private.tribe_account_state
 for each row execute function spot_private.tribe_configuration_immutable();

create function public.join_tribe(tribe_id uuid)returns jsonb
language plpgsql security definer set search_path='' as $$declare
 me uuid;stamp timestamptz;s spot_private.tribe_account_state;m spot_private.tribe_memberships;
 used integer;grace boolean;
begin
 me:=spot_private.tribe_membership_lock();
 -- Capture wall time AFTER waiting for locks; never use a caller clock or stale transaction start.
 stamp:=clock_timestamp();
 if tribe_id is null then raise exception 'TRIBE_INPUT'using errcode='22023';end if;
 perform 1 from spot_private.tribe_catalog c join public.venues v on v.id=c.id
  where c.id=tribe_id and c.active and c.joinable and v.active for share of c,v;
 if not found then raise exception 'TRIBE_UNAVAILABLE'using errcode='42501';end if;
 select * into m from spot_private.tribe_memberships where user_id=me and venue_id=tribe_id;
 if found and(m.membership_id is null or m.membership_source is null)then
  raise exception 'TRIBE_LEGACY_RECONCILIATION_REQUIRED';
 end if;
 -- A legacy membership created by the unchanged QR writer must not gain retroactive grace.
 insert into spot_private.tribe_account_state(user_id,configuration_state)
 values(me,case when exists(select 1 from spot_private.tribe_memberships where user_id=me)then 'legacy_closed'else 'unstarted'end)
 on conflict(user_id)do nothing;
 select * into s from spot_private.tribe_account_state where user_id=me for update;
 select count(*)into used from spot_private.tribe_memberships where user_id=me;
 if m.user_id is null then
  if used>=3 then raise exception 'TRIBE_LIMIT'using errcode='23514';end if;
  if exists(select 1 from spot_private.tribe_rejoin_guards g where g.user_id=me and g.tribe_id=join_tribe.tribe_id and g.rejoin_not_before>stamp)
  then raise exception 'TRIBE_COOLDOWN'using errcode='42501';end if;
  insert into spot_private.tribe_memberships(user_id,venue_id,membership_id,membership_source)
  values(me,tribe_id,gen_random_uuid(),'manual')returning * into m;
  if s.configuration_state='unstarted'then
   update spot_private.tribe_account_state set configuration_state='started',configuration_started_at=stamp,revision=revision+1
   where user_id=me returning * into s;
  else
   -- Write fence also forces serialization failure rather than oversubscription
   -- for callers using REPEATABLE READ / SERIALIZABLE snapshots.
   update spot_private.tribe_account_state set revision=revision+1 where user_id=me returning * into s;
  end if;
  used:=used+1;
 end if;
 -- Only expired technical guards; never reset a live cooldown on join/retry.
 delete from spot_private.tribe_rejoin_guards where user_id=me and rejoin_not_before<=stamp;
 grace:=s.configuration_state='started'and stamp<s.configuration_started_at+interval '24 hours';
 return jsonb_build_object('tribe_id',tribe_id,'membership_id',m.membership_id,'membership_source',m.membership_source,
  'initial_grace_active',grace,'slots_used',used,'slots_remaining',greatest(0,3-used));
end$$;

create function public.leave_tribe(tribe_id uuid)returns jsonb
language plpgsql security definer set search_path='' as $$declare
 me uuid;stamp timestamptz;s spot_private.tribe_account_state;m spot_private.tribe_memberships;used integer;grace boolean;
begin
 me:=spot_private.tribe_membership_lock();stamp:=clock_timestamp();
 if tribe_id is null then raise exception 'TRIBE_INPUT'using errcode='22023';end if;
 select * into m from spot_private.tribe_memberships where user_id=me and venue_id=tribe_id for update;
 if found then
  -- Missing state + existing membership is conservatively legacy, never a new first join.
  insert into spot_private.tribe_account_state(user_id,configuration_state)values(me,'legacy_closed')on conflict(user_id)do nothing;
  select * into s from spot_private.tribe_account_state where user_id=me for update;
  grace:=s.configuration_state='started'and stamp<s.configuration_started_at+interval '24 hours';
  if not grace then
   insert into spot_private.tribe_rejoin_guards(user_id,tribe_id,rejoin_not_before)values(me,tribe_id,stamp+interval '720 hours')
   on conflict on constraint tribe_rejoin_guards_pkey do update set rejoin_not_before=excluded.rejoin_not_before;
  end if;
  delete from spot_private.tribe_memberships where user_id=me and venue_id=tribe_id;
  update spot_private.tribe_account_state set revision=revision+1 where user_id=me;
 end if;
 delete from spot_private.tribe_rejoin_guards where user_id=me and rejoin_not_before<=stamp;
 select count(*)into used from spot_private.tribe_memberships where user_id=me;
 -- Absent membership is a neutral NO-OP, including after Tribe removal. No guard extension.
 return jsonb_build_object('tribe_id',tribe_id,'left',m.user_id is not null,'slots_used',used,'slots_remaining',greatest(0,3-used));
end$$;
-- my_tribes() already returns only the caller's current membership projection.
-- Preserve its signature/result and all legacy clients; no history/guards exposed.
revoke all on function spot_private.tribe_membership_lock(),spot_private.tribe_configuration_immutable()from public,anon,authenticated,service_role;
revoke all on function public.join_tribe(uuid),public.leave_tribe(uuid)from public,anon,authenticated,service_role;
grant execute on function public.join_tribe(uuid),public.leave_tribe(uuid)to authenticated;
-- Existing RLS/grants on membership/state/guard tables stay unchanged: no direct client writes.
notify pgrst,'reload schema';
commit;
