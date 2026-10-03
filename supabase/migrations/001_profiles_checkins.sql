-- Apply to a new Supabase project. No demo venue or fixed QR secret is seeded.
begin;
create schema if not exists spot_private;
revoke all on schema spot_private from public, anon, authenticated;
grant usage on schema spot_private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  age integer not null check (age >= 18 and age <= 120),
  gender text not null check (gender in ('M', 'F')),
  preference text not null check (preference in ('M', 'F', 'ALL')),
  photo_path text not null check (photo_path like id::text || '/%'),
  updated_at timestamptz not null default now()
);
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  active boolean not null default true
);
create table spot_private.venue_codes (
  venue_id uuid primary key references public.venues(id) on delete cascade,
  qr_token uuid not null unique default gen_random_uuid()
);
alter table spot_private.venue_codes enable row level security;
create table public.checkins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  venue_id uuid not null references public.venues(id),
  checked_in_at timestamptz not null,
  expires_at timestamptz not null,
  check (expires_at = checked_in_at + interval '1 hour')
);
create index checkins_venue_expiry on public.checkins(venue_id, expires_at);
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.checkins enable row level security;
alter table public.blocks enable row level security;
revoke all on public.profiles, public.venues, public.checkins, public.blocks from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.venues, public.checkins to authenticated;
grant select, insert, delete on public.blocks to authenticated;

-- A helper avoids recursive RLS when checking another profile's presence.
create function spot_private.can_view_profile(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    target = auth.uid() or (
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
revoke all on function spot_private.can_view_profile(uuid) from public, anon;
grant execute on function spot_private.can_view_profile(uuid) to authenticated;
create policy profiles_read on public.profiles for select to authenticated
  using (spot_private.can_view_profile(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and exists (
    select 1 from storage.objects where bucket_id = 'profile-photos' and name = photo_path
  ));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and exists (
    select 1 from storage.objects where bucket_id = 'profile-photos' and name = photo_path
  ));
create policy venues_read on public.venues for select to authenticated using (active);
create policy checkins_read_own on public.checkins for select to authenticated
  using (user_id = (select auth.uid()));
create policy blocks_read_own on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy blocks_insert_own on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy blocks_delete_own on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- Only this operation can create or renew presence; clients cannot set timestamps.
create function public.check_in(qr_token uuid)
returns public.checkins language plpgsql security definer set search_path = '' as $$
declare venue uuid; result public.checkins; stamp timestamptz := now();
begin
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
revoke all on function public.check_in(uuid) from public, anon;
grant execute on function public.check_in(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('profile-photos','profile-photos',false,8388608,array['image/jpeg','image/png','image/webp']);
create policy photos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Explicit authorization, without relying on a nested RLS-filtered profile query.
create function spot_private.can_view_photo(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    split_part(object_name, '/', 1) = auth.uid()::text
    or exists (
      select 1 from public.profiles p
      where p.photo_path = object_name and spot_private.can_view_profile(p.id)
    )
  );
$$;
revoke all on function spot_private.can_view_photo(text) from public, anon;
grant execute on function spot_private.can_view_photo(text) to authenticated;
create policy photos_read_allowed on storage.objects for select to authenticated
  using (bucket_id = 'profile-photos' and spot_private.can_view_photo(name));
-- No overwrite/delete API until profile photo replacement is committed successfully.
commit;
