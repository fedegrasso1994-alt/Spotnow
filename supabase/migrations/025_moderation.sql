begin;
do $$begin if not exists(select 1 from spot_private.privacy_environment where environment='staging') then raise exception 'MODERATION_STAGING_ONLY';end if;end$$;
create table spot_private.moderation_roles(user_id uuid primary key references auth.users(id) on delete cascade,role text not null check(role in('MODERATOR','ADMIN')),active boolean not null default true,granted_by uuid references auth.users(id) on delete set null,changed_at timestamptz not null default clock_timestamp());
create table spot_private.moderation_role_events(operation_id uuid primary key,actor_id uuid references auth.users(id) on delete cascade,target_id uuid references auth.users(id) on delete cascade,previous_role text,new_role text,created_at timestamptz not null default clock_timestamp());
alter table spot_private.reports add column queue_state text not null default 'open' check(queue_state in('open','under_review','closed')),add column revision bigint not null default 0,add column assigned_to uuid references auth.users(id) on delete set null,add column claim_until timestamptz;
update spot_private.reports set queue_state='closed' where closed_at is not null;
create index moderation_queue_cursor on spot_private.reports(queue_state,created_at,id);
alter table spot_private.suspensions add column kind text not null default 'suspend' check(kind in('suspend','ban')),add column until_at timestamptz;
alter table spot_private.moderation_audit add column operation_id uuid unique,add column target_id uuid references public.profiles(id) on delete cascade,add column reason_code text,add column previous_state jsonb,add column new_state jsonb,add column request jsonb;
alter table spot_private.moderation_audit alter column report_id drop not null;
alter table spot_private.retention_runs add column moderation_counts jsonb not null default '{}'::jsonb;
do $$declare t text;begin foreach t in array array['moderation_roles','moderation_role_events']loop execute format('alter table spot_private.%I enable row level security',t);execute format('revoke all on spot_private.%I from public,anon,authenticated',t);end loop;end$$;
create function spot_private.moderation_role()returns text language sql stable security definer set search_path='' as $$
 select r.role from spot_private.moderation_roles r join auth.users u on u.id=r.user_id where r.user_id=auth.uid() and r.active and not u.is_anonymous and coalesce((to_jsonb(u)->>'banned_until')::timestamptz,'-infinity'::timestamptz)<=now() and exists(select 1 from auth.mfa_factors f where f.user_id=u.id and f.status='verified') and coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'aal','')='aal2';$$;
create or replace function public.is_moderator()returns boolean language sql stable security definer set search_path='' as $$select spot_private.moderation_role() in('MODERATOR','ADMIN')$$;
create function public.moderation_role_set(target_user uuid,new_role text,operation_id uuid)returns void language plpgsql security definer set search_path='' as $$declare prior spot_private.moderation_role_events;old text;begin
 if spot_private.moderation_role() is distinct from 'ADMIN' then raise exception 'MODERATION_DENIED' using errcode='42501';end if;
 if target_user is null or operation_id is null or new_role is null or new_role not in('MODERATOR','ADMIN','REVOKED') then raise exception 'MODERATION_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(operation_id::text,25));select * into prior from spot_private.moderation_role_events e where e.operation_id=moderation_role_set.operation_id;
 if found then if prior.actor_id<>auth.uid() or prior.target_id<>target_user or prior.new_role<>new_role then raise exception 'MODERATION_CONFLICT';end if;return;end if;
 perform pg_advisory_xact_lock(hashtextextended('moderation-roles',25));
 if target_user=auth.uid() then raise exception 'MODERATION_SELF_ROLE';end if;
 select role into old from spot_private.moderation_roles where user_id=target_user and active;
 if new_role='REVOKED' then update spot_private.moderation_roles set active=false,changed_at=clock_timestamp(),granted_by=auth.uid() where user_id=target_user;
 else insert into spot_private.moderation_roles(user_id,role,granted_by)values(target_user,new_role,auth.uid())on conflict(user_id)do update set role=excluded.role,active=true,granted_by=excluded.granted_by,changed_at=clock_timestamp();end if;
 insert into spot_private.moderation_role_events values(operation_id,auth.uid(),target_user,old,new_role,clock_timestamp());end$$;
create function public.moderation_queue(filter text default 'open',cursor_time timestamptz default null,cursor_id uuid default null,page_size integer default 50)returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if not coalesce(public.is_moderator(),false) then raise exception 'MODERATION_DENIED' using errcode='42501';end if;
 if filter is null or filter not in('all','open','under_review','closed') or page_size is null or page_size not between 1 and 100 or (cursor_time is null)<>(cursor_id is null) then raise exception 'MODERATION_INPUT';end if;
 select coalesce(jsonb_agg(to_jsonb(q)order by created_at,id),'[]')into result from(select r.id,r.target_id,r.reason,r.details,r.status,r.queue_state,r.revision,r.created_at,r.closed_at,r.assigned_to,r.claim_until,p.name target_name,
 coalesce((select s.kind from spot_private.suspensions s where s.user_id=r.target_id and s.revoked_at is null and(s.until_at is null or s.until_at>now())),'active')account_state
 from spot_private.reports r join public.profiles p on p.id=r.target_id where (filter='all' or r.queue_state=filter)and(cursor_time is null or(r.created_at,r.id)>(cursor_time,cursor_id))order by r.created_at,r.id limit page_size+1)q;
 return jsonb_build_object('staff_role',spot_private.moderation_role(),'items',case when jsonb_array_length(result)>page_size then result-page_size else result end,'more',jsonb_array_length(result)>page_size);
end$$;
create function public.moderation_action(report_id uuid,action text,reason_code text,operation_id uuid,expected_revision bigint,note text default '',duration_hours integer default null)returns jsonb language plpgsql security definer set search_path='' as $$
declare r spot_private.reports;prior spot_private.moderation_audit;args jsonb;old jsonb;after_state jsonb;role text:=spot_private.moderation_role();result jsonb;
begin
 if role is null then raise exception 'MODERATION_DENIED' using errcode='42501';end if;
 if action is null or action not in('claim','review','dismiss','warn','suspend','ban','release','reopen') or operation_id is null or expected_revision is null or reason_code is null or reason_code not in('HARASSMENT','FAKE_PROFILE','UNDERAGE','INAPPROPRIATE','OTHER','APPEAL') or note is null or length(note)>200 or (action='suspend' and(duration_hours is null or duration_hours not between 1 and 720)) or(action<>'suspend' and duration_hours is not null) then raise exception 'MODERATION_INPUT';end if;
 if action in('ban','release','reopen') and role<>'ADMIN' then raise exception 'MODERATION_ADMIN_REQUIRED' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('privacy-retention',23));perform pg_advisory_xact_lock(hashtextextended(operation_id::text,25));
 args:=jsonb_build_object('report',report_id,'action',action,'reason',reason_code,'revision',expected_revision,'note',note,'hours',duration_hours);
 select * into prior from spot_private.moderation_audit a where a.operation_id=moderation_action.operation_id;
 if found then if prior.actor_id<>auth.uid() or (prior.request||jsonb_build_object('note',prior.note))<>args then raise exception 'MODERATION_CONFLICT';end if;return prior.new_state;end if;
 select * into r from spot_private.reports where id=report_id for update;if not found then raise exception 'MODERATION_REPORT';end if;
 perform spot_private.photo_owner_lock(r.target_id);
 if r.revision<>expected_revision then raise exception 'MODERATION_STALE';end if;
 if action not in('reopen','release') and r.queue_state='closed' then raise exception 'MODERATION_CLOSED';end if;
 if r.assigned_to is not null and r.assigned_to<>auth.uid() and r.claim_until>clock_timestamp() then raise exception 'MODERATION_CLAIMED';end if;
 old:=jsonb_build_object('queue',r.queue_state,'revision',r.revision,'account',coalesce((select kind from spot_private.suspensions where user_id=r.target_id and revoked_at is null and(until_at is null or until_at>now())),'active'));
 if action='claim' then update spot_private.reports set queue_state='under_review',assigned_to=auth.uid(),claim_until=clock_timestamp()+interval '15 minutes',revision=revision+1 where id=report_id;
 else
  if action='suspend' and exists(select 1 from spot_private.suspensions where user_id=r.target_id and kind='ban' and revoked_at is null) then raise exception 'MODERATION_BAN_RELEASE_REQUIRED';end if;
  if action in('ban','suspend') then
   insert into spot_private.suspensions(user_id,reason,kind,until_at)values(r.target_id,reason_code,action,case when action='suspend' then clock_timestamp()+make_interval(hours=>duration_hours)end)on conflict(user_id)do update set reason=excluded.reason,kind=excluded.kind,until_at=excluded.until_at,revoked_at=null,created_at=clock_timestamp();
  elsif action='release' then update spot_private.suspensions set revoked_at=clock_timestamp() where user_id=r.target_id and revoked_at is null;end if;
  update spot_private.reports set queue_state=case when action='reopen' then 'open' else 'closed' end,status=case when action='dismiss' then 'dismissed' when action='reopen' then 'pending' else 'reviewed' end,closed_at=case when action='reopen' then null else clock_timestamp()end,reviewed_at=clock_timestamp(),assigned_to=null,claim_until=null,revision=revision+1 where id=report_id;
 end if;
 select jsonb_build_object('queue',queue_state,'revision',revision,'account',coalesce((select kind from spot_private.suspensions where user_id=r.target_id and revoked_at is null and(until_at is null or until_at>now())),'active'))into after_state from spot_private.reports where id=report_id;
 insert into spot_private.moderation_audit(actor_id,report_id,action,note,operation_id,target_id,reason_code,previous_state,new_state,request)values(auth.uid(),report_id,action,note,operation_id,r.target_id,reason_code,old,after_state,args-'note');
 return after_state;
end$$;
create function public.moderation_release(target_user uuid,reason_code text,operation_id uuid,note text default '')returns jsonb language plpgsql security definer set search_path='' as $$
declare prior spot_private.moderation_audit;args jsonb;before_state jsonb;after_state jsonb:=jsonb_build_object('account','active');begin
 if spot_private.moderation_role() is distinct from 'ADMIN'then raise exception 'MODERATION_ADMIN_REQUIRED'using errcode='42501';end if;
 if target_user is null or operation_id is null or reason_code is null or reason_code not in('APPEAL','OTHER')or note is null or length(note)>200 then raise exception 'MODERATION_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended('privacy-retention',23));perform pg_advisory_xact_lock(hashtextextended(operation_id::text,25));
 args:=jsonb_build_object('target',target_user,'action','release_target','reason',reason_code,'note',note);
 select * into prior from spot_private.moderation_audit a where a.operation_id=moderation_release.operation_id;
 if found then if prior.actor_id<>auth.uid()or(prior.request||jsonb_build_object('note',prior.note))<>args then raise exception 'MODERATION_CONFLICT';end if;return prior.new_state;end if;
 perform spot_private.photo_owner_lock(target_user);perform 1 from public.profiles where id=target_user for update;if not found then raise exception 'MODERATION_TARGET';end if;
 before_state:=jsonb_build_object('account',coalesce((select kind from spot_private.suspensions where user_id=target_user and revoked_at is null and(until_at is null or until_at>now())),'active'));
 update spot_private.suspensions set revoked_at=clock_timestamp()where user_id=target_user and revoked_at is null;
 insert into spot_private.moderation_audit(actor_id,report_id,action,note,operation_id,target_id,reason_code,previous_state,new_state,request)values(auth.uid(),null,'release',note,operation_id,target_user,reason_code,before_state,after_state,args-'note');return after_state;
end$$;
revoke all on function public.moderation_release(uuid,text,uuid,text)from public,anon;grant execute on function public.moderation_release(uuid,text,uuid,text)to authenticated;
-- Replace active-suspension predicates only in the known prior gates, preserving other logic.
do $$declare f record;def text;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','spot_private') and p.prokind='f' and p.proname not in('moderation_action','moderation_queue','moderation_release') and p.prosrc like '%spot_private.suspensions%' and p.prosrc like '%revoked_at is null%' loop
  def:=pg_get_functiondef(f.oid);def:=replace(def,'s.revoked_at is null','s.revoked_at is null and (s.until_at is null or s.until_at>now())');
  if def not like '%s.until_at%' then def:=replace(def,'revoked_at is null','revoked_at is null and (until_at is null or until_at>now())');end if;
  execute def;
 end loop;
end$$;
create function public.my_moderation_notice()returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('restricted',exists(select 1 from spot_private.suspensions s where s.user_id=auth.uid() and s.revoked_at is null and(s.until_at is null or s.until_at>now())),'warning',(select jsonb_build_object('reason_code',a.reason_code,'at',a.created_at)from spot_private.moderation_audit a where a.target_id=auth.uid() and a.action='warn'order by a.created_at desc,a.id limit 1))where exists(select 1 from auth.users where id=auth.uid());$$;
revoke all on function public.my_moderation_notice()from public,anon;grant execute on function public.my_moderation_notice()to authenticated;
-- Role audit follows the configurable technical metadata retention, under the existing OFF-by-default job.
alter function public.privacy_retention_run(text,uuid,boolean)rename to moderation_prior_retention_run;
do $$begin execute replace(pg_get_functiondef('public.moderation_prior_retention_run(text,uuid,boolean)'::regprocedure),'privacy_retention_run.','moderation_prior_retention_run.');end$$;
revoke all on function public.moderation_prior_retention_run(text,uuid,boolean)from public,anon,authenticated,service_role;
create function public.privacy_retention_run(category text,operation_id uuid,dry_run boolean default true)returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;counts jsonb:='{}';eligible bigint;removed bigint:=0;begin
 result:=public.moderation_prior_retention_run(category,operation_id,dry_run);
 if coalesce((result->>'replay')::boolean,false)then select moderation_counts into counts from spot_private.retention_runs r where r.operation_id=privacy_retention_run.operation_id;return result||jsonb_build_object('moderation_counts',counts);end if;
 if not coalesce((result->>'paused')::boolean,false)then
  if category='privacy_operation_metadata'then
   select count(*)into eligible from spot_private.moderation_role_events e cross join spot_private.retention_policies p where p.category=privacy_retention_run.category and e.created_at<now()-p.duration;
   if not dry_run then delete from spot_private.moderation_role_events e using spot_private.retention_policies p where p.category=privacy_retention_run.category and e.created_at<now()-p.duration;get diagnostics removed=row_count;end if;
   counts:=jsonb_build_object('role_events_candidates',eligible,'role_events_purged',removed);
  elsif category='closed_reports'then
   select count(*)into eligible from spot_private.moderation_audit a cross join spot_private.retention_policies p where p.category=privacy_retention_run.category and a.report_id is null and a.created_at<now()-p.duration and not spot_private.retention_held('moderation_actions',a.id::text) and not exists(select 1 from spot_private.reports r where r.target_id=a.target_id and r.closed_at is null)and not exists(select 1 from spot_private.suspensions s where s.user_id=a.target_id and s.revoked_at is null and(s.until_at is null or s.until_at>now()));
   if not dry_run then delete from spot_private.moderation_audit a using spot_private.retention_policies p where p.category=privacy_retention_run.category and a.report_id is null and a.created_at<now()-p.duration and not spot_private.retention_held('moderation_actions',a.id::text)and not exists(select 1 from spot_private.reports r where r.target_id=a.target_id and r.closed_at is null)and not exists(select 1 from spot_private.suspensions s where s.user_id=a.target_id and s.revoked_at is null and(s.until_at is null or s.until_at>now()));get diagnostics removed=row_count;end if;
   counts:=jsonb_build_object('standalone_actions_candidates',eligible,'standalone_actions_purged',removed);
  end if;
  update spot_private.retention_runs r set moderation_counts=counts where r.operation_id=privacy_retention_run.operation_id;
 end if;return result||jsonb_build_object('moderation_counts',counts);
end$$;
revoke all on function public.privacy_retention_run(text,uuid,boolean)from public,anon,authenticated;grant execute on function public.privacy_retention_run(text,uuid,boolean)to service_role;
-- Explicit held standalone actions preserve only the existing categorical safety evidence shape.
alter function public.prepare_account_deletion(uuid)rename to moderation_prior_prepare_account_deletion;
revoke all on function public.moderation_prior_prepare_account_deletion(uuid)from public,anon,authenticated,service_role;
create function public.prepare_account_deletion(target_user uuid)returns void language plpgsql security definer set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtextextended('privacy-retention',23));perform spot_private.photo_owner_lock(target_user);
 insert into spot_private.safety_evidence(hold_id,report_reason,report_status)
 select h.id,lower(a.reason_code),'reviewed'from spot_private.safety_holds h join spot_private.moderation_audit a on h.target=a.id::text where h.category='moderation_actions'and h.released_at is null and target_user in(a.actor_id,a.target_id)on conflict(hold_id)do nothing;
 perform public.moderation_prior_prepare_account_deletion(target_user);
end$$;
revoke all on function public.prepare_account_deletion(uuid)from public,anon,authenticated;grant execute on function public.prepare_account_deletion(uuid)to service_role;
-- Dedicated staff principals do not inherit normal discovery/chat/photo-upload privileges.
do $$declare f text;def text;begin foreach f in array array['spot_private.has_account()','spot_private.privacy_discovery_eligible(uuid)','spot_private.photo_account_active(uuid)']loop
 def:=pg_get_functiondef(f::regprocedure);
 if f='spot_private.has_account()' then def:=replace(def,'select exists(','select not exists(select 1 from spot_private.moderation_roles where user_id=auth.uid() and active) and exists(');
 elsif f='spot_private.privacy_discovery_eligible(uuid)'then def:=replace(def,'select spot_private.age_eligible(person)','select not exists(select 1 from spot_private.moderation_roles where user_id=person and active) and spot_private.age_eligible(person)');
 else def:=replace(def,'select spot_private.age_eligible(target)','select not exists(select 1 from spot_private.moderation_roles where user_id=target and active) and spot_private.age_eligible(target)');end if;
 execute def;
end loop;end$$;
-- No privilege path remains through old moderation writers/queue or legacy membership.
revoke all on function public.moderation_reports(),public.moderate_report(uuid,text,text)from public,anon,authenticated,service_role;
revoke all on function spot_private.moderation_role()from public,anon,authenticated;
revoke all on function public.moderation_role_set(uuid,text,uuid),public.moderation_queue(text,timestamptz,uuid,integer),public.moderation_action(uuid,text,text,uuid,bigint,text,integer)from public,anon;
grant execute on function public.moderation_role_set(uuid,text,uuid),public.moderation_queue(text,timestamptz,uuid,integer),public.moderation_action(uuid,text,text,uuid,bigint,text,integer)to authenticated;
notify pgrst,'reload schema';commit;
