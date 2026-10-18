-- Generated from candidate032 function bodies; no row contents.
begin read only;
do $$begin if exists(select 1 from(values
('public.check_in(uuid)','042cdd57bac0a58062903b790de5d5af'),
('public.privacy_prior_check_in(uuid)','042cdd57bac0a58062903b790de5d5af'),
('spot_private.ora_eligible(uuid)','4005b2055daec307c947ccac7ae38639'),
('spot_private.ora_gate()','dc4bcf024e38a353757a26039f9e5447'),
('spot_private.ora_current()','94530dd3833bc917b7a84b6369ee2039'),
('public.my_presence()','41b4ac662e3c21a7d2642391fb590e94'),
('public.search_places(text,integer)','d1b91f908649bc531658ffa77b7f484a'),
('spot_private.start_ora(uuid,text)','64977466f9cf65e38275d798b86900f8'),
('public.start_ora_manual(uuid)','60512730ce2c947409eedd8f198b5ddf'),
('public.start_ora_qr(uuid)','dd46b9bd47ef5cae4f3a6da7e6cfaa46'),
('public.end_ora(uuid)','31f7fbf779a5e5a87f0765a1ddc091d0'),
('spot_private.ora_can_discover(uuid)','abc1a5949b90b54428302c1e21e4d020'),
('spot_private.can_view_profile(uuid)','7531f2a65c79e9484cfe02c6a8c62b13'),
('public.ora_people_page(integer,integer)','4a77f2200b96c65a8871b44f3fd0f813'))e(signature,hash)left join pg_proc p on p.oid=to_regprocedure(e.signature)where p.oid is null or md5(p.prosrc)<>e.hash)then raise exception 'ORA_SOURCE_MISMATCH';end if;end$$;
select 'PASS: all14 ORA/retired writer/minimal authorization function bodies match versioned032' evidence;rollback;
