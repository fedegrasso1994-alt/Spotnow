begin;
set local lock_timeout='5s';set local statement_timeout='60s';select spot_private.board_lock();
do $$begin if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'SHARE_STAGING_ONLY';end if;end$$;
-- One content-level reference, not one per sender/click. No tracking or arbitrary TTL.
-- 244 random bits from two independent UUID v4 values; no embedded identifiers.
create table spot_private.spotted_share_refs(
 token text primary key check(token~'^[0-9a-f]{64}$'),
 post_id uuid not null references spot_private.board_posts(id)on delete cascade,
 comment_id uuid unique references spot_private.board_comments(id)on delete cascade
);
create unique index spotted_share_post_ref on spot_private.spotted_share_refs(post_id)where comment_id is null;
alter table spot_private.spotted_share_refs enable row level security;
revoke all on spot_private.spotted_share_refs from public,anon,authenticated,service_role;
create function public.spotted_share(content_id uuid,content_kind text)returns text
language plpgsql security definer set search_path=''as $$declare parent uuid;result text;begin
 perform spot_private.board_lock();
 if not spot_private.spotted_ready()or content_kind is null or content_kind not in('post','comment')then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 if content_kind='post'then
  if not coalesce(spot_private.spotted_post_visible(content_id),false)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
  parent:=content_id;
 else
  if not coalesce(spot_private.spotted_comment_visible(content_id),false)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
  select post_id into parent from spot_private.board_comments where id=content_id;
 end if;
 select token into result from spot_private.spotted_share_refs r where r.post_id=parent and((content_kind='post'and r.comment_id is null)or(content_kind='comment'and r.comment_id=content_id));
 if result is null then
  perform spot_private.spotted_rate();
  result:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into spot_private.spotted_share_refs(token,post_id,comment_id)values(result,parent,case when content_kind='comment'then content_id end);
 end if;
 return result;
end$$;
create function public.spotted_resolve_share(reference text)returns jsonb
language plpgsql volatile security definer set search_path=''as $$declare r spot_private.spotted_share_refs;p spot_private.board_posts;c spot_private.board_comments;begin
 -- Identical neutral result for malformed/missing/expired/removed/nonmember.
 if auth.uid()is null or not spot_private.spotted_ready()or reference is null or reference!~'^[0-9a-f]{64}$'then return jsonb_build_object('available',false);end if;
 select *into r from spot_private.spotted_share_refs where token=reference;
 if not found or not coalesce(spot_private.spotted_post_visible(r.post_id),false)then return jsonb_build_object('available',false);end if;
 if r.comment_id is not null and not coalesce(spot_private.spotted_comment_visible(r.comment_id),false)then return jsonb_build_object('available',false);end if;
 select *into p from spot_private.board_posts where id=r.post_id;
 if r.comment_id is not null then select *into c from spot_private.board_comments where id=r.comment_id;end if;
 return jsonb_build_object('available',true,'place',p.venue_id,'post',spot_private.spotted_post_json(p)||jsonb_build_object('qod_answer',p.parent_qod_id is not null),'comment',case when r.comment_id is null then null else spot_private.spotted_comment_json(c)end);
end$$;
revoke all on function public.spotted_share(uuid,text),public.spotted_resolve_share(text)from public,anon,authenticated,service_role;
grant execute on function public.spotted_share(uuid,text),public.spotted_resolve_share(text)to authenticated;
notify pgrst,'reload schema';commit;
