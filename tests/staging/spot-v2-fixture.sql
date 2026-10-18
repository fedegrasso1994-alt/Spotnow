-- Controlled synthetic SQL principals only. No passwords, real photos or Storage writes.
begin;
set local lock_timeout='5s';set local statement_timeout='60s';
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'NOT_STAGING';end if;
 if exists(select 1 from auth.users where id::text like 'fea34000-%')or exists(select 1 from venues where id::text like 'fea34100-%')then raise exception 'FIXTURE_COLLISION';end if;
 if not exists(select 1 from spot_private.photo_cutover_control where phase='OPEN'and not execute_enabled and not scheduler_enabled)then raise exception 'PHOTO_BASELINE_CHANGED';end if;
end$$;
set local soma.photo_protocol='PHOTO02';
insert into auth.users(id,email,is_anonymous,raw_user_meta_data)select ('fea34000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'spot-v2-synthetic-'||n||'@example.invalid',false,'{"synthetic":true,"task":"spot-034"}'::jsonb from generate_series(1,12)n;
insert into spot_private.account_eligibility(user_id,status,declared_age)select id,'eligible',25 from auth.users where id::text like 'fea34000-%';
insert into spot_private.validated_photos(photo_path,user_id,preview,canonical_sha,canonical_bytes,source_format,source_width,source_height)select id::text||'/fixture.jpg',id,'data:image/jpeg;base64,YQ==',repeat('a',64),1,'JPEG',1,1 from auth.users where id::text like 'fea34000-%';
insert into spot_private.photo_lifecycle_sets(photo_path,user_id,state,writer,not_before)select id::text||'/fixture.jpg',id,'ready','settled',clock_timestamp()+interval '1 day'from auth.users where id::text like 'fea34000-%';
insert into public.profiles(id,name,age,gender,preference,photo_path)select id,'SPOT SYNTHETIC',25,'M',null,id::text||'/fixture.jpg'from auth.users where id::text like 'fea34000-%';
insert into spot_private.consent_state(user_id,status,version)select u.id,'active',v.version from auth.users u cross join spot_private.consent_versions v where u.id::text like 'fea34000-%'and v.required;
update public.profiles set preference='ALL'where id::text like 'fea34000-%';
insert into public.venues(id,name,address,active,ora_enabled)select ('fea34100-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'SPOT SYNTHETIC '||n,'No real location',true,true from generate_series(1,2)n;
update spot_private.soma_v2_control set spot_enabled=true;update spot_private.ora_spot_policy set enabled=true;
do $$declare u uuid;begin for u in select id from auth.users where id::text like 'fea34000-%'loop
 perform set_config('request.jwt.claim.sub',u::text,true);perform public.start_ora_manual('fea34100-0000-4000-8000-000000000001');end loop;end$$;
commit;
select 'PASS fixture setup: 12 synthetic SQL principals, no Storage writes' evidence;
