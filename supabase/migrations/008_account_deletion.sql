begin;
-- Private data with non-cascading references must be removed before auth user deletion.
create function public.prepare_account_deletion(target_user uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 delete from spot_private.moderation_audit a where a.actor_id=target_user or a.report_id in(
 select r.id from spot_private.reports r where r.reporter_id=target_user or r.target_id=target_user);
 delete from spot_private.reports where reporter_id=target_user or target_id=target_user;
 delete from spot_private.suspensions where user_id=target_user;
 delete from spot_private.moderators where user_id=target_user;
end $$;
revoke all on function public.prepare_account_deletion(uuid) from public,anon,authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
commit;
