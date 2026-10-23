-- Staging-only historical synthetic import, entirely rolled back.
-- Replica mode is SESSION LOCAL, for deterministic old fixtures only; restored before
-- dry-run/purge. No Storage object or PHOTO registry/lifecycle is fabricated or touched.
begin;
set local lock_timeout='3s';set local statement_timeout='45s';
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or current_setting('supabase.project_ref',true)not in('zjinjtkekmaqtxsuyvho','')then raise exception 'STAGING_ONLY';end if;
 if exists(select 1 from spot_private.retention_phase_a_control where manual_enabled or scheduler_enabled)or exists(select 1 from cron.job where active)or exists(select 1 from spot_private.notification_control where enabled or delivery_enabled)or exists(select 1 from spot_private.soma_v2_control where discovery_enabled)then raise exception 'PHASE_A_UNSAFE_BASELINE';end if;
 if exists(select 1 from auth.users where id::text like 'a1a15400-%')then raise exception 'FIXTURE_COLLISION';end if;
end$$;
do $$declare p text;begin foreach p in array array['analytics','observability','dd','notifications']loop if exists(select 1 from spot_private.phase_a_candidates(p,clock_timestamp())c where not c.held)then raise exception 'NON_FIXTURE_ELIGIBLE_BEFORE_CANARY %',p;end if;end loop;end$$;
create temp table phase_a_evidence(name text primary key,value jsonb)on commit drop;
insert into phase_a_evidence values('baseline',jsonb_build_object('auth',(select count(*)from auth.users),'profiles',(select count(*)from profiles),'storage',(select count(*)from storage.objects),'storage_hash',(select md5(coalesce(jsonb_agg(to_jsonb(o)order by bucket_id,name)::text,''))from storage.objects o)));
-- Historical test records are not a normal onboarding/PHOTO test. No external account
-- can see uncommitted fixtures. Existing users/rows are never changed.
set local session_replication_role=replica;
insert into auth.users(id,raw_user_meta_data)values('a1a15400-0000-4000-8000-000000000001','{"soma_synthetic_canary":true}'),('a1a15400-0000-4000-8000-000000000002','{"soma_synthetic_canary":true}');
insert into profiles(id,name,age,gender,preference,photo_path)values('a1a15400-0000-4000-8000-000000000001','SYNTHETIC RETENTION A',25,'M','ALL','a1a15400-0000-4000-8000-000000000001/disposable-metadata-only.jpg'),('a1a15400-0000-4000-8000-000000000002','SYNTHETIC RETENTION B',25,'F','ALL','a1a15400-0000-4000-8000-000000000002/disposable-metadata-only.jpg');
insert into venues(id,name,address)values('a1a15401-0000-4000-8000-000000000001','SYNTHETIC RETENTION','SYNTHETIC');
insert into spot_private.tribe_catalog(id,active,joinable)values('a1a15401-0000-4000-8000-000000000001',true,false);
insert into spot_private.tribe_memberships(user_id,venue_id,membership_id)values('a1a15400-0000-4000-8000-000000000001','a1a15401-0000-4000-8000-000000000001','a1a15402-0000-4000-8000-000000000001'),('a1a15400-0000-4000-8000-000000000002','a1a15401-0000-4000-8000-000000000001','a1a15402-0000-4000-8000-000000000002');
insert into spot_private.discovery_windows(id,local_date,slot,policy_version,starts_at,ends_at,state)
 select ('a1a15403-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,(clock_timestamp()at time zone 'Europe/Rome')::date-days,'morning',2,(((clock_timestamp()at time zone 'Europe/Rome')::date-days)+time '08:00')at time zone 'Europe/Rome',(((clock_timestamp()at time zone 'Europe/Rome')::date-days)+time '16:00')at time zone 'Europe/Rome','closed'from(values(1,31),(2,29),(3,32))x(n,days);
insert into spot_private.discovery_allocations(window_id,user_id,exposure_count)select w.id,u.id,1 from spot_private.discovery_windows w cross join auth.users u where w.id::text like 'a1a15403-%'and u.id::text like 'a1a15400-%';
insert into spot_private.discovery_exposures(id,window_id,user_a,user_b,tribe_id,membership_a,membership_b)
 select ('a1a15404-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('a1a15403-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'a1a15400-0000-4000-8000-000000000001','a1a15400-0000-4000-8000-000000000002','a1a15401-0000-4000-8000-000000000001','a1a15402-0000-4000-8000-000000000001','a1a15402-0000-4000-8000-000000000002'from generate_series(1,3)n;
insert into matches(id,user_a,user_b,venue_id)values('a1a15405-0000-4000-8000-000000000001','a1a15400-0000-4000-8000-000000000001','a1a15400-0000-4000-8000-000000000002','a1a15401-0000-4000-8000-000000000001');
set local session_replication_role=origin;
-- Check historical import reference closure before invoking real executor guards.
do $$begin
 if exists(select 1 from spot_private.discovery_exposures e left join spot_private.discovery_windows w on w.id=e.window_id left join spot_private.tribe_memberships a on a.membership_id=e.membership_a and a.user_id=e.user_a left join spot_private.tribe_memberships b on b.membership_id=e.membership_b and b.user_id=e.user_b where e.id::text like 'a1a15404-%'and(w.id is null or a.user_id is null or b.user_id is null))then raise exception 'FIXTURE_FK_INVALID';end if;
end$$;
insert into phase_a_evidence values('protected_product_hash',jsonb_build_object('profiles',(select md5(jsonb_agg(to_jsonb(prof)order by id)::text)from profiles prof),'matches',(select md5(jsonb_agg(to_jsonb(m)order by id)::text)from matches m),'messages',(select md5(coalesce(jsonb_agg(to_jsonb(m)order by id)::text,''))from messages m)));
insert into spot_private.safety_holds(category,target,case_reference,reason_code,review_at)values('dd_exposures','a1a15404-0000-4000-8000-000000000003','SYNTHETIC PHASE A','INCIDENT',clock_timestamp()+interval '1 day');
insert into spot_private.analytics_days(user_id,day,created_at)values('a1a15400-0000-4000-8000-000000000001',current_date-91,clock_timestamp()-interval '91 days'),('a1a15400-0000-4000-8000-000000000001',current_date-89,clock_timestamp()-interval '89 days');
insert into spot_private.analytics_events(user_id,event,surface,source,dedupe,created_at)values('a1a15400-0000-4000-8000-000000000001','screen_view','profile','client',repeat('a',32),clock_timestamp()-interval '91 days'),('a1a15400-0000-4000-8000-000000000001','screen_view','profile','client',repeat('b',32),clock_timestamp()-interval '89 days');
insert into spot_private.ops_events(request_id,operation,source,result,duration_ms,created_at)values('a1a15406-0000-4000-8000-000000000001','chat.read','edge','success',0,clock_timestamp()-interval '15 days'),('a1a15406-0000-4000-8000-000000000002','chat.read','edge','success',0,clock_timestamp()-interval '13 days');
insert into spot_private.ops_incidents(operation,source,rule,opened_at,last_failure_at)values('chat.read','edge','three_failures',clock_timestamp()-interval '15 days',clock_timestamp());
insert into spot_private.push_bindings(id,owner_id,endpoint,p256dh,auth_key,binding_key,expires_at)values('a1a15407-0000-4000-8000-000000000001','a1a15400-0000-4000-8000-000000000001','https://fcm.googleapis.com/synthetic-retention-a',repeat('A',87),repeat('B',22),repeat('c',64),clock_timestamp()-interval '1 day');
insert into spot_private.notification_events(id,kind,canonical_id,owner_id,target_id)values('a1a15408-0000-4000-8000-000000000001','match','a1a15405-0000-4000-8000-000000000001','a1a15400-0000-4000-8000-000000000001','a1a15405-0000-4000-8000-000000000001');
insert into spot_private.notification_deliveries(event_id,binding_id)values('a1a15408-0000-4000-8000-000000000001','a1a15407-0000-4000-8000-000000000001');
update spot_private.retention_phase_a_control set manual_enabled=true;
do $$declare p text;r jsonb;before_count bigint;after_count bigint;begin
 -- Refuse a canary that would touch pre-existing due analytics/OPS/notification rows.
 if exists(select 1 from spot_private.phase_a_candidates('analytics',clock_timestamp())c where not c.held and c.k->>'user_id'is distinct from 'a1a15400-0000-4000-8000-000000000001'and c.rel<>'analytics_events')then raise exception 'NON_FIXTURE_ELIGIBLE';end if;
 foreach p in array array['analytics','observability','dd','notifications']loop
 select count(*)into before_count from spot_private.phase_a_candidates(p,clock_timestamp());
 r:=public.retention_phase_a_batch(p,gen_random_uuid(),true,100);if r->>'status'<>'completed'then raise exception 'DRY_RUN_FAILED %',p;end if;
 select count(*)into after_count from spot_private.phase_a_candidates(p,clock_timestamp());if before_count<>after_count then raise exception 'DRY_RUN_MUTATED';end if;
 insert into phase_a_evidence values(p||'_dry_run',r- 'operation_id');
 for n in 1..4 loop
 r:=public.retention_phase_a_batch(p,gen_random_uuid(),false,100);if r->>'status'<>'completed'then raise exception 'MANUAL_PURGE_FAILED % %',p,r->>'error_code';end if;
 insert into phase_a_evidence values(p||'_manual_'||n,r-'operation_id');
 end loop;
 r:=public.retention_phase_a_batch(p,gen_random_uuid(),false,100);if(r->>'deleted')::int<>0 then raise exception 'NOT_IDEMPOTENT %',p;end if;
 end loop;
 if exists(select 1 from spot_private.analytics_days where user_id='a1a15400-0000-4000-8000-000000000001'and day=current_date-91)or not exists(select 1 from spot_private.analytics_days where user_id='a1a15400-0000-4000-8000-000000000001'and day=current_date-89)then raise exception 'ANALYTICS_BOUNDARY';end if;
 if exists(select 1 from spot_private.ops_events where request_id='a1a15406-0000-4000-8000-000000000001')or not exists(select 1 from spot_private.ops_events where request_id='a1a15406-0000-4000-8000-000000000002')or not exists(select 1 from spot_private.ops_incidents where operation='chat.read'and source='edge')then raise exception 'OPS_BOUNDARY';end if;
 if exists(select 1 from spot_private.discovery_windows where id='a1a15403-0000-4000-8000-000000000001')or not exists(select 1 from spot_private.discovery_exposures where id='a1a15404-0000-4000-8000-000000000002')or not exists(select 1 from spot_private.discovery_exposures where id='a1a15404-0000-4000-8000-000000000003')or not exists(select 1 from spot_private.discovery_windows where id='a1a15403-0000-4000-8000-000000000003')then raise exception 'DD_BOUNDARY_HOLD';end if;
 if(select value from phase_a_evidence where name='protected_product_hash')is distinct from jsonb_build_object('profiles',(select md5(jsonb_agg(to_jsonb(prof)order by id)::text)from profiles prof),'matches',(select md5(jsonb_agg(to_jsonb(m)order by id)::text)from matches m),'messages',(select md5(coalesce(jsonb_agg(to_jsonb(m)order by id)::text,''))from messages m))then raise exception 'PRODUCT_MUTATED';end if;
 insert into phase_a_evidence values('assertions','{"old_new":"PASS","direct_child_hold":"PASS","parent_no_cascade":"PASS","match_chat_profile":"PASS","repeat":"PASS","import_mode_restored":true,"historical_import":"uncommitted synthetic metadata only; no PHOTO pipeline claim"}');
end$$;
select jsonb_object_agg(name,value)as evidence from phase_a_evidence;
rollback;
