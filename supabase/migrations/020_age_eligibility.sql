begin;
-- AGE-01: self declaration, not independent verification. No DOB persisted.
create table spot_private.account_eligibility (
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null check(status in('confirmation_required','eligible','restricted')),
 declared_age integer check(declared_age between 18 and 120),
 statement_version text not null default 'adult-v1',method text not null default 'self_declared_age',
 attested_at timestamptz,revision bigint not null default 0,
 check(status<>'eligible' or declared_age is not null)
);
create table spot_private.age_events (
 user_id uuid references auth.users(id) on delete cascade,operation_id uuid,
 request_fingerprint text not null,status text not null,created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,operation_id)
);
alter table spot_private.account_eligibility enable row level security;
alter table spot_private.age_events enable row level security;
revoke all on spot_private.account_eligibility,spot_private.age_events from public,anon,authenticated;
insert into spot_private.account_eligibility(user_id,status) select id,'confirmation_required' from auth.users;
create function spot_private.age_eligible(person uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from spot_private.account_eligibility where user_id=person and status='eligible' and declared_age between 18 and 120);
$$;
create function spot_private.privacy_discovery_eligible(person uuid) returns boolean language sql stable security definer set search_path='' as $$
 select spot_private.age_eligible(person) and exists(select 1 from auth.users where id=person and not is_anonymous)
 and not exists(select 1 from spot_private.suspensions where user_id=person and revoked_at is null)
 and not exists(select 1 from spot_private.account_deletions where user_id=person);
$$;
create function public.my_privacy_state() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('age_status',coalesce(a.status,'confirmation_required'),'age_revision',coalesce(a.revision,0),'declared_age',a.declared_age,'statement_version','adult-v1')
 from (select auth.uid() id) x left join spot_private.account_eligibility a on a.user_id=x.id;
$$;
create function public.attest_adult(age integer,declared boolean,statement_version text,operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();fp text;previous spot_private.age_events;next_status text;
begin
 if me is null or not exists(select 1 from auth.users where id=me and not is_anonymous) then raise exception 'AGE_AUTH' using errcode='42501';end if;
 if age is null or age<0 or age>120 or declared is null or statement_version is distinct from 'adult-v1' or operation_id is null then raise exception 'AGE_INVALID';end if;
 perform spot_private.photo_owner_lock(me);
 fp:=md5(case when age<18 then 'underage' else age::text end||':'||declared::text||':'||statement_version);
 select * into previous from spot_private.age_events where user_id=me and age_events.operation_id=attest_adult.operation_id;
 if found then
  if previous.request_fingerprint<>fp then raise exception 'AGE_OPERATION_CONFLICT';end if;
  return public.my_privacy_state();
 end if;
 next_status:=case when age<18 then 'restricted' when not declared then 'confirmation_required' else 'eligible' end;
 insert into spot_private.account_eligibility(user_id,status,declared_age,attested_at,revision) values(me,next_status,case when next_status='eligible' then age end,clock_timestamp(),1)
 on conflict(user_id) do update set status=excluded.status,declared_age=excluded.declared_age,attested_at=excluded.attested_at,revision=account_eligibility.revision+1;
 insert into spot_private.age_events(user_id,operation_id,request_fingerprint,status)values(me,operation_id,fp,next_status);
 if next_status='eligible' then update public.profiles set age=attest_adult.age where id=me;end if;
 return public.my_privacy_state();
end $$;
create function spot_private.enforce_profile_privacy() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform spot_private.photo_owner_lock(new.id);
 if not spot_private.age_eligible(new.id) or not exists(select 1 from spot_private.account_eligibility where user_id=new.id and declared_age=new.age) then raise exception 'AGE_REQUIRED' using errcode='42501';end if;
 return new;
end $$;
create trigger aa_profile_privacy before insert or update on public.profiles for each row execute function spot_private.enforce_profile_privacy();
create or replace function spot_private.can_write_profile() returns boolean language sql stable security definer set search_path='' as $$select spot_private.has_account() and spot_private.age_eligible(auth.uid());$$;
create or replace function spot_private.can_discover(target uuid,place uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if not spot_private.privacy_discovery_eligible(auth.uid()) or not spot_private.privacy_discovery_eligible(target) then return false;end if;
 return target<>auth.uid() and spot_private.tribe_member(auth.uid(),place) and spot_private.tribe_member(target,place)
 and exists(select 1 from public.profiles mine join public.profiles p on p.id=target where mine.id=auth.uid() and (mine.preference='ALL' or mine.preference=p.gender))
 and not exists(select 1 from public.blocks where (blocker_id=auth.uid() and blocked_id=target) or (blocked_id=auth.uid() and blocker_id=target));
end $$;
create or replace function spot_private.can_use_match(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select spot_private.has_account() and spot_private.age_eligible(auth.uid()) and exists(select 1 from public.matches m where m.id=target and auth.uid() in(m.user_a,m.user_b)
 and spot_private.age_eligible(m.user_a) and spot_private.age_eligible(m.user_b)
 and not exists(select 1 from spot_private.account_deletions where user_id in(m.user_a,m.user_b))
 and not exists(select 1 from spot_private.suspensions where user_id in(m.user_a,m.user_b) and revoked_at is null)
 and not exists(select 1 from public.blocks where (blocker_id=m.user_a and blocked_id=m.user_b) or (blocker_id=m.user_b and blocked_id=m.user_a)));
$$;
-- Narrow photo authorization dependency; leave processing, leases and cleanup untouched.
create or replace function spot_private.photo_account_active(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select spot_private.age_eligible(target) and exists(select 1 from auth.users where id=target and not is_anonymous)
 and not exists(select 1 from spot_private.account_deletions where user_id=target)
 and not exists(select 1 from spot_private.suspensions where user_id=target and revoked_at is null);
$$;
create or replace function public.location_people_page(place uuid,live boolean,page_size integer default 49,page_offset integer default 0)
returns table(id uuid,name text,age integer,gender text,photo_path text,checked_in_at timestamptz,expires_at timestamptz,interest_sent boolean,occupation text,total_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
 if not spot_private.privacy_discovery_eligible(auth.uid()) or not spot_private.tribe_member(auth.uid(),place) then raise exception 'PRIVACY_REQUIRED' using errcode='42501';end if;
 if live and not exists(select 1 from public.checkins where user_id=auth.uid() and venue_id=place and checkins.expires_at>now()) then return;end if;
 return query with visible as materialized (
 select p.id,p.name,p.age,p.gender,p.photo_path,p.occupation from public.profiles p
 join spot_private.tribe_memberships m on m.user_id=p.id and m.venue_id=place
 left join public.checkins c on c.user_id=p.id and c.venue_id=place
 where spot_private.can_discover(p.id,place) and (coalesce(c.expires_at>now(),false)=live)
 ) select v.id,v.name,v.age,v.gender,v.photo_path,null::timestamptz,null::timestamptz,
 exists(select 1 from spot_private.interests i where i.sender_id=auth.uid() and i.recipient_id=v.id and i.venue_id=place),v.occupation,count(*) over()
 from visible v order by v.name,v.id limit least(101,greatest(1,coalesce(page_size,49))) offset greatest(0,coalesce(page_offset,0));
end $$;
create or replace function public.my_matches_page(page_size integer default 49,page_offset integer default 0,requested_match uuid default null,requested_person uuid default null)
returns table(id uuid,person_id uuid,name text,age integer,photo_path text,venue_name text,created_at timestamptz,first_message_at timestamptz,total_count bigint)
language sql stable security definer set search_path='' as $$
 select m.id,p.id,p.name,p.age,p.photo_path,v.name,m.created_at,m.first_message_at,count(*) over()
 from public.matches m join public.profiles p on p.id=case when m.user_a=auth.uid() then m.user_b else m.user_a end join public.venues v on v.id=m.venue_id
 where spot_private.can_use_match(m.id) and (requested_match is null or m.id=requested_match) and (requested_person is null or p.id=requested_person)
 order by m.created_at desc,m.id desc limit least(101,greatest(1,coalesce(page_size,49))) offset greatest(0,coalesce(page_offset,0));
$$;
-- Keep older clients at the same protected contracts; implementation aliases cannot be invoked.
alter function public.check_in(uuid) rename to privacy_prior_check_in;
create function public.check_in(qr_token uuid) returns public.checkins language plpgsql security definer set search_path='' as $$
begin
 perform spot_private.photo_owner_lock(auth.uid());
 if not spot_private.privacy_discovery_eligible(auth.uid()) then raise exception 'PRIVACY_REQUIRED' using errcode='42501';end if;
 return public.privacy_prior_check_in(qr_token);
end $$;
alter function public.send_message(uuid,text,uuid) rename to privacy_prior_send_message;
create function public.send_message(target_match uuid,message_text text,client_nonce uuid) returns public.messages language plpgsql security definer set search_path='' as $$
declare m public.matches;
begin
 select * into m from public.matches where id=target_match;
 if not found then raise exception 'Match non disponibile';end if;
 perform spot_private.photo_owner_lock(least(m.user_a,m.user_b));perform spot_private.photo_owner_lock(greatest(m.user_a,m.user_b));
 return public.privacy_prior_send_message(target_match,message_text,client_nonce);
end $$;
-- SQL legacy overload must bind to the protected function, not its renamed implementation.
create or replace function public.send_message(target_match uuid,message_text text) returns public.messages language sql security definer set search_path='' as $$select public.send_message(target_match,message_text,gen_random_uuid());$$;
create or replace function public.venue_preview(qr_token uuid) returns table(id uuid,name text,address text,live_count bigint,member_count bigint)
language sql stable security definer set search_path='' as $$
 select v.id,v.name,v.address,
 (select count(*) from public.checkins c where c.venue_id=v.id and c.expires_at>now() and spot_private.privacy_discovery_eligible(c.user_id)),
 (select count(*) from spot_private.tribe_memberships m where m.venue_id=v.id and spot_private.tribe_member(m.user_id,v.id) and spot_private.privacy_discovery_eligible(m.user_id))
 from public.venues v join spot_private.venue_codes c on c.venue_id=v.id where c.qr_token=venue_preview.qr_token and v.active;
$$;
create or replace function public.my_tribes() returns table(id uuid,name text,address text,member_count bigint,live_count bigint)
language sql stable security definer set search_path='' as $$
 select v.id,v.name,v.address,
 (select count(*) from spot_private.tribe_memberships m where m.venue_id=v.id and spot_private.tribe_member(m.user_id,v.id) and spot_private.privacy_discovery_eligible(m.user_id)),
 (select count(*) from public.checkins c where c.venue_id=v.id and c.expires_at>now() and spot_private.privacy_discovery_eligible(c.user_id))
 from public.venues v join spot_private.tribe_memberships own on own.venue_id=v.id where own.user_id=auth.uid() and spot_private.has_account() and spot_private.age_eligible(auth.uid()) and spot_private.tribe_member(auth.uid(),v.id) and v.active order by v.name,v.id;
$$;
revoke all on function public.privacy_prior_check_in(uuid),public.privacy_prior_send_message(uuid,text,uuid),spot_private.age_eligible(uuid),spot_private.privacy_discovery_eligible(uuid),spot_private.enforce_profile_privacy() from public,anon,authenticated,service_role;
do $$begin execute replace(pg_get_functiondef('public.privacy_prior_check_in(uuid)'::regprocedure),'check_in.','privacy_prior_check_in.');execute replace(pg_get_functiondef('public.privacy_prior_send_message(uuid,text,uuid)'::regprocedure),'send_message.','privacy_prior_send_message.');end $$;
revoke all on function public.attest_adult(integer,boolean,text,uuid),public.my_privacy_state(),public.check_in(uuid),public.send_message(uuid,text,uuid) from public,anon;
grant execute on function public.attest_adult(integer,boolean,text,uuid),public.my_privacy_state(),public.check_in(uuid),public.send_message(uuid,text,uuid) to authenticated;
notify pgrst,'reload schema';commit;
