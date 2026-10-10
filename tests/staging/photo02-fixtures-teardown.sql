-- STAGING ONLY: the fixture owner registry was created by the staging test controls.
-- Venue ids must be supplied from the private run manifests, never guessed from a display name.
do $$ begin
 if exists(select 1 from auth.users a join spot_private.photo02_fixture_owners f on a.id=f.user_id)
 or exists(select 1 from storage.objects o join spot_private.photo02_fixture_owners f on split_part(o.name,'/',1)=f.user_id::text where o.bucket_id='profile-photos')
 or exists(select 1 from spot_private.photo_cleanup_accounts a join spot_private.photo02_fixture_owners f using(user_id) where a.state<>'completed')
 then raise exception 'FIXTURE_REMAINS';end if;
end $$;
-- Delete exact synthetic venue ids from manifests before dropping controls, if no participants remain.
-- Example placeholder is intentionally not an executable deletion of guessed records.
drop function public.photo02_fixture_control(text,uuid,text,bigint);
drop function public.photo02_fixture_race(uuid,uuid,text,boolean);
drop table spot_private.photo02_fixture_owners;
notify pgrst,'reload schema';
