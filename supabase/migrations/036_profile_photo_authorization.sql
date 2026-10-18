begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'PROFILE_AUTH_STAGING_ONLY';end if;
 if current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho'then raise exception 'PROFILE_AUTH_PROJECT_MISMATCH';end if;
end$$;
-- Authorization only: no decoder, photo ledger, quota, publication or purge changes.
create function spot_private.profile_request_authorized(viewer uuid,target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select false; -- Future SPOTTED integration must explicitly implement recipient -> sender.
$$;
create function spot_private.profile_dd_authorized(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from spot_private.soma_v2_control where discovery_enabled)
 and spot_private.ora_eligible(auth.uid()) and spot_private.ora_eligible(target)
 and exists(select 1 from spot_private.discovery_exposures e
 join spot_private.discovery_windows w on w.id=e.window_id
 join spot_private.discovery_policy pol on pol.version=w.policy_version and pol.enabled and not pol.paused
 join spot_private.tribe_memberships a on a.membership_id=e.membership_a and a.user_id=e.user_a and a.venue_id=e.tribe_id
 join spot_private.tribe_memberships b on b.membership_id=e.membership_b and b.user_id=e.user_b and b.venue_id=e.tribe_id
 join spot_private.tribe_catalog t on t.id=e.tribe_id and t.active
 where ((e.user_a=auth.uid()and e.user_b=target)or(e.user_b=auth.uid()and e.user_a=target))
 and w.state='ready'and w.starts_at<=statement_timestamp()and w.ends_at>statement_timestamp())
 and exists(select 1 from public.profiles p join public.profiles t on t.id=target where p.id=auth.uid()and(p.preference='ALL'or p.preference=t.gender));
$$;
create or replace function spot_private.can_view_profile(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid()is not null and exists(select 1 from public.profiles where id=target)and
 (target=auth.uid()or(spot_private.board_eligible(auth.uid())and spot_private.board_eligible(target)
 and not exists(select 1 from public.blocks where(blocker_id=auth.uid()and blocked_id=target)or(blocked_id=auth.uid()and blocker_id=target))
 and (spot_private.ora_can_discover(target)or spot_private.profile_dd_authorized(target)
 or exists(select 1 from public.matches m where ((m.user_a=auth.uid()and m.user_b=target)or(m.user_b=auth.uid()and m.user_a=target))and spot_private.can_use_match(m.id))
 or spot_private.profile_request_authorized(auth.uid(),target))));
$$;
-- Explicit public projection: the owner continues using self-only profiles RLS.
create function public.authorized_profile(target_user uuid)
returns table(id uuid,name text,age integer,gender text,occupation text,photo_path text,thumbnail_path text,detail_path text)
language sql stable security definer set search_path='' as $$
 select p.id,p.name,p.age,p.gender,p.occupation,'profile:'||p.id||':'||md5(p.photo_path)||':canonical','profile:'||p.id||':'||md5(p.photo_path)||':thumb','profile:'||p.id||':'||md5(p.photo_path)||':detail'
 from public.profiles p where spot_private.can_view_profile(p.id)and p.id=target_user;
$$;
-- Same-Tribe never grants a directory. Legacy readers are retired at their API boundary.
revoke all on function public.location_people(uuid,boolean),public.location_people_page(uuid,boolean,integer,integer),public.location_people_photos_page(uuid,boolean,integer,integer),public.visible_profiles()from public,anon,authenticated;
-- Also replace their bodies to prevent accidental definer-wrapper reactivation.
create or replace function public.visible_profiles()returns table(id uuid,name text,age integer,gender text,photo_path text)
language sql stable security definer set search_path='' as $$select p.id,p.name,p.age,p.gender,'profile:'||p.id||':'||md5(p.photo_path)||':canonical'from public.profiles p where false$$;
-- Every legacy location reader, including postgres/definer callers, fails closed.
do $retire$declare f record;begin for f in select p.oid::regprocedure signature,pg_get_functiondef(p.oid) body from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname in('location_people','location_people_page','location_people_photos_page')loop
 execute regexp_replace(replace(f.body,'LANGUAGE sql','LANGUAGE plpgsql'),'AS \$function\$.*\$function\$','AS $function$ BEGIN RAISE EXCEPTION ''PROFILE_READER_RETIRED'' USING ERRCODE=''42501''; END $function$','s');
 end loop;end$retire$;
-- New minimal projections keep the frontend shape but replace physical paths with opaque references.
create or replace function public.ora_people_page(page_size integer default 49,page_offset integer default 0)
returns table(id uuid,name text,age integer,gender text,photo_path text,occupation text,photo_preview text,thumbnail_path text,detail_path text,total_count bigint)
language plpgsql stable security definer set search_path='' as $$begin
 perform spot_private.ora_gate();
 if not exists(select 1 from public.checkins where user_id=auth.uid()and expires_at>statement_timestamp())then raise exception 'ORA_PRESENCE_REQUIRED'using errcode='42501';end if;
 if page_offset is null or page_offset<0 or page_offset>10000 then raise exception 'ORA_INPUT';end if;
 return query select p.id,p.name,p.age,p.gender,'profile:'||p.id||':'||md5(p.photo_path)||':canonical',p.occupation,null::text,'profile:'||p.id||':'||md5(p.photo_path)||':thumb','profile:'||p.id||':'||md5(p.photo_path)||':detail',count(*)over()
 from public.checkins own join public.checkins c on c.venue_id=own.venue_id and c.expires_at>statement_timestamp()
 join public.profiles p on p.id=c.user_id
 where own.user_id=auth.uid()and own.expires_at>statement_timestamp()and spot_private.ora_can_discover(p.id)and spot_private.can_view_profile(p.id)
 order by p.name,p.id limit least(49,greatest(1,coalesce(page_size,49)))offset page_offset;
end$$;
create or replace function public.my_matches_page(page_size integer default 49,page_offset integer default 0,requested_match uuid default null,requested_person uuid default null)
returns table(id uuid,person_id uuid,name text,age integer,photo_path text,venue_name text,created_at timestamptz,first_message_at timestamptz,total_count bigint)
language sql stable security definer set search_path='' as $$
 select m.id,p.id,p.name,p.age,'profile:'||p.id||':'||md5(p.photo_path)||':canonical',v.name,m.created_at,m.first_message_at,count(*)over()
 from public.matches m join public.profiles p on p.id=case when m.user_a=auth.uid()then m.user_b else m.user_a end join public.venues v on v.id=m.venue_id
 where spot_private.can_use_match(m.id)and spot_private.can_view_profile(p.id)and(requested_match is null or m.id=requested_match)and(requested_person is null or p.id=requested_person)
 order by m.created_at desc,m.id desc limit least(101,greatest(1,coalesce(page_size,49)))offset greatest(0,coalesce(page_offset,0));
$$;
create or replace function public.my_matches_photos_page(page_size integer default 49,page_offset integer default 0,requested_match uuid default null,requested_person uuid default null)
returns table(id uuid,person_id uuid,name text,age integer,photo_path text,venue_name text,created_at timestamptz,first_message_at timestamptz,total_count bigint,photo_preview text,thumbnail_path text,detail_path text)
language sql stable security definer set search_path='' as $$
 select m.*,null::text,replace(m.photo_path,':canonical',':thumb'),replace(m.photo_path,':canonical',':detail')from public.my_matches_page(page_size,page_offset,requested_match,requested_person)m;
$$;
create or replace function public.my_matches()
returns table(id uuid,person_id uuid,name text,age integer,photo_path text,venue_name text,created_at timestamptz,first_message_at timestamptz)
language sql stable security definer set search_path='' as $$
 select m.id,m.person_id,m.name,m.age,m.photo_path,m.venue_name,m.created_at,m.first_message_at from public.my_matches_page(101,0,null,null)m;
$$;
-- Keep PHOTO02's ready/current wrapper intact; consolidate only its authorization dependency.
create or replace function spot_private.photo01_can_view_photo(object_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid()is not null and(split_part(object_name,'/',1)=auth.uid()::text or exists(
 select 1 from public.profiles p left join spot_private.photo_assets a on a.photo_path=p.photo_path
 where object_name in(p.photo_path,a.thumbnail_path,a.detail_path)and spot_private.can_view_profile(p.id)));
$$;
revoke all on function public.photo_asset_status(text)from public,anon,authenticated;
-- No direct Storage GET or client-controlled arbitrary-duration signing, including self.
-- PHOTO writers use service role; owners render through the bounded signer as well.
update storage.buckets set public=false where id='profile-photos';
alter policy photos_read_allowed on storage.objects using(false);
-- Service-only resolution derives authorization from the verified Auth subject.
-- Set request subject transaction-locally; never accept it in an authenticated-user RPC.
create function public.resolve_authorized_photos(viewer uuid,refs text[])
returns table(ref text,object_name text)language plpgsql security definer set search_path='' as $$
declare r text;person uuid;variant text;path text;prior text:=current_setting('request.jwt.claim.sub',true);begin
 if viewer is null or coalesce(cardinality(refs),0)>48 then raise exception 'PHOTO_REFERENCE_INPUT';end if;
 perform set_config('request.jwt.claim.sub',viewer::text,true);
 foreach r in array coalesce(refs,array[]::text[])loop
 path:=null;
 if r ~ '^profile:[0-9a-f-]{36}:[0-9a-f]{32}:(canonical|thumb|detail)$'then
 person:=split_part(r,':',2)::uuid;variant:=split_part(r,':',4);
 if spot_private.can_view_profile(person)then
 select case variant when 'thumb'then coalesce(a.thumbnail_path,p.photo_path)when 'detail'then coalesce(a.detail_path,p.photo_path)else p.photo_path end into path from public.profiles p left join spot_private.photo_assets a on a.photo_path=p.photo_path where p.id=person and md5(p.photo_path)=split_part(r,':',3);
 end if;
 elsif split_part(r,'/',1)=viewer::text then path:=r;
 end if;
 if path is not null and spot_private.can_view_photo(path)and exists(select 1 from storage.objects where bucket_id='profile-photos'and name=path)then ref:=r;object_name:=path;return next;end if;
 end loop;
 perform set_config('request.jwt.claim.sub',coalesce(prior,''),true);
end$$;
revoke all on function spot_private.profile_request_authorized(uuid,uuid),spot_private.profile_dd_authorized(uuid)from public,anon,authenticated,service_role;
revoke all on function public.authorized_profile(uuid),public.resolve_authorized_photos(uuid,text[])from public,anon,authenticated,service_role;
grant execute on function public.authorized_profile(uuid)to authenticated;
grant execute on function public.resolve_authorized_photos(uuid,text[])to service_role;
notify pgrst,'reload schema';commit;
