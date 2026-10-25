begin;
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'STAFF_SESSION_STAGING_ONLY';end if;
end$$;
-- Server session creation time is full-precision, unlike the integer JWT iat.
-- Existing grants fail closed until a fresh login after this migration.
alter table spot_private.moderation_roles add column session_not_before timestamptz not null default clock_timestamp();
-- Deny old session identities independently of JWT iat/refresh/clock skew.
-- Only a technical FK; Auth session removal physically cascades this receipt.
create table spot_private.staff_revoked_sessions(
 session_id uuid primary key references auth.sessions(id) on delete cascade
);
alter table spot_private.staff_revoked_sessions enable row level security;
revoke all on spot_private.staff_revoked_sessions from public,anon,authenticated,service_role;
insert into spot_private.staff_revoked_sessions select s.id from auth.sessions s join spot_private.moderation_roles r on r.user_id=s.user_id;
create function spot_private.staff_session_fence()returns trigger language plpgsql security definer set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtextextended('moderation-roles',25));
 if TG_OP='INSERT' then new.session_not_before:=clock_timestamp();
 elsif new.role is distinct from old.role or new.active is distinct from old.active then
  new.session_not_before:=greatest(clock_timestamp(),old.session_not_before+interval '1 microsecond');
 else new.session_not_before:=old.session_not_before;return new;end if;
 insert into spot_private.staff_revoked_sessions select s.id from auth.sessions s where s.user_id=new.user_id on conflict do nothing;
 return new;
end$$;
create trigger staff_session_fence before insert or update on spot_private.moderation_roles for each row execute function spot_private.staff_session_fence();
revoke all on function spot_private.staff_session_fence()from public,anon,authenticated,service_role;
create or replace function spot_private.moderation_role()returns text language plpgsql volatile security definer set search_path='' as $$
declare claims jsonb;sid uuid;person uuid;result text;
begin
 -- PostgREST RPCs use READ COMMITTED; reject pinned old snapshots.
 if current_setting('transaction_isolation')<>'read committed' then return null;end if;
 claims:=nullif(current_setting('request.jwt.claims',true),'')::jsonb;
 if jsonb_typeof(claims) is distinct from 'object' or claims->>'aal' is distinct from 'aal2'
  or jsonb_typeof(claims->'session_id') is distinct from 'string'
  or (claims->>'session_id')!~'^[a-fA-F0-9]{8}-([a-fA-F0-9]{4}-){3}[a-fA-F0-9]{12}$' then return null;end if;
 person:=auth.uid();sid:=(claims->>'session_id')::uuid;
 -- Serialize staff authorization transactions with the existing role-write lock.
 -- No normal-user guard, Auth trigger or token issuance is changed.
 perform pg_advisory_xact_lock_shared(hashtextextended('moderation-roles',25));
 select r.role into result from spot_private.moderation_roles r
 join auth.users u on u.id=r.user_id
 join auth.sessions s on s.id=sid and s.user_id=u.id
 where r.user_id=person and r.active and not u.is_anonymous
 and not exists(select 1 from spot_private.staff_revoked_sessions x where x.session_id=sid)
 and coalesce((to_jsonb(u)->>'banned_until')::timestamptz,'-infinity'::timestamptz)<=clock_timestamp()
 and s.created_at>r.session_not_before and s.created_at<=clock_timestamp()
 and (s.not_after is null or s.not_after>clock_timestamp()) and s.aal::text='aal2'
 and exists(select 1 from auth.mfa_factors f where f.user_id=u.id and f.id=s.factor_id and f.factor_type='totp' and f.status='verified');
 return result;
exception when invalid_text_representation then return null;
end$$;
revoke all on function spot_private.moderation_role()from public,anon,authenticated,service_role;
commit;
