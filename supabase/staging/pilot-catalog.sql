-- Founder-approved pilot catalog, staging only. No schema/flags/legacy data changes.
begin;
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging') or (current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho') then raise exception 'PILOT_STAGING_ONLY';end if;
 if exists(select 1 from public.venues where name in('Università IULM Milano','Università Bocconi Milano','Palestra FitActive Cesena'))then raise exception 'PILOT_CATALOG_ALREADY_PRESENT_REVIEW';end if;
 if exists(select 1 from public.venues where id in('fa350000-0000-4000-8000-000000000001','fa350000-0000-4000-8000-000000000002','fa350000-0000-4000-8000-000000000003'))then raise exception 'PILOT_ID_COLLISION';end if;
end$$;
insert into public.venues(id,name,address,active,ora_enabled)values
('fa350000-0000-4000-8000-000000000001','Università IULM Milano','Milano · catalogo pilot staging',true,true),
('fa350000-0000-4000-8000-000000000002','Università Bocconi Milano','Milano · catalogo pilot staging',true,true),
('fa350000-0000-4000-8000-000000000003','Palestra FitActive Cesena','Cesena · catalogo pilot staging',true,true);
insert into spot_private.tribe_catalog(id,active,joinable)select id,true,true from public.venues where id in('fa350000-0000-4000-8000-000000000001','fa350000-0000-4000-8000-000000000002','fa350000-0000-4000-8000-000000000003');
update public.venues set linked_tribe_id=id where id in('fa350000-0000-4000-8000-000000000001','fa350000-0000-4000-8000-000000000002','fa350000-0000-4000-8000-000000000003');
commit;
