begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'SPOTTED_STAGING_ONLY';end if;
 if current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho'then raise exception 'SPOTTED_PROJECT_MISMATCH';end if;
end$$;
-- Reuse 027 comments, 026 posts/reactions/report receipts and existing moderation.
-- No romantic request, share, Discovery or scheduler flag is activated here.
-- comment_id already exists from 027; preserve its FK and reuse it.
alter table spot_private.board_reports add constraint board_report_one_target check(num_nonnulls(post_id,comment_id)=1) not valid;
create unique index board_comment_report_unique on spot_private.board_reports(comment_id,reporter_id) where comment_id is not null;
create index board_receipt_rate on spot_private.board_receipts(user_id,created_at);
create table spot_private.board_likes(
 user_id uuid not null references auth.users(id)on delete cascade,
 post_id uuid references spot_private.board_posts(id)on delete cascade,
 comment_id uuid references spot_private.board_comments(id)on delete cascade,
 check(num_nonnulls(post_id,comment_id)=1)
);
create unique index board_post_like_unique on spot_private.board_likes(user_id,post_id)where post_id is not null;
create unique index board_comment_like_unique on spot_private.board_likes(user_id,comment_id)where comment_id is not null;
alter table spot_private.board_likes enable row level security;
revoke all on spot_private.board_likes from public,anon,authenticated;
create function spot_private.spotted_text_valid(body text)returns boolean language sql immutable set search_path=''as $$
 select body is not null and char_length(btrim(body))between 1 and 280
 -- Plain text only: reject links, URL-like domains, markup and mention/tag tokens.
 and body !~* '(https?://|www\.|[[:alnum:]-]+\.[[:alpha:]]{2,}([/[:space:]]|$)|(^|[[:space:]])[@#][^[:space:]]|[<>])';
$$;
create function spot_private.spotted_text_guard()returns trigger language plpgsql set search_path=''as $$begin
 if not spot_private.spotted_text_valid(new.body)then raise exception 'BOARD_TEXT';end if;return new;
end$$;
create trigger spotted_post_text before insert or update of body on spot_private.board_posts for each row execute function spot_private.spotted_text_guard();
create trigger spotted_comment_text before insert or update of body on spot_private.board_comments for each row execute function spot_private.spotted_text_guard();
create function spot_private.spotted_ready()returns boolean language sql stable security definer set search_path=''as $$
 select coalesce((select comments_enabled from spot_private.soma_v2_control where singleton),false)
 and exists(select 1 from spot_private.privacy_environment where environment='staging');$$;
create function spot_private.spotted_post_visible(pid uuid)returns boolean language sql volatile security definer set search_path=''as $$
 select exists(select 1 from spot_private.board_posts p where p.id=pid and not p.hidden and p.expires_at>clock_timestamp()
 and spot_private.board_member(p.venue_id)and spot_private.board_eligible(p.author_id));$$;
create function spot_private.spotted_comment_visible(cid uuid)returns boolean language sql volatile security definer set search_path=''as $$
 select exists(select 1 from spot_private.board_comments c where c.id=cid and not c.hidden and c.removed_at is null
 and spot_private.board_eligible(c.author_id)and spot_private.spotted_post_visible(c.post_id));$$;
create function spot_private.spotted_rate()returns void language plpgsql security definer set search_path=''as $$begin
 if(select count(*)from spot_private.board_receipts where user_id=auth.uid()and created_at>clock_timestamp()-interval '1 minute')>=120 then raise exception 'BOARD_RATE';end if;
end$$;
-- Exact public allowlist. No author, user IDs, internal revision, timestamps or liker list.
create function spot_private.spotted_post_json(p spot_private.board_posts)returns jsonb language sql volatile security definer set search_path=''as $$select jsonb_build_object(
 'id',p.id,'text',p.body,'can_delete',p.author_id=auth.uid(),
 'likes',(select count(*)from spot_private.board_likes l where l.post_id=p.id),
 'liked',exists(select 1 from spot_private.board_likes l where l.post_id=p.id and l.user_id=auth.uid()),
 'comments',(select count(*)from spot_private.board_comments c where c.post_id=p.id and spot_private.spotted_comment_visible(c.id)))$$;
create function spot_private.spotted_comment_json(c spot_private.board_comments)returns jsonb language sql stable security definer set search_path=''as $$select jsonb_build_object(
 'id',c.id,'text',c.body,'can_delete',c.author_id=auth.uid(),
 'likes',(select count(*)from spot_private.board_likes l where l.comment_id=c.id),
 'liked',exists(select 1 from spot_private.board_likes l where l.comment_id=c.id and l.user_id=auth.uid()))$$;
create function public.spotted_feed(place uuid,after_id uuid default null,page_size integer default 20)returns jsonb language plpgsql volatile security definer set search_path=''as $$declare data jsonb;cursor_row spot_private.board_posts;begin
 if not spot_private.spotted_ready()or not coalesce(spot_private.board_member(place),false)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 if page_size is null or page_size not between 1 and 30 then raise exception 'BOARD_INPUT';end if;
 if after_id is not null then select * into cursor_row from spot_private.board_posts where id=after_id and venue_id=place;if not found then raise exception 'BOARD_ACCESS'using errcode='42501';end if;end if;
 select coalesce(jsonb_agg(j order by stamp desc,id desc),'[]')into data from(select spot_private.spotted_post_json(p)j,p.created_at stamp,p.id from spot_private.board_posts p
 where p.venue_id=place and spot_private.spotted_post_visible(p.id)and(after_id is null or(p.created_at,p.id)<(cursor_row.created_at,cursor_row.id))order by p.created_at desc,p.id desc limit page_size+1)x;
 return jsonb_build_object('items',case when jsonb_array_length(data)>page_size then data-page_size else data end,'more',jsonb_array_length(data)>page_size,
 'remaining',3-coalesce((select used from spot_private.board_quota where user_id=auth.uid()and venue_id=place and day=(clock_timestamp()at time zone 'Europe/Rome')::date),0));end$$;
create function public.spotted_comments(target_post uuid,after_id uuid default null,page_size integer default 30)returns jsonb language plpgsql volatile security definer set search_path=''as $$declare data jsonb;cursor_row spot_private.board_comments;begin
 if not spot_private.spotted_ready()or not spot_private.spotted_post_visible(target_post)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 if page_size is null or page_size not between 1 and 50 then raise exception 'BOARD_INPUT';end if;
 if after_id is not null then select * into cursor_row from spot_private.board_comments where id=after_id and post_id=target_post;if not found then raise exception 'BOARD_ACCESS'using errcode='42501';end if;end if;
 select coalesce(jsonb_agg(j order by stamp,id),'[]')into data from(select spot_private.spotted_comment_json(c)j,c.created_at stamp,c.id from spot_private.board_comments c
 where c.post_id=target_post and spot_private.spotted_comment_visible(c.id)and(after_id is null or(c.created_at,c.id)>(cursor_row.created_at,cursor_row.id))order by c.created_at,c.id limit page_size+1)x;
 return jsonb_build_object('items',case when jsonb_array_length(data)>page_size then data-page_size else data end,'more',jsonb_array_length(data)>page_size);end$$;
create function public.spotted_create_post(place uuid,message_text text,operation_id uuid)returns uuid language plpgsql security definer set search_path=''as $$begin
 if not spot_private.spotted_ready()then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 return public.board_create(place,message_text,operation_id);end$$;
create function public.spotted_create_comment(target_post uuid,message_text text,operation_id uuid)returns uuid language plpgsql security definer set search_path=''as $$declare
 p spot_private.board_posts;prior spot_private.board_receipts;fp text;cid uuid;bucket timestamptz;begin
 perform spot_private.board_lock();perform spot_private.photo_owner_lock(auth.uid());
 if not spot_private.spotted_ready()or not spot_private.spotted_post_visible(target_post)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 if not spot_private.spotted_text_valid(message_text)then raise exception 'BOARD_TEXT';end if;
 if not coalesce(spot_private.board_operation_valid(operation_id),false)then raise exception 'BOARD_OPERATION_EXPIRED';end if;
 fp:=md5(target_post::text||':'||btrim(message_text));select * into prior from spot_private.board_receipts r where r.user_id=auth.uid()and r.operation_id=spotted_create_comment.operation_id;
 if found then if prior.action<>'comment'or prior.fingerprint<>fp then raise exception 'BOARD_OPERATION_CONFLICT';end if;return prior.result_id;end if;
 perform spot_private.spotted_rate();select * into p from spot_private.board_posts where id=target_post;
 bucket:=date_trunc('minute',clock_timestamp());
 if coalesce((select used from spot_private.board_comment_quota where user_id=auth.uid()and venue_id=p.venue_id and bucket_start=bucket),0)>=10 then raise exception 'BOARD_RATE';end if;
 insert into spot_private.board_comment_quota values(auth.uid(),p.venue_id,bucket,1)on conflict(user_id,venue_id,bucket_start)do update set used=board_comment_quota.used+1;
 insert into spot_private.board_comments(post_id,author_id,body)values(target_post,auth.uid(),btrim(message_text))returning id into cid;
 insert into spot_private.board_receipts(user_id,operation_id,action,fingerprint,result_id)values(auth.uid(),operation_id,'comment',fp,cid);return cid;end$$;
-- Explicit desired state (not toggle). Retries replay before rate charging.
create function public.spotted_like(content_id uuid,content_kind text,liked boolean,operation_id uuid)returns void language plpgsql security definer set search_path=''as $$declare prior spot_private.board_receipts;fp text;begin
 perform spot_private.board_lock();perform spot_private.photo_owner_lock(auth.uid());
 if content_kind is null or content_kind not in('post','comment')or liked is null or operation_id is null then raise exception 'BOARD_INPUT';end if;
 if not spot_private.spotted_ready()or not(case when content_kind='post'then spot_private.spotted_post_visible(content_id)else spot_private.spotted_comment_visible(content_id)end)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 fp:=md5(content_kind||':'||content_id::text||':'||liked::text);select * into prior from spot_private.board_receipts r where r.user_id=auth.uid()and r.operation_id=spotted_like.operation_id;
 if found then if prior.action<>'like'or prior.fingerprint<>fp then raise exception 'BOARD_OPERATION_CONFLICT';end if;return;end if;perform spot_private.spotted_rate();
 if liked then insert into spot_private.board_likes(user_id,post_id,comment_id)values(auth.uid(),case when content_kind='post'then content_id end,case when content_kind='comment'then content_id end)on conflict do nothing;
 else delete from spot_private.board_likes where user_id=auth.uid()and(case when content_kind='post'then post_id=content_id else comment_id=content_id end);end if;
 insert into spot_private.board_receipts(user_id,operation_id,action,fingerprint)values(auth.uid(),operation_id,'like',fp);end$$;
create function public.spotted_report_comment(target_comment uuid,reason text,operation_id uuid)returns uuid language plpgsql security definer set search_path=''as $$declare prior spot_private.board_receipts;fp text;rid uuid;begin
 perform spot_private.board_lock();perform spot_private.photo_owner_lock(auth.uid());
 if not spot_private.spotted_ready()or not spot_private.spotted_comment_visible(target_comment)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 if operation_id is null or reason is null or reason not in('harassment','fake_profile','underage','inappropriate','other')then raise exception 'BOARD_INPUT';end if;
 fp:=md5(target_comment::text||':'||reason);select * into prior from spot_private.board_receipts r where r.user_id=auth.uid()and r.operation_id=spotted_report_comment.operation_id;
 if found then if prior.action<>'comment_report'or prior.fingerprint<>fp then raise exception 'BOARD_OPERATION_CONFLICT';end if;return prior.result_id;end if;perform spot_private.spotted_rate();
 insert into spot_private.board_reports(comment_id,reporter_id,reason)values(target_comment,auth.uid(),reason)on conflict(comment_id,reporter_id)where comment_id is not null do update set reason=excluded.reason returning id into rid;
 insert into spot_private.board_receipts(user_id,operation_id,action,fingerprint,result_id)values(auth.uid(),operation_id,'comment_report',fp,rid);return rid;end$$;
create function spot_private.spotted_comment_capture(cid uuid)returns void language plpgsql security definer set search_path=''as $$begin
 insert into spot_private.board_evidence(hold_id,body,reason)select h.id,c.body,coalesce(r.reason,'other')from spot_private.safety_holds h join spot_private.board_comments c on c.id=cid
 left join spot_private.board_reports r on r.comment_id=c.id and h.category='board_reports'and h.target=r.id::text
 where h.released_at is null and((h.category='board_comments'and h.target=c.id::text)or r.id is not null)on conflict(hold_id)do nothing;end$$;
create function public.spotted_delete_comment(target_comment uuid,operation_id uuid)returns void language plpgsql security definer set search_path=''as $$declare c spot_private.board_comments;prior spot_private.board_receipts;begin
 perform spot_private.board_lock();perform spot_private.photo_owner_lock(auth.uid());
 if auth.uid()is null or operation_id is null then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 select * into prior from spot_private.board_receipts r where r.user_id=auth.uid()and r.operation_id=spotted_delete_comment.operation_id;
 if found then if prior.action<>'comment_delete'or prior.fingerprint<>target_comment::text then raise exception 'BOARD_OPERATION_CONFLICT';end if;return;end if;
 select * into c from spot_private.board_comments where id=target_comment;
 if found then if c.author_id<>auth.uid()then raise exception 'BOARD_ACCESS'using errcode='42501';end if;perform spot_private.spotted_comment_capture(c.id);delete from spot_private.board_comments where id=c.id;end if;
 insert into spot_private.board_receipts(user_id,operation_id,action,fingerprint)values(auth.uid(),operation_id,'comment_delete',target_comment::text);end$$;
-- Existing suspension path permanently hides both content types. Unsuspend does not republish.
create or replace function spot_private.board_sanction()returns trigger language plpgsql security definer set search_path=''as $$begin
 if new.revoked_at is null and(new.until_at is null or new.until_at>clock_timestamp())then
 update spot_private.board_posts set hidden=true,revision=revision+1 where author_id=new.user_id and not hidden;
 update spot_private.board_comments set hidden=true,revision=revision+1 where author_id=new.user_id and not hidden;
 end if;return new;end$$;
create or replace function public.board_moderation_queue(filter text default 'open',cursor_time timestamptz default null,cursor_id uuid default null,page_size integer default 50)returns jsonb language plpgsql stable security definer set search_path='' as $$declare data jsonb;begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or not coalesce(public.is_moderator(),false)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 if filter is null or filter not in('all','open','under_review','closed')or page_size is null or page_size not between 1 and 100 or(cursor_time is null)<>(cursor_id is null)then raise exception 'BOARD_INPUT';end if;
 select coalesce(jsonb_agg(to_jsonb(q)order by created_at,id),'[]')into data from(select r.id,r.reason,r.state queue_state,r.revision,r.created_at,r.post_id,r.comment_id,case when r.comment_id is null then 'post'else 'comment'end content_kind,coalesce(c.body,p.body)text,coalesce(c.hidden,p.hidden)hidden from spot_private.board_reports r left join spot_private.board_posts p on p.id=r.post_id left join spot_private.board_comments c on c.id=r.comment_id where(filter='all'or r.state=filter)and(cursor_time is null or(r.created_at,r.id)>(cursor_time,cursor_id))order by r.created_at,r.id limit page_size+1)q;
 return jsonb_build_object('staff_role',spot_private.moderation_role(),'items',case when jsonb_array_length(data)>page_size then data-page_size else data end,'more',jsonb_array_length(data)>page_size);end$$;
create or replace function public.board_moderation_action(target_report uuid,action text,operation_id uuid,expected_revision bigint,duration_hours integer default null)returns jsonb language plpgsql security definer set search_path='' as $$declare r spot_private.board_reports;p spot_private.board_posts;prior spot_private.board_audit;fp text;staff text:=spot_private.moderation_role();begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or staff is null then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 if action is null or action not in('claim','review','dismiss','hide','warn','suspend','ban','resolve_author')or operation_id is null or expected_revision is null or(action='suspend'and(duration_hours is null or duration_hours not between 1 and 720))or(action<>'suspend'and duration_hours is not null)then raise exception 'BOARD_INPUT';end if;
 if action='ban'and staff<>'ADMIN'then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 perform spot_private.board_lock();fp:=md5(target_report::text||':'||action||':'||expected_revision||':'||coalesce(duration_hours,0));
 select * into prior from spot_private.board_audit where board_audit.operation_id=board_moderation_action.operation_id;
 if found then if prior.actor_id<>auth.uid()or prior.fingerprint<>fp then raise exception 'BOARD_OPERATION_CONFLICT';end if;if action<>'resolve_author'then return jsonb_build_object('completed',true);end if;end if;
 select * into r from spot_private.board_reports where id=target_report for update;if not found then raise exception 'BOARD_CASE';end if;
 if r.comment_id is null then select * into p from spot_private.board_posts where id=r.post_id for update;else select parent.* into p from spot_private.board_comments c join spot_private.board_posts parent on parent.id=c.post_id where c.id=r.comment_id;select c.author_id,c.body into p.author_id,p.body from spot_private.board_comments c where c.id=r.comment_id;end if;perform spot_private.photo_owner_lock(p.author_id);
 if r.revision<>expected_revision and prior.id is null then raise exception 'BOARD_STALE';end if;
 if r.assigned_to is not null and r.assigned_to<>auth.uid()and r.claim_until>clock_timestamp()then raise exception 'BOARD_CLAIMED';end if;
 if r.state='closed'and prior.id is null then raise exception 'BOARD_CLOSED';end if;
 if prior.id is null then insert into spot_private.board_audit(actor_id,report_id,action,operation_id,fingerprint)values(auth.uid(),r.id,action,operation_id,fp);end if;
 if action='resolve_author'then if r.state<>'under_review'or r.assigned_to is distinct from auth.uid()or coalesce(r.claim_until,'-infinity')<=clock_timestamp()then raise exception 'BOARD_CLAIM_REQUIRED';end if;return jsonb_build_object('author_id',p.author_id);end if;
 if action='claim'then update spot_private.board_reports set state='under_review',assigned_to=auth.uid(),claim_until=clock_timestamp()+interval '15 minutes',revision=revision+1 where id=r.id;
 else
 if action in('hide','suspend','ban')then if r.comment_id is null then update spot_private.board_posts set hidden=true,revision=revision+1 where id=p.id;else update spot_private.board_comments set hidden=true,revision=revision+1 where id=r.comment_id;end if;end if;
 if action='suspend'and exists(select 1 from spot_private.suspensions where user_id=p.author_id and kind='ban'and revoked_at is null)then raise exception 'BOARD_BAN_RELEASE_REQUIRED';end if;
 if action in('suspend','ban')then insert into spot_private.suspensions(user_id,reason,kind,until_at)values(p.author_id,upper(r.reason),action,case when action='suspend'then clock_timestamp()+make_interval(hours=>duration_hours)end)on conflict(user_id)do update set reason=excluded.reason,kind=excluded.kind,until_at=excluded.until_at,revoked_at=null,created_at=clock_timestamp();end if;
 if action='warn'then insert into spot_private.moderation_audit(actor_id,report_id,action,note,operation_id,target_id,reason_code,previous_state,new_state,request)values(auth.uid(),null,'warn','',operation_id,p.author_id,upper(r.reason),'{}','{}','{}');end if;
 update spot_private.board_reports set state='closed',closed_at=clock_timestamp(),assigned_to=null,claim_until=null,revision=revision+1 where id=r.id;end if;
 return jsonb_build_object('completed',true);end$$;
create or replace function spot_private.board_capture(pid uuid)returns void language plpgsql security definer set search_path='' as $$declare c record;begin
 insert into spot_private.board_evidence(hold_id,body,reason)select h.id,p.body,coalesce(r.reason,'other')from spot_private.safety_holds h join spot_private.board_posts p on p.id=pid left join spot_private.board_reports r on r.post_id=p.id and h.category='board_reports'and h.target=r.id::text where h.released_at is null and((h.category='board_posts'and h.target=p.id::text)or r.id is not null)on conflict(hold_id)do nothing;for c in select id from spot_private.board_comments where post_id=pid loop perform spot_private.spotted_comment_capture(c.id);end loop;end$$;
alter function public.prepare_account_deletion(uuid)rename to spotted_prior_prepare_account_deletion;
revoke all on function public.spotted_prior_prepare_account_deletion(uuid)from public,anon,authenticated,service_role;
create function public.prepare_account_deletion(target_user uuid)returns void language plpgsql security definer set search_path=''as $$declare c record;begin
 perform spot_private.board_lock();perform spot_private.photo_owner_lock(target_user);
 for c in select b.id from spot_private.board_comments b where b.author_id=target_user or exists(select 1 from spot_private.board_reports r where r.comment_id=b.id and r.reporter_id=target_user)loop perform spot_private.spotted_comment_capture(c.id);end loop;
 perform public.spotted_prior_prepare_account_deletion(target_user);end$$;
revoke all on function public.prepare_account_deletion(uuid)from public,anon,authenticated;grant execute on function public.prepare_account_deletion(uuid)to service_role;
alter function public.my_rights_page(text,text,integer)rename to spotted_prior_rights_page;
revoke all on function public.spotted_prior_rights_page(text,text,integer)from public,anon,authenticated,service_role;
create function public.my_rights_page(section text,after_key text default '',page_size integer default 100)returns jsonb language plpgsql stable security definer set search_path=''as $$declare data jsonb;begin
 if section not in('board_comments','board_likes')then return public.spotted_prior_rights_page(section,after_key,page_size);end if;
 if auth.uid()is null or not exists(select 1 from auth.users where id=auth.uid())then raise exception 'RIGHTS_AUTH'using errcode='42501';end if;
 if page_size is null or page_size not between 1 and 100 or after_key is null or length(after_key)>200 then raise exception 'RIGHTS_INPUT';end if;
 select coalesce(jsonb_agg(jsonb_build_object('key',k,'data',value)order by k),'[]')into data from(select * from(
 select id::text k,jsonb_build_object('id',id,'post_id',post_id,'text',body,'created_at',created_at)value from spot_private.board_comments where section='board_comments'and author_id=auth.uid()
 union all select coalesce(post_id,comment_id)::text,jsonb_build_object('content_id',coalesce(post_id,comment_id),'kind',case when post_id is not null then 'post'else 'comment'end)from spot_private.board_likes where section='board_likes'and user_id=auth.uid())x where k>after_key order by k limit page_size+1)y;
 return jsonb_build_object('owner_id',auth.uid(),'section',section,'items',coalesce((select jsonb_agg(value)from(select value from jsonb_array_elements(data)with ordinality e(value,n)where n<=page_size)x),'[]'),'next_key',case when jsonb_array_length(data)>page_size then data->(page_size-1)->>'key'end);end$$;
revoke all on function public.my_rights_page(text,text,integer)from public,anon;grant execute on function public.my_rights_page(text,text,integer)to authenticated;
create or replace function public.privacy_retention_run(category text,operation_id uuid,dry_run boolean default true)returns jsonb language plpgsql security definer set search_path='' as $$declare rule spot_private.retention_policies;prior spot_private.retention_runs;p record;n integer:=0;removed integer:=0;begin
 if category not in('board_posts','board_reports','board_metadata')then return public.board_prior_retention_run(category,operation_id,dry_run);end if;
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'BOARD_STAGING_ONLY';end if;
 if operation_id is null or dry_run is null then raise exception 'RETENTION_INPUT';end if;perform spot_private.board_lock();select * into prior from spot_private.retention_runs where retention_runs.operation_id=privacy_retention_run.operation_id;
 if found then if prior.category<>category or prior.dry_run<>dry_run then raise exception 'RETENTION_OPERATION_CONFLICT';end if;return jsonb_build_object('candidates',prior.candidates,'purged',prior.purged,'replay',true);end if;
 select * into rule from spot_private.retention_policies where retention_policies.category=privacy_retention_run.category;
 if not dry_run and((select paused from spot_private.retention_control)or not rule.enabled)then return jsonb_build_object('paused',true,'purged',0);end if;
 if category='board_posts'then for p in select id from spot_private.board_posts b where expires_at<=clock_timestamp()and not exists(select 1 from spot_private.board_reports r where r.post_id=b.id and r.state<>'closed')and not spot_private.retention_held('board_posts',b.id::text)and not exists(select 1 from spot_private.board_reports r where r.post_id=b.id and spot_private.retention_held('board_reports',r.id::text))and not exists(select 1 from spot_private.board_comments c where c.post_id=b.id and(spot_private.retention_held('board_comments',c.id::text)or exists(select 1 from spot_private.board_reports r where r.comment_id=c.id and(r.state<>'closed'or spot_private.retention_held('board_reports',r.id::text)))))order by expires_at,id limit rule.batch_size loop n:=n+1;if not dry_run then delete from spot_private.board_posts where id=p.id;removed:=removed+1;end if;end loop;
 elsif category='board_reports'then for p in select id from spot_private.board_reports where state='closed'and closed_at<clock_timestamp()-rule.duration and not spot_private.retention_held('board_reports',id::text)loop n:=n+1;if not dry_run then delete from spot_private.board_reports where id=p.id;removed:=removed+1;end if;end loop;
 else select count(*)into n from spot_private.board_receipts where created_at<clock_timestamp()-rule.duration;if not dry_run then delete from spot_private.board_receipts where created_at<clock_timestamp()-rule.duration;get diagnostics removed=row_count;delete from spot_private.board_comment_quota where bucket_start<clock_timestamp()-rule.duration;delete from spot_private.board_quota where day<(clock_timestamp()at time zone 'Europe/Rome')::date-extract(day from rule.duration)::integer;end if;end if;
 insert into spot_private.retention_runs(operation_id,category,policy_version,dry_run,candidates,purged)values(operation_id,category,rule.version,dry_run,n,removed);return jsonb_build_object('category',category,'candidates',n,'purged',removed,'dry_run',dry_run);end$$;
-- Revoke every new private helper and public endpoint before granting only authenticated RPC entrypoints.
do $$declare f record;begin for f in select p.oid::regprocedure s from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname like 'spotted_%'and n.nspname in('public','spot_private')loop execute format('revoke all on function %s from public,anon,authenticated,service_role',f.s);end loop;end$$;
grant execute on function public.spotted_feed(uuid,uuid,integer),public.spotted_comments(uuid,uuid,integer),public.spotted_create_post(uuid,text,uuid),public.spotted_create_comment(uuid,text,uuid),public.spotted_like(uuid,text,boolean,uuid),public.spotted_report_comment(uuid,text,uuid),public.spotted_delete_comment(uuid,uuid)to authenticated;
notify pgrst,'reload schema';
commit;
