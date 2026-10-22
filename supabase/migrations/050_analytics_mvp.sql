begin;
set local lock_timeout='5s';set local statement_timeout='60s';
do $$begin if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'ANALYTICS_STAGING_ONLY';end if;end$$;
-- Independent operational gate; no product flags/retention settings are changed.
create table spot_private.analytics_control(singleton boolean primary key default true check(singleton),enabled boolean not null default false,test_only boolean not null default true,dropped bigint not null default 0,installed_at timestamptz not null default clock_timestamp());
insert into spot_private.analytics_control default values;
create table spot_private.analytics_admission(user_id uuid primary key references auth.users(id)on delete cascade);
create table spot_private.analytics_events(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id)on delete cascade,
 event text not null check(event in('signup_completed','auth_success','profile_complete','onboarding_complete','tribe_join','ora_start','spot_created','spot_matched','match_created','first_match','message_sent','conversation_started','post_created','qod_answer','comment_created','like_added','romantic_attempt','romantic_delivered','romantic_accepted','screen_view','dd_view','share_shared','share_copied','share_cancelled','share_resolved')),
 surface text not null check(surface in('account','tribe','ora','spotted','match','profile')),
 channel text not null default 'unknown'check(channel in('unknown','google','email')),
 entry text not null default 'direct'check(entry in('direct','qr','share','notification')),
 source text not null check(source in('server','client')),
 -- Owner-scoped digest for retry dedup only; not an anonymization claim.
 dedupe text not null check(dedupe~'^[a-f0-9]{32}$'),created_at timestamptz not null default clock_timestamp(),unique(user_id,event,dedupe)
);
create index analytics_events_due on spot_private.analytics_events(created_at);
create unique index analytics_first_message_once on spot_private.analytics_events(dedupe)where event='conversation_started';
create table spot_private.analytics_days(user_id uuid references auth.users(id)on delete cascade,day date,created_at timestamptz not null default clock_timestamp(),primary key(user_id,day));
create table spot_private.analytics_fairness(user_id uuid references auth.users(id)on delete cascade,day date,slot text check(slot in('morning','afternoon')),opportunities integer not null check(opportunities=1),assignments integer not null check(assignments between 0 and 4),created_at timestamptz not null default clock_timestamp(),primary key(user_id,day,slot));
-- Reserved for separately reviewed genuinely anonymous rollups. No automatic writer.
create table spot_private.analytics_anonymous_rollups(period date,metric text check(metric in('active','activation','engagement','fairness')),value bigint not null check(value>=0),reviewed_at timestamptz not null,created_at timestamptz not null default clock_timestamp(),primary key(period,metric));
do $$declare t text;begin foreach t in array array['analytics_control','analytics_admission','analytics_events','analytics_days','analytics_fairness','analytics_anonymous_rollups']loop execute format('alter table spot_private.%I enable row level security',t);execute format('revoke all on spot_private.%I from public,anon,authenticated,service_role',t);end loop;end$$;
create function spot_private.analytics_admitted(u uuid)returns boolean language sql stable security definer set search_path=''as $$select exists(select 1 from spot_private.analytics_control c join auth.users a on a.id=u where c.enabled and not coalesce(a.is_anonymous,false)and(not c.test_only or exists(select 1 from spot_private.analytics_admission m where m.user_id=u)))$$;
create function spot_private.analytics_emit(u uuid,k text,s text,key text,activity boolean default false,origin text default 'server',ch text default 'unknown',ingress text default 'direct')returns void language plpgsql security definer set search_path=''as $$begin
 if not spot_private.analytics_admitted(u)then return;end if;
 insert into spot_private.analytics_events(user_id,event,surface,dedupe,source,channel,entry)values(u,k,s,md5(case when k='conversation_started'then k else u::text end||':'||key),origin,ch,ingress)on conflict do nothing;
 if activity then insert into spot_private.analytics_days(user_id,day)values(u,(clock_timestamp()at time zone 'Europe/Rome')::date)on conflict do nothing;end if;
 exception when others then begin update spot_private.analytics_control set dropped=dropped+1;exception when others then null;end;
end$$;
create function spot_private.analytics_canonical()returns trigger language plpgsql security definer set search_path=''as $$declare u uuid;k text;s text:='account';key text;active boolean:=false;w spot_private.discovery_windows;begin
 if tg_table_name='profiles'then u:=new.id;k:='profile_complete';key:=new.id::text;active:=u=auth.uid();
 elsif tg_table_name='account_onboarding'then if new.completed_at is null or old.completed_at is not null then return null;end if;u:=new.user_id;k:='onboarding_complete';key:=u::text;active:=u=auth.uid();
 elsif tg_table_name='tribe_memberships'then u:=new.user_id;k:='tribe_join';s:='tribe';key:=new.membership_id::text;active:=u=auth.uid();
 elsif tg_table_name='checkins'then u:=new.user_id;k:='ora_start';s:='ora';key:=new.presence_id::text;active:=u=auth.uid();
 elsif tg_table_name='spot_v2_intents'then
  if tg_op='UPDATE'and(new.state<>'matched'or old.state='matched')then return null;end if;u:=new.sender_id;k:=case when tg_op='INSERT'then 'spot_created'else 'spot_matched'end;s:=case when new.origin_kind='tribe'then 'tribe'else 'ora'end;key:=new.id::text;active:=tg_op='INSERT'and u=auth.uid();
 elsif tg_table_name='matches'then
  -- Exactly one global Match event, attributed to a stable participant, not two matches.
  -- No counterpart ID or origin guess stored. Participant activation is derivable from product data.
  u:=new.user_a;k:='match_created';s:='match';key:=new.id::text;
  perform spot_private.analytics_emit(new.user_a,'first_match','match',new.user_a::text,false);perform spot_private.analytics_emit(new.user_b,'first_match','match',new.user_b::text,false);
 elsif tg_table_name='messages'then
  u:=new.sender_id;k:='message_sent';s:='match';key:=new.id::text;active:=u=auth.uid();
  if not exists(select 1 from public.messages x where x.match_id=new.match_id and x.id<>new.id)then perform spot_private.analytics_emit(u,'conversation_started','match',new.match_id::text,false);end if;
 elsif tg_table_name='board_posts'then if new.author_id is null or coalesce(new.post_kind,'user')='system'then return null;end if;u:=new.author_id;k:=case when new.parent_qod_id is null then 'post_created'else 'qod_answer'end;s:='spotted';key:=new.id::text;active:=u=auth.uid();
 elsif tg_table_name='board_comments'then u:=new.author_id;k:='comment_created';s:='spotted';key:=new.id::text;active:=u=auth.uid();
 elsif tg_table_name='board_likes'then u:=new.user_id;k:='like_added';s:='spotted';key:=coalesce(new.post_id,new.comment_id)::text||':'||txid_current()::text;active:=u=auth.uid();
 elsif tg_table_name='board_request_attempts'then u:=new.sender_id;k:='romantic_attempt';s:='spotted';key:=new.id::text;active:=u=auth.uid();
 elsif tg_table_name='board_romantic_requests'then
  if tg_op='UPDATE'and(new.status<>'accepted'or old.status='accepted')then return null;end if;u:=new.recipient_id;k:=case when tg_op='INSERT'then 'romantic_delivered'else 'romantic_accepted'end;s:='spotted';key:=new.id::text;active:=tg_op='UPDATE'and u=auth.uid();
 elsif tg_table_name='discovery_allocations'then
  if not spot_private.analytics_admitted(new.user_id)then return null;end if;select *into w from spot_private.discovery_windows where id=new.window_id;
  insert into spot_private.analytics_fairness(user_id,day,slot,opportunities,assignments)values(new.user_id,w.local_date,w.slot,1,new.exposure_count)on conflict(user_id,day,slot)do update set assignments=greatest(analytics_fairness.assignments,excluded.assignments);
  return null;
 end if;
 if key is not null then perform spot_private.analytics_emit(u,k,s,key,active);end if;return null;
 exception when others then begin update spot_private.analytics_control set dropped=dropped+1;exception when others then null;end;return null;
end$$;
create trigger analytics_profile after insert on public.profiles for each row execute function spot_private.analytics_canonical();
create trigger analytics_onboarding after update of completed_at on spot_private.account_onboarding for each row execute function spot_private.analytics_canonical();
create trigger analytics_tribe after insert on spot_private.tribe_memberships for each row execute function spot_private.analytics_canonical();
create trigger analytics_presence after insert on public.checkins for each row execute function spot_private.analytics_canonical();
create trigger analytics_spot after insert or update of state on spot_private.spot_v2_intents for each row execute function spot_private.analytics_canonical();
create trigger analytics_match after insert on public.matches for each row execute function spot_private.analytics_canonical();
create trigger analytics_message after insert on public.messages for each row execute function spot_private.analytics_canonical();
create trigger analytics_post after insert on spot_private.board_posts for each row execute function spot_private.analytics_canonical();
create trigger analytics_comment after insert on spot_private.board_comments for each row execute function spot_private.analytics_canonical();
create trigger analytics_like after insert on spot_private.board_likes for each row execute function spot_private.analytics_canonical();
create trigger analytics_attempt after insert on spot_private.board_request_attempts for each row execute function spot_private.analytics_canonical();
create trigger analytics_request after insert or update of status on spot_private.board_romantic_requests for each row execute function spot_private.analytics_canonical();
create trigger analytics_fairness after insert or update of exposure_count on spot_private.discovery_allocations for each row execute function spot_private.analytics_canonical();
-- Only observation events may be asserted by a client; no arbitrary metadata/actor/time.
create function public.analytics_observe(event_name text,surface text,operation_id uuid,channel text default 'unknown',entry text default 'direct')returns void language plpgsql security definer set search_path=''as $$declare me uuid:=auth.uid();key text;w uuid;begin
 if me is null then raise exception 'ANALYTICS_AUTH'using errcode='42501';end if;
 if event_name is null or event_name not in('screen_view','dd_view','auth_success','share_shared','share_copied','share_cancelled','share_resolved')or surface is null or surface not in('account','tribe','ora','spotted','match','profile')or operation_id is null or channel is null or channel not in('unknown','google','email')or entry is null or entry not in('direct','qr','share','notification')then raise exception 'ANALYTICS_INPUT'using errcode='22023';end if;
 if not spot_private.analytics_admitted(me)then return;end if;
 key:=(clock_timestamp()at time zone 'Europe/Rome')::date::text||':'||surface;
 if event_name='dd_view'then
  select a.window_id into w from spot_private.discovery_allocations a join spot_private.discovery_windows d on d.id=a.window_id where a.user_id=me and a.exposure_count>0 and d.starts_at<=clock_timestamp()and d.ends_at>clock_timestamp()and exists(select 1 from spot_private.discovery_exposures x where x.window_id=d.id and me in(x.user_a,x.user_b)and spot_private.dd_exposure_authorized(x.id,me,case when me=x.user_a then x.user_b else x.user_a end))limit 1;
  if w is null then return;end if;key:=w::text;
 elsif event_name not in('screen_view','auth_success')then key:=operation_id::text;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('analytics-observe:'||me::text,50));
 -- Fixed technical ceiling for observation rows only, never a product quota.
 if(select count(*)from spot_private.analytics_events where user_id=me and source='client'and created_at>clock_timestamp()-interval '1 day')>=500 then return;end if;
 perform spot_private.analytics_emit(me,event_name,surface,key,true,'client',channel,entry);
 if event_name='auth_success'and exists(select 1 from auth.users a cross join spot_private.analytics_control c where a.id=me and a.created_at>=c.installed_at)then perform spot_private.analytics_emit(me,'signup_completed','account',me::text,false);end if;
end$$;
-- Physical deletion, bounded batches, no scheduler. No product retention function is replaced.
create function public.analytics_purge(dry_run boolean default true)returns jsonb language plpgsql security definer set search_path=''as $$declare t text;n int;counts jsonb:='{}';cut interval;begin
 if dry_run is null then raise exception 'ANALYTICS_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended('analytics-retention',50));
 foreach t in array array['analytics_events','analytics_days','analytics_fairness','analytics_anonymous_rollups']loop
  cut:=case when t='analytics_anonymous_rollups'then interval '24 months'else interval '90 days'end;
  execute format('select count(*) from(select 1 from spot_private.%I where created_at<=clock_timestamp()-$1 limit 500)x',t)into n using cut;
  if not dry_run then execute format('delete from spot_private.%I where ctid in(select ctid from spot_private.%I where created_at<=clock_timestamp()-$1 limit 500)',t,t)using cut;end if;
  counts:=counts||jsonb_build_object(t,n);
 end loop;return counts||jsonb_build_object('dry_run',dry_run);
end$$;
-- Owner export remains available without dating consent/eligibility. No event receiver/other account.
alter function public.my_rights_page(text,text,integer)rename to analytics_prior_rights_page;
create function public.my_rights_page(section text,after_key text default '',page_size integer default 100)returns jsonb language plpgsql stable security definer set search_path=''as $$declare me uuid:=auth.uid();data jsonb;last_key text;more boolean;begin
 if section<>'analytics'then return public.analytics_prior_rights_page(section,after_key,page_size);end if;
 if me is null or not exists(select 1 from auth.users where id=me)then raise exception 'RIGHTS_AUTH'using errcode='42501';end if;
 if page_size is null or page_size not between 1 and 100 or after_key is null or length(after_key)>200 then raise exception 'RIGHTS_INPUT';end if;
 with records as(
 select 'event/'||id::text k,jsonb_build_object('event',event,'surface',surface,'source',source,'channel',channel,'entry',entry,'at',created_at)v from spot_private.analytics_events where user_id=me
 union all select 'day/'||day::text,jsonb_build_object('active_day',day)from spot_private.analytics_days where user_id=me
 union all select 'fairness/'||day::text||'/'||slot,jsonb_build_object('day',day,'slot',slot,'opportunities',opportunities,'assignments',assignments)from spot_private.analytics_fairness where user_id=me),page as materialized(select *from records where k>after_key order by k limit page_size+1),shown as(select *from page order by k limit page_size)
 select coalesce((select jsonb_agg(jsonb_build_object('key',k,'data',v)order by k)from shown),'[]'),(select max(k)from shown),(select count(*)>page_size from page)into data,last_key,more;
 return jsonb_build_object('owner_id',me,'section',section,'items',data,'next_key',case when more then last_key end);
end$$;
revoke all on function spot_private.analytics_admitted(uuid),spot_private.analytics_emit(uuid,text,text,text,boolean,text,text,text),spot_private.analytics_canonical(),public.analytics_prior_rights_page(text,text,integer),public.analytics_observe(text,text,uuid,text,text),public.analytics_purge(boolean),public.my_rights_page(text,text,integer)from public,anon,authenticated,service_role;
grant execute on function public.analytics_observe(text,text,uuid,text,text),public.my_rights_page(text,text,integer)to authenticated;
grant execute on function public.analytics_purge(boolean)to service_role;
create function public.analytics_summary()returns jsonb language sql stable security definer set search_path=''as $$
 with cohort as(select distinct d.user_id,(a.created_at at time zone 'Europe/Rome')::date as cohort_day from spot_private.analytics_days d join auth.users a on a.id=d.user_id where a.created_at>clock_timestamp()-interval '90 days'),r as(select n,count(*)filter(where c.cohort_day+n<=(clock_timestamp()at time zone 'Europe/Rome')::date) eligible,count(*)filter(where c.cohort_day+n<=(clock_timestamp()at time zone 'Europe/Rome')::date and exists(select 1 from spot_private.analytics_days d where d.user_id=c.user_id and d.day=c.cohort_day+n))returned from cohort c cross join(values(1),(7),(30))v(n)group by n)
 select jsonb_build_object('events',(select coalesce(jsonb_agg(x),'[]')from(select event,surface,source,count(*) total from spot_private.analytics_events group by event,surface,source order by event,surface,source)x),'retention',(select coalesce(jsonb_agg(to_jsonb(r)),'[]')from r),'cohort','Observed authenticated accounts, registration day Europe/Rome; deleted accounts removed','fairness',(select jsonb_build_object('account_windows',count(*),'min',min(assignments),'max',max(assignments),'average',avg(assignments))from spot_private.analytics_fairness));
 $$;
 revoke all on function public.analytics_summary()from public,anon,authenticated;
 grant execute on function public.analytics_summary()to service_role;
 notify pgrst,'reload schema';commit;
