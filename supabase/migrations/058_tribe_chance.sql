begin;
set local lock_timeout='5s';set local statement_timeout='60s';
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'CHANCE_STAGING_ONLY';end if;
 if exists(select 1 from spot_private.soma_v2_control where discovery_enabled)then raise exception 'CHANCE_REQUIRES_DISCOVERY_OFF';end if;
end$$;
-- A release is still one reciprocal exposure. Existing DD retention/holds/FKs remain authoritative.
create function spot_private.chance_lock()returns void language plpgsql security definer set search_path=''as $$begin if current_setting('transaction_isolation')<>'read committed'then raise exception 'CHANCE_ISOLATION'using errcode='25000';end if;perform spot_private.board_lock();end$$;
create function spot_private.chance_times_valid(times time[])returns boolean language sql immutable set search_path=''as $$
 select cardinality(times)>0 and not exists(select 1 from generate_subscripts(times,1)i where times[i]is null or times[i]>=time '24:00' or(i>1 and times[i]<=times[i-1]));$$;
create table spot_private.chance_control(singleton boolean primary key default true check(singleton),enabled boolean not null default false,scheduler_enabled boolean not null default false,activated_at timestamptz,daily_limit integer not null default 4,release_times time[]not null default array[time '10:00',time '14:00',time '18:00',time '21:30'],check(spot_private.chance_times_valid(release_times)),check(daily_limit>0 and daily_limit<=cardinality(release_times)));
insert into spot_private.chance_control default values;
create function spot_private.chance_activation()returns trigger language plpgsql security definer set search_path=''as $$begin new.activated_at:=case when new.enabled then coalesce(old.activated_at,clock_timestamp())else old.activated_at end;return new;end$$;
create trigger chance_control_lock before update on spot_private.chance_control for each statement execute function spot_private.dd_admission_write_lock();
create trigger chance_activation before update on spot_private.chance_control for each row execute function spot_private.chance_activation();
alter table spot_private.discovery_policy add column chance boolean not null default false;
insert into spot_private.discovery_policy(version,enabled,paused,chance,exposure_retention,fairness_retention,pair_memory_retention)values(3,false,true,true,interval '30 days',interval '30 days',interval '30 days');
-- Pin a Rome day's schedule before its first release; later configuration edits apply to uncreated days.
create table spot_private.chance_days(local_date date primary key,daily_limit integer not null,release_times time[]not null,check(spot_private.chance_times_valid(release_times)),check(daily_limit>0 and daily_limit<=cardinality(release_times)));
alter table spot_private.discovery_windows drop constraint discovery_windows_slot_check;
alter table spot_private.discovery_windows add constraint discovery_windows_slot_check check(slot in('morning','afternoon')or slot~'^c[1-9][0-9]*$'),add column chance_day date references spot_private.chance_days(local_date)on delete cascade,add column chance_number integer;
create table spot_private.chance_state(exposure_id uuid references spot_private.discovery_exposures(id)on delete cascade,user_id uuid references auth.users(id)on delete cascade,first_revealed_at timestamptz,first_viewed_at timestamptz,spot_sent_at timestamptz,spot_operation_id uuid,expiry_observed_at timestamptz,primary key(exposure_id,user_id),check((spot_sent_at is null)=(spot_operation_id is null)),check(first_viewed_at is null or first_revealed_at is not null));
create index chance_state_owner on spot_private.chance_state(user_id,exposure_id);
do $$declare t text;begin foreach t in array array['chance_control','chance_days','chance_state']loop execute format('alter table spot_private.%I enable row level security',t);execute format('revoke all on spot_private.%I from public,anon,authenticated,service_role',t);end loop;end$$;
-- Preserve the exact legacy window guard for legacy policies, but permit overlapping individual 24h Chance releases.
alter function spot_private.dd_window_guard()rename to chance_prior_window_guard;
create function spot_private.dd_window_guard()returns trigger language plpgsql security definer set search_path=''as $$declare d spot_private.chance_days;is_chance boolean;begin
 perform spot_private.board_lock();select chance into is_chance from spot_private.discovery_policy where version=new.policy_version;
 if is_chance then
  select *into d from spot_private.chance_days where local_date=new.local_date;
  if d.local_date is null or new.chance_day is distinct from new.local_date or new.chance_number is null or new.chance_number<1 or new.chance_number>d.daily_limit or new.slot<>'c'||new.chance_number::text or new.starts_at is distinct from((d.local_date+d.release_times[new.chance_number])at time zone 'Europe/Rome')or new.ends_at is distinct from new.starts_at+interval '24 hours'then raise exception 'CHANCE_WINDOW_CONTEXT';end if;
 else
  if new.chance_day is not null or new.chance_number is not null or new.local_date<>(new.starts_at at time zone 'Europe/Rome')::date or new.ends_at>((new.local_date+1)::timestamp at time zone 'Europe/Rome')then raise exception 'DD_WINDOW_DAY';end if;
  if exists(select 1 from spot_private.discovery_windows w join spot_private.discovery_policy p on p.version=w.policy_version where not p.chance and w.id<>new.id and w.starts_at<new.ends_at and w.ends_at>new.starts_at and w.state in('draft','building','ready')and new.state in('draft','building','ready'))then raise exception 'DD_WINDOW_OVERLAP';end if;
 end if;
 if tg_op='UPDATE'and old.state in('ready','closed')and(new.local_date<>old.local_date or new.starts_at<>old.starts_at or new.ends_at<>old.ends_at or new.policy_version<>old.policy_version or new.chance_day is distinct from old.chance_day or new.chance_number is distinct from old.chance_number or new.generation_id is distinct from old.generation_id or new.state not in('ready','closed')or(old.state='closed'and new.state<>'closed'))then raise exception 'DD_WINDOW_IMMUTABLE';end if;
 return new;
end$$;
drop trigger discovery_window_guard on spot_private.discovery_windows;
create trigger discovery_window_guard before insert or update on spot_private.discovery_windows for each row execute function spot_private.dd_window_guard();
-- Parameterize only degree/day caps in the proven builder and pair insertion invariant.
-- Ranking, reciprocal selection, admission, locks, recurrence and no-refill remain the same engine.
do $patch$declare body text;begin
 body:=pg_get_functiondef('spot_private.dd_insert_pair()'::regprocedure);
 if strpos(body,'day_used>=8')=0 or strpos(body,'exposure_count<4')=0 then raise exception 'CHANCE_INSERT_DEPENDENCY';end if;
 body:=replace(body,'memory spot_private.discovery_pair_memory;','memory spot_private.discovery_pair_memory;degree integer:=4;daily integer:=8;');
 body:=replace(body,'select * into p from spot_private.discovery_policy where version=w.policy_version;',E'select * into p from spot_private.discovery_policy where version=w.policy_version;\n if p.chance then degree:=1;select daily_limit into daily from spot_private.chance_days where local_date=w.local_date;if not coalesce((select enabled from spot_private.chance_control),false)or daily is null then raise exception ''CHANCE_PAUSED'';end if;end if;');
 body:=replace(replace(body,'day_used>=8','day_used>=daily'),'exposure_count<4','exposure_count<degree');execute body;
 body:=pg_get_functiondef('spot_private.dd_build(uuid)'::regprocedure);
 if strpos(body,'initial boolean;')=0 or strpos(body,'8-coalesce(sum')=0 or strpos(body,')<8')=0 then raise exception 'CHANCE_BUILD_DEPENDENCY';end if;
 body:=replace(body,'initial boolean;','initial boolean;degree integer:=4;daily integer:=8;');
 body:=replace(body,'select * into p from spot_private.discovery_policy where version=w.policy_version for share;',E'select * into p from spot_private.discovery_policy where version=w.policy_version for share;\n if p.chance then degree:=1;select daily_limit into daily from spot_private.chance_days where local_date=w.local_date;if not coalesce((select enabled from spot_private.chance_control),false)or daily is null then raise exception ''CHANCE_PAUSED'';end if;end if;');
 body:=replace(replace(replace(body,'exposure_count<4','exposure_count<degree'),'8-coalesce(sum','daily-coalesce(sum'),')<8',')<daily');execute body;
end$patch$;
create function spot_private.chance_pair_state()returns trigger language plpgsql security definer set search_path=''as $$begin
 if exists(select 1 from spot_private.discovery_windows w join spot_private.discovery_policy p on p.version=w.policy_version where w.id=new.window_id and p.chance)then insert into spot_private.chance_state(exposure_id,user_id)values(new.id,new.user_a),(new.id,new.user_b);end if;return null;
end$$;
create trigger chance_pair_state after insert on spot_private.discovery_exposures for each row execute function spot_private.chance_pair_state();
do $$begin execute replace(pg_get_functiondef('spot_private.dd_exposure_authorized(uuid,uuid,uuid)'::regprocedure),'FUNCTION spot_private.dd_exposure_authorized(','FUNCTION spot_private.chance_prior_exposure_authorized(');end$$;
create or replace function spot_private.dd_exposure_authorized(exposure uuid,viewer uuid,target uuid)returns boolean language sql volatile security definer set search_path=''as $$
 select spot_private.chance_prior_exposure_authorized(exposure,viewer,target)and exists(select 1 from spot_private.discovery_exposures e join spot_private.discovery_windows w on w.id=e.window_id join spot_private.discovery_policy p on p.version=w.policy_version where e.id=exposure and(not p.chance or(current_setting('transaction_isolation')='read committed'and exists(select 1 from spot_private.chance_control where enabled)and exists(select 1 from spot_private.chance_state s where s.exposure_id=e.id and s.user_id=viewer and s.first_revealed_at is not null))));$$;
-- Old clients cannot request a gallery when Chance is enabled.
do $$begin execute replace(pg_get_functiondef('public.my_daily_discovery()'::regprocedure),'FUNCTION public.my_daily_discovery(','FUNCTION spot_private.chance_prior_daily_discovery(');end$$;
create or replace function public.my_daily_discovery()returns jsonb language plpgsql security definer set search_path=''as $$begin
 if exists(select 1 from spot_private.chance_control where enabled)then raise exception 'CHANCE_CLIENT_REQUIRED'using errcode='42501';end if;return spot_private.chance_prior_daily_discovery();end$$;

create function spot_private.chance_release_due()returns integer language plpgsql volatile security definer set search_path=''as $$declare stamp timestamptz:=clock_timestamp();d date;day spot_private.chance_days;c spot_private.chance_control;i integer;start_at timestamptz;w uuid;n integer:=0;begin
 if current_setting('transaction_isolation')<>'read committed'then raise exception 'DD_ISOLATION'using errcode='25000';end if;
 perform spot_private.board_lock();select *into c from spot_private.chance_control;
 if not c.enabled or not exists(select 1 from spot_private.soma_v2_control where discovery_enabled)or not exists(select 1 from spot_private.discovery_policy where version=3 and enabled and not paused)then return 0;end if;
 for d in select generate_series((stamp at time zone 'Europe/Rome')::date-1,(stamp at time zone 'Europe/Rome')::date,interval '1 day')::date loop
  insert into spot_private.chance_days values(d,c.daily_limit,c.release_times)on conflict do nothing;select *into day from spot_private.chance_days where local_date=d;
  for i in 1..day.daily_limit loop
   start_at:=(d+day.release_times[i])at time zone 'Europe/Rome';
   if start_at>=c.activated_at and start_at<=stamp and start_at+interval '24 hours'>stamp then
    select id into w from spot_private.discovery_windows where local_date=d and slot='c'||i;
    if w is null then insert into spot_private.discovery_windows(local_date,slot,policy_version,starts_at,ends_at,chance_day,chance_number)values(d,'c'||i,3,start_at,start_at+interval '24 hours',d,i)returning id into w;end if;
    perform spot_private.dd_build(w);n:=n+1;
   end if;
  end loop;
 end loop;return n;
end$$;
create function spot_private.chance_live(exposure uuid,viewer uuid)returns boolean language sql volatile security definer set search_path=''as $$
 select exists(select 1 from spot_private.chance_control where enabled)and exists(select 1 from spot_private.discovery_exposures e join spot_private.discovery_windows w on w.id=e.window_id join spot_private.discovery_policy p on p.version=w.policy_version and p.chance and p.enabled and not p.paused where e.id=exposure and viewer in(e.user_a,e.user_b)and w.state='ready'and w.starts_at<=clock_timestamp()and w.ends_at>clock_timestamp()and spot_private.chance_prior_exposure_authorized(e.id,viewer,case when viewer=e.user_a then e.user_b else e.user_a end));$$;
create function public.my_chances()returns jsonb language plpgsql volatile security definer set search_path=''as $$declare me uuid:=auth.uid();stamp timestamptz;data jsonb;next_at timestamptz;c spot_private.chance_control;begin
 if me is null or not coalesce(spot_private.ora_eligible(me),false)then raise exception 'CHANCE_ACCOUNT'using errcode='42501';end if;
 perform spot_private.chance_lock();stamp:=clock_timestamp();select *into c from spot_private.chance_control;
 select min((d+times[i])at time zone 'Europe/Rome')into next_at from(select (stamp at time zone 'Europe/Rome')::date+offset_day d,coalesce(p.release_times,c.release_times)times,coalesce(p.daily_limit,c.daily_limit)lim from generate_series(0,1)offset_day left join spot_private.chance_days p on p.local_date=(stamp at time zone 'Europe/Rome')::date+offset_day)x cross join lateral generate_series(1,lim)i where(d+times[i])at time zone 'Europe/Rome'>stamp;
 if not c.enabled or not spot_private.dd_admitted(me)or not exists(select 1 from spot_private.soma_v2_control where discovery_enabled)or not exists(select 1 from spot_private.discovery_policy where version=3 and enabled and not paused)then return jsonb_build_object('status','paused','server_now',stamp,'next_release_at',next_at,'chances','[]'::jsonb,'unrevealed_count',0);end if;
 if not exists(select 1 from spot_private.tribe_memberships where user_id=me)then return jsonb_build_object('status','tribe_required','server_now',stamp,'next_release_at',next_at,'chances','[]'::jsonb,'unrevealed_count',0);end if;
 perform spot_private.chance_release_due();
 -- Metadata only: no counterpart ID, name, photo, profile preview or pool endpoint.
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'released_at',w.starts_at,'expires_at',w.ends_at,'revealed',s.first_revealed_at is not null,'spotted',s.spot_sent_at is not null,'slot',w.chance_number)order by w.starts_at,e.id),'[]')into data from spot_private.chance_state s join spot_private.discovery_exposures e on e.id=s.exposure_id join spot_private.discovery_windows w on w.id=e.window_id where s.user_id=me and spot_private.chance_live(e.id,me);
 return jsonb_build_object('status',case when jsonb_array_length(data)=0 then 'waiting'else 'ready'end,'server_now',clock_timestamp(),'next_release_at',next_at,'chances',data,'unrevealed_count',(select count(*)from jsonb_array_elements(data)x where not(x->>'revealed')::boolean));
end$$;
create function public.reveal_chance(chance_id uuid)returns jsonb language plpgsql volatile security definer set search_path=''as $$declare me uuid:=auth.uid();e spot_private.discovery_exposures;w spot_private.discovery_windows;p jsonb;s spot_private.chance_state;begin
 perform spot_private.chance_lock();
 if me is null or not spot_private.chance_live(chance_id,me)then raise exception 'CHANCE_UNAVAILABLE'using errcode='42501';end if;
 select *into e from spot_private.discovery_exposures where id=chance_id;select *into w from spot_private.discovery_windows where id=e.window_id;
 update spot_private.chance_state set first_revealed_at=coalesce(first_revealed_at,clock_timestamp())where exposure_id=chance_id and user_id=me returning *into s;
 select to_jsonb(x)into p from public.authorized_profile(case when me=e.user_a then e.user_b else e.user_a end)x;
 if p is null or not spot_private.chance_live(chance_id,me)then raise exception 'CHANCE_UNAVAILABLE'using errcode='42501';end if;
 return jsonb_build_object('id',e.id,'server_now',clock_timestamp(),'released_at',w.starts_at,'expires_at',w.ends_at,'first_revealed_at',s.first_revealed_at,'spotted',s.spot_sent_at is not null,'slot',w.chance_number,'profile',p||jsonb_build_object('tribe_id',e.tribe_id,'tribe_name',(select name from public.venues where id=e.tribe_id),'outgoing_spot_pending',exists(select 1 from spot_private.spot_v2_intents i where i.sender_id=me and i.recipient_id=case when me=e.user_a then e.user_b else e.user_a end and i.state='pending'and i.valid_until>clock_timestamp())));
end$$;
create function public.chance_viewed(chance_id uuid)returns void language plpgsql security definer set search_path=''as $$begin
 perform spot_private.chance_lock();if not spot_private.chance_live(chance_id,auth.uid())then raise exception 'CHANCE_UNAVAILABLE'using errcode='42501';end if;
 update spot_private.chance_state set first_viewed_at=coalesce(first_viewed_at,clock_timestamp())where exposure_id=chance_id and user_id=auth.uid()and first_revealed_at is not null;if not found then raise exception 'CHANCE_REVEAL_REQUIRED'using errcode='42501';end if;
end$$;
-- All Tribe write entry points share this fence; no new per-calendar-day Spot cap.
create function spot_private.chance_spot_gate(exposure uuid,target uuid,operation uuid)returns void language plpgsql security definer set search_path=''as $$declare own_state spot_private.chance_state;begin
 if not exists(select 1 from spot_private.discovery_exposures e join spot_private.discovery_windows w on w.id=e.window_id join spot_private.discovery_policy p on p.version=w.policy_version where e.id=exposure and p.chance)then return;end if;
 if exists(select 1 from spot_private.spot_v2_operations o join spot_private.chance_state s on s.exposure_id=o.exposure_id and s.user_id=o.sender_id join spot_private.discovery_exposures e on e.id=s.exposure_id join spot_private.discovery_windows w on w.id=e.window_id join spot_private.discovery_policy p on p.version=w.policy_version where o.sender_id=auth.uid()and o.operation_id=operation and o.recipient_id=target and o.exposure_id=exposure and s.first_revealed_at is not null and w.starts_at<=clock_timestamp()and w.ends_at>clock_timestamp()and p.enabled and not p.paused and exists(select 1 from spot_private.chance_control where enabled))then return;end if;
 if not spot_private.chance_live(exposure,auth.uid())or not spot_private.dd_exposure_authorized(exposure,auth.uid(),target)then raise exception 'CHANCE_UNAVAILABLE'using errcode='42501';end if;
 select *into own_state from spot_private.chance_state where exposure_id=exposure and user_id=auth.uid()for update;
 if own_state.spot_sent_at is not null and own_state.spot_operation_id is distinct from operation then raise exception 'CHANCE_SPOT_USED';end if;
 update spot_private.chance_state set spot_sent_at=coalesce(spot_sent_at,clock_timestamp()),spot_operation_id=coalesce(spot_operation_id,operation)where exposure_id=exposure and user_id=auth.uid();
end$$;
do $patch$declare body text;begin
 body:=pg_get_functiondef('spot_private.dd_charge_spot(uuid)'::regprocedure);
 body:=replace(body,'-- Called inside send_spot_v2 only for an actually NEW intent, after its global/pair locks.',E'-- Chance already has a one-per-introduction fence; no calendar-day Spot cap.\n if exists(select 1 from spot_private.discovery_windows w join spot_private.discovery_policy p on p.version=w.policy_version where w.id=dd_charge_spot.window_id and p.chance)then update spot_private.discovery_allocations set spots_used=1 where discovery_allocations.window_id=dd_charge_spot.window_id and user_id=auth.uid();return;end if;');execute body;
 body:=pg_get_functiondef('public.send_spot_v2(uuid,uuid,text,uuid)'::regprocedure);
 if strpos(body,'perform spot_private.spot_v2_gate();')=0 or strpos(body,'return result;')=0 then raise exception 'CHANCE_SPOT_DEPENDENCY';end if;
 body:=replace(body,'perform spot_private.spot_v2_gate();',E'perform spot_private.spot_v2_gate();\n if origin_kind=''tribe''then perform spot_private.chance_spot_gate(exposure_id,target_user,operation_id);end if;');
 body:=replace(body,'return result;',E'if origin_kind=''tribe''and exists(select 1 from spot_private.discovery_exposures e join spot_private.discovery_windows w on w.id=e.window_id join spot_private.discovery_policy p on p.version=w.policy_version where e.id=exposure_id and p.chance and w.ends_at<=clock_timestamp())then raise exception ''CHANCE_EXPIRED'';end if;\n return result;');execute body;
end$patch$;
create function public.send_chance_spot(chance_id uuid,operation_id uuid)returns jsonb language plpgsql security definer set search_path=''as $$declare target uuid;begin
 perform spot_private.chance_lock();if not spot_private.chance_live(chance_id,auth.uid())and not exists(select 1 from spot_private.spot_v2_operations o join spot_private.discovery_exposures e on e.id=o.exposure_id join spot_private.discovery_windows w on w.id=e.window_id where o.sender_id=auth.uid()and o.operation_id=send_chance_spot.operation_id and o.exposure_id=chance_id and w.ends_at>clock_timestamp())then raise exception 'CHANCE_UNAVAILABLE'using errcode='42501';end if;
 select case when user_a=auth.uid()then user_b else user_a end into target from spot_private.discovery_exposures where id=chance_id;return public.send_spot_v2(target,operation_id,'tribe',chance_id);
end$$;
-- Preserve fail-closed FK inventory: admit exactly this new owner-state child, not arbitrary cascades.
do $patch$declare body text;begin
 if to_regprocedure('spot_private.phase_a_fk_check(regclass)')is not null then
 body:=pg_get_functiondef('spot_private.phase_a_fk_check(regclass)'::regprocedure);
 if strpos(body,'c.conrelid=''spot_private.spot_v2_intents''::regclass')=0 then raise exception 'CHANCE_RETENTION_DEPENDENCY';end if;
 execute replace(body,'c.conrelid=''spot_private.spot_v2_intents''::regclass','c.conrelid in(''spot_private.spot_v2_intents''::regclass,''spot_private.chance_state''::regclass)');
 end if;
end$patch$;
-- The existing purge removes exposures -> owner state. Remove only old unreferenced non-personal schedule snapshots.
create function spot_private.chance_day_retired()returns trigger language plpgsql security definer set search_path=''as $$begin
 delete from spot_private.chance_days d where d.local_date=old.chance_day and not exists(select 1 from spot_private.discovery_windows w where w.chance_day=d.local_date)and d.local_date<(clock_timestamp()at time zone 'Europe/Rome')::date-30;return null;end$$;
create trigger chance_day_retired after delete on spot_private.discovery_windows for each row execute function spot_private.chance_day_retired();
-- Scheduler command stays inside PostgreSQL: no new provider/Edge secret or legacy key transport.
create function spot_private.chance_tick()returns integer language plpgsql security definer set search_path=''as $$begin
 if not exists(select 1 from spot_private.chance_control where enabled and scheduler_enabled)then return 0;end if;return spot_private.chance_release_due();end$$;
create function public.chance_scheduler_configure(enabled boolean default false)returns bigint language plpgsql security definer set search_path=''as $$declare job bigint;begin
 perform spot_private.require_staging_server_transport('zjinjtkekmaqtxsuyvho');perform spot_private.board_lock();
 if enabled and not exists(select 1 from spot_private.chance_control c cross join spot_private.soma_v2_control s where c.enabled and s.discovery_enabled)then raise exception 'CHANCE_REQUIRES_ENABLED';end if;
 select jobid into job from cron.job where jobname='soma-chance-staging';if job is null then select cron.schedule('soma-chance-staging','* * * * *','select spot_private.chance_tick();')into job;end if;
 perform cron.alter_job(job,active:=enabled);update spot_private.chance_control set scheduler_enabled=chance_scheduler_configure.enabled;return job;
end$$;
revoke all on function spot_private.chance_lock(),spot_private.chance_activation(),spot_private.chance_times_valid(time[]),spot_private.chance_prior_window_guard(),spot_private.dd_window_guard(),spot_private.chance_prior_exposure_authorized(uuid,uuid,uuid),spot_private.dd_exposure_authorized(uuid,uuid,uuid),spot_private.chance_prior_daily_discovery(),spot_private.chance_pair_state(),spot_private.chance_release_due(),spot_private.chance_live(uuid,uuid),spot_private.chance_spot_gate(uuid,uuid,uuid),spot_private.chance_day_retired(),spot_private.chance_tick()from public,anon,authenticated,service_role;
revoke all on function public.my_chances(),public.reveal_chance(uuid),public.chance_viewed(uuid),public.send_chance_spot(uuid,uuid),public.my_daily_discovery(),public.chance_scheduler_configure(boolean)from public,anon,authenticated,service_role;
grant execute on function public.my_chances(),public.reveal_chance(uuid),public.chance_viewed(uuid),public.send_chance_spot(uuid,uuid),public.my_daily_discovery()to authenticated;
grant execute on function public.chance_scheduler_configure(boolean)to service_role;
notify pgrst,'reload schema';commit;
