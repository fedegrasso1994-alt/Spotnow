begin;
do $$begin if exists(select 1 from spot_private.tribe_settings where activity_window is not null) then raise exception 'LOCATION_ACTIVITY_WINDOW_REQUIRES_REVIEW';end if;end $$;
alter table spot_private.tribe_memberships alter column last_checkin_at drop not null;
alter table spot_private.interests alter column sender_checkin drop not null;
update spot_private.tribe_memberships set last_checkin_at=null;
update spot_private.interests set sender_checkin=null;
-- No new visit timestamps, including direct privileged accidental writes.
create function spot_private.discard_visit_timestamp() returns trigger language plpgsql set search_path='' as $$begin
 if tg_table_name='tribe_memberships' then new.last_checkin_at:=null;else new.sender_checkin:=null;end if;return new;
end $$;
create trigger no_tribe_visit before insert or update on spot_private.tribe_memberships for each row execute function spot_private.discard_visit_timestamp();
create trigger no_spot_checkin before insert or update on spot_private.interests for each row execute function spot_private.discard_visit_timestamp();
revoke all on function spot_private.discard_visit_timestamp() from public,anon,authenticated;
create or replace function spot_private.tribe_member(person uuid,place uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from spot_private.tribe_memberships where user_id=person and venue_id=place);
$$;
create or replace function public.privacy_prior_check_in(qr_token uuid) returns public.checkins language plpgsql security definer set search_path='' as $$
declare venue uuid;result public.checkins;stamp timestamptz:=now();
begin
 if not spot_private.has_account() or not exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'Completa il profilo prima del check-in';end if;
 select c.venue_id into venue from spot_private.venue_codes c join public.venues v on v.id=c.venue_id where c.qr_token=privacy_prior_check_in.qr_token and v.active;
 if venue is null then raise exception 'QR non valido';end if;
 insert into public.checkins(user_id,venue_id,checked_in_at,expires_at) values(auth.uid(),venue,stamp,stamp+interval '90 minutes')
 on conflict(user_id) do update set venue_id=excluded.venue_id,checked_in_at=excluded.checked_in_at,expires_at=excluded.expires_at returning * into result;
 insert into spot_private.tribe_memberships(user_id,venue_id,last_checkin_at)values(auth.uid(),venue,null)on conflict(user_id,venue_id)do nothing;
 return result;
end $$;
notify pgrst,'reload schema';commit;
