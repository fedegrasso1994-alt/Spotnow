begin;
drop function if exists public.privacy_stage_fixture(uuid,text);
drop table if exists spot_private.privacy_fixture_owners;
notify pgrst,'reload schema';commit;
