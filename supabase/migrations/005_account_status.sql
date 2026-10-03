begin;
-- Returns only the caller's state, never another user's moderation details.
create function public.my_account_status()
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from spot_private.suspensions s where s.user_id=auth.uid() and s.revoked_at is null
 );
$$;
revoke all on function public.my_account_status() from public,anon;
grant execute on function public.my_account_status() to authenticated;
commit;
