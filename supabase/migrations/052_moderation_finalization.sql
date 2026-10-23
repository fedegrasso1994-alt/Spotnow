begin;
set local lock_timeout='5s';set local statement_timeout='60s';
do $$begin if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'MODERATION_STAGING_ONLY';end if;end$$;
-- Anonymous-content blocks are deliberately NOT public.blocks or nominal auth gates.
create table spot_private.anonymous_blocks(id uuid primary key default gen_random_uuid(),blocker_id uuid not null references auth.users(id)on delete cascade,author_id uuid not null references auth.users(id)on delete cascade,created_at timestamptz not null default clock_timestamp(),unique(blocker_id,author_id),check(blocker_id<>author_id));
alter table spot_private.anonymous_blocks enable row level security;
revoke all on spot_private.anonymous_blocks from public,anon,authenticated,service_role;
create function spot_private.social_pair_blocked(a uuid,b uuid)returns boolean language sql stable security definer set search_path=''as $$select exists(select 1 from public.blocks where(blocker_id=a and blocked_id=b)or(blocker_id=b and blocked_id=a))or exists(select 1 from spot_private.anonymous_blocks where(blocker_id=a and author_id=b)or(blocker_id=b and author_id=a))$$;
-- Preserve a nominal-context reader for existing delivered requests; no anonymous
-- block may identify an author by changing an already nominal relationship.
create function spot_private.nominal_post_visible(pid uuid)returns boolean language sql volatile security definer set search_path=''as $$select exists(select 1 from spot_private.board_posts p where p.id=pid and not p.hidden and p.expires_at>clock_timestamp()and spot_private.board_member(p.venue_id)and spot_private.board_eligible(p.author_id)and coalesce(p.post_kind,'user')='user'and(p.parent_qod_id is null or spot_private.qod_visible(p.parent_qod_id))and not exists(select 1 from public.blocks where(blocker_id=auth.uid()and blocked_id=p.author_id)or(blocker_id=p.author_id and blocked_id=auth.uid())))$$;
create function spot_private.nominal_comment_visible(cid uuid)returns boolean language sql volatile security definer set search_path=''as $$select exists(select 1 from spot_private.board_comments c where c.id=cid and not c.hidden and c.removed_at is null and spot_private.board_eligible(c.author_id)and spot_private.nominal_post_visible(c.post_id)and not exists(select 1 from public.blocks where(blocker_id=auth.uid()and blocked_id=c.author_id)or(blocker_id=c.author_id and blocked_id=auth.uid())))$$;
create or replace function spot_private.spotted_post_visible(pid uuid)returns boolean language sql volatile security definer set search_path=''as $$select spot_private.nominal_post_visible(pid)and exists(select 1 from spot_private.board_posts p where p.id=pid and not spot_private.social_pair_blocked(auth.uid(),p.author_id))$$;
create or replace function spot_private.spotted_comment_visible(cid uuid)returns boolean language sql volatile security definer set search_path=''as $$select spot_private.nominal_comment_visible(cid)and exists(select 1 from spot_private.board_comments c where c.id=cid and not spot_private.social_pair_blocked(auth.uid(),c.author_id)and spot_private.spotted_post_visible(c.post_id))$$;
create function public.spotted_block_author(content_id uuid,content_kind text,operation_id uuid)returns jsonb language plpgsql security definer set search_path=''as $$declare person uuid;prior spot_private.board_receipts;fp text;begin
 perform spot_private.board_lock();perform spot_private.photo_owner_lock(auth.uid());
 if not spot_private.spotted_ready()or not coalesce(spot_private.board_eligible(auth.uid()),false)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 if operation_id is null or content_id is null or content_kind is null or content_kind not in('post','comment')then raise exception 'BOARD_INPUT';end if;
 fp:=md5(content_kind||':'||content_id::text);select *into prior from spot_private.board_receipts where user_id=auth.uid()and board_receipts.operation_id=spotted_block_author.operation_id;
 if found then if prior.action<>'anonymous_block'or prior.fingerprint<>fp then raise exception 'BOARD_OPERATION_CONFLICT';end if;return jsonb_build_object('completed',true);end if;
 perform spot_private.spotted_rate();
 if content_kind='post'then select author_id into person from spot_private.board_posts where id=content_id and spot_private.nominal_post_visible(id);
 else select author_id into person from spot_private.board_comments where id=content_id and spot_private.nominal_comment_visible(id);end if;
 if person is not null and person<>auth.uid()then insert into spot_private.anonymous_blocks(blocker_id,author_id)values(auth.uid(),person)on conflict(blocker_id,author_id)do nothing;end if;
 insert into spot_private.board_receipts(user_id,operation_id,action,fingerprint)values(auth.uid(),operation_id,'anonymous_block',fp);
 return jsonb_build_object('completed',true);end$$;
-- Only NEW deliveries are suppressed. No invalidation, guard extension or quota
-- reset for existing requests, no change to Match/profile/photo authorization.
create function spot_private.anonymous_request_admission()returns trigger language plpgsql security definer set search_path=''as $$begin
 if exists(select 1 from spot_private.anonymous_blocks where(blocker_id=new.sender_id and author_id=new.recipient_id)or(blocker_id=new.recipient_id and author_id=new.sender_id))then return null;end if;return new;end$$;
create trigger anonymous_request_admission before insert on spot_private.board_romantic_requests for each row execute function spot_private.anonymous_request_admission();
do $$declare body text;begin
 body:=pg_get_functiondef('public.spotted_romantic_submit(uuid,text,uuid)'::regprocedure);
 body:=replace(replace(body,'spot_private.spotted_post_visible','spot_private.nominal_post_visible'),'spot_private.spotted_comment_visible','spot_private.nominal_comment_visible');execute body;
 body:=pg_get_functiondef('public.spotted_romantic_inbox()'::regprocedure);
 body:=replace(replace(body,'spot_private.spotted_post_visible','spot_private.nominal_post_visible'),'spot_private.spotted_comment_visible','spot_private.nominal_comment_visible');execute body;
 body:=pg_get_functiondef('public.board_feed(uuid,timestamp with time zone,uuid,integer)'::regprocedure);
 if position('spot_private.board_eligible(author_id)'in body)=0 then raise exception 'LEGACY_FEED_SHAPE';end if;
 execute replace(body,'spot_private.board_eligible(author_id)','spot_private.board_eligible(author_id)and not spot_private.social_pair_blocked(auth.uid(),author_id)');
 body:=pg_get_functiondef('public.board_react(uuid,text,uuid)'::regprocedure);
 execute replace(body,'or p.hidden','or spot_private.social_pair_blocked(auth.uid(),p.author_id)or p.hidden');end$$;
-- Immutable action facts; no content copies. Historical missing facts stay NULL.
alter table spot_private.board_audit add column target_type text,add column target_internal_id uuid,add column reason_code text,add column previous_state jsonb,add column new_state jsonb,add column current_status text,add column review_due_at timestamptz,add column review_outcome text;
alter table spot_private.moderation_audit add column target_type text,add column current_status text,add column review_due_at timestamptz,add column review_outcome text;
create function spot_private.moderation_action_defaults()returns trigger language plpgsql set search_path=''as $$begin
 new.current_status:=coalesce(new.current_status,'pending_review');new.review_due_at:=new.created_at+interval '30 days';
 if tg_table_name='moderation_audit'then new.target_type:='profile';end if;return new;end$$;
create trigger board_action_defaults before insert on spot_private.board_audit for each row execute function spot_private.moderation_action_defaults();
create trigger profile_action_defaults before insert on spot_private.moderation_audit for each row execute function spot_private.moderation_action_defaults();
alter function public.board_moderation_action(uuid,text,uuid,bigint,integer)rename to moderation052_prior_board_action;
do $$begin execute replace(pg_get_functiondef('public.moderation052_prior_board_action(uuid,text,uuid,bigint,integer)'::regprocedure),'board_moderation_action.','moderation052_prior_board_action.');end$$;
revoke all on function public.moderation052_prior_board_action(uuid,text,uuid,bigint,integer)from public,anon,authenticated,service_role;
create function public.board_moderation_action(target_report uuid,action text,operation_id uuid,expected_revision bigint,duration_hours integer default null)returns jsonb language plpgsql security definer set search_path=''as $$declare r spot_private.board_reports;result jsonb;old_hidden boolean;new_hidden boolean;begin
 if spot_private.moderation_role()is null then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 perform spot_private.board_lock();select *into r from spot_private.board_reports where id=target_report;
 select case when r.comment_id is null then(select hidden from spot_private.board_posts where id=r.post_id)else(select hidden from spot_private.board_comments where id=r.comment_id)end into old_hidden;
 result:=public.moderation052_prior_board_action(target_report,action,operation_id,expected_revision,duration_hours);
 select case when r.comment_id is null then(select hidden from spot_private.board_posts where id=r.post_id)else(select hidden from spot_private.board_comments where id=r.comment_id)end into new_hidden;
 update spot_private.board_audit a set target_type=case when r.comment_id is null then 'post'else 'comment'end,target_internal_id=coalesce(r.comment_id,r.post_id),content_kind=case when r.comment_id is null then 'post'else 'comment'end,comment_id=r.comment_id,reason_code=r.reason,previous_state=jsonb_build_object('report',r.state,'hidden',old_hidden),new_state=jsonb_build_object('report',(select state from spot_private.board_reports where id=r.id),'hidden',new_hidden)
 where a.operation_id=board_moderation_action.operation_id and a.actor_id=auth.uid()and a.target_type is null;return result;end$$;
-- Hold cadence is operational, not a maximum legal retention or automatic release.
alter table spot_private.safety_holds add column actor_id uuid references auth.users(id)on delete set null,add column current_status text,add column review_due_at timestamptz,add column review_outcome text;
update spot_private.safety_holds set current_status=case when released_at is null then 'active'else 'released'end,review_due_at=least(review_at,created_at+interval '30 days');
create function spot_private.moderation_hold_defaults()returns trigger language plpgsql set search_path=''as $$begin
 if tg_op='INSERT'then new.actor_id:=auth.uid();new.review_at:=least(new.review_at,new.created_at+interval '30 days');end if;
 new.review_due_at:=new.review_at;new.current_status:=case when new.released_at is not null then 'released'else coalesce(nullif(new.current_status,'released'),'active')end;return new;end$$;
create trigger moderation_hold_defaults before insert or update on spot_private.safety_holds for each row execute function spot_private.moderation_hold_defaults();
create table spot_private.moderation_reviews(operation_id uuid primary key,hold_id uuid references spot_private.safety_holds(id)on delete cascade,board_action_id uuid references spot_private.board_audit(id)on delete cascade,profile_action_id uuid references spot_private.moderation_audit(id)on delete cascade,actor_id uuid references auth.users(id)on delete set null,outcome text not null check(outcome in('keep','release','escalate')),reason_code text not null,created_at timestamptz not null default clock_timestamp(),check(num_nonnulls(hold_id,board_action_id,profile_action_id)=1));
alter table spot_private.moderation_reviews enable row level security;
revoke all on spot_private.moderation_reviews from public,anon,authenticated,service_role;
create function public.moderation_hold_report(target_report uuid,report_kind text,operation_id uuid)returns uuid language plpgsql security definer set search_path=''as $$declare reason text;assigned uuid;until_at timestamptz;cat text;prior spot_private.safety_hold_audit;begin
 if spot_private.moderation_role()is null then raise exception 'MODERATION_DENIED'using errcode='42501';end if;perform spot_private.board_lock();
 if operation_id is null or target_report is null or report_kind is null or report_kind not in('content','profile')then raise exception 'MODERATION_INPUT';end if;
 select *into prior from spot_private.safety_hold_audit a where a.operation_id=moderation_hold_report.operation_id;
 if found then if prior.actor_ref<>auth.uid()::text or not exists(select 1 from spot_private.safety_holds h where h.id=prior.hold_id and h.target=target_report::text and h.category=case when report_kind='content'then 'board_reports'else 'closed_reports'end)then raise exception 'HOLD_OPERATION_CONFLICT';end if;return prior.hold_id;end if;
 if report_kind='content'then select r.reason,r.assigned_to,r.claim_until into reason,assigned,until_at from spot_private.board_reports r where r.id=target_report;cat:='board_reports';
 elsif report_kind='profile'then select r.reason,r.assigned_to,r.claim_until into reason,assigned,until_at from spot_private.reports r where r.id=target_report;cat:='closed_reports';else raise exception 'MODERATION_INPUT';end if;
 if assigned is distinct from auth.uid()or coalesce(until_at,'-infinity')<=clock_timestamp()then raise exception 'MODERATION_CLAIM_REQUIRED';end if;
 return public.privacy_safety_hold(cat,target_report::text,'moderation:'||target_report,'MODERATION',clock_timestamp()+interval '30 days',auth.uid()::text,operation_id);
 end$$;
create function public.moderation_review(subject_kind text,subject_id uuid,outcome text,operation_id uuid)returns jsonb language plpgsql security definer set search_path=''as $$declare prior spot_private.moderation_reviews;why text;begin
 if spot_private.moderation_role()is null then raise exception 'MODERATION_DENIED'using errcode='42501';end if;
 if subject_kind is null or subject_kind not in('hold','content_action','profile_action')or subject_id is null or outcome is null or outcome not in('keep','release','escalate')or operation_id is null then raise exception 'MODERATION_INPUT';end if;
 perform spot_private.board_lock();select *into prior from spot_private.moderation_reviews where moderation_reviews.operation_id=moderation_review.operation_id;
 if found then if prior.actor_id is distinct from auth.uid()or prior.outcome<>outcome or coalesce(prior.hold_id,prior.board_action_id,prior.profile_action_id)<>subject_id or(subject_kind='hold')<>(prior.hold_id is not null)or(subject_kind='content_action')<>(prior.board_action_id is not null)then raise exception 'MODERATION_CONFLICT';end if;return jsonb_build_object('completed',true);end if;
 if subject_kind='hold'then
  select reason_code into why from spot_private.safety_holds where id=subject_id and released_at is null for update;if not found then raise exception 'MODERATION_CASE';end if;
  update spot_private.safety_holds set released_at=case when outcome='release'then clock_timestamp()end,review_at=clock_timestamp()+interval '30 days',current_status=case when outcome='escalate'then 'escalated'else 'active'end,review_outcome=outcome where id=subject_id;
 elsif subject_kind='content_action'then
  select reason_code into why from spot_private.board_audit where id=subject_id and target_type is not null for update;if not found then raise exception 'MODERATION_CASE';end if;
  update spot_private.board_audit set current_status=case when outcome='release'then 'closed'else 'pending_review'end,review_due_at=clock_timestamp()+interval '30 days',review_outcome=outcome where id=subject_id;
 else
  select reason_code into why from spot_private.moderation_audit where id=subject_id and review_due_at is not null for update;if not found then raise exception 'MODERATION_CASE';end if;
  update spot_private.moderation_audit set current_status=case when outcome='release'then 'closed'else 'pending_review'end,review_due_at=clock_timestamp()+interval '30 days',review_outcome=outcome where id=subject_id;
 end if;
 insert into spot_private.moderation_reviews(operation_id,hold_id,board_action_id,profile_action_id,actor_id,outcome,reason_code)values(operation_id,case when subject_kind='hold'then subject_id end,case when subject_kind='content_action'then subject_id end,case when subject_kind='profile_action'then subject_id end,auth.uid(),outcome,coalesce(why,'OTHER'));
 return jsonb_build_object('completed',true);end$$;
create function public.moderation_review_queue(cursor_due timestamptz default null,cursor_kind text default null,cursor_id uuid default null)returns jsonb language plpgsql stable security definer set search_path=''as $$declare items jsonb;begin
 if spot_private.moderation_role()is null then raise exception 'MODERATION_DENIED'using errcode='42501';end if;
 if num_nonnulls(cursor_due,cursor_kind,cursor_id)not in(0,3)then raise exception 'MODERATION_INPUT';end if;
 select coalesce(jsonb_agg(to_jsonb(q)order by q.review_due_at,q.kind,q.id),'[]')into items from(select *from(
 select 'hold'::text kind,id,reason_code,current_status,created_at,review_due_at,review_outcome,actor_id from spot_private.safety_holds where released_at is null
 union all select 'content_action',id,reason_code,current_status,created_at,review_due_at,review_outcome,actor_id from spot_private.board_audit where current_status='pending_review'
 union all select 'profile_action',id,reason_code,current_status,created_at,review_due_at,review_outcome,actor_id from spot_private.moderation_audit where current_status='pending_review')x where cursor_due is null or(x.review_due_at,x.kind,x.id)>(cursor_due,cursor_kind,cursor_id) order by review_due_at,kind,id limit 51)q;
 return jsonb_build_object('items',case when jsonb_array_length(items)>50 then items-50 else items end,'more',jsonb_array_length(items)>50);end$$;
create function public.moderation_review_detail(subject_kind text,subject_id uuid)returns jsonb language plpgsql stable security definer set search_path=''as $$declare text_value text;why text;action_value text;case_ref text;begin
 if spot_private.moderation_role()is null then raise exception 'MODERATION_DENIED'using errcode='42501';end if;
 if subject_kind='hold'then
  select h.reason_code,h.case_reference into why,case_ref from spot_private.safety_holds h where h.id=subject_id;
  if not found then raise exception 'MODERATION_CASE';end if;action_value:='hold';
  select e.body into text_value from spot_private.board_evidence e where e.hold_id=subject_id;
  if text_value is null then select coalesce(p.body,c.body)into text_value from spot_private.safety_holds h left join spot_private.board_reports r on h.category='board_reports'and r.id::text=h.target left join spot_private.board_posts p on p.id=r.post_id or(h.category='board_posts'and p.id::text=h.target)left join spot_private.board_comments c on c.id=r.comment_id or(h.category='board_comments'and c.id::text=h.target)where h.id=subject_id;end if;
 elsif subject_kind='content_action'then
  select a.reason_code,a.action,'report:'||a.report_id,coalesce(p.body,c.body)into why,action_value,case_ref,text_value from spot_private.board_audit a left join spot_private.board_posts p on a.target_type='post'and p.id=a.target_internal_id left join spot_private.board_comments c on a.target_type='comment'and c.id=a.target_internal_id where a.id=subject_id and a.target_type is not null;if not found then raise exception 'MODERATION_CASE';end if;
 elsif subject_kind='profile_action'then
  select a.reason_code,a.action,coalesce('report:'||a.report_id,'action:'||a.id)into why,action_value,case_ref from spot_private.moderation_audit a where a.id=subject_id;if not found then raise exception 'MODERATION_CASE';end if;
 else raise exception 'MODERATION_INPUT';end if;
 return jsonb_build_object('reason',why,'action',action_value,'case_reference',case_ref,'ugc_context',left(text_value,280));end$$;
revoke all on function public.moderation_review_detail(text,uuid)from public,anon,authenticated,service_role;
grant execute on function public.moderation_review_detail(text,uuid)to authenticated;
-- Own export only opaque block receipts; no author UUID, content graph or peer ID.
alter function public.my_rights_page(text,text,integer)rename to moderation052_prior_rights;
do $$begin execute replace(pg_get_functiondef('public.moderation052_prior_rights(text,text,integer)'::regprocedure),'my_rights_page.','moderation052_prior_rights.');end$$;
revoke all on function public.moderation052_prior_rights(text,text,integer)from public,anon,authenticated,service_role;
create function public.my_rights_page(section text,after_key text default '',page_size integer default 100)returns jsonb language plpgsql stable security definer set search_path=''as $$declare data jsonb;begin
 if section<>'anonymous_blocks'then return public.moderation052_prior_rights(section,after_key,page_size);end if;
 if auth.uid()is null or not exists(select 1 from auth.users where id=auth.uid())then raise exception 'RIGHTS_AUTH'using errcode='42501';end if;
 if after_key is null or length(after_key)>200 or page_size is null or page_size not between 1 and 100 then raise exception 'RIGHTS_INPUT';end if;
 select coalesce(jsonb_agg(jsonb_build_object('key',id::text,'data',jsonb_build_object('id',id,'created_at',created_at))order by id),'[]')into data from(select id,created_at from spot_private.anonymous_blocks where blocker_id=auth.uid()and id::text>after_key order by id limit page_size+1)x;
 return jsonb_build_object('owner_id',auth.uid(),'section',section,'items',case when jsonb_array_length(data)>page_size then data-page_size else data end,'next_key',case when jsonb_array_length(data)>page_size then data->(page_size-1)->>'key'end);end$$;
revoke all on function spot_private.social_pair_blocked(uuid,uuid),spot_private.nominal_post_visible(uuid),spot_private.nominal_comment_visible(uuid),spot_private.anonymous_request_admission(),spot_private.moderation_action_defaults(),spot_private.moderation_hold_defaults()from public,anon,authenticated,service_role;
revoke all on function public.spotted_block_author(uuid,text,uuid),public.board_moderation_action(uuid,text,uuid,bigint,integer),public.moderation_hold_report(uuid,text,uuid),public.moderation_review(text,uuid,text,uuid),public.moderation_review_queue(timestamptz,text,uuid),public.my_rights_page(text,text,integer)from public,anon,authenticated,service_role;
grant execute on function public.spotted_block_author(uuid,text,uuid),public.board_moderation_action(uuid,text,uuid,bigint,integer),public.moderation_hold_report(uuid,text,uuid),public.moderation_review(text,uuid,text,uuid),public.moderation_review_queue(timestamptz,text,uuid),public.my_rights_page(text,text,integer)to authenticated;
notify pgrst,'reload schema';commit;
