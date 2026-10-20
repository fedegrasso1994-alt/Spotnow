begin;
set local lock_timeout='5s';set local statement_timeout='60s';
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or
 (current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'ROMANTIC_STAGING_ONLY';end if;
 if exists(select 1 from spot_private.soma_v2_control where requests_enabled)then raise exception 'ROMANTIC_REQUIRES_OFF';end if;
 if exists(select 1 from spot_private.board_romantic_requests)or exists(select 1 from spot_private.board_request_attempts)then raise exception 'ROMANTIC_PREFLIGHT_REQUIRED';end if;
end$$;
alter table spot_private.board_romantic_requests add column declined_at timestamptz,add column match_id uuid references public.matches(id)on delete set null;
create index board_romantic_expiry on spot_private.board_romantic_requests(expires_at)where status='pending';
create unique index board_romantic_pending_pair on spot_private.board_romantic_requests(least(sender_id,recipient_id),greatest(sender_id,recipient_id))where status='pending';
alter table spot_private.board_request_quota add constraint romantic_daily_cap check(used<=6);
alter table spot_private.board_romantic_requests add constraint romantic_seven_days check(expires_at=created_at+interval '168 hours');

create function spot_private.romantic_ready()returns boolean language sql stable security definer set search_path=''as $$
 select coalesce((select requests_enabled from spot_private.soma_v2_control where singleton),false)
 and exists(select 1 from spot_private.privacy_environment where environment='staging');$$;
create function spot_private.romantic_write_gate()returns void language plpgsql security definer set search_path=''as $$begin
 if current_setting('transaction_isolation')<>'read committed'then raise exception 'ROMANTIC_ISOLATION'using errcode='25000';end if;
 perform spot_private.board_lock();
 if not spot_private.romantic_ready()or not coalesce(spot_private.board_eligible(auth.uid()),false)then raise exception 'ROMANTIC_ACCESS'using errcode='42501';end if;
end$$;
-- One policy shared by delivery, inbox, decisions and directional authorization.
create function spot_private.romantic_pair_allowed(sender uuid,recipient uuid)returns boolean language sql stable security definer set search_path=''as $$
 select spot_private.romantic_ready()and spot_private.board_eligible(sender)and spot_private.board_eligible(recipient)
 and spot_private.privacy_discovery_eligible(sender)and spot_private.privacy_discovery_eligible(recipient)
 and coalesce((select receive_romantic_requests from spot_private.board_preferences where user_id=recipient),true)
 and exists(select 1 from public.profiles a join public.profiles b on b.id=recipient where a.id=sender and(a.preference='ALL'or a.preference=b.gender)and(b.preference='ALL'or b.preference=a.gender))
 and not exists(select 1 from public.blocks where(blocker_id=sender and blocked_id=recipient)or(blocker_id=recipient and blocked_id=sender))
;$$;
create function spot_private.romantic_deliverable(sender uuid,recipient uuid)returns boolean language sql stable security definer set search_path=''as $$select spot_private.romantic_pair_allowed(sender,recipient)and not exists(select 1 from public.matches where user_a=least(sender,recipient)and user_b=greatest(sender,recipient));$$;
-- Lazy logical expiry; no scheduler or physical purge activated. Never extend a guard on retry.
create function spot_private.romantic_expire()returns void language plpgsql security definer set search_path=''as $$declare r record;begin
 for r in update spot_private.board_romantic_requests set status='expired',resolved_at=expires_at where status='pending'and expires_at<=clock_timestamp()returning *loop
  insert into spot_private.board_request_pair_guards(user_a,user_b,retry_not_before,purge_after)
   values(least(r.sender_id,r.recipient_id),greatest(r.sender_id,r.recipient_id),r.expires_at+interval '720 hours',r.expires_at+interval '720 hours')
   on conflict(user_a,user_b)do update set retry_not_before=greatest(board_request_pair_guards.retry_not_before,excluded.retry_not_before),purge_after=greatest(board_request_pair_guards.purge_after,excluded.purge_after);
 end loop;
end$$;
create or replace function spot_private.profile_request_authorized(viewer uuid,target uuid)returns boolean language sql stable security definer set search_path=''as $$
 select spot_private.romantic_deliverable(target,viewer)and exists(select 1 from spot_private.board_romantic_requests where recipient_id=viewer and sender_id=target and status='pending'and expires_at>statement_timestamp());$$;

create function public.spotted_romantic_settings()returns jsonb language sql stable security definer set search_path=''as $$
 select jsonb_build_object('enabled',spot_private.romantic_ready()and coalesce(spot_private.board_eligible(auth.uid()),false),
 'receive',coalesce((select receive_romantic_requests from spot_private.board_preferences where user_id=auth.uid()),true),
 'remaining',greatest(0,6-coalesce((select used from spot_private.board_request_quota where user_id=auth.uid()and day=(statement_timestamp()at time zone 'Europe/Rome')::date),0)));$$;
create function public.spotted_romantic_opt_in(receive boolean)returns void language plpgsql security definer set search_path=''as $$begin
 perform spot_private.romantic_write_gate();if receive is null then raise exception 'ROMANTIC_INPUT';end if;
 insert into spot_private.board_preferences values(auth.uid(),receive)on conflict(user_id)do update set receive_romantic_requests=excluded.receive_romantic_requests;
 -- No resurrection when opt-in is restored. No new cooldown on opt-out.
 if not receive then update spot_private.board_romantic_requests set status='invalidated',resolved_at=clock_timestamp()where recipient_id=auth.uid()and status='pending';end if;
end$$;
create function public.spotted_romantic_submit(content_id uuid,content_kind text,operation_id uuid)returns jsonb language plpgsql security definer set search_path=''as $$declare
 me uuid:=auth.uid();recipient uuid;place uuid;pid uuid;cid uuid;fp text;prior spot_private.board_request_attempts;attempt uuid;stamp timestamptz;quota_day date;charged boolean;
begin
 perform spot_private.romantic_write_gate();
 if content_id is null or operation_id is null or content_kind is null or content_kind not in('post','comment')then raise exception 'ROMANTIC_INPUT'using errcode='22023';end if;
 fp:=md5(content_kind||':'||content_id::text);
 select *into prior from spot_private.board_request_attempts a where a.sender_id=me and a.operation_id=spotted_romantic_submit.operation_id;
 if found then if prior.fingerprint<>fp then raise exception 'ROMANTIC_OPERATION_CONFLICT'using errcode='22023';end if;return jsonb_build_object('submitted',true);end if;
 if not spot_private.privacy_discovery_eligible(me)then raise exception 'ROMANTIC_ACCESS'using errcode='42501';end if;
 if content_kind='post'then
  select p.author_id,p.venue_id,p.id into recipient,place,pid from spot_private.board_posts p where p.id=content_id and coalesce(p.post_kind,'user')='user'and spot_private.spotted_post_visible(p.id);
 else
  select c.author_id,p.venue_id,c.post_id,c.id into recipient,place,pid,cid from spot_private.board_comments c join spot_private.board_posts p on p.id=c.post_id where c.id=content_id and spot_private.spotted_comment_visible(c.id);
 end if;
 if recipient is null or recipient=me then raise exception 'ROMANTIC_CONTENT'using errcode='42501';end if;
 stamp:=clock_timestamp();quota_day:=(stamp at time zone 'Europe/Rome')::date;
 -- Charge before any private delivery decision, including pending/guard/Match suppression.
 insert into spot_private.board_request_quota values(me,quota_day,1)on conflict(user_id,day)do update set used=board_request_quota.used+1 where board_request_quota.used<6;
 charged:=found;
 if(select count(*)from spot_private.board_request_attempts where sender_id=me and created_at>stamp-interval '1 minute')>=120 then raise exception 'ROMANTIC_RATE';end if;
 insert into spot_private.board_request_attempts(sender_id,operation_id,fingerprint,origin_post_id,origin_comment_id,state,purge_after)
 values(me,operation_id,fp,case when cid is null then pid end,cid,'completed',stamp+interval '168 hours')returning id into attempt;
 perform spot_private.romantic_expire();
 -- A retry, opposite request, another content item or an existing Match never auto-accepts.
 insert into spot_private.board_romantic_requests(attempt_id,sender_id,recipient_id,venue_id,origin_kind,origin_post_id,origin_comment_id,created_at,expires_at,purge_after)
 select attempt,me,recipient,place,content_kind,case when cid is null then pid end,cid,stamp,stamp+interval '168 hours',stamp+interval '168 hours'
 where charged and spot_private.romantic_deliverable(me,recipient)
 and not exists(select 1 from spot_private.board_request_pair_guards where user_a=least(me,recipient)and user_b=greatest(me,recipient)and retry_not_before>stamp)
 and not exists(select 1 from spot_private.board_romantic_requests where least(sender_id,recipient_id)=least(me,recipient)and greatest(sender_id,recipient_id)=greatest(me,recipient)and status='pending');
 return jsonb_build_object('submitted',true);
end$$;
create function public.spotted_romantic_inbox()returns jsonb language plpgsql security definer set search_path=''as $$declare items jsonb;begin
 perform spot_private.romantic_write_gate();perform spot_private.romantic_expire();
 select coalesce(jsonb_agg(j order by created_at desc,id desc),'[]'::jsonb)into items from(
 select r.id,r.created_at,jsonb_build_object('id',r.id,'sender',(select to_jsonb(p)from public.authorized_profile(r.sender_id)p),
 'context',case when r.origin_kind='post'and spot_private.spotted_post_visible(r.origin_post_id)then(select body from spot_private.board_posts where id=r.origin_post_id)
 when r.origin_kind='comment'and spot_private.spotted_comment_visible(r.origin_comment_id)then(select body from spot_private.board_comments where id=r.origin_comment_id)
 else 'Una persona vorrebbe conoscerti tramite SPOTTED.'end)j
 from spot_private.board_romantic_requests r where r.recipient_id=auth.uid()and r.status='pending'and r.expires_at>clock_timestamp()and spot_private.romantic_deliverable(r.sender_id,r.recipient_id)
 order by r.created_at desc,r.id desc limit 50)q;
 return jsonb_build_object('items',items);
end$$;
create function public.spotted_romantic_decide(request_id uuid,accept boolean)returns jsonb language plpgsql security definer set search_path=''as $$declare r spot_private.board_romantic_requests;stamp timestamptz;matched uuid;begin
 perform spot_private.romantic_write_gate();perform spot_private.romantic_expire();
 if accept is null then raise exception 'ROMANTIC_INPUT';end if;
 select *into r from spot_private.board_romantic_requests where id=request_id and recipient_id=auth.uid()for update;
 if not found then raise exception 'ROMANTIC_UNAVAILABLE'using errcode='42501';end if;
 if r.status='accepted'and accept and r.match_id is not null and spot_private.can_use_match(r.match_id)then return jsonb_build_object('match_id',r.match_id);end if;
 if r.status='declined'and not accept then return jsonb_build_object('match_id',null);end if;
 if r.status<>'pending'or not spot_private.romantic_pair_allowed(r.sender_id,r.recipient_id)then raise exception 'ROMANTIC_UNAVAILABLE'using errcode='42501';end if;
 stamp:=clock_timestamp();
 if accept then
  insert into public.matches(user_a,user_b,venue_id)values(least(r.sender_id,r.recipient_id),greatest(r.sender_id,r.recipient_id),r.venue_id)on conflict(user_a,user_b)do nothing;
  select id into matched from public.matches where user_a=least(r.sender_id,r.recipient_id)and user_b=greatest(r.sender_id,r.recipient_id);
  update spot_private.board_romantic_requests set status='accepted',resolved_at=stamp,match_id=matched where id=r.id;
 else
  update spot_private.board_romantic_requests set status='declined',declined_at=stamp,resolved_at=stamp where id=r.id;
  insert into spot_private.board_request_pair_guards values(least(r.sender_id,r.recipient_id),greatest(r.sender_id,r.recipient_id),stamp+interval '720 hours',stamp+interval '720 hours')
   on conflict(user_a,user_b)do update set retry_not_before=greatest(board_request_pair_guards.retry_not_before,excluded.retry_not_before),purge_after=greatest(board_request_pair_guards.purge_after,excluded.purge_after);
 end if;
 return jsonb_build_object('match_id',matched);
end$$;
-- Changes to safety/eligibility never publish status to the sender. Opt-out additionally
-- persists invalidation, so subsequent opt-in cannot resurrect delivered requests.
create function spot_private.romantic_safety_change()returns trigger language plpgsql security definer set search_path=''as $$declare people uuid[];begin
 if not spot_private.romantic_ready()then return null;end if;
 if tg_table_name='blocks'then people:=array[new.blocker_id,new.blocked_id];elsif tg_table_name in('users','profiles')then people:=array[new.id];else people:=array[new.user_id];end if;
 update spot_private.board_romantic_requests r set status='invalidated',resolved_at=clock_timestamp()
 where r.status='pending'and(r.sender_id=any(people)or r.recipient_id=any(people))and not spot_private.romantic_deliverable(r.sender_id,r.recipient_id);
 return null;
end$$;
create trigger romantic_on_block after insert on public.blocks for each row execute function spot_private.romantic_safety_change();
create trigger romantic_on_suspension after insert or update on spot_private.suspensions for each row execute function spot_private.romantic_safety_change();
create trigger romantic_on_consent after insert or update on spot_private.consent_state for each row execute function spot_private.romantic_safety_change();
create trigger romantic_on_age after insert or update on spot_private.account_eligibility for each row execute function spot_private.romantic_safety_change();
-- Serialize source changes before row locks, matching board/delete/retention ordering.
create function spot_private.romantic_source_lock()returns trigger language plpgsql security definer set search_path=''as $$begin perform spot_private.board_lock();return null;end$$;
create trigger romantic_block_lock before insert on public.blocks for each statement execute function spot_private.romantic_source_lock();
create trigger romantic_suspension_lock before insert or update on spot_private.suspensions for each statement execute function spot_private.romantic_source_lock();
create trigger romantic_consent_lock before insert or update on spot_private.consent_state for each statement execute function spot_private.romantic_source_lock();
create trigger romantic_age_lock before insert or update on spot_private.account_eligibility for each statement execute function spot_private.romantic_source_lock();
create trigger romantic_preferences_lock before insert or update on spot_private.board_preferences for each statement execute function spot_private.romantic_source_lock();
create trigger romantic_on_preferences after insert or update on spot_private.board_preferences for each row execute function spot_private.romantic_safety_change();
create trigger romantic_profile_lock before update of gender,preference on public.profiles for each statement execute function spot_private.romantic_source_lock();
create trigger romantic_on_profile after update of gender,preference on public.profiles for each row execute function spot_private.romantic_safety_change();
create trigger romantic_auth_lock before update of banned_until on auth.users for each statement execute function spot_private.romantic_source_lock();
create trigger romantic_on_auth after update of banned_until on auth.users for each row execute function spot_private.romantic_safety_change();
-- Static content-kind eligibility only. Never encode author compatibility/Match/opt-out in the feed.
do $$declare body text;begin
 body:=pg_get_functiondef('spot_private.spotted_post_json(spot_private.board_posts)'::regprocedure);
 if strpos(body,'''id'',p.id,''text'',p.body,')=0 then raise exception 'ROMANTIC_SOCIAL_DEPENDENCY';end if;
 execute replace(body,'''id'',p.id,''text'',p.body,','''romantic_content'',spot_private.romantic_ready()and coalesce(p.post_kind,''user'')=''user'',''id'',p.id,''text'',p.body,');
 body:=pg_get_functiondef('spot_private.spotted_comment_json(spot_private.board_comments)'::regprocedure);
 if strpos(body,'''id'',c.id,''text'',c.body,')=0 then raise exception 'ROMANTIC_COMMENT_DEPENDENCY';end if;
 execute replace(body,'''id'',c.id,''text'',c.body,','''romantic_content'',spot_private.romantic_ready(),''id'',c.id,''text'',c.body,');
end$$;
-- Existing report_profile and MODERATION handle sender safety reports. No new console.
do $$declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='spot_private'and p.proname like 'romantic_%'loop execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);end loop;
end$$;
revoke all on function public.spotted_romantic_settings(),public.spotted_romantic_opt_in(boolean),public.spotted_romantic_submit(uuid,text,uuid),public.spotted_romantic_inbox(),public.spotted_romantic_decide(uuid,boolean)from public,anon,authenticated,service_role;
grant execute on function public.spotted_romantic_settings(),public.spotted_romantic_opt_in(boolean),public.spotted_romantic_submit(uuid,text,uuid),public.spotted_romantic_inbox(),public.spotted_romantic_decide(uuid,boolean)to authenticated;
notify pgrst,'reload schema';
commit;
