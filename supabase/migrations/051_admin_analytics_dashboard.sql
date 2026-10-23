begin;
set local lock_timeout='5s';set local statement_timeout='60s';
do $$begin if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'DASHBOARD_STAGING_ONLY';end if;end$$;
-- Presentation suppression only. No changes to collection, product tables, roles or flags.
create function spot_private.dashboard_count(amount bigint,contributors bigint)returns jsonb language sql immutable set search_path=''as $$
 select case when contributors<10 then jsonb_build_object('status','suppressed','value',null)else jsonb_build_object('status','available','value',(amount/10)*10,'precision','lower_bound_10')end;$$;
revoke all on function spot_private.dashboard_count(bigint,bigint)from public,anon,authenticated,service_role;
create function public.admin_analytics_dashboard(weeks_ago integer default 0)returns jsonb language plpgsql stable security definer set search_path=''as $$
declare start_day date;end_day date;lo timestamptz;hi timestamptz;metrics jsonb:='{}';trend jsonb:='[]';fair jsonb;item record;n bigint;c bigint;bins jsonb;safe boolean;ret jsonb:='{}';
begin
 if spot_private.moderation_role() is distinct from 'ADMIN'then raise exception 'DASHBOARD_DENIED'using errcode='42501';end if;
 if weeks_ago is null or weeks_ago not between 0 and 10 then raise exception 'DASHBOARD_RANGE';end if;
 -- Only whole, non-overlapping closed Rome weeks. No arbitrary time/entity slicing.
 end_day:=date_trunc('week',clock_timestamp()at time zone 'Europe/Rome')::date-weeks_ago*7;
 start_day:=end_day-7;lo:=start_day::timestamp at time zone 'Europe/Rome';hi:=end_day::timestamp at time zone 'Europe/Rome';
 for item in select e.event,s.surface,count(a.id) amount,count(distinct a.user_id) contributors from unnest(array['signup_completed','auth_success','profile_complete','onboarding_complete','tribe_join','ora_start','spot_created','spot_matched','match_created','first_match','message_sent','conversation_started','post_created','qod_answer','comment_created','like_added','romantic_attempt','romantic_delivered','romantic_accepted','screen_view','dd_view','share_shared','share_copied','share_cancelled','share_resolved'])e(event)cross join unnest(array['account','tribe','ora','spotted','match','profile'])s(surface)left join spot_private.analytics_events a on a.event=e.event and a.surface=s.surface and a.created_at>=lo and a.created_at<hi and a.created_at>clock_timestamp()-interval '90 days' group by e.event,s.surface loop
  metrics:=metrics||jsonb_build_object(item.event||':'||item.surface,spot_private.dashboard_count(item.amount,item.contributors),item.event||':'||item.surface||':users',spot_private.dashboard_count(item.contributors,item.contributors));
 end loop;
 -- Missing event keys are intentionally indistinguishable from suppressed cohorts.
 for item in select 'dau' key,1 span union all select 'wau',7 union all select 'mau',30 loop
  select count(distinct user_id)into c from spot_private.analytics_days where day>=end_day-item.span and day<end_day and created_at>clock_timestamp()-interval '90 days';
  metrics:=metrics||jsonb_build_object(item.key,spot_private.dashboard_count(c,c));
 end loop;
 -- Count distinct observed milestones, never label observed signups as all Auth accounts.
 for item in select unnest(array['signup_completed','onboarding_complete','first_match']) event loop
  select count(distinct user_id)into c from spot_private.analytics_events where event=item.event and created_at>=lo and created_at<hi and created_at>clock_timestamp()-interval '90 days';
  metrics:=metrics||jsonb_build_object(item.event||'_users',spot_private.dashboard_count(c,c));
 end loop;
 -- Retention uses the canonical 050 registration-day/observed-account definition.
 -- Cohorts are drawn from the selected week; all must have matured before release.
 for item in select unnest(array[1,7,30]) offset_days loop
  if end_day-1+item.offset_days>(clock_timestamp()at time zone 'Europe/Rome')::date then
   ret:=ret||jsonb_build_object('d'||item.offset_days,jsonb_build_object('status','immature','value',null));continue;
  end if;
  with cohort as(select distinct d.user_id,(u.created_at at time zone 'Europe/Rome')::date registered from spot_private.analytics_days d join auth.users u on u.id=d.user_id where (u.created_at at time zone 'Europe/Rome')::date>=start_day and(u.created_at at time zone 'Europe/Rome')::date<end_day and u.created_at>clock_timestamp()-interval '90 days')
  select count(*),count(*)filter(where exists(select 1 from spot_private.analytics_days a where a.user_id=cohort.user_id and a.day=cohort.registered+item.offset_days and a.created_at>clock_timestamp()-interval '90 days'))into c,n from cohort;
  if n>=10 and c-n>=10 then
   ret:=ret||jsonb_build_object('d'||item.offset_days,jsonb_build_object('status','available','returned_lower_bound',(n/10)*10,'eligible_lower_bound',(c/10)*10));
  else ret:=ret||jsonb_build_object('d'||item.offset_days,jsonb_build_object('status','suppressed','value',null));end if;
 end loop;
 -- Distribution released as a unit: no total/complement can reveal a suppressed bin.
 -- Each account contributes once, using its mean assignments across observed windows.
 with per_user as(select user_id,floor(avg(assignments))::int bucket from spot_private.analytics_fairness where day>=start_day and day<end_day and created_at>clock_timestamp()-interval '90 days' group by user_id),dist as(select k,count(p.user_id)::bigint n from generate_series(0,4)k left join per_user p on p.bucket=k group by k)
 select bool_and(dist.n>=10),jsonb_agg(jsonb_build_object('bucket',k,'accounts_lower_bound',(dist.n/10)*10)order by k)into safe,bins from dist;
 fair:=case when coalesce(safe,false)then jsonb_build_object('status','available','distribution',bins)else jsonb_build_object('status','suppressed','distribution',null)end;
 if coalesce(safe,false)then
  select count(*),coalesce(sum(assignments),0)into c,n from spot_private.analytics_fairness where day>=start_day and day<end_day and created_at>clock_timestamp()-interval '90 days';
  metrics:=metrics||jsonb_build_object('dd_assignments',spot_private.dashboard_count(n,10),'dd_average',jsonb_build_object('status','available','band',floor(n::numeric/c*2)/2,'band_width',0.5));
 else metrics:=metrics||jsonb_build_object('dd_assignments',jsonb_build_object('status','suppressed','value',null),'dd_average',jsonb_build_object('status','suppressed','value',null));end if;
 -- Trend periods never overlap; each point independently meets the same threshold.
 for item in select generate_series(0,3) ago loop
  select count(distinct user_id)into c from spot_private.analytics_days where day>=end_day-(item.ago+1)*7 and day<end_day-item.ago*7 and created_at>clock_timestamp()-interval '90 days';
  trend:=trend||jsonb_build_array(jsonb_build_object('start',end_day-(item.ago+1)*7,'active',spot_private.dashboard_count(c,c)));
 end loop;
 return jsonb_build_object('period',jsonb_build_object('start',start_day,'end_exclusive',end_day,'zone','Europe/Rome'),'threshold',10,'collection_enabled',(select enabled from spot_private.analytics_control),'metrics',metrics,'retention',ret,'fairness',fair,'trend',trend,'entity_filters_supported',false);
end$$;
revoke all on function public.admin_analytics_dashboard(integer)from public,anon,service_role;
grant execute on function public.admin_analytics_dashboard(integer)to authenticated;
notify pgrst,'reload schema';
commit;
