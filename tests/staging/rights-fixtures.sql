-- Synthetic SQL rehearsal only; transaction always rolls back. No Storage bytes written.
begin;
do $$begin if not exists(select 1 from spot_private.privacy_environment where environment='staging') then raise exception 'STAGING_REQUIRED';end if;end$$;
insert into auth.users(id,email,is_anonymous,raw_user_meta_data)values
('e0000000-0000-4000-8000-000000000001','rights-a@example.invalid',false,'{"rights_fixture":true,"photo02_fixture":true}'),
('e0000000-0000-4000-8000-000000000002','rights-b@example.invalid',false,'{"rights_fixture":true,"photo02_fixture":true}');
insert into spot_private.account_eligibility(user_id,status)values('e0000000-0000-4000-8000-000000000001','restricted'),('e0000000-0000-4000-8000-000000000002','confirmation_required');
insert into spot_private.consent_state(user_id,status,version)values('e0000000-0000-4000-8000-000000000001','revoked','dating-staging-v1');
set local role authenticated;
select set_config('request.jwt.claim.sub','e0000000-0000-4000-8000-000000000001',true);
do $$declare r jsonb;begin
 r:=public.my_rights_page('account');
 if r->>'owner_id'<>'e0000000-0000-4000-8000-000000000001' or r->'items'->0->'data'->>'email'<>'rights-a@example.invalid' or r::text like '%rights-b@example.invalid%' then raise exception 'OWNER_BOUNDARY_FAILED';end if;
 r:=public.my_rights_page('age');if r->'items'->0->'data'->>'status'<>'restricted' then raise exception 'RESTRICTED_ACCESS_FAILED';end if;
 r:=public.my_rights_page('consent');if r->'items'->0->'data'->>'status'<>'revoked' then raise exception 'REVOKED_ACCESS_FAILED';end if;
 begin perform public.my_rights_page('safety_holds');raise exception 'FORBIDDEN_SECTION_ALLOWED';exception when raise_exception then if sqlerrm<>'RIGHTS_SECTION' then raise;end if;end;
 begin perform public.my_rights_page('account','',101);raise exception 'LIMIT_ALLOWED';exception when raise_exception then if sqlerrm<>'RIGHTS_INPUT' then raise;end if;end;
end$$;
set local role anon;
do $$begin
 begin perform public.my_rights_page('account');raise exception 'ANON_ALLOWED';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- Gate change is private to this transaction, fixture-scoped, then rolled back.
select photo_cutover_set('canary','rights-test','synthetic-sql-rehearsal','ef964a56b99e6947c1244dc2639a5668613839dc',array['e0000000-0000-4000-8000-000000000001'::uuid]);
do $$declare claim uuid;begin
 perform public.photo02_begin_account_deletion('e0000000-0000-4000-8000-000000000001');
 claim:=public.claim_photo_account_cleanup('e0000000-0000-4000-8000-000000000001');if claim is null then raise exception 'DELETE_CLAIM_FAILED';end if;
 perform public.prepare_account_deletion('e0000000-0000-4000-8000-000000000001');
 delete from auth.users where id='e0000000-0000-4000-8000-000000000001';
 perform public.finish_photo_account_cleanup('e0000000-0000-4000-8000-000000000001',claim);
 if exists(select 1 from spot_private.account_eligibility where user_id='e0000000-0000-4000-8000-000000000001') or exists(select 1 from spot_private.consent_state where user_id='e0000000-0000-4000-8000-000000000001') then raise exception 'DELETE_PROOF_RESIDUE';end if;
end$$;
set local role authenticated;
do $$begin begin perform public.my_rights_page('account');raise exception 'DELETED_ACCOUNT_ACCESS';exception when insufficient_privilege then null;end;end$$;
reset role;
select 'PASS' as owner_boundary,'PASS' as restricted_access,'PASS' as revoked_access,'PASS' as anonymous_denied,'PASS' as section_limit_guard;
rollback;
select count(*) as residual_fixtures from auth.users where id in('e0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002');
