begin;
-- LOC-01: preserve legacy response keys, but never project other users' presence times.
-- location_people_photos_page delegates to location_people_page and inherits nulls.
create or replace function public.location_people(place uuid,live boolean)
returns table(id uuid,name text,age integer,gender text,photo_path text,checked_in_at timestamptz,expires_at timestamptz,interest_sent boolean,occupation text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not spot_private.has_account() or not spot_private.tribe_member(auth.uid(),place) then raise exception 'Accesso alla Tribe negato' using errcode='42501'; end if;
 if live and not exists(select 1 from public.checkins c where c.user_id=auth.uid() and c.venue_id=place and c.expires_at>now()) then return; end if;
 return query select p.id,p.name,p.age,p.gender,p.photo_path,
 null::timestamptz,null::timestamptz,
 exists(select 1 from spot_private.interests i where i.sender_id=auth.uid() and i.recipient_id=p.id and i.venue_id=place),p.occupation
 from spot_private.tribe_memberships m join public.profiles p on p.id=m.user_id
 left join public.checkins c on c.user_id=p.id and c.venue_id=place
 where m.venue_id=place and spot_private.can_discover(p.id,place)
 and (coalesce(c.expires_at>now(),false)=live) order by p.name,p.id;
end $$;

create or replace function public.location_people_page(place uuid,live boolean,page_size integer default 49,page_offset integer default 0)
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
 null::timestamptz,null::timestamptz,
 exists(select 1 from spot_private.interests i where i.sender_id=me and i.recipient_id=p.id and i.venue_id=place),p.occupation,p.full_count from page p order by p.name,p.id;
end $$;

notify pgrst, 'reload schema';
commit;
