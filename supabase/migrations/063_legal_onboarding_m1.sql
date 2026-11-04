begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'LEGAL_STAGING_ONLY';end if;
 if current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho'then raise exception 'LEGAL_PROJECT_MISMATCH';end if;
end$$;
-- Technical staging version: no pilot/publication/legal-validation authorization.
create table spot_private.terms_versions(
 version text primary key,document_hash text not null check(document_hash~'^[a-f0-9]{64}$'),
 document_url text not null check(document_url like '/legal/%'),required boolean not null default false
);
create unique index one_required_terms on spot_private.terms_versions(required)where required;
insert into spot_private.terms_versions values('terms-1.1-staging','d3b894bc17c774e30810dcf12ff3e22c656ce419ee9c400c73a88b4043c94946','/legal/terms-v1.1-staging.html',true);
create table spot_private.terms_acceptances(
 user_id uuid references auth.users(id)on delete cascade,version text references spot_private.terms_versions(version),
 document_hash text not null,operation_id uuid not null,accepted_at timestamptz not null default clock_timestamp(),
 primary key(user_id,version),unique(user_id,operation_id)
);
alter table spot_private.terms_versions enable row level security;
alter table spot_private.terms_acceptances enable row level security;
revoke all on spot_private.terms_versions,spot_private.terms_acceptances from public,anon,authenticated,service_role;
create function spot_private.terms_version_immutable()returns trigger language plpgsql security definer set search_path=''as $$begin
 perform pg_advisory_xact_lock(hashtextextended('legal-terms-version',63));
 if TG_OP='UPDATE'and(new.version,new.document_hash,new.document_url)is distinct from(old.version,old.document_hash,old.document_url)then raise exception 'LEGAL_VERSION_IMMUTABLE';end if;
 if TG_OP='DELETE'then raise exception 'LEGAL_VERSION_IMMUTABLE';end if;
 return new;
end$$;
create trigger terms_version_immutable before insert or update or delete on spot_private.terms_versions for each row execute function spot_private.terms_version_immutable();
create function spot_private.terms_accepted(person uuid)returns boolean language sql stable security definer set search_path=''as $$
 select exists(select 1 from spot_private.terms_versions v join spot_private.terms_acceptances a on a.version=v.version and a.document_hash=v.document_hash where v.required and a.user_id=person);
$$;
-- Preserve the pre-Terms account predicate for the completion path; never grant it to clients.
alter function spot_private.has_account()rename to m1_account_before_terms;
create function spot_private.has_account()returns boolean language sql stable security definer set search_path=''as $$select spot_private.m1_account_before_terms()and spot_private.terms_accepted(auth.uid());$$;
do $$declare body text;begin
 body:=pg_get_functiondef('public.attest_adult_checkbox(boolean,uuid)'::regprocedure);
 if strpos(body,'spot_private.has_account()')=0 then raise exception 'LEGAL_AGE_DEPENDENCY';end if;
 execute replace(body,'spot_private.has_account()','spot_private.m1_account_before_terms()');
end$$;
alter function spot_private.board_eligible(uuid)rename to m1_board_before_terms;
create function spot_private.board_eligible(person uuid)returns boolean language sql stable security definer set search_path=''as $$select spot_private.m1_board_before_terms(person)and spot_private.terms_accepted(person);$$;
alter function spot_private.privacy_discovery_eligible(uuid)rename to m1_discovery_before_terms;
create function spot_private.privacy_discovery_eligible(person uuid)returns boolean language sql stable security definer set search_path=''as $$select spot_private.m1_discovery_before_terms(person)and spot_private.terms_accepted(person);$$;
alter function public.my_privacy_state()set schema spot_private;
alter function spot_private.my_privacy_state()rename to m1_privacy_before_terms;
create function public.my_privacy_state()returns jsonb language sql stable security definer set search_path=''as $$
 select spot_private.m1_privacy_before_terms()||jsonb_build_object(
 'terms_status',case when spot_private.terms_accepted(auth.uid())then 'accepted'else 'required'end,
 'required_terms_version',v.version,'required_terms_hash',v.document_hash,'terms_url',v.document_url,
 'terms_accepted_at',(select a.accepted_at from spot_private.terms_acceptances a where a.user_id=auth.uid()and a.version=v.version))
 from(select 1)x left join spot_private.terms_versions v on v.required;
$$;
create function public.accept_legal_terms(expected_version text,expected_hash text,accepted boolean,operation_id uuid)returns jsonb language plpgsql security definer set search_path=''as $$declare me uuid:=auth.uid();v spot_private.terms_versions;prior spot_private.terms_acceptances;begin
 if me is null or not spot_private.m1_account_before_terms()then raise exception 'LEGAL_AUTH'using errcode='42501';end if;
 if accepted is distinct from true or operation_id is null then raise exception 'LEGAL_EXPLICIT_REQUIRED';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('legal-terms-version',63));
 perform spot_private.photo_owner_lock(me);
 select *into v from spot_private.terms_versions where required;
 if not found or expected_version is distinct from v.version or expected_hash is distinct from v.document_hash then raise exception 'LEGAL_VERSION_CHANGED';end if;
 if not spot_private.age_eligible(me)then raise exception 'AGE_REQUIRED'using errcode='42501';end if;
 select *into prior from spot_private.terms_acceptances a where a.user_id=me and a.operation_id=accept_legal_terms.operation_id;
 if found and(prior.version,prior.document_hash)is distinct from(expected_version,expected_hash)then raise exception 'LEGAL_OPERATION_CONFLICT';end if;
 insert into spot_private.terms_acceptances(user_id,version,document_hash,operation_id)values(me,v.version,v.document_hash,operation_id)on conflict(user_id,version)do nothing;
 return public.my_privacy_state();
end$$;
-- Specific profile copy from Legal Pack 03; remains technically staged, NOT legal validation.
update spot_private.consent_versions set required=false where required;
insert into spot_private.consent_versions(version,purpose,text_content,text_hash,status,required)
values('dating-profile-1.1-staging','dating_preferences','Acconsento esplicitamente al trattamento delle mie preferenze sulle persone che desidero conoscere, anche quando possono rivelare informazioni sul mio orientamento sessuale, per ricevere presentazioni romantiche compatibili, secondo l''Informativa sulla privacy.',md5('Acconsento esplicitamente al trattamento delle mie preferenze sulle persone che desidero conoscere, anche quando possono rivelare informazioni sul mio orientamento sessuale, per ricevere presentazioni romantiche compatibili, secondo l''Informativa sulla privacy.'),'placeholder',true);
-- Preserve the existing function ACLs rather than introducing default PUBLIC execution.
do $$declare pair text[];a record;target text;begin
 foreach pair slice 1 in array array[['has_account()','m1_account_before_terms()'],['board_eligible(uuid)','m1_board_before_terms(uuid)'],['privacy_discovery_eligible(uuid)','m1_discovery_before_terms(uuid)']]loop
  target:='spot_private.'||pair[1];
  execute 'revoke all on function '||target||' from public,anon,authenticated,service_role';
  for a in select x.grantee,x.is_grantable from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner)))x where p.oid=('spot_private.'||pair[2])::regprocedure and x.privilege_type='EXECUTE'and x.grantee<>p.proowner loop
   execute 'grant execute on function '||target||' to '||case when a.grantee=0 then 'PUBLIC'else quote_ident(pg_get_userbyid(a.grantee))end||case when a.is_grantable then ' with grant option'else ''end;
  end loop;
 end loop;
end$$;
-- No backfill of assent, no roles/MFA/session changes, no product/retention/PHOTO flag changes.
revoke all on function spot_private.terms_version_immutable(),spot_private.terms_accepted(uuid),spot_private.m1_account_before_terms(),spot_private.m1_board_before_terms(uuid),spot_private.m1_discovery_before_terms(uuid),spot_private.m1_privacy_before_terms()from public,anon,authenticated,service_role;
revoke all on function public.accept_legal_terms(text,text,boolean,uuid),public.my_privacy_state()from public,anon,service_role;
grant execute on function public.accept_legal_terms(text,text,boolean,uuid),public.my_privacy_state()to authenticated;
notify pgrst,'reload schema';
commit;
