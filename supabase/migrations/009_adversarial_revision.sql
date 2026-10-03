begin;
-- A partially deleted account remains unavailable until deletion is retried.
create table spot_private.account_deletions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 started_at timestamptz not null default now()
);
alter table spot_private.account_deletions enable row level security;
revoke all on spot_private.account_deletions from public,anon,authenticated;
create function public.begin_account_deletion(target_user uuid)
returns void language sql security definer set search_path='' as $$
 insert into spot_private.account_deletions(user_id) values(target_user) on conflict do nothing;
$$;
revoke all on function public.begin_account_deletion(uuid) from public,anon,authenticated;
grant execute on function public.begin_account_deletion(uuid) to service_role;
create or replace function spot_private.has_account()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and not u.is_anonymous)
 and not exists(select 1 from spot_private.suspensions s where s.user_id=auth.uid() and s.revoked_at is null)
 and not exists(select 1 from spot_private.account_deletions d where d.user_id=auth.uid());
$$;
create function public.my_account_state()
returns text language sql stable security definer set search_path='' as $$
 select case when auth.uid() is null then 'signed_out'
 when exists(select 1 from spot_private.account_deletions where user_id=auth.uid()) then 'deleting'
 when exists(select 1 from spot_private.suspensions where user_id=auth.uid() and revoked_at is null) then 'suspended'
 else 'active' end;
$$;
revoke all on function public.my_account_state() from public,anon;
grant execute on function public.my_account_state() to authenticated;
create function spot_private.can_write_profile()
returns boolean language sql stable security definer set search_path='' as $$select spot_private.has_account();$$;
revoke all on function spot_private.can_write_profile() from public,anon;
grant execute on function spot_private.can_write_profile() to authenticated;
-- Anonymous/suspended/deleting sessions cannot write profiles or upload more photos.
alter policy profiles_insert on public.profiles with check (
 id=auth.uid() and spot_private.can_write_profile() and exists(select 1 from storage.objects where bucket_id='profile-photos' and name=photo_path)
);
alter policy profiles_update on public.profiles using(id=auth.uid() and spot_private.can_write_profile()) with check (
 id=auth.uid() and spot_private.can_write_profile() and exists(select 1 from storage.objects where bucket_id='profile-photos' and name=photo_path)
);
alter policy photos_insert_own on storage.objects with check (
 bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text and spot_private.can_write_profile()
);
create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path='' as $$
 select spot_private.has_account() and exists(select 1 from spot_private.moderators where user_id=auth.uid());
$$;
create or replace function spot_private.can_discover(target uuid,place uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select spot_private.has_account() and target<>auth.uid()
 and spot_private.tribe_member(auth.uid(),place) and spot_private.tribe_member(target,place)
 and exists(select 1 from auth.users u join public.profiles p on p.id=u.id join public.profiles mine on mine.id=auth.uid()
 where u.id=target and not u.is_anonymous and (mine.preference='ALL' or mine.preference=p.gender))
 and not exists(select 1 from spot_private.account_deletions d where d.user_id=target)
 and not exists(select 1 from spot_private.suspensions s where s.user_id=target and s.revoked_at is null)
 and not exists(select 1 from public.blocks b where (b.blocker_id=auth.uid() and b.blocked_id=target) or (b.blocker_id=target and b.blocked_id=auth.uid()));
$$;
create or replace function public.venue_preview(qr_token uuid)
returns table(id uuid,name text,address text,live_count bigint,member_count bigint)
language sql stable security definer set search_path='' as $$
 select v.id,v.name,v.address,
 (select count(*) from public.checkins c join auth.users u on u.id=c.user_id where c.venue_id=v.id and c.expires_at>now() and not u.is_anonymous and not exists(select 1 from spot_private.account_deletions d where d.user_id=u.id) and not exists(select 1 from spot_private.suspensions s where s.user_id=c.user_id and s.revoked_at is null)),
 (select count(*) from spot_private.tribe_memberships m join auth.users u on u.id=m.user_id where m.venue_id=v.id and not u.is_anonymous and not exists(select 1 from spot_private.account_deletions d where d.user_id=u.id) and spot_private.tribe_member(m.user_id,v.id) and not exists(select 1 from spot_private.suspensions s where s.user_id=m.user_id and s.revoked_at is null))
 from public.venues v join spot_private.venue_codes codes on codes.venue_id=v.id where codes.qr_token=venue_preview.qr_token and v.active;
$$;
create or replace function public.my_tribes()
returns table(id uuid,name text,address text,member_count bigint,live_count bigint)
language sql stable security definer set search_path='' as $$
 select v.id,v.name,v.address,
 (select count(*) from spot_private.tribe_memberships other join auth.users u on u.id=other.user_id where other.venue_id=v.id and not u.is_anonymous and not exists(select 1 from spot_private.account_deletions d where d.user_id=u.id) and spot_private.tribe_member(other.user_id,v.id) and not exists(select 1 from spot_private.suspensions s where s.user_id=other.user_id and s.revoked_at is null)),
 (select count(*) from public.checkins c join auth.users u on u.id=c.user_id where c.venue_id=v.id and c.expires_at>now() and not u.is_anonymous and not exists(select 1 from spot_private.account_deletions d where d.user_id=u.id) and not exists(select 1 from spot_private.suspensions s where s.user_id=c.user_id and s.revoked_at is null))
 from spot_private.tribe_memberships m join public.venues v on v.id=m.venue_id
 where m.user_id=auth.uid() and spot_private.has_account() and spot_private.tribe_member(auth.uid(),v.id) order by v.name,v.id;
$$;
create or replace function spot_private.can_use_match(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select spot_private.has_account() and exists(select 1 from public.matches m where m.id=target and auth.uid() in(m.user_a,m.user_b)
 and not exists(select 1 from spot_private.account_deletions d where d.user_id in(m.user_a,m.user_b))
 and not exists(select 1 from spot_private.suspensions s where s.user_id in(m.user_a,m.user_b) and s.revoked_at is null)
 and not exists(select 1 from public.blocks b where (b.blocker_id=m.user_a and b.blocked_id=m.user_b) or (b.blocker_id=m.user_b and b.blocked_id=m.user_a)));
$$;
-- Match row locking serializes retries and concurrent first messages.
alter table public.messages add column client_nonce uuid;
create unique index messages_sender_nonce on public.messages(sender_id,client_nonce) where client_nonce is not null;
create function public.send_message(target_match uuid,message_text text,client_nonce uuid)
returns public.messages language plpgsql security definer set search_path='' as $$
declare result public.messages;
begin
 if client_nonce is null then raise exception 'Identificatore messaggio richiesto'; end if;
 perform 1 from public.matches where id=target_match for update;
 if not spot_private.can_use_match(target_match) then raise exception 'Match non disponibile'; end if;
 if message_text is null or char_length(trim(message_text)) not between 1 and 2000 then raise exception 'Scrivi un messaggio da 1 a 2000 caratteri'; end if;
 select * into result from public.messages m where m.sender_id=auth.uid() and m.client_nonce=send_message.client_nonce;
 if result.id is not null then
  if result.match_id<>target_match or result.body<>trim(message_text) then raise exception 'Identificatore messaggio già utilizzato'; end if;
  return result;
 end if;
 insert into public.messages(match_id,sender_id,body,client_nonce) values(target_match,auth.uid(),trim(message_text),client_nonce) returning * into result;
 update public.matches set first_message_at=coalesce(first_message_at,result.created_at) where id=target_match;
 return result;
end $$;
revoke all on function public.send_message(uuid,text,uuid) from public,anon;
grant execute on function public.send_message(uuid,text,uuid) to authenticated;
-- Keep old deployed clients working during the coordinated rollout.
create or replace function public.send_message(target_match uuid,message_text text)
returns public.messages language sql security definer set search_path='' as $$
 select public.send_message(target_match,message_text,gen_random_uuid());
$$;
create function public.block_profile(target_user uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not spot_private.has_account() or target_user=auth.uid() then raise exception 'Profilo non disponibile'; end if;
 if exists(select 1 from public.blocks where blocker_id=auth.uid() and blocked_id=target_user) then return; end if;
 if not spot_private.can_view_profile(target_user) and not exists(
 select 1 from public.matches m where target_user in(m.user_a,m.user_b) and spot_private.can_use_match(m.id)
 ) then raise exception 'Profilo non disponibile'; end if;
 insert into public.blocks(blocker_id,blocked_id) values(auth.uid(),target_user) on conflict do nothing;
end $$;
revoke all on function public.block_profile(uuid) from public,anon;
grant execute on function public.block_profile(uuid) to authenticated;
alter policy blocks_insert_own on public.blocks with check (
 blocker_id=auth.uid() and spot_private.can_write_profile()
);
-- Idempotent reports survive a lost response even when the first request also blocked the target.
alter table spot_private.reports add column client_nonce uuid;
create unique index reports_reporter_nonce on spot_private.reports(reporter_id,client_nonce) where client_nonce is not null;
create function public.report_profile(target_user uuid,report_reason text,report_details text,also_block boolean,client_nonce uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); previous spot_private.reports; report_id uuid;
begin
 if not spot_private.has_account() or caller=target_user or client_nonce is null then raise exception 'Profilo non disponibile'; end if;
 perform pg_advisory_xact_lock(hashtextextended('report:'||caller::text,0));
 select * into previous from spot_private.reports r where r.reporter_id=caller and r.client_nonce=report_profile.client_nonce;
 if previous.id is not null then
  if previous.target_id<>target_user or previous.reason<>report_reason or previous.details<>trim(coalesce(report_details,'')) then raise exception 'Identificatore segnalazione già utilizzato'; end if;
  return previous.id;
 end if;
 if not spot_private.can_view_profile(target_user) and not exists (
 select 1 from public.matches m where target_user in(m.user_a,m.user_b) and spot_private.can_use_match(m.id)
 ) then raise exception 'Profilo non disponibile'; end if;
 if report_reason is null or report_reason not in ('harassment','fake_profile','underage','inappropriate','other') or char_length(coalesce(report_details,''))>1000 then raise exception 'Segnalazione non valida'; end if;
 if (select count(*) from spot_private.reports where reporter_id=caller and created_at>now()-interval '1 hour')>=10 then raise exception 'Report limit reached'; end if;
 insert into spot_private.reports(reporter_id,target_id,reason,details,client_nonce) values(caller,target_user,report_reason,trim(coalesce(report_details,'')),client_nonce) returning id into report_id;
 if also_block then insert into public.blocks(blocker_id,blocked_id) values(caller,target_user) on conflict do nothing; end if;
 return report_id;
end $$;
revoke all on function public.report_profile(uuid,text,text,boolean,uuid) from public,anon;
grant execute on function public.report_profile(uuid,text,text,boolean,uuid) to authenticated;
create or replace function public.report_profile(target_user uuid,report_reason text,report_details text default '',also_block boolean default true)
returns uuid language sql security definer set search_path='' as $$
 select public.report_profile(target_user,report_reason,report_details,also_block,gen_random_uuid());
$$;
notify pgrst, 'reload schema';
commit;
