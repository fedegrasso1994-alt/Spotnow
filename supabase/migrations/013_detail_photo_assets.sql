begin;
alter table spot_private.photo_assets add column detail_path text check(detail_path is null or detail_path=photo_path||'.detail.jpg');
create or replace function spot_private.can_view_photo(object_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (split_part(object_name,'/',1)=auth.uid()::text or exists(
 select 1 from public.profiles p where (p.photo_path=object_name or exists(select 1 from spot_private.photo_assets a where a.photo_path=p.photo_path and (a.thumbnail_path=object_name or a.detail_path=object_name))) and (
 spot_private.can_view_profile(p.id) or exists(select 1 from public.matches m where p.id in(m.user_a,m.user_b) and spot_private.can_use_match(m.id)))));
$$;
create or replace function public.save_my_photo_preview(path text,preview_text text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not spot_private.has_account() or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.photo_path=path) then raise exception 'Foto non autorizzata' using errcode='42501'; end if;
 insert into spot_private.photo_assets(photo_path,user_id,preview,thumbnail_path,detail_path) values(path,auth.uid(),preview_text,
 case when exists(select 1 from storage.objects o where o.bucket_id='profile-photos' and o.name=path||'.thumb.jpg') then path||'.thumb.jpg' else null end,
 case when exists(select 1 from storage.objects o where o.bucket_id='profile-photos' and o.name=path||'.detail.jpg') then path||'.detail.jpg' else null end)
 on conflict(photo_path) do update set preview=excluded.preview,thumbnail_path=coalesce(excluded.thumbnail_path,photo_assets.thumbnail_path),detail_path=coalesce(excluded.detail_path,photo_assets.detail_path),updated_at=now();
end $$;
drop function public.photo_asset_status(text);
create function public.photo_asset_status(path text)
returns table(preview text,thumbnail_path text,detail_path text) language sql stable security definer set search_path='' as $$
 select a.preview,a.thumbnail_path,a.detail_path from spot_private.photo_assets a where a.photo_path=path and spot_private.has_account() and spot_private.can_view_photo(path) and exists(select 1 from public.profiles p where p.photo_path=path);
$$;
create or replace function public.pending_photo_assets()
returns table(photo_path text,total_count bigint) language sql stable security definer set search_path='' as $$
 select p.photo_path,count(*) over() from public.profiles p join auth.users u on u.id=p.id left join spot_private.photo_assets a on a.photo_path=p.photo_path where not u.is_anonymous and (a.thumbnail_path is null or a.detail_path is null) and not exists(select 1 from spot_private.account_deletions d where d.user_id=p.id) and not exists(select 1 from spot_private.suspensions s where s.user_id=p.id and s.revoked_at is null) order by p.photo_path limit 1;
$$;
create function public.store_photo_assets_hd(path text,preview_text text,thumbnail text,detail text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if detail<>path||'.detail.jpg' or detail is null or not exists(select 1 from storage.objects o where o.bucket_id='profile-photos' and o.name=detail) then raise exception 'Foto non disponibile' using errcode='42501'; end if;
 perform public.store_photo_assets(path,preview_text,thumbnail);
 update spot_private.photo_assets set detail_path=detail where photo_path=path;
end $$;
drop function public.location_people_photos_page(uuid,boolean,integer,integer);
create function public.location_people_photos_page(place uuid,live boolean,page_size integer default 49,page_offset integer default 0)
returns table(id uuid,name text,age integer,gender text,photo_path text,checked_in_at timestamptz,expires_at timestamptz,interest_sent boolean,occupation text,total_count bigint,photo_preview text,thumbnail_path text,detail_path text)
language sql stable security definer set search_path='' as $$
 select p.*,a.preview,a.thumbnail_path,a.detail_path from public.location_people_page(place,live,page_size,page_offset) p left join spot_private.photo_assets a on a.photo_path=p.photo_path order by p.name,p.id;
$$;
drop function public.my_matches_photos_page(integer,integer,uuid,uuid);
create function public.my_matches_photos_page(page_size integer default 49,page_offset integer default 0,requested_match uuid default null,requested_person uuid default null)
returns table(id uuid,person_id uuid,name text,age integer,photo_path text,venue_name text,created_at timestamptz,first_message_at timestamptz,total_count bigint,photo_preview text,thumbnail_path text,detail_path text)
language sql stable security definer set search_path='' as $$
 select m.*,a.preview,a.thumbnail_path,a.detail_path from public.my_matches_page(page_size,page_offset,requested_match,requested_person) m left join spot_private.photo_assets a on a.photo_path=m.photo_path order by m.created_at desc,m.id desc;
$$;
revoke all on function public.photo_asset_status(text),public.location_people_photos_page(uuid,boolean,integer,integer),public.my_matches_photos_page(integer,integer,uuid,uuid),public.store_photo_assets_hd(text,text,text,text) from public,anon,authenticated;
grant execute on function public.photo_asset_status(text),public.location_people_photos_page(uuid,boolean,integer,integer),public.my_matches_photos_page(integer,integer,uuid,uuid) to authenticated;
grant execute on function public.photo_asset_status(text),public.store_photo_assets_hd(text,text,text,text) to service_role;
notify pgrst,'reload schema';
commit;
