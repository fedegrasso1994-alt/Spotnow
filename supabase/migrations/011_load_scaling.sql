begin;
create index if not exists profiles_name_id on public.profiles(name,id);
create index if not exists matches_a_created on public.matches(user_a,created_at desc,id);
create index if not exists matches_b_created on public.matches(user_b,created_at desc,id);

-- Check the caller once; keep the same target exclusions and permanent Tribe rules.
create function public.location_people_page(place uuid,live boolean,page_size integer default 49,page_offset integer default 0)
returns table(id uuid,name text,age integer,gender text,photo_path text,checked_in_at timestamptz,expires_at timestamptz,interest_sent boolean,occupation text,total_count bigint)
language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid(); preference_filter text; activity interval;
begin
 if not spot_private.has_account() or not spot_private.tribe_member(me,place) then raise exception 'Accesso alla Tribe negato' using errcode='42501'; end if;
 if live and not exists(select 1 from public.checkins c where c.user_id=me and c.venue_id=place and c.expires_at>now()) then return; end if;
 select p.preference into preference_filter from public.profiles p where p.id=me;
 select settings.activity_window into activity from spot_private.tribe_settings settings where settings.singleton;
 return query with visible as materialized (
  select p.id,p.name,p.age,p.gender,p.photo_path,p.occupation,c.checked_in_at,c.expires_at
  from spot_private.tribe_memberships member join public.profiles p on p.id=member.user_id join auth.users u on u.id=p.id
  left join public.checkins c on c.user_id=p.id and c.venue_id=place
  where member.venue_id=place and p.id<>me and not u.is_anonymous
  and (activity is null or member.last_checkin_at>now()-activity)
  and (preference_filter='ALL' or preference_filter=p.gender)
  and (coalesce(c.expires_at>now(),false)=live)
  and not exists(select 1 from spot_private.account_deletions d where d.user_id=p.id)
  and not exists(select 1 from spot_private.suspensions s where s.user_id=p.id and s.revoked_at is null)
  and not exists(select 1 from public.blocks b where (b.blocker_id=me and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=me))
 ),page as (
  select v.*,count(*) over() as full_count from visible v order by v.name,v.id limit least(101,greatest(1,coalesce(page_size,49))) offset greatest(0,coalesce(page_offset,0))
 ) select p.id,p.name,p.age,p.gender,p.photo_path,
 case when live then p.checked_in_at else null end,case when live then p.expires_at else null end,
 exists(select 1 from spot_private.interests i where i.sender_id=me and i.recipient_id=p.id and i.venue_id=place),p.occupation,p.full_count from page p order by p.name,p.id;
end $$;

create function public.my_matches_page(page_size integer default 49,page_offset integer default 0,requested_match uuid default null,requested_person uuid default null)
returns table(id uuid,person_id uuid,name text,age integer,photo_path text,venue_name text,created_at timestamptz,first_message_at timestamptz,total_count bigint)
language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid();
begin
 if not spot_private.has_account() then return; end if;
 return query with available as materialized (
  select m.id,p.id as person_id,p.name,p.age,p.photo_path,v.name as venue_name,m.created_at,m.first_message_at
  from public.matches m join public.profiles p on p.id=case when m.user_a=me then m.user_b else m.user_a end join public.venues v on v.id=m.venue_id
  where me in(m.user_a,m.user_b) and (requested_match is null or m.id=requested_match) and (requested_person is null or p.id=requested_person)
  and not exists(select 1 from spot_private.account_deletions d where d.user_id=p.id)
  and not exists(select 1 from spot_private.suspensions s where s.user_id=p.id and s.revoked_at is null)
  and not exists(select 1 from public.blocks b where (b.blocker_id=me and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=me))
 ) select a.*,count(*) over() from available a order by a.created_at desc,a.id desc limit least(101,greatest(1,coalesce(page_size,49))) offset greatest(0,coalesce(page_offset,0));
end $$;

-- Counts use indexed membership checks directly, without one nested function per member.
create or replace function public.my_tribes()
returns table(id uuid,name text,address text,member_count bigint,live_count bigint)
language sql stable security definer set search_path='' as $$
 select v.id,v.name,v.address,
 (select count(*) from spot_private.tribe_memberships other join auth.users u on u.id=other.user_id where other.venue_id=v.id and not u.is_anonymous and (settings.activity_window is null or other.last_checkin_at>now()-settings.activity_window) and not exists(select 1 from spot_private.account_deletions d where d.user_id=u.id) and not exists(select 1 from spot_private.suspensions s where s.user_id=u.id and s.revoked_at is null)),
 (select count(*) from public.checkins c join auth.users u on u.id=c.user_id where c.venue_id=v.id and c.expires_at>now() and not u.is_anonymous and not exists(select 1 from spot_private.account_deletions d where d.user_id=u.id) and not exists(select 1 from spot_private.suspensions s where s.user_id=u.id and s.revoked_at is null))
 from spot_private.tribe_memberships mine join public.venues v on v.id=mine.venue_id cross join spot_private.tribe_settings settings
 where mine.user_id=auth.uid() and spot_private.has_account() and v.active and (settings.activity_window is null or mine.last_checkin_at>now()-settings.activity_window) order by v.name,v.id;
$$;

-- QR landing contains aggregates only, with the same activity and moderation exclusions.
create or replace function public.venue_preview(qr_token uuid)
returns table(id uuid,name text,address text,live_count bigint,member_count bigint)
language sql stable security definer set search_path='' as $$
 select v.id,v.name,v.address,
 (select count(*) from public.checkins c join auth.users u on u.id=c.user_id where c.venue_id=v.id and c.expires_at>now() and not u.is_anonymous and not exists(select 1 from spot_private.account_deletions d where d.user_id=u.id) and not exists(select 1 from spot_private.suspensions s where s.user_id=u.id and s.revoked_at is null)),
 (select count(*) from spot_private.tribe_memberships member join auth.users u on u.id=member.user_id where member.venue_id=v.id and not u.is_anonymous and (settings.activity_window is null or member.last_checkin_at>now()-settings.activity_window) and not exists(select 1 from spot_private.account_deletions d where d.user_id=u.id) and not exists(select 1 from spot_private.suspensions s where s.user_id=u.id and s.revoked_at is null))
 from public.venues v join spot_private.venue_codes codes on codes.venue_id=v.id cross join spot_private.tribe_settings settings where codes.qr_token=venue_preview.qr_token and v.active;
$$;
revoke all on function public.location_people_page(uuid,boolean,integer,integer),public.my_matches_page(integer,integer,uuid,uuid) from public,anon,authenticated;
grant execute on function public.location_people_page(uuid,boolean,integer,integer),public.my_matches_page(integer,integer,uuid,uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
