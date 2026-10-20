begin;
set local lock_timeout='5s';set local statement_timeout='60s';select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'SPOTTED_STAGING_ONLY';end if;
 if exists(select 1 from information_schema.columns where table_schema='spot_private'and table_name='board_posts'and column_name='parent_qod_id')then raise exception 'QOD_DRAFT_MUST_REMAIN_UNAPPLIED';end if;
end$$;
-- SPOTTED no longer uses the legacy daily board_quota. Retain the same create
-- receipts/fingerprint so retries of already-published posts remain idempotent.
create or replace function public.spotted_create_post(place uuid,message_text text,operation_id uuid)returns uuid language plpgsql security definer set search_path=''as $$declare
 text_value text:=btrim(message_text);fp text;prior spot_private.board_receipts;pid uuid;stamp timestamptz;
begin
 perform spot_private.board_lock();perform spot_private.photo_owner_lock(auth.uid());
 if not coalesce(spot_private.spotted_ready(),false)or not coalesce(spot_private.board_member(place),false)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 if not coalesce(spot_private.board_operation_valid(operation_id),false)then raise exception 'BOARD_OPERATION_EXPIRED';end if;
 if not coalesce(spot_private.spotted_text_valid(text_value),false)then raise exception 'BOARD_TEXT';end if;
 fp:=md5(place::text||':'||text_value);select *into prior from spot_private.board_receipts r where r.user_id=auth.uid()and r.operation_id=spotted_create_post.operation_id;
 if found then if prior.action<>'create'or prior.fingerprint<>fp then raise exception 'BOARD_OPERATION_CONFLICT';end if;return prior.result_id;end if;
 -- Existing technical rate threshold, not a new daily product quota.
 perform spot_private.spotted_rate();stamp:=clock_timestamp();
 insert into spot_private.board_posts(venue_id,author_id,body,created_at,expires_at)values(place,auth.uid(),text_value,stamp,stamp+interval '24 hours')returning id into pid;
 insert into spot_private.board_receipts(user_id,operation_id,action,fingerprint,result_id)values(auth.uid(),operation_id,'create',fp,pid);return pid;
end$$;
create or replace function public.spotted_feed(place uuid,after_id uuid default null,page_size integer default 20)returns jsonb language plpgsql volatile security definer set search_path=''as $$declare data jsonb;cursor_row spot_private.board_posts;begin
 if not spot_private.spotted_ready()or not coalesce(spot_private.board_member(place),false)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 if page_size is null or page_size not between 1 and 30 then raise exception 'BOARD_INPUT';end if;
 if after_id is not null then select *into cursor_row from spot_private.board_posts where id=after_id and venue_id=place;if not found then raise exception 'BOARD_ACCESS'using errcode='42501';end if;end if;
 select coalesce(jsonb_agg(j order by stamp desc,id desc),'[]')into data from(select spot_private.spotted_post_json(p)j,p.created_at stamp,p.id from spot_private.board_posts p
 where p.venue_id=place and spot_private.spotted_post_visible(p.id)and(after_id is null or(p.created_at,p.id)<(cursor_row.created_at,cursor_row.id))order by p.created_at desc,p.id desc limit page_size+1)x;
 return jsonb_build_object('items',case when jsonb_array_length(data)>page_size then data-page_size else data end,'more',jsonb_array_length(data)>page_size);end$$;
revoke all on function public.spotted_create_post(uuid,text,uuid),public.spotted_feed(uuid,uuid,integer)from public,anon,service_role;
grant execute on function public.spotted_create_post(uuid,text,uuid),public.spotted_feed(uuid,uuid,integer)to authenticated;
notify pgrst,'reload schema';commit;
