begin;
-- PLACEHOLDER versions are allowed only in the explicit staging configuration.
create table spot_private.privacy_environment(singleton boolean primary key check(singleton),environment text not null check(environment in('staging','production')));
-- Fail-safe in every newly migrated project. Staging activation requires its signed service ref.
insert into spot_private.privacy_environment values(true,'production');
create table spot_private.consent_versions(version text primary key,purpose text not null default 'dating_preferences',text_content text not null,text_hash text not null,status text not null check(status in('placeholder','validated')),required boolean not null default false);
insert into spot_private.consent_versions select 'dating-staging-v1','dating_preferences',t,md5(t),'placeholder',true from (values('PLACEHOLDER — NON VALIDATO — SOLO TEST: acconsento esplicitamente all’uso delle mie preferenze dating per discovery e matching.')) x(t);
create unique index consent_one_required on spot_private.consent_versions(required) where required;
create table spot_private.consent_state(user_id uuid primary key references auth.users(id) on delete cascade,status text not null check(status in('active','revoked')),version text references spot_private.consent_versions(version),revision bigint not null default 0,changed_at timestamptz not null default clock_timestamp());
create table spot_private.consent_challenges(token uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,version text references spot_private.consent_versions(version),revision bigint not null,expires_at timestamptz not null default clock_timestamp()+interval '10 minutes',used boolean not null default false);
create table spot_private.consent_events(user_id uuid references auth.users(id) on delete cascade,operation_id uuid,action text not null check(action in('accept','revoke')),version text,text_hash text,created_at timestamptz not null default clock_timestamp(),primary key(user_id,operation_id));
do $$declare t text;begin foreach t in array array['privacy_environment','consent_versions','consent_state','consent_challenges','consent_events'] loop execute format('alter table spot_private.%I enable row level security',t);execute format('revoke all on spot_private.%I from public,anon,authenticated',t);end loop;end $$;
alter table public.profiles alter column preference drop not null;
-- Existing usage is not evidence of consent. Staging minimization; no invented opt-ins.
-- Trigger remains active: do not bypass publication/lifecycle safeguards.
create function spot_private.valid_dating_consent(person uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from spot_private.consent_state s join spot_private.consent_versions v on v.version=s.version cross join spot_private.privacy_environment e where s.user_id=person and s.status='active' and v.required and (v.status='validated' or e.environment='staging'));
$$;
create or replace function spot_private.privacy_discovery_eligible(person uuid) returns boolean language sql stable security definer set search_path='' as $$
 select spot_private.age_eligible(person) and spot_private.valid_dating_consent(person)
 and exists(select 1 from auth.users where id=person and not is_anonymous)
 and not exists(select 1 from spot_private.suspensions where user_id=person and revoked_at is null)
 and not exists(select 1 from spot_private.account_deletions where user_id=person);
$$;
create or replace function spot_private.enforce_profile_privacy() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform spot_private.photo_owner_lock(new.id);
 if not spot_private.age_eligible(new.id) or not exists(select 1 from spot_private.account_eligibility where user_id=new.id and declared_age=new.age) then raise exception 'AGE_REQUIRED' using errcode='42501';end if;
 if new.preference is not null and not spot_private.valid_dating_consent(new.id) then raise exception 'CONSENT_REQUIRED' using errcode='42501';end if;
 return new;
end $$;
-- Existing profiles may be unconfirmed: backfill via dedicated owner-only flag, never client-controlled.
-- Use a separate SQL update before replacing the trigger temporarily in the transaction.
-- No photo-path UPDATE, so no photo publication/retirement is performed.
alter table public.profiles disable trigger aa_profile_privacy;
update public.profiles set preference=null;
alter table public.profiles enable trigger aa_profile_privacy;
create or replace function public.my_privacy_state() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('age_status',coalesce(a.status,'confirmation_required'),'age_revision',coalesce(a.revision,0),'declared_age',a.declared_age,'statement_version','adult-v1',
 'consent_status',case when s.status='active' and not spot_private.valid_dating_consent(x.id) then 'renewal_required' else coalesce(s.status,'missing') end,
 'consent_revision',coalesce(s.revision,0),'consent_version',s.version,'required_version',v.version,'consent_text',v.text_content)
 from (select auth.uid() id) x left join spot_private.account_eligibility a on a.user_id=x.id left join spot_private.consent_state s on s.user_id=x.id left join spot_private.consent_versions v on v.required;
$$;
create function public.dating_consent_challenge() returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();v spot_private.consent_versions;c spot_private.consent_challenges;
begin
 if not spot_private.has_account() or not spot_private.age_eligible(me) then raise exception 'AGE_REQUIRED' using errcode='42501';end if;
 perform spot_private.photo_owner_lock(me);
 select * into v from spot_private.consent_versions where required;
 if not found or v.status<>'validated' and not exists(select 1 from spot_private.privacy_environment where environment='staging') then raise exception 'CONSENT_NOT_VALIDATED';end if;
 delete from spot_private.consent_challenges where user_id=me;
 insert into spot_private.consent_challenges(user_id,version,revision) values(me,v.version,coalesce((select revision from spot_private.consent_state where user_id=me),0)) returning * into c;
 return jsonb_build_object('token',c.token,'version',v.version,'revision',c.revision,'text',v.text_content);
end $$;
create function public.accept_dating_consent(challenge uuid,operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();c spot_private.consent_challenges;prior spot_private.consent_events;
begin
 if not spot_private.has_account() or not spot_private.age_eligible(me) or operation_id is null then raise exception 'AGE_REQUIRED' using errcode='42501';end if;
 perform spot_private.photo_owner_lock(me);
 select * into prior from spot_private.consent_events where user_id=me and consent_events.operation_id=accept_dating_consent.operation_id;
 if found then if prior.action<>'accept' then raise exception 'CONSENT_OPERATION_CONFLICT';end if;return public.my_privacy_state();end if;
 select * into c from spot_private.consent_challenges where token=challenge and user_id=me;
 if not found or c.used or c.expires_at<=clock_timestamp() or c.revision<>coalesce((select revision from spot_private.consent_state where user_id=me),0) or not exists(select 1 from spot_private.consent_versions v cross join spot_private.privacy_environment e where v.version=c.version and v.required and (v.status='validated' or e.environment='staging')) then raise exception 'CONSENT_CHALLENGE';end if;
 insert into spot_private.consent_state(user_id,status,version,revision) values(me,'active',c.version,1) on conflict(user_id) do update set status='active',version=excluded.version,revision=consent_state.revision+1,changed_at=clock_timestamp();
 update spot_private.consent_challenges set used=true where token=challenge;
 insert into spot_private.consent_events(user_id,operation_id,action,version,text_hash) select me,operation_id,'accept',c.version,text_hash from spot_private.consent_versions where version=c.version;
 return public.my_privacy_state();
end $$;
create function public.revoke_dating_consent(operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();prior spot_private.consent_events;current_state spot_private.consent_state;
begin
 if me is null or operation_id is null then raise exception 'CONSENT_AUTH' using errcode='42501';end if;
 perform spot_private.photo_owner_lock(me);
 select * into prior from spot_private.consent_events where user_id=me and consent_events.operation_id=revoke_dating_consent.operation_id;
 if found then if prior.action<>'revoke' then raise exception 'CONSENT_OPERATION_CONFLICT';end if;return public.my_privacy_state();end if;
 select * into current_state from spot_private.consent_state where user_id=me;
 if current_state.status is distinct from 'revoked' then
 insert into spot_private.consent_state(user_id,status,version,revision) values(me,'revoked',current_state.version,1) on conflict(user_id) do update set status='revoked',revision=consent_state.revision+1,changed_at=clock_timestamp();
 insert into spot_private.consent_events(user_id,operation_id,action,version,text_hash) values(me,operation_id,'revoke',current_state.version,(select text_hash from spot_private.consent_versions where version=current_state.version));
 end if;
 delete from spot_private.consent_challenges where user_id=me;
 -- Do not require age eligibility for erasure of a sensitive preference.
 update public.profiles set preference=null where id=me;
 return public.my_privacy_state();
end $$;
-- Permit restricted owners to erase preference, but not to rewrite their profile.
create or replace function spot_private.enforce_profile_privacy() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform spot_private.photo_owner_lock(new.id);
 if tg_op='UPDATE' and new.preference is null and (to_jsonb(new)-'preference')=(to_jsonb(old)-'preference') then return new;end if;
 if not spot_private.age_eligible(new.id) or not exists(select 1 from spot_private.account_eligibility where user_id=new.id and declared_age=new.age) then raise exception 'AGE_REQUIRED' using errcode='42501';end if;
 if new.preference is not null and not spot_private.valid_dating_consent(new.id) then raise exception 'CONSENT_REQUIRED' using errcode='42501';end if;
 return new;
end $$;
-- New Spot requires consent, existing match/chat intentionally do not.
alter function public.send_spot(uuid,uuid) rename to privacy_prior_send_spot;
create function public.send_spot(target_user uuid,place uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform spot_private.photo_owner_lock(least(auth.uid(),target_user));perform spot_private.photo_owner_lock(greatest(auth.uid(),target_user));
 if not spot_private.privacy_discovery_eligible(auth.uid()) or not spot_private.privacy_discovery_eligible(target_user) then raise exception 'CONSENT_REQUIRED' using errcode='42501';end if;
 return public.privacy_prior_send_spot(target_user,place);
end $$;
-- Normalize function-body qualified references after rename, preserving nonce checks.
do $$begin execute replace(pg_get_functiondef('public.privacy_prior_send_spot(uuid,uuid)'::regprocedure),'send_spot.','privacy_prior_send_spot.');end $$;
revoke all on function public.privacy_prior_send_spot(uuid,uuid),spot_private.valid_dating_consent(uuid) from public,anon,authenticated,service_role;
revoke all on function public.dating_consent_challenge(),public.accept_dating_consent(uuid,uuid),public.revoke_dating_consent(uuid) from public,anon;
grant execute on function public.dating_consent_challenge(),public.accept_dating_consent(uuid,uuid),public.revoke_dating_consent(uuid),public.send_spot(uuid,uuid) to authenticated;
create function spot_private.immutable_consent_text()returns trigger language plpgsql set search_path='' as $$begin
 if (new.version,new.purpose,new.text_content,new.text_hash) is distinct from (old.version,old.purpose,old.text_content,old.text_hash) then raise exception 'CONSENT_VERSION_IMMUTABLE';end if;return new;end $$;
create trigger consent_text_immutable before update on spot_private.consent_versions for each row execute function spot_private.immutable_consent_text();
revoke all on function spot_private.immutable_consent_text()from public,anon,authenticated;
create function public.privacy_staging_enable(project_ref text)returns void language plpgsql security definer set search_path='' as $$
declare claims jsonb:=coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
begin
 if project_ref is distinct from 'zjinjtkekmaqtxsuyvho' or claims->>'role' is distinct from 'service_role' or claims->>'ref' is distinct from project_ref then raise exception 'STAGING_PROJECT_REQUIRED' using errcode='42501';end if;
 update spot_private.privacy_environment set environment='staging'where singleton;
end $$;
revoke all on function public.privacy_staging_enable(text)from public,anon,authenticated;
grant execute on function public.privacy_staging_enable(text)to service_role;
notify pgrst,'reload schema';commit;
