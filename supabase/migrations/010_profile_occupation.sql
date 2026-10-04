begin;
alter table public.profiles add column if not exists occupation text not null default '' check (char_length(occupation)<=80);
drop function public.location_people(uuid,boolean);
create function public.location_people(place uuid,live boolean)
returns table(id uuid,name text,age integer,gender text,photo_path text,checked_in_at timestamptz,expires_at timestamptz,interest_sent boolean,occupation text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not spot_private.has_account() or not spot_private.tribe_member(auth.uid(),place) then raise exception 'Accesso alla Tribe negato' using errcode='42501'; end if;
 if live and not exists(select 1 from public.checkins c where c.user_id=auth.uid() and c.venue_id=place and c.expires_at>now()) then return; end if;
 return query select p.id,p.name,p.age,p.gender,p.photo_path,
 case when live then c.checked_in_at else null end,case when live then c.expires_at else null end,
 exists(select 1 from spot_private.interests i where i.sender_id=auth.uid() and i.recipient_id=p.id and i.venue_id=place),p.occupation
 from spot_private.tribe_memberships m join public.profiles p on p.id=m.user_id
 left join public.checkins c on c.user_id=p.id and c.venue_id=place
 where m.venue_id=place and spot_private.can_discover(p.id,place)
 and (coalesce(c.expires_at>now(),false)=live) order by p.name,p.id;
end $$;

revoke all on function public.location_people(uuid,boolean) from public,anon,authenticated;
grant execute on function public.location_people(uuid,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
