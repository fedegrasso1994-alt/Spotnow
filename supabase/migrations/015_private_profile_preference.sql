begin;
-- SEC-01: direct table reads (including REST select=*) are self-only.
-- Keep SELECT grants for own reads and INSERT/UPSERT ... RETURNING.
-- Other-user access remains in explicit SECURITY DEFINER projections.
alter policy profiles_read on public.profiles
 using (id = (select auth.uid()));

-- Preserve the legacy peopleHere contract without exposing entire profile rows.
create function public.visible_profiles()
returns table(id uuid,name text,age integer,gender text,photo_path text)
language sql stable security definer set search_path='' as $$
 select p.id,p.name,p.age,p.gender,p.photo_path
 from public.profiles p
 where p.id<>auth.uid() and spot_private.can_view_profile(p.id);
$$;
revoke all on function public.visible_profiles() from public,anon,authenticated;
grant execute on function public.visible_profiles() to authenticated;
notify pgrst, 'reload schema';
commit;
