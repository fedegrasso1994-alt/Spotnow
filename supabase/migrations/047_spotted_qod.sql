begin;
set local lock_timeout='5s';set local statement_timeout='60s';select spot_private.board_lock();
do $$begin if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'QOD_STAGING_ONLY';end if;end$$;
-- Replaces the unapplied 045 draft, after applied 046. Ordinary publication stays quota-free.
-- Reuse posts for official questions and their answers; comments stay one-level.
alter table spot_private.board_posts alter column author_id drop not null;
alter table spot_private.board_posts add column question_day date,add column parent_qod_id uuid references spot_private.board_posts(id)on delete restrict;
alter table spot_private.board_posts add constraint qod_author_shape check(
 (coalesce(post_kind,'user')='user'and author_id is not null and question_day is null)or
 (post_kind='system'and author_id is null and question_day is not null and parent_qod_id is null));
create unique index qod_one_per_tribe_day on spot_private.board_posts(venue_id,question_day)where post_kind='system';
create index qod_answers_page on spot_private.board_posts(parent_qod_id,created_at desc,id desc)where parent_qod_id is not null;
-- A consumed answer remains consumed even when its content is deleted. No product quota.
create table spot_private.qod_answer_claims(
 question_id uuid not null references spot_private.board_posts(id)on delete cascade,
 user_id uuid not null references auth.users(id)on delete cascade,
 answer_id uuid references spot_private.board_posts(id)on delete set null,
 primary key(question_id,user_id)
);
alter table spot_private.qod_answer_claims enable row level security;
revoke all on spot_private.qod_answer_claims from public,anon,authenticated,service_role;
create function spot_private.qod_ready()returns boolean language sql stable security definer set search_path=''as $$select spot_private.spotted_ready()and coalesce((select system_posts_enabled from spot_private.soma_v2_control where singleton),false)$$;
create function spot_private.qod_visible(target uuid)returns boolean language sql volatile security definer set search_path=''as $$select spot_private.qod_ready()and exists(select 1 from spot_private.board_posts q where q.id=target and q.post_kind='system'and q.question_day=(clock_timestamp()at time zone 'Europe/Rome')::date and not q.hidden and q.created_at<=clock_timestamp()and q.expires_at>clock_timestamp()and coalesce(spot_private.board_member(q.venue_id),false))$$;
-- Owner-only editorial function, no CMS or public editorial permissions.
create function spot_private.qod_publish(place uuid,local_day date,question_text text)returns uuid language plpgsql security definer set search_path=''as $$declare result uuid;begin
 perform spot_private.board_lock();
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or local_day is null then raise exception 'QOD_STAGING_ONLY';end if;
 if not coalesce(spot_private.spotted_text_valid(question_text),false)then raise exception 'BOARD_TEXT';end if;
 insert into spot_private.board_posts(venue_id,author_id,body,post_kind,question_day,created_at,expires_at)
 values(place,null,btrim(question_text),'system',local_day,local_day::timestamp at time zone 'Europe/Rome',(local_day+1)::timestamp at time zone 'Europe/Rome')returning id into result;return result;
end$$;
-- Normal authenticated RPCs can never edit/delete/publish an official question,
-- including legacy board_delete's nullable-author comparison.
create function spot_private.qod_content_guard()returns trigger language plpgsql security definer set search_path=''as $$declare q spot_private.board_posts;begin
 if tg_op='DELETE'then if old.post_kind='system'and auth.uid()is not null then raise exception 'QOD_EDITORIAL_ACCESS'using errcode='42501';end if;return old;end if;
 if(new.post_kind='system'or(tg_op='UPDATE'and old.post_kind='system'))and auth.uid()is not null then raise exception 'QOD_EDITORIAL_ACCESS'using errcode='42501';end if;
 if new.post_kind='system'then
  if new.created_at is distinct from(new.question_day::timestamp at time zone 'Europe/Rome')or new.expires_at is distinct from((new.question_day+1)::timestamp at time zone 'Europe/Rome')then raise exception 'QOD_DAY';end if;
 elsif new.parent_qod_id is not null then
  select *into q from spot_private.board_posts where id=new.parent_qod_id;
  if not found or q.post_kind is distinct from 'system'or q.venue_id<>new.venue_id or new.expires_at>q.expires_at then raise exception 'QOD_PARENT';end if;
  if tg_op='INSERT'and(not coalesce(spot_private.qod_visible(q.id),false)or new.created_at>=q.expires_at)then raise exception 'QOD_CLOSED';end if;
 end if;return new;
end$$;
create trigger qod_content_guard before insert or update or delete on spot_private.board_posts for each row execute function spot_private.qod_content_guard();
create function spot_private.qod_close_children()returns trigger language plpgsql security definer set search_path=''as $$begin
 if old.post_kind='system'and(new.hidden or new.expires_at<>old.expires_at)then update spot_private.board_posts set hidden=hidden or new.hidden,expires_at=least(expires_at,new.expires_at)where parent_qod_id=new.id;end if;return null;
end$$;
create trigger qod_close_children after update of hidden,expires_at on spot_private.board_posts for each row execute function spot_private.qod_close_children();
-- User answers are normal romantic origins; official questions are never such origins.
create or replace function spot_private.spotted_post_visible(pid uuid)returns boolean language sql volatile security definer set search_path=''as $$
 select exists(select 1 from spot_private.board_posts p where p.id=pid and not p.hidden and p.expires_at>clock_timestamp()
 and spot_private.board_member(p.venue_id)and spot_private.board_eligible(p.author_id)
 and coalesce(p.post_kind,'user')='user'and(p.parent_qod_id is null or spot_private.qod_visible(p.parent_qod_id)))$$;
-- Preserve ordinary feeds. QoD and its answers are read via the top-module RPCs,
-- never leaked through legacy timestamp-bearing publication projections.
do $$declare body text;begin
 body:=pg_get_functiondef('public.spotted_feed(uuid,uuid,integer)'::regprocedure);
 if strpos(body,'where p.venue_id=place and spot_private.spotted_post_visible')=0 then raise exception 'QOD_FEED_DEPENDENCY';end if;
 execute replace(body,'where p.venue_id=place and spot_private.spotted_post_visible','where p.parent_qod_id is null and p.venue_id=place and spot_private.spotted_post_visible');
 body:=pg_get_functiondef('public.board_feed(uuid,timestamp with time zone,uuid,integer)'::regprocedure);
 if strpos(body,'where venue_id=place and not hidden')=0 then raise exception 'QOD_LEGACY_FEED_DEPENDENCY';end if;
 execute replace(body,'where venue_id=place and not hidden','where parent_qod_id is null and coalesce(post_kind,''user'')=''user''and venue_id=place and not hidden');
 -- Do not invent QoD physical retention. Existing ordinary posts remain unchanged.
 body:=pg_get_functiondef('public.privacy_retention_run(text,uuid,boolean)'::regprocedure);
 if strpos(body,'where expires_at<=clock_timestamp()and not exists')=0 then raise exception 'QOD_RETENTION_DEPENDENCY';end if;
 execute replace(body,'where expires_at<=clock_timestamp()and not exists','where b.parent_qod_id is null and coalesce(b.post_kind,''user'')=''user''and expires_at<=clock_timestamp()and not exists');
end$$;
create function public.spotted_qod(place uuid)returns jsonb language plpgsql volatile security definer set search_path=''as $$declare q spot_private.board_posts;begin
 if not spot_private.spotted_ready()or not coalesce(spot_private.board_member(place),false)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 select *into q from spot_private.board_posts where venue_id=place and post_kind='system'and spot_private.qod_visible(id);
 if not found then return jsonb_build_object('question',null);end if;
 return jsonb_build_object('question',jsonb_build_object('id',q.id,'text',q.body,'official',true,'romantic_content',false,'answered',exists(select 1 from spot_private.qod_answer_claims c where c.question_id=q.id and c.user_id=auth.uid()),'answers',(select count(*)from spot_private.board_posts a where a.parent_qod_id=q.id and spot_private.spotted_post_visible(a.id))));
end$$;
create function public.spotted_qod_answers(question_id uuid,after_id uuid default null,page_size integer default 20)returns jsonb language plpgsql volatile security definer set search_path=''as $$declare data jsonb;cursor_row spot_private.board_posts;begin
 if not coalesce(spot_private.qod_visible(question_id),false)then raise exception 'QOD_CLOSED'using errcode='42501';end if;
 if page_size is null or page_size not between 1 and 30 then raise exception 'BOARD_INPUT';end if;
 if after_id is not null then select *into cursor_row from spot_private.board_posts where id=after_id and parent_qod_id=question_id;if not found then raise exception 'BOARD_ACCESS'using errcode='42501';end if;end if;
 select coalesce(jsonb_agg(j order by stamp desc,id desc),'[]')into data from(select spot_private.spotted_post_json(a)||jsonb_build_object('qod_answer',true)j,a.created_at stamp,a.id from spot_private.board_posts a where a.parent_qod_id=question_id and spot_private.spotted_post_visible(a.id)and(after_id is null or(a.created_at,a.id)<(cursor_row.created_at,cursor_row.id))order by a.created_at desc,a.id desc limit page_size+1)x;
 return jsonb_build_object('items',case when jsonb_array_length(data)>page_size then data-page_size else data end,'more',jsonb_array_length(data)>page_size);
end$$;
-- Existing signed nonce, receipt/rate protection and serialization; no board_create/board_quota.
create function public.spotted_qod_answer(question_id uuid,message_text text,operation_id uuid)returns uuid
language plpgsql security definer set search_path=''as $$declare
 q spot_private.board_posts;prior spot_private.board_receipts;fp text;pid uuid;stamp timestamptz;
begin
 perform spot_private.board_lock();perform spot_private.photo_owner_lock(auth.uid());
 if not coalesce(spot_private.qod_visible(question_id),false)then raise exception 'QOD_CLOSED'using errcode='42501';end if;
 if not coalesce(spot_private.spotted_text_valid(message_text),false)then raise exception 'BOARD_TEXT';end if;
 if not coalesce(spot_private.board_operation_valid(operation_id),false)then raise exception 'BOARD_OPERATION_EXPIRED';end if;
 fp:=md5(question_id::text||':'||btrim(message_text));
 select *into prior from spot_private.board_receipts r where r.user_id=auth.uid()and r.operation_id=spotted_qod_answer.operation_id;
 if found then if prior.action<>'qod_answer'or prior.fingerprint<>fp then raise exception 'BOARD_OPERATION_CONFLICT';end if;return prior.result_id;end if;
 if exists(select 1 from spot_private.qod_answer_claims c where c.question_id=spotted_qod_answer.question_id and c.user_id=auth.uid())then raise exception 'QOD_ALREADY_ANSWERED';end if;
 perform spot_private.spotted_rate();select *into q from spot_private.board_posts where id=question_id;stamp:=clock_timestamp();
 insert into spot_private.board_posts(venue_id,author_id,body,created_at,expires_at,parent_qod_id)
 values(q.venue_id,auth.uid(),btrim(message_text),stamp,q.expires_at,q.id)returning id into pid;
 insert into spot_private.qod_answer_claims(question_id,user_id,answer_id)values(q.id,auth.uid(),pid);
 insert into spot_private.board_receipts(user_id,operation_id,action,fingerprint,result_id)values(auth.uid(),operation_id,'qod_answer',fp,pid);
 return pid;
end$$;
-- Minimal manual close; owner-only like publish. Closed content never becomes current again.
create function spot_private.qod_close(question_id uuid)returns void language plpgsql security definer set search_path=''as $$begin
 perform spot_private.board_lock();
 if auth.uid()is not null then raise exception 'QOD_EDITORIAL_ACCESS'using errcode='42501';end if;
 update spot_private.board_posts set hidden=true,revision=revision+1 where id=question_id and post_kind='system';
end$$;
-- Grant only the authenticated read endpoints. Editorial helpers stay owner-only.
do $$declare f record;begin for f in select p.oid::regprocedure s from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='spot_private'and p.proname like 'qod_%'loop execute format('revoke all on function %s from public,anon,authenticated,service_role',f.s);end loop;end$$;
revoke all on function public.spotted_qod(uuid),public.spotted_qod_answers(uuid,uuid,integer),public.spotted_qod_answer(uuid,text,uuid)from public,anon,authenticated,service_role;
grant execute on function public.spotted_qod(uuid),public.spotted_qod_answers(uuid,uuid,integer),public.spotted_qod_answer(uuid,text,uuid)to authenticated;
notify pgrst,'reload schema';commit;
