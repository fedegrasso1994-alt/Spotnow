begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'PRIVACY_WELCOME_STAGING_ONLY';end if;
 if current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho'then raise exception 'PRIVACY_WELCOME_PROJECT_MISMATCH';end if;
end$$;
-- An adult declaration, never a fabricated numeric age. Existing numeric attestations remain valid.
alter table spot_private.account_eligibility drop constraint account_eligibility_check;
alter table spot_private.account_eligibility add constraint account_eligibility_check check(status<>'eligible' or declared_age is not null or (method='adult_checkbox' and statement_version='adult-checkbox-v1'));
create or replace function spot_private.age_eligible(person uuid)returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from spot_private.account_eligibility where user_id=person and status='eligible' and (declared_age between 18 and 120 or (method='adult_checkbox' and statement_version='adult-checkbox-v1')));
$$;
create function public.attest_adult_checkbox(declared boolean,operation_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); prior spot_private.age_events; fp text:='adult-checkbox-v1:true';
begin
 if me is null or not spot_private.has_account() or not exists(select 1 from auth.users where id=me and not is_anonymous)then raise exception 'AGE_AUTH'using errcode='42501';end if;
 if declared is distinct from true or operation_id is null then raise exception 'AGE_INVALID';end if;
 perform spot_private.photo_owner_lock(me);
 select * into prior from spot_private.age_events where user_id=me and age_events.operation_id=attest_adult_checkbox.operation_id;
 if found then if prior.request_fingerprint<>fp then raise exception 'AGE_OPERATION_CONFLICT';end if;return public.my_privacy_state();end if;
 if exists(select 1 from spot_private.account_eligibility where user_id=me and status='restricted')then raise exception 'AGE_RESTRICTED'using errcode='42501';end if;
 if not spot_private.age_eligible(me)then
 insert into spot_private.account_eligibility(user_id,status,declared_age,statement_version,method,attested_at,revision)
 values(me,'eligible',null,'adult-checkbox-v1','adult_checkbox',clock_timestamp(),1)
 on conflict(user_id)do update set status='eligible',declared_age=null,statement_version='adult-checkbox-v1',method='adult_checkbox',attested_at=excluded.attested_at,revision=account_eligibility.revision+1;
 end if;
 insert into spot_private.age_events(user_id,operation_id,request_fingerprint,status)values(me,operation_id,fp,'eligible');
 return public.my_privacy_state();
end$$;
-- Preserve consent enforcement and the existing preference-erasure exception.
do $$declare body text;begin
 body:=pg_get_functiondef('spot_private.enforce_profile_privacy()'::regprocedure);
 if strpos(body,'declared_age=new.age')=0 then raise exception 'PRIVACY_TRIGGER_DEPENDENCY';end if;
 body:=replace(body,'declared_age=new.age','(declared_age=new.age or (method=''adult_checkbox'' and statement_version=''adult-checkbox-v1'' and new.age between 18 and 120))');
 execute body;
 body:=pg_get_functiondef('public.my_privacy_state()'::regprocedure);
 body:=replace(body,$old$'statement_version','adult-v1'$old$,$new$'statement_version',coalesce(a.statement_version,'adult-v1')$new$);
 execute body;
end$$;
-- Readable staging copy, still NOT legally validated. Never silently transfer existing consent.
update spot_private.consent_versions set required=false where required;
insert into spot_private.consent_versions(version,purpose,text_content,text_hash,status,required)
values('dating-staging-v2','dating_preferences','Acconsento esplicitamente all’uso delle mie preferenze dating per mostrarmi profili compatibili e consentire nuovi Spot e match.',md5('Acconsento esplicitamente all’uso delle mie preferenze dating per mostrarmi profili compatibili e consentire nuovi Spot e match.'),'placeholder',true);
revoke all on function public.attest_adult_checkbox(boolean,uuid)from public,anon,authenticated,service_role;
grant execute on function public.attest_adult_checkbox(boolean,uuid)to authenticated;
notify pgrst,'reload schema';
commit;
