begin;
create table spot_private.suspensions (
 user_id uuid primary key references public.profiles(id),
 reason text not null check(char_length(trim(reason)) between 1 and 1000),
 created_at timestamptz not null default now(),
 revoked_at timestamptz
);
alter table spot_private.suspensions enable row level security;
revoke all on spot_private.suspensions from public,anon,authenticated;
create or replace function spot_private.can_view_profile(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    target = auth.uid() or (
      not exists(select 1 from spot_private.suspensions s where s.user_id in (auth.uid(),target) and s.revoked_at is null) and
      exists (
        select 1 from public.checkins viewer
        join public.checkins other on other.venue_id = viewer.venue_id
        join public.profiles mine on mine.id = viewer.user_id
        join public.profiles theirs on theirs.id = other.user_id
        where viewer.user_id = auth.uid() and other.user_id = target
          and viewer.expires_at > now() and other.expires_at > now()
          and (mine.preference = 'ALL' or mine.preference = theirs.gender)
      ) and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = target)
           or (b.blocker_id = target and b.blocked_id = auth.uid())
      )
    )
  );
$$;
create or replace function spot_private.can_use_match(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.matches m
 where m.id=target and auth.uid() in(m.user_a,m.user_b)
 and not exists(select 1 from spot_private.suspensions s where s.user_id in(m.user_a,m.user_b) and s.revoked_at is null)
 and (m.first_message_at is not null or m.created_at+interval '1 hour'>now())
 and not exists(select 1 from public.blocks b where
 (b.blocker_id=m.user_a and b.blocked_id=m.user_b) or
 (b.blocker_id=m.user_b and b.blocked_id=m.user_a)));
$$;
create or replace function public.check_in(qr_token uuid)
returns public.checkins language plpgsql security definer set search_path = '' as $$
declare venue uuid; result public.checkins; stamp timestamptz := now();
begin
  if exists(select 1 from spot_private.suspensions s where s.user_id=auth.uid() and s.revoked_at is null) then raise exception 'Account sospeso'; end if;
  if auth.uid() is null then raise exception 'Login richiesto'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Completa il profilo prima del check-in';
  end if;
  select codes.venue_id into venue from spot_private.venue_codes codes
    join public.venues v on v.id = codes.venue_id
    where codes.qr_token = check_in.qr_token and v.active;
  if venue is null then raise exception 'QR non valido'; end if;
  insert into public.checkins(user_id,venue_id,checked_in_at,expires_at)
    values(auth.uid(),venue,stamp,stamp + interval '1 hour')
    on conflict(user_id) do update set venue_id=excluded.venue_id,
      checked_in_at=excluded.checked_in_at, expires_at=excluded.expires_at
    returning * into result;
  return result;
end;
$$;
-- Admin-only SQL operation; no frontend execution permission.
create function spot_private.suspend_profile(target_user uuid,moderation_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
 insert into spot_private.suspensions(user_id,reason) values(target_user,moderation_reason)
 on conflict(user_id) do update set reason=excluded.reason,created_at=now(),revoked_at=null;
end $$;
revoke all on function spot_private.suspend_profile(uuid,text) from public,anon,authenticated;
commit;
