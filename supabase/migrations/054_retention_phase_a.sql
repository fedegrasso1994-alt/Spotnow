begin;
set local lock_timeout='5s'; set local statement_timeout='60s';
do $$begin if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'PHASE_A_STAGING_ONLY';end if;end$$;
-- No activation, schedule, external transport or PHOTO integration.
create table spot_private.retention_phase_a_control(singleton boolean primary key default true check(singleton),manual_enabled boolean not null default false,scheduler_enabled boolean not null default false);
insert into spot_private.retention_phase_a_control default values;
create table spot_private.retention_phase_a_runs(
 operation_id uuid primary key,path text not null check(path in('analytics','observability','dd','notifications')),
 dry_run boolean not null,batch_limit integer not null check(batch_limit between 1 and 200),
 started_at timestamptz not null,finished_at timestamptz not null,status text not null check(status in('completed','paused','busy','failed')),
 eligible integer not null default 0,deleted integer not null default 0,protected integer not null default 0,skipped integer not null default 0,
 error_code text check(error_code in('SCHEMA_DRIFT','DEPENDENCY','INTERNAL')),check(finished_at>=started_at));
create index analytics_days_retention on spot_private.analytics_days(created_at);
create index analytics_fairness_retention on spot_private.analytics_fairness(created_at);
create index ops_admission_retention on spot_private.ops_admission(created_at);
create index push_binding_retention on spot_private.push_bindings(expires_at);
create index retention_phase_a_runs_age on spot_private.retention_phase_a_runs(finished_at,operation_id);
alter table spot_private.retention_phase_a_control enable row level security;
alter table spot_private.retention_phase_a_runs enable row level security;
revoke all on spot_private.retention_phase_a_control,spot_private.retention_phase_a_runs from public,anon,authenticated,service_role;
-- 14d diagnostic run receipts, not a new product/idempotency retention policy.
create function spot_private.phase_a_held(rel text,k jsonb,people uuid[] default '{}',w uuid default null)returns boolean language sql stable security definer set search_path=''as $$
 select exists(select 1 from spot_private.safety_holds h where h.released_at is null and(
 (h.category=rel and(h.target=k::text or h.target=(select string_agg(value,'/'order by key)from jsonb_each_text(k))))
 or(w is not null and h.category='dd_windows'and h.target=w::text)
 or(h.category in('account','dd_account','analytics_account','notification_account')and h.target=any(select u::text from unnest(people)u))));
$$;
-- Unknown new inbound FK => stop the category, including SET NULL side effects.
create function spot_private.phase_a_fk_check(rel regclass)returns void language plpgsql security definer set search_path=''as $$declare c record;begin
 for c in select conrelid,confdeltype from pg_constraint where contype='f'and confrelid=rel loop
 if not((rel='spot_private.discovery_windows'::regclass and c.conrelid in('spot_private.discovery_allocations'::regclass,'spot_private.discovery_exposures'::regclass,'spot_private.interests'::regclass))
 or(rel='spot_private.discovery_exposures'::regclass and c.conrelid='spot_private.spot_v2_intents'::regclass)
 or(rel='spot_private.push_bindings'::regclass and c.conrelid='spot_private.notification_deliveries'::regclass))then raise exception 'PHASE_A_SCHEMA_DRIFT';end if;
 end loop;
end$$;
-- Internal candidates only. No identifiers/payloads are exposed in run responses.
create function spot_private.phase_a_candidates(path text,stamp timestamptz,target_rel text default null,target_key jsonb default null)returns table(rel text,k jsonb,held boolean,due timestamptz)language plpgsql stable security definer set search_path=''set timezone='UTC'as $$begin
 if path='analytics'then
 return query select 'analytics_events',jsonb_build_object('id',e.id),spot_private.phase_a_held('analytics_events',jsonb_build_object('id',e.id),array[e.user_id]),e.created_at from spot_private.analytics_events e where e.created_at<stamp-interval '90 days' and(target_rel is null or target_rel='analytics_events')and(target_key is null or(e.id=(target_key->>'id')::uuid));
 return query select 'analytics_days',jsonb_build_object('user_id',d.user_id,'day',d.day),spot_private.phase_a_held('analytics_days',jsonb_build_object('user_id',d.user_id,'day',d.day),array[d.user_id]),d.created_at from spot_private.analytics_days d where d.created_at<stamp-interval '90 days' and(target_rel is null or target_rel='analytics_days')and(target_key is null or(d.user_id=(target_key->>'user_id')::uuid and d.day=(target_key->>'day')::date));
 return query select 'analytics_fairness',jsonb_build_object('user_id',f.user_id,'day',f.day,'slot',f.slot),spot_private.phase_a_held('analytics_fairness',jsonb_build_object('user_id',f.user_id,'day',f.day,'slot',f.slot),array[f.user_id]),f.created_at from spot_private.analytics_fairness f where f.created_at<stamp-interval '90 days' and(target_rel is null or target_rel='analytics_fairness')and(target_key is null or(f.user_id=(target_key->>'user_id')::uuid and f.day=(target_key->>'day')::date and f.slot=(target_key->>'slot')::text));
 -- No rollup creation or purge in Phase A.
 elsif path='observability'then
 return query select 'ops_events',jsonb_build_object('id',e.id),spot_private.phase_a_held('ops_events',jsonb_build_object('id',e.id)),e.created_at from spot_private.ops_events e where e.created_at<stamp-interval '14 days' and(target_rel is null or target_rel='ops_events')and(target_key is null or(e.id=(target_key->>'id')::bigint));
 return query select 'ops_admission',jsonb_build_object('request_id',e.request_id),spot_private.phase_a_held('ops_admission',jsonb_build_object('request_id',e.request_id)),e.created_at from spot_private.ops_admission e where e.created_at<stamp-interval '14 days' and(target_rel is null or target_rel='ops_admission')and(target_key is null or(e.request_id=(target_key->>'request_id')::uuid));
 -- Rolling minimal operational state: preserve an incident still receiving failures.
 -- No event history is retained by this exception; no account/content fields exist.
 return query select 'ops_incidents',jsonb_build_object('id',e.id),spot_private.phase_a_held('ops_incidents',jsonb_build_object('id',e.id))or(e.state='open'and e.last_failure_at>stamp-interval '14 days'),e.opened_at from spot_private.ops_incidents e where e.opened_at<stamp-interval '14 days' and(target_rel is null or target_rel='ops_incidents')and(target_key is null or(e.id=(target_key->>'id')::uuid));
 return query select 'ops_jobs',jsonb_build_object('operation',e.operation),spot_private.phase_a_held('ops_jobs',jsonb_build_object('operation',e.operation)),e.updated_at from spot_private.ops_jobs e where e.updated_at<stamp-interval '14 days' and(target_rel is null or target_rel='ops_jobs')and(target_key is null or(e.operation=(target_key->>'operation')::text));
 return query select 'retention_phase_a_runs',jsonb_build_object('operation_id',e.operation_id),spot_private.phase_a_held('retention_phase_a_runs',jsonb_build_object('operation_id',e.operation_id)),e.finished_at from spot_private.retention_phase_a_runs e where e.finished_at<stamp-interval '14 days' and(target_rel is null or target_rel='retention_phase_a_runs')and(target_key is null or(e.operation_id=(target_key->>'operation_id')::uuid));
 elsif path='dd'then
 return query select 'discovery_exposures',jsonb_build_object('id',e.id),spot_private.dd_retention_held('dd_exposures',e.id::text,array[e.user_a,e.user_b],w.id)
 or spot_private.phase_a_held('discovery_exposures',jsonb_build_object('id',e.id),array[e.user_a,e.user_b],w.id)
 or exists(select 1 from spot_private.spot_v2_intents s where s.exposure_id=e.id)
 or exists(select 1 from spot_private.spot_v2_operations s where s.exposure_id=e.id),w.ends_at
 from spot_private.discovery_exposures e join spot_private.discovery_windows w on w.id=e.window_id where w.ends_at<stamp-interval '30 days'and w.state in('ready','closed')and w.lease_until is null and(target_rel is null or target_rel='discovery_exposures')and(target_key is null or(e.id=(target_key->>'id')::uuid));
 return query select 'discovery_allocations',jsonb_build_object('window_id',a.window_id,'user_id',a.user_id),spot_private.dd_retention_held('dd_allocations',a.window_id::text||'/'||a.user_id::text,array[a.user_id],w.id)
 or spot_private.phase_a_held('discovery_allocations',jsonb_build_object('window_id',a.window_id,'user_id',a.user_id),array[a.user_id],w.id)
 or exists(select 1 from spot_private.discovery_exposures e where e.window_id=a.window_id and a.user_id in(e.user_a,e.user_b)),w.ends_at
 from spot_private.discovery_allocations a join spot_private.discovery_windows w on w.id=a.window_id where w.ends_at<stamp-interval '30 days'and w.state in('ready','closed')and w.lease_until is null and(target_rel is null or target_rel='discovery_allocations')and(target_key is null or(a.window_id=(target_key->>'window_id')::uuid and a.user_id=(target_key->>'user_id')::uuid));
 return query select 'discovery_windows',jsonb_build_object('id',w.id),spot_private.retention_held('dd_windows',w.id::text)or spot_private.phase_a_held('discovery_windows',jsonb_build_object('id',w.id))
 or exists(select 1 from spot_private.discovery_exposures e where e.window_id=w.id)
 or exists(select 1 from spot_private.discovery_allocations a where a.window_id=w.id)
 or exists(select 1 from spot_private.interests i where i.origin_window_id=w.id),w.ends_at
 from spot_private.discovery_windows w where w.ends_at<stamp-interval '30 days'and w.state in('ready','closed')and w.lease_until is null and(target_rel is null or target_rel='discovery_windows')and(target_key is null or(w.id=(target_key->>'id')::uuid));
 return query select 'discovery_pair_memory',jsonb_build_object('user_a',m.user_a,'user_b',m.user_b),spot_private.dd_retention_held('dd_pair_memory',m.user_a::text||'/'||m.user_b::text,array[m.user_a,m.user_b])or spot_private.phase_a_held('discovery_pair_memory',jsonb_build_object('user_a',m.user_a,'user_b',m.user_b),array[m.user_a,m.user_b]),m.last_exposed_at
 from spot_private.discovery_pair_memory m where m.last_exposed_at<stamp-interval '30 days'and m.purge_after<stamp and(target_rel is null or target_rel='discovery_pair_memory')and(target_key is null or(m.user_a=(target_key->>'user_a')::uuid and m.user_b=(target_key->>'user_b')::uuid));
 return query select 'discovery_fairness_buckets',jsonb_build_object('user_id',f.user_id,'bucket_date',f.bucket_date),spot_private.dd_retention_held('dd_fairness',f.user_id::text||'/'||f.bucket_date::text,array[f.user_id])or spot_private.phase_a_held('discovery_fairness_buckets',jsonb_build_object('user_id',f.user_id,'bucket_date',f.bucket_date),array[f.user_id]),f.purge_after from spot_private.discovery_fairness_buckets f where f.purge_after<stamp and(target_rel is null or target_rel='discovery_fairness_buckets')and(target_key is null or(f.user_id=(target_key->>'user_id')::uuid and f.bucket_date=(target_key->>'bucket_date')::date));
 elsif path='notifications'then
 -- Only stale/revoked subscriptions. Outbox retention/dispatch are NOT scheduled here.
 -- Drain terminal/ready child rows explicitly, bounded; NEVER cascade-delete them.
 return query select 'notification_deliveries',jsonb_build_object('id',d.id),spot_private.phase_a_held('push_bindings',jsonb_build_object('id',b.id),array[b.owner_id])or spot_private.phase_a_held('notification_deliveries',jsonb_build_object('id',d.id),array[b.owner_id])or spot_private.phase_a_held('notification_events',jsonb_build_object('id',d.event_id),array[b.owner_id])or d.state in('sending','unknown'),b.expires_at
 from spot_private.notification_deliveries d join spot_private.push_bindings b on b.id=d.binding_id where (b.expires_at<stamp or not b.active)and(target_rel is null or target_rel='notification_deliveries')and(target_key is null or(d.id=(target_key->>'id')::uuid));
 return query select 'push_bindings',jsonb_build_object('id',b.id),spot_private.phase_a_held('push_bindings',jsonb_build_object('id',b.id),array[b.owner_id])or exists(select 1 from spot_private.notification_deliveries d where d.binding_id=b.id),b.expires_at from spot_private.push_bindings b where (b.expires_at<stamp or not b.active)and(target_rel is null or target_rel='push_bindings')and(target_key is null or(b.id=(target_key->>'id')::uuid));
 else raise exception 'PHASE_A_PATH';end if;
end$$;
create function public.retention_phase_a_batch(path text,operation_id uuid,dry_run boolean default true,batch_limit integer default 100)returns jsonb language plpgsql security definer set search_path=''set timezone='UTC'as $$declare
 started timestamptz:=clock_timestamp();finished timestamptz;prior spot_private.retention_phase_a_runs;item record;predicate text;locked boolean;n integer:=0;deleted integer:=0;protected integer:=0;skipped integer:=0;changed integer;state text:='completed';err text;result jsonb;
begin
 if path is null or path not in('analytics','observability','dd','notifications')or operation_id is null or dry_run is null or batch_limit is null or batch_limit<1 or batch_limit>200 then raise exception 'PHASE_A_INPUT';end if;
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'PHASE_A_STAGING_ONLY';end if;
 -- Non-waiting admission: no queued long global retention lock. Each RPC is one bounded transaction.
 if not pg_try_advisory_xact_lock(hashtextextended('privacy-retention',23))then return jsonb_build_object('status','busy','path',path,'started_at',started,'finished_at',clock_timestamp(),'eligible',0,'deleted',0,'protected',0,'skipped',0,'error_code',null);end if;
 select *into prior from spot_private.retention_phase_a_runs r where r.operation_id=retention_phase_a_batch.operation_id;
 if found then
 if prior.path<>path or prior.dry_run<>dry_run or prior.batch_limit<>batch_limit then raise exception 'PHASE_A_OPERATION_CONFLICT';end if;
 if prior.status in('completed','paused')then return to_jsonb(prior)||jsonb_build_object('replay',true);end if;
 end if;
 if not dry_run and not(select manual_enabled from spot_private.retention_phase_a_control)then state:='paused';else
 begin
 -- Lock order matches writer/hold domains; do not enable any product feature.
 if path='observability'and not pg_try_advisory_xact_lock(hashtextextended('soma-operational-recorder',53))then state:='busy';
 elsif path='analytics'and not pg_try_advisory_xact_lock(hashtextextended('analytics-retention',50))then state:='busy';end if;
 if state<>'busy'then
 select count(*)into protected from(select 1 from spot_private.phase_a_candidates(path,started,null,null)c where c.held limit batch_limit)x;
 for item in select *from spot_private.phase_a_candidates(path,started,null,null)c where not c.held order by c.due,c.rel,c.k::text limit batch_limit loop
 perform spot_private.phase_a_fk_check(('spot_private.'||item.rel)::regclass);
 n:=n+1;if dry_run then continue;end if;
 select string_agg(format('t.%I = ($1->>%L)::%s',a.attname,a.attname,format_type(a.atttypid,a.atttypmod)),' and 'order by a.attname)into predicate from pg_attribute a where a.attrelid=('spot_private.'||item.rel)::regclass and a.attname in(select jsonb_object_keys(item.k))and not a.attisdropped;
 -- FK insertions need KEY SHARE; FOR UPDATE fences new children until the recheck/delete.
 execute format('select true from spot_private.%I t where %s for update skip locked',item.rel,predicate)into locked using item.k;
 if not coalesce(locked,false)then skipped:=skipped+1;continue;end if;
 if not exists(select 1 from spot_private.phase_a_candidates(path,started,item.rel,item.k)c where c.rel=item.rel and c.k=item.k and not c.held)then skipped:=skipped+1;continue;end if;
 execute format('delete from spot_private.%I t where %s',item.rel,predicate)using item.k;get diagnostics changed=row_count;deleted:=deleted+changed;
 end loop;end if;
 exception when others then
 -- Entire category batch rolls back; no raw message/stack/content is persisted.
 state:='failed';deleted:=0;err:=case when sqlerrm='PHASE_A_SCHEMA_DRIFT'then 'SCHEMA_DRIFT'when sqlstate in('55P03','40P01','57014','23503')then 'DEPENDENCY'else 'INTERNAL'end;
 end;end if;
 finished:=clock_timestamp();
 insert into spot_private.retention_phase_a_runs values(operation_id,path,dry_run,batch_limit,started,finished,state,n,deleted,protected,skipped,err)
 on conflict on constraint retention_phase_a_runs_pkey do update set started_at=excluded.started_at,finished_at=excluded.finished_at,status=excluded.status,eligible=excluded.eligible,deleted=excluded.deleted,protected=excluded.protected,skipped=excluded.skipped,error_code=excluded.error_code;
 select to_jsonb(r)into result from spot_private.retention_phase_a_runs r where r.operation_id=retention_phase_a_batch.operation_id;return result;
end$$;
create function public.retention_phase_a_status()returns jsonb language sql stable security definer set search_path=''as $$
 select jsonb_build_object('control',(select to_jsonb(c)from spot_private.retention_phase_a_control c),'runs',(select coalesce(jsonb_agg(to_jsonb(r)),'[]')from(select *from spot_private.retention_phase_a_runs order by finished_at desc limit 50)r));
$$;
revoke all on function spot_private.phase_a_held(text,jsonb,uuid[],uuid),spot_private.phase_a_fk_check(regclass),spot_private.phase_a_candidates(text,timestamptz,text,jsonb),public.retention_phase_a_batch(text,uuid,boolean,integer),public.retention_phase_a_status()from public,anon,authenticated,service_role;
grant execute on function public.retention_phase_a_batch(text,uuid,boolean,integer),public.retention_phase_a_status()to service_role;
notify pgrst,'reload schema';commit;
