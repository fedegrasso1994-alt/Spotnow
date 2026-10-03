begin;
-- A single membership per physical place; visit timestamps never leave private schema.
create table spot_private.tribe_settings (
 singleton boolean primary key default true check(singleton), activity_window interval
);
insert into spot_private.tribe_settings(singleton,activity_window) values(true,null);
create table spot_private.tribe_memberships (
 user_id uuid not null references public.profiles(id) on delete cascade,
 venue_id uuid not null references public.venues(id),
 last_checkin_at timestamptz not null,
 primary key(user_id,venue_id)
);
create index tribe_memberships_venue on spot_private.tribe_memberships(venue_id,user_id);
alter table spot_private.tribe_settings enable row level security;
alter table spot_private.tribe_memberships enable row level security;
revoke all on spot_private.tribe_settings,spot_private.tribe_memberships from public,anon,authenticated;
-- Recover only the association still present in the current data.
insert into spot_private.tribe_memberships select user_id,venue_id,checked_in_at from public.checkins;
alter table public.checkins drop constraint checkins_check;
alter table public.checkins add constraint checkins_check check(expires_at=checked_in_at+interval '90 minutes') not valid;
update public.checkins set expires_at=checked_in_at+interval '90 minutes';
alter table public.checkins validate constraint checkins_check;
create function spot_private.has_account()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and not u.is_anonymous)
 and not exists(select 1 from spot_private.suspensions s where s.user_id=auth.uid() and s.revoked_at is null);
$$;
create function spot_private.tribe_member(person uuid,place uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from spot_private.tribe_memberships m join public.venues v on v.id=m.venue_id cross join spot_private.tribe_settings settings
 where m.user_id=person and m.venue_id=place and v.active
 and (settings.activity_window is null or m.last_checkin_at>now()-settings.activity_window));
$$;
create function spot_private.can_discover(target uuid,place uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select spot_private.has_account() and target<>auth.uid()
 and spot_private.tribe_member(auth.uid(),place) and spot_private.tribe_member(target,place)
 and exists(select 1 from auth.users u join public.profiles p on p.id=u.id join public.profiles mine on mine.id=auth.uid()
 where u.id=target and not u.is_anonymous and (mine.preference='ALL' or mine.preference=p.gender))
 and not exists(select 1 from spot_private.suspensions s where s.user_id=target and s.revoked_at is null)
 and not exists(select 1 from public.blocks b where (b.blocker_id=auth.uid() and b.blocked_id=target) or (b.blocker_id=target and b.blocked_id=auth.uid()));
$$;
create or replace function spot_private.can_view_profile(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (target=auth.uid() or exists(
 select 1 from spot_private.tribe_memberships m where m.user_id=auth.uid() and spot_private.can_discover(target,m.venue_id)));
$$;
create or replace function public.check_in(qr_token uuid)
returns public.checkins language plpgsql security definer set search_path='' as $$
declare venue uuid; result public.checkins; stamp timestamptz:=now();
begin
 if not spot_private.has_account() then raise exception 'Accedi con Google o email prima del check-in'; end if;
 if not exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'Completa il profilo'; end if;
 select codes.venue_id into venue from spot_private.venue_codes codes join public.venues v on v.id=codes.venue_id where codes.qr_token=check_in.qr_token and v.active;
 if venue is null then raise exception 'QR non valido'; end if;
 insert into public.checkins(user_id,venue_id,checked_in_at,expires_at) values(auth.uid(),venue,stamp,stamp+interval '90 minutes')
 on conflict(user_id) do update set venue_id=excluded.venue_id,checked_in_at=excluded.checked_in_at,expires_at=excluded.expires_at returning * into result;
 insert into spot_private.tribe_memberships values(auth.uid(),venue,stamp)
 on conflict(user_id,venue_id) do update set last_checkin_at=excluded.last_checkin_at;
 return result;
end $$;
create function public.venue_preview(qr_token uuid)
returns table(id uuid,name text,address text,live_count bigint,member_count bigint)
language sql stable security definer set search_path='' as $$
 select v.id,v.name,v.address,
 (select count(*) from public.checkins c join auth.users u on u.id=c.user_id where c.venue_id=v.id and c.expires_at>now() and not u.is_anonymous and not exists(select 1 from spot_private.suspensions s where s.user_id=c.user_id and s.revoked_at is null)),
 (select count(*) from spot_private.tribe_memberships m join auth.users u on u.id=m.user_id where m.venue_id=v.id and not u.is_anonymous and spot_private.tribe_member(m.user_id,v.id) and not exists(select 1 from spot_private.suspensions s where s.user_id=m.user_id and s.revoked_at is null))
 from public.venues v join spot_private.venue_codes codes on codes.venue_id=v.id where codes.qr_token=venue_preview.qr_token and v.active;
$$;
create function public.my_tribes()
returns table(id uuid,name text,address text,member_count bigint,live_count bigint)
language sql stable security definer set search_path='' as $$
 select v.id,v.name,v.address,
 (select count(*) from spot_private.tribe_memberships other join auth.users u on u.id=other.user_id where other.venue_id=v.id and not u.is_anonymous and spot_private.tribe_member(other.user_id,v.id) and not exists(select 1 from spot_private.suspensions s where s.user_id=other.user_id and s.revoked_at is null)),
 (select count(*) from public.checkins c join auth.users u on u.id=c.user_id where c.venue_id=v.id and c.expires_at>now() and not u.is_anonymous and not exists(select 1 from spot_private.suspensions s where s.user_id=c.user_id and s.revoked_at is null))
 from spot_private.tribe_memberships m join public.venues v on v.id=m.venue_id
 where m.user_id=auth.uid() and spot_private.has_account() and spot_private.tribe_member(auth.uid(),v.id) order by v.name,v.id;
$$;
create function public.location_people(place uuid,live boolean)
returns table(id uuid,name text,age integer,gender text,photo_path text,checked_in_at timestamptz,expires_at timestamptz,interest_sent boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if not spot_private.has_account() or not spot_private.tribe_member(auth.uid(),place) then raise exception 'Accesso alla Tribe negato' using errcode='42501'; end if;
 if live and not exists(select 1 from public.checkins c where c.user_id=auth.uid() and c.venue_id=place and c.expires_at>now()) then return; end if;
 return query select p.id,p.name,p.age,p.gender,p.photo_path,
 case when live then c.checked_in_at else null end,case when live then c.expires_at else null end,
 exists(select 1 from spot_private.interests i where i.sender_id=auth.uid() and i.recipient_id=p.id and i.venue_id=place)
 from spot_private.tribe_memberships m join public.profiles p on p.id=m.user_id
 left join public.checkins c on c.user_id=p.id and c.venue_id=place
 where m.venue_id=place and spot_private.can_discover(p.id,place)
 and (coalesce(c.expires_at>now(),false)=live) order by p.name,p.id;
end $$;
-- Preserve pending interests separately for each shared location.
alter table spot_private.interests drop constraint interests_pkey;
alter table spot_private.interests add primary key(sender_id,recipient_id,venue_id);
create or replace function public.express_interest(target_user uuid)
returns uuid language plpgsql security definer set search_path='' as $$
begin raise exception 'Seleziona il luogo per inviare uno Spot'; end $$;
create function public.send_spot(target_user uuid,place uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); a uuid; b uuid; result uuid;
begin
 a:=least(me,target_user);b:=greatest(me,target_user);
 perform pg_advisory_xact_lock(hashtextextended(a::text||b::text,0));
 if not spot_private.can_discover(target_user,place) then raise exception 'Profilo non disponibile'; end if;
 insert into spot_private.interests(sender_id,recipient_id,venue_id,sender_checkin) values(me,target_user,place,now()) on conflict do nothing;
 if exists(select 1 from spot_private.interests i where i.sender_id=target_user and i.recipient_id=me and i.venue_id=place) then
 insert into public.matches(user_a,user_b,venue_id) values(a,b,place) on conflict(user_a,user_b) do nothing;
 select m.id into result from public.matches m where m.user_a=a and m.user_b=b;
 end if;return result;
end $$;
create or replace function spot_private.can_use_match(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select spot_private.has_account() and exists(select 1 from public.matches m where m.id=target and auth.uid() in(m.user_a,m.user_b)
 and not exists(select 1 from spot_private.suspensions s where s.user_id in(m.user_a,m.user_b) and s.revoked_at is null)
 and not exists(select 1 from public.blocks b where (b.blocker_id=m.user_a and b.blocked_id=m.user_b) or (b.blocker_id=m.user_b and b.blocked_id=m.user_a)));
$$;
revoke all on function spot_private.has_account(),spot_private.tribe_member(uuid,uuid),spot_private.can_discover(uuid,uuid) from public,anon,authenticated;
revoke all on function public.venue_preview(uuid),public.my_tribes(),public.location_people(uuid,boolean),public.send_spot(uuid,uuid) from public,anon,authenticated;
grant execute on function public.venue_preview(uuid) to anon,authenticated;
grant execute on function public.my_tribes(),public.location_people(uuid,boolean),public.send_spot(uuid,uuid) to authenticated;
commit;
