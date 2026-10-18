begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or
 (current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'ORA_STAGING_ONLY';end if;
 if not exists(select 1 from spot_private.soma_v2_control where singleton and jobs_paused and not membership_enabled and not ora_enabled and not spot_enabled and not discovery_enabled and not comments_enabled and not requests_enabled and not system_posts_enabled and not share_enabled)then raise exception 'ORA_NOT_PAUSED';end if;
end$$;
-- No rewrite/backfill of historical rows. One physical row per account remains the PK.
alter table public.checkins drop constraint checkins_check;
alter table public.checkins add constraint checkins_check check(expires_at>checked_in_at and expires_at<=checked_in_at+interval '4 hours');
-- Both bodies are retired, not just hidden from the UI. Even an owner calling the
-- alias accidentally cannot create a membership. Existing clients fail closed.
create or replace function public.check_in(qr_token uuid)returns public.checkins language plpgsql security definer set search_path='' as $$begin raise exception 'ORA_LEGACY_RETIRED'using errcode='42501';end$$;
create or replace function public.privacy_prior_check_in(qr_token uuid)returns public.checkins language plpgsql security definer set search_path='' as $$begin raise exception 'ORA_LEGACY_RETIRED'using errcode='42501';end$$;
revoke all on function public.check_in(uuid),public.privacy_prior_check_in(uuid)from public,anon,authenticated,service_role;

create function spot_private.ora_eligible(person uuid)returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(spot_private.board_eligible(person),false)and coalesce(spot_private.privacy_discovery_eligible(person),false);
$$;
create function spot_private.ora_gate()returns void language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from spot_private.soma_v2_control where singleton and ora_enabled)then raise exception 'ORA_PAUSED'using errcode='42501';end if;
 if not coalesce(spot_private.ora_eligible(auth.uid()),false)then raise exception 'ORA_ACCOUNT'using errcode='42501';end if;
end$$;
create function spot_private.ora_current()returns jsonb language sql volatile security definer set search_path='' as $$
 select to_jsonb(x)from(select c.presence_id,c.venue_id place_id,c.venue_id,c.checked_in_at started_at,c.checked_in_at,c.expires_at,c.presence_source source,v.name,v.address,v.linked_tribe_id,clock_timestamp()server_now
 from public.checkins c join public.venues v on v.id=c.venue_id where c.user_id=auth.uid()and c.expires_at>clock_timestamp())x;
$$;
create function public.my_presence()returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 perform spot_private.ora_gate();return spot_private.ora_current();end$$;
create function public.search_places(search_text text default '',page_offset integer default 0)returns table(place_id uuid,name text,address text,has_tribe boolean)
language plpgsql stable security definer set search_path='' as $$begin
 perform spot_private.ora_gate();
 if search_text is null or char_length(search_text)>80 or page_offset is null or page_offset<0 or page_offset>10000 then raise exception 'ORA_INPUT'using errcode='22023';end if;
 return query select v.id,v.name,v.address,v.linked_tribe_id is not null from public.venues v where v.active and v.ora_enabled and strpos(lower(v.name),lower(btrim(search_text)))>0 order by v.name,v.id limit 20 offset page_offset;
end$$;
-- Volatile commands see fresh READ COMMITTED snapshots after the account lock.
-- PK/DELETE conflicts abort stale RR/serializable callers instead of allowing two live rows.
create function spot_private.start_ora(place uuid,source text)returns jsonb language plpgsql security definer set search_path='' as $$declare
 stamp timestamptz;old public.checkins;
begin
 perform spot_private.board_lock();perform spot_private.photo_owner_lock(auth.uid());perform spot_private.ora_gate();
 perform 1 from public.venues where id=place and active and ora_enabled for share;
 if not found then raise exception 'ORA_PLACE_UNAVAILABLE'using errcode='42501';end if;
 stamp:=clock_timestamp();select * into old from public.checkins where user_id=auth.uid()for update;
 if old.venue_id=place and old.expires_at>stamp then return spot_private.ora_current();end if;
 -- Delete+insert intentionally discards prior presence and safely detaches optional future FK refs.
 delete from public.checkins where user_id=auth.uid();
 insert into public.checkins(user_id,venue_id,checked_in_at,expires_at,presence_id,presence_source)
 values(auth.uid(),place,stamp,stamp+interval '4 hours',gen_random_uuid(),source);
 return spot_private.ora_current();
end$$;
create function public.start_ora_manual(place_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$begin
 return spot_private.start_ora(place_id,'manual');end$$;
create function public.start_ora_qr(qr_token uuid)returns jsonb language plpgsql security definer set search_path='' as $$declare place uuid;begin
 -- Common lock order, also excludes concurrent catalog/QR mutations via row share locks.
 perform spot_private.board_lock();perform spot_private.photo_owner_lock(auth.uid());perform spot_private.ora_gate();
 select c.venue_id into place from spot_private.venue_codes c join public.venues v on v.id=c.venue_id where c.qr_token=start_ora_qr.qr_token and v.active and v.ora_enabled for share of c,v;
 if place is null then raise exception 'ORA_QR_INVALID'using errcode='42501';end if;
 return spot_private.start_ora(place,'qr');
end$$;
create function public.end_ora(presence_id uuid)returns boolean language plpgsql security definer set search_path='' as $$begin
 if auth.uid()is null then raise exception 'ORA_AUTH'using errcode='42501';end if;
 -- Exit stays available when eligibility/consent changes; never touches another owner's presence.
 perform spot_private.board_lock();perform spot_private.photo_owner_lock(auth.uid());
 delete from public.checkins c where c.user_id=auth.uid()and c.presence_id=end_ora.presence_id;
 return true;
end$$;
create function spot_private.ora_can_discover(target uuid)returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from spot_private.soma_v2_control where ora_enabled)and target<>auth.uid()
 and spot_private.ora_eligible(auth.uid())and spot_private.ora_eligible(target)
 and exists(select 1 from public.checkins a join public.checkins b on b.venue_id=a.venue_id
 join public.profiles p on p.id=a.user_id join public.profiles t on t.id=b.user_id
 where a.user_id=auth.uid()and b.user_id=target and a.expires_at>statement_timestamp()and b.expires_at>statement_timestamp()
 and(p.preference='ALL'or p.preference=t.gender))
 and not exists(select 1 from public.blocks where(blocker_id=auth.uid()and blocked_id=target)or(blocked_id=auth.uid()and blocker_id=target));
$$;
-- Minimal shared-live relationship for existing signed photo authorization.
-- Existing own/Tribe/match behavior and PHOTO lifecycle checks remain intact.
create or replace function spot_private.can_view_profile(target uuid)returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid()is not null and(target=auth.uid()or exists(select 1 from spot_private.tribe_memberships m where m.user_id=auth.uid()and spot_private.can_discover(target,m.venue_id))or spot_private.ora_can_discover(target));
$$;
create function public.ora_people_page(page_size integer default 49,page_offset integer default 0)
returns table(id uuid,name text,age integer,gender text,photo_path text,occupation text,photo_preview text,thumbnail_path text,detail_path text,total_count bigint)
language plpgsql stable security definer set search_path='' as $$begin
 perform spot_private.ora_gate();
 if not exists(select 1 from public.checkins where user_id=auth.uid()and expires_at>statement_timestamp())then raise exception 'ORA_PRESENCE_REQUIRED'using errcode='42501';end if;
 if page_offset is null or page_offset<0 or page_offset>10000 then raise exception 'ORA_INPUT';end if;
 return query select p.id,p.name,p.age,p.gender,p.photo_path,p.occupation,a.preview,a.thumbnail_path,a.detail_path,count(*)over()
 from public.checkins own join public.checkins c on c.venue_id=own.venue_id and c.expires_at>statement_timestamp()
 join public.profiles p on p.id=c.user_id left join spot_private.photo_assets a on a.photo_path=p.photo_path
 where own.user_id=auth.uid()and own.expires_at>statement_timestamp()and spot_private.ora_can_discover(p.id)
 order by p.name,p.id limit least(49,greatest(1,coalesce(page_size,49)))offset page_offset;
end$$;
revoke all on function spot_private.ora_eligible(uuid),spot_private.ora_gate(),spot_private.ora_current(),spot_private.start_ora(uuid,text),spot_private.ora_can_discover(uuid)from public,anon,authenticated,service_role;
revoke all on function public.my_presence(),public.search_places(text,integer),public.start_ora_manual(uuid),public.start_ora_qr(uuid),public.end_ora(uuid),public.ora_people_page(integer,integer)from public,anon,authenticated,service_role;
grant execute on function public.my_presence(),public.search_places(text,integer),public.start_ora_manual(uuid),public.start_ora_qr(uuid),public.end_ora(uuid),public.ora_people_page(integer,integer)to authenticated;
-- can_view_profile is also called from visible_profiles/photo helpers as definer.
notify pgrst,'reload schema';commit;
