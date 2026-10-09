begin;
drop function public.photo_cutover_fixture(text,uuid);
drop table spot_private.photo_cutover_fixture_owners;
commit;
