begin;
create table spot_private.interests (
 sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 venue_id uuid not null references public.venues(id),
 sender_checkin timestamptz not null,
 created_at timestamptz not null default now(),
 primary key(sender_id,recipient_id), check(sender_id<>recipient_id)
);
alter table spot_private.interests enable row level security;
revoke all on spot_private.interests from public,anon,authenticated;
create table public.matches (
 id uuid primary key default gen_random_uuid(),
 user_a uuid not null references public.profiles(id) on delete cascade,
 user_b uuid not null references public.profiles(id) on delete cascade,
 venue_id uuid not null references public.venues(id),
 created_at timestamptz not null default now(),
 first_message_at timestamptz,
 unique(user_a,user_b), check(user_a<user_b)
);
create table public.messages (
 id uuid primary key default gen_random_uuid(),
 match_id uuid not null references public.matches(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index messages_match_time on public.messages(match_id,created_at,id);
alter table public.matches enable row level security;
alter table public.messages enable row level security;
revoke all on public.matches,public.messages from anon,authenticated;
grant select on public.matches,public.messages to authenticated;
create function spot_private.can_use_match(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.matches m
 where m.id=target and auth.uid() in(m.user_a,m.user_b)
 and (m.first_message_at is not null or m.created_at+interval '1 hour'>now())
 and not exists(select 1 from public.blocks b where
 (b.blocker_id=m.user_a and b.blocked_id=m.user_b) or
 (b.blocker_id=m.user_b and b.blocked_id=m.user_a)));
$$;
revoke all on function spot_private.can_use_match(uuid) from public,anon;
grant execute on function spot_private.can_use_match(uuid) to authenticated;
create policy matches_read on public.matches for select to authenticated using(spot_private.can_use_match(id));
create policy messages_read on public.messages for select to authenticated using(spot_private.can_use_match(match_id));
create function public.express_interest(target_user uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); a uuid; b uuid; venue uuid; stamp timestamptz; result uuid;
begin
 if me is null or me=target_user then raise exception 'Profilo non valido'; end if;
 a:=least(me,target_user); b:=greatest(me,target_user);
 perform pg_advisory_xact_lock(hashtextextended(a::text||b::text,0));
 if not spot_private.can_view_profile(target_user) then raise exception 'Profilo non più presente'; end if;
 select c.venue_id,c.checked_in_at into venue,stamp from public.checkins c
 where c.user_id=me and c.expires_at>now();
 if venue is null then raise exception 'Check-in scaduto'; end if;
 insert into spot_private.interests(sender_id,recipient_id,venue_id,sender_checkin)
 values(me,target_user,venue,stamp) on conflict(sender_id,recipient_id) do update
 set venue_id=excluded.venue_id,sender_checkin=excluded.sender_checkin,created_at=now();
 if exists(select 1 from spot_private.interests i join public.checkins c on c.user_id=i.sender_id
 where i.sender_id=target_user and i.recipient_id=me and i.venue_id=venue
 and c.venue_id=venue and c.checked_in_at=i.sender_checkin and c.expires_at>now()) then
 insert into public.matches(user_a,user_b,venue_id) values(a,b,venue)
 on conflict(user_a,user_b) do update set created_at=now(),venue_id=excluded.venue_id,first_message_at=null
 where public.matches.first_message_at is null and public.matches.created_at+interval '1 hour'<=now()
 returning id into result;
 if result is null then select id into result from public.matches where user_a=a and user_b=b; end if;
 end if;
 return result;
end;
$$;
create function public.send_message(target_match uuid,message_text text)
returns public.messages language plpgsql security definer set search_path='' as $$
declare result public.messages;
begin
 perform 1 from public.matches where id=target_match for update;
 if not spot_private.can_use_match(target_match) then raise exception 'Match scaduto o non disponibile'; end if;
 if message_text is null or char_length(trim(message_text)) not between 1 and 2000 then raise exception 'Scrivi un messaggio da 1 a 2000 caratteri'; end if;
 insert into public.messages(match_id,sender_id,body) values(target_match,auth.uid(),trim(message_text)) returning * into result;
 update public.matches set first_message_at=coalesce(first_message_at,result.created_at) where id=target_match;
 return result;
end;
$$;
create function public.my_matches()
returns table(id uuid,person_id uuid,name text,age integer,photo_path text,venue_name text,created_at timestamptz,first_message_at timestamptz)
language sql stable security definer set search_path='' as $$
 select m.id,p.id,p.name,p.age,p.photo_path,v.name,m.created_at,m.first_message_at
 from public.matches m join public.profiles p on p.id=case when m.user_a=auth.uid() then m.user_b else m.user_a end
 join public.venues v on v.id=m.venue_id
 where spot_private.can_use_match(m.id) order by m.created_at desc;
$$;
-- Match partners keep access to each other's current photo for the conversation.
-- The discovery list still requires active presence; profile RLS is unchanged.
create or replace function spot_private.can_view_photo(object_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 split_part(object_name,'/',1)=auth.uid()::text or exists(
 select 1 from public.profiles p where p.photo_path=object_name and (
 spot_private.can_view_profile(p.id) or exists(select 1 from public.matches m
 where p.id in(m.user_a,m.user_b) and spot_private.can_use_match(m.id)))));
$$;
revoke all on function public.express_interest(uuid),public.send_message(uuid,text),public.my_matches() from public,anon;
grant execute on function public.express_interest(uuid),public.send_message(uuid,text),public.my_matches() to authenticated;
commit;
