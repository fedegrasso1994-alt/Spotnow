begin;
-- Design defaults, OFF. Not a legal retention policy or a production activation.
create table spot_private.retention_policies(category text primary key,duration interval not null check(duration>interval '0'),enabled boolean not null default false,version bigint not null default 1,validation text not null default 'DESIGN_ONLY',batch_size integer not null default 100 check(batch_size between 1 and 500));
insert into spot_private.retention_policies(category,duration)values('checkins',interval '24 hours'),('interests',interval '90 days'),('empty_matches',interval '90 days'),('inactive_chats',interval '12 months'),('closed_reports',interval '180 days'),('diagnostic_logs',interval '7 days'),('security_logs',interval '30 days'),('technical_receipts',interval '7 days'),('released_safety_metadata',interval '180 days');
create table spot_private.retention_control(singleton boolean primary key check(singleton),paused boolean not null default true);
insert into spot_private.retention_control values(true,true);
create table spot_private.safety_holds(id uuid primary key default gen_random_uuid(),category text not null,target text not null,case_reference text not null,reason_code text not null check(reason_code in('MODERATION','INCIDENT','ABUSE','APPEAL')),created_at timestamptz not null default clock_timestamp(),review_at timestamptz not null,released_at timestamptz,check(review_at>created_at));
create index safety_hold_target on spot_private.safety_holds(category,target)where released_at is null;
create table spot_private.safety_hold_audit(id uuid primary key default gen_random_uuid(),hold_id uuid not null,request_fingerprint text not null,operation_id uuid unique not null,action text not null,actor_ref text not null,created_at timestamptz not null default clock_timestamp());
create table spot_private.retention_runs(operation_id uuid primary key,category text not null,policy_version bigint not null,dry_run boolean not null,candidates integer not null default 0,purged integer not null default 0,completed_at timestamptz not null default clock_timestamp());
create table spot_private.privacy_logs(id uuid primary key default gen_random_uuid(),category text not null check(category in('diagnostic_logs','security_logs')),code text not null check(code ~ '^[A-Z0-9_]{1,64}$'),created_at timestamptz not null default clock_timestamp());
alter table spot_private.reports add column closed_at timestamptz;
-- Do not infer closure from reviewed_at. All historical reports require explicit review.
do $$declare t text;begin foreach t in array array['retention_policies','retention_control','safety_holds','safety_hold_audit','retention_runs','privacy_logs']loop execute format('alter table spot_private.%I enable row level security',t);execute format('revoke all on spot_private.%I from public,anon,authenticated',t);end loop;end $$;
create index interests_retention on spot_private.interests(created_at);
create index matches_empty_retention on public.matches(created_at) where first_message_at is null;
create index reports_closed_retention on spot_private.reports(closed_at)where closed_at is not null;
create index privacy_logs_due on spot_private.privacy_logs(category,created_at);
create function spot_private.retention_pair_lock(a uuid,b uuid)returns void language plpgsql set search_path='' as $$begin
 perform spot_private.photo_owner_lock(least(a,b));perform spot_private.photo_owner_lock(greatest(a,b));
end $$;
create function spot_private.retention_held(category text,target text)returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from spot_private.safety_holds h where h.category=retention_held.category and h.target=retention_held.target and h.released_at is null);
$$;
-- Fixed allowlist, no arbitrary relation/SQL input from a client.
create function spot_private.retention_candidates(category text)returns table(target text)language plpgsql stable security definer set search_path='' as $$
declare rule spot_private.retention_policies;
begin
 select * into rule from spot_private.retention_policies where retention_policies.category=retention_candidates.category;
 if not found then raise exception 'RETENTION_CATEGORY';end if;
 if category='checkins' then
 return query select c.user_id::text from public.checkins c where c.expires_at<=now() and not spot_private.retention_held(category,c.user_id::text)order by c.expires_at,c.user_id limit rule.batch_size;
 elsif category='interests' then
 return query select i.sender_id::text||'/'||i.recipient_id::text||'/'||i.venue_id::text from spot_private.interests i where i.created_at<=now()-rule.duration
 and not exists(select 1 from spot_private.interests r where r.sender_id=i.recipient_id and r.recipient_id=i.sender_id and r.venue_id=i.venue_id)
 and not exists(select 1 from public.matches m where m.user_a=least(i.sender_id,i.recipient_id) and m.user_b=greatest(i.sender_id,i.recipient_id))
 and not spot_private.retention_held(category,i.sender_id::text||'/'||i.recipient_id::text||'/'||i.venue_id::text)order by i.created_at limit rule.batch_size;
 elsif category in('empty_matches','inactive_chats') then
 return query select m.id::text from public.matches m where
 (category='empty_matches' and m.created_at<=now()-rule.duration and m.first_message_at is null and not exists(select 1 from public.messages x where x.match_id=m.id)
 or category='inactive_chats' and exists(select 1 from public.messages x where x.match_id=m.id) and (select max(x.created_at) from public.messages x where x.match_id=m.id)<=now()-rule.duration)
 and not spot_private.retention_held(category,m.id::text)
 and not spot_private.retention_held('matches',m.id::text)
 and not exists(select 1 from spot_private.reports r where r.closed_at is null and (r.target_id in(m.user_a,m.user_b) or r.reporter_id in(m.user_a,m.user_b)))
 order by m.created_at limit rule.batch_size;
 elsif category='closed_reports' then
 return query select r.id::text from spot_private.reports r where r.closed_at<=now()-rule.duration and r.status<>'pending' and not spot_private.retention_held(category,r.id::text)
 and not exists(select 1 from spot_private.suspensions s where s.user_id=r.target_id and s.revoked_at is null)order by r.closed_at limit rule.batch_size;
 elsif category='technical_receipts' then
 return query select r.operation_id::text from spot_private.retention_runs r where r.completed_at<=now()-rule.duration order by r.completed_at limit rule.batch_size;
 elsif category='released_safety_metadata' then
 return query select h.id::text from spot_private.safety_holds h where h.released_at<=now()-rule.duration order by h.released_at limit rule.batch_size;
 else
 return query select l.id::text from spot_private.privacy_logs l where l.category=retention_candidates.category and l.created_at<=now()-rule.duration and not spot_private.retention_held(category,l.id::text)order by l.created_at limit rule.batch_size;
 end if;
end $$;
create function public.privacy_retention_run(category text,operation_id uuid,dry_run boolean default true)returns jsonb language plpgsql security definer set search_path='' as $$
declare rule spot_private.retention_policies;previous spot_private.retention_runs;c record;parts text[];m public.matches;n integer:=0;removed integer:=0;changed integer;
begin
 if operation_id is null or dry_run is null then raise exception 'RETENTION_INPUT';end if;
 -- Category lock coordinates workers, hold actions, policy changes and pause. No long-lived stale claims.
 perform pg_advisory_xact_lock(hashtextextended('privacy-retention',23));
 select * into previous from spot_private.retention_runs where retention_runs.operation_id=privacy_retention_run.operation_id;
 if found then
 if previous.category<>category or previous.dry_run<>dry_run then raise exception 'RETENTION_OPERATION_CONFLICT';end if;
 return jsonb_build_object('category',category,'candidates',previous.candidates,'purged',previous.purged,'replay',true);
 end if;
 select * into rule from spot_private.retention_policies where retention_policies.category=privacy_retention_run.category;
 if not found then raise exception 'RETENTION_CATEGORY';end if;
 if not dry_run and ((select paused from spot_private.retention_control) or not rule.enabled) then return jsonb_build_object('paused',true,'purged',0);end if;
 if not dry_run and rule.validation<>'VALIDATED' and not exists(select 1 from spot_private.privacy_environment where environment='staging') then raise exception 'RETENTION_NOT_VALIDATED';end if;
 for c in select * from spot_private.retention_candidates(category)loop
 n:=n+1;if dry_run then continue;end if;
 if category='checkins' then perform spot_private.photo_owner_lock(c.target::uuid);
 elsif category='interests' then parts:=string_to_array(c.target,'/');perform spot_private.retention_pair_lock(parts[1]::uuid,parts[2]::uuid);
 elsif category='closed_reports' then perform 1 from spot_private.reports where id=c.target::uuid for update;
 elsif category in('empty_matches','inactive_chats') then select * into m from public.matches where id=c.target::uuid;perform spot_private.retention_pair_lock(m.user_a,m.user_b);perform 1 from public.matches where id=m.id for update;
 end if;
 -- A new statement after writer locks gets a fresh READ COMMITTED snapshot; never use stale candidate eligibility.
 if not exists(select 1 from spot_private.retention_candidates(category) x where x.target=c.target) then continue;end if;
 if category='checkins' then delete from public.checkins where user_id=c.target::uuid and expires_at<=now();
 elsif category='interests' then delete from spot_private.interests where sender_id=parts[1]::uuid and recipient_id=parts[2]::uuid and venue_id=parts[3]::uuid;
 elsif category in('empty_matches','inactive_chats') then delete from public.matches where id=c.target::uuid;
 elsif category='closed_reports' then delete from spot_private.moderation_audit where report_id=c.target::uuid;delete from spot_private.reports where id=c.target::uuid;
 elsif category='technical_receipts' then delete from spot_private.retention_runs where retention_runs.operation_id=c.target::uuid;
 elsif category='released_safety_metadata' then delete from spot_private.safety_hold_audit where hold_id=c.target::uuid;delete from spot_private.safety_holds where id=c.target::uuid;
 else delete from spot_private.privacy_logs where id=c.target::uuid;end if;
 get diagnostics changed=row_count;removed:=removed+changed;
 end loop;
 insert into spot_private.retention_runs(operation_id,category,policy_version,dry_run,candidates,purged)values(operation_id,category,rule.version,dry_run,n,removed);
 return jsonb_build_object('category',category,'candidates',n,'purged',removed,'dry_run',dry_run,'policy_version',rule.version);
end $$;
create function public.privacy_retention_config(category text default null,duration interval default null,enabled boolean default null,paused boolean default null)returns void language plpgsql security definer set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtextextended('privacy-retention',23));
 if paused is not null then update spot_private.retention_control set paused=privacy_retention_config.paused;end if;
 if category is not null then
 if not exists(select 1 from spot_private.retention_policies where retention_policies.category=privacy_retention_config.category) then raise exception 'RETENTION_CATEGORY';end if;
 update spot_private.retention_policies set duration=coalesce(privacy_retention_config.duration,retention_policies.duration),enabled=coalesce(privacy_retention_config.enabled,retention_policies.enabled),version=version+1 where retention_policies.category=privacy_retention_config.category;
 end if;
end $$;
create function public.privacy_safety_hold(category text,target text,case_reference text,reason_code text,review_at timestamptz,actor_ref text,operation_id uuid,release_hold uuid default null)returns uuid language plpgsql security definer set search_path='' as $$
declare previous spot_private.safety_hold_audit;result uuid;fp text;
begin
 perform pg_advisory_xact_lock(hashtextextended('privacy-retention',23));
 if operation_id is null or actor_ref is null or length(actor_ref)>100 then raise exception 'HOLD_INPUT';end if;
 fp:=md5(jsonb_build_array(category,target,case_reference,reason_code,review_at,actor_ref,release_hold)::text);
 select * into previous from spot_private.safety_hold_audit where safety_hold_audit.operation_id=privacy_safety_hold.operation_id;
 if found then if previous.request_fingerprint<>fp then raise exception 'HOLD_OPERATION_CONFLICT';end if;return previous.hold_id;end if;
 if release_hold is null then
 if case_reference is null or length(case_reference)>100 or target is null or length(target)>120 then raise exception 'HOLD_INPUT';end if;
 insert into spot_private.safety_holds(category,target,case_reference,reason_code,review_at)values(category,target,case_reference,reason_code,review_at)returning id into result;
 else update spot_private.safety_holds set released_at=clock_timestamp() where id=release_hold returning id into result;if not found then raise exception 'HOLD_NOT_FOUND';end if;end if;
 insert into spot_private.safety_hold_audit(hold_id,request_fingerprint,operation_id,action,actor_ref)values(result,fp,operation_id,case when release_hold is null then 'hold' else 'release' end,actor_ref);return result;
end $$;
create function public.privacy_retention_status()returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('paused',(select paused from spot_private.retention_control),'policies',(select jsonb_agg(jsonb_build_object('category',category,'duration',duration,'enabled',enabled,'version',version,'validation',validation))from spot_private.retention_policies),'overdue_holds',(select count(*)from spot_private.safety_holds where released_at is null and review_at<=clock_timestamp()),'checkins_past_24h',(select count(*)from public.checkins where expires_at<clock_timestamp()-interval '24 hours'));
$$;
revoke all on function spot_private.retention_pair_lock(uuid,uuid),spot_private.retention_held(text,text),spot_private.retention_candidates(text),public.privacy_retention_run(text,uuid,boolean),public.privacy_retention_config(text,interval,boolean,boolean),public.privacy_safety_hold(text,text,text,text,timestamptz,text,uuid,uuid),public.privacy_retention_status() from public,anon,authenticated;
grant execute on function public.privacy_retention_run(text,uuid,boolean),public.privacy_retention_config(text,interval,boolean,boolean),public.privacy_safety_hold(text,text,text,text,timestamptz,text,uuid,uuid),public.privacy_retention_status()to service_role;
alter function public.moderate_report(uuid,text,text) rename to privacy_prior_moderate_report;
create function public.moderate_report(target_report uuid,moderation_action text,moderation_note text default '')returns void language plpgsql security definer set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtextextended('privacy-retention',23));
 perform public.privacy_prior_moderate_report(target_report,moderation_action,moderation_note);
end $$;
revoke all on function public.privacy_prior_moderate_report(uuid,text,text)from public,anon,authenticated,service_role;
revoke all on function public.moderate_report(uuid,text,text)from public,anon;
grant execute on function public.moderate_report(uuid,text,text)to authenticated;
notify pgrst,'reload schema';commit;
