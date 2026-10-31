-- ORA only: three distinct visited Places/day, one NEW Spot/Place/day.
begin;
set local lock_timeout='5s';set local statement_timeout='60s';
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or
 (current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'ORA_QUOTA_STAGING_ONLY';end if;
 if to_regclass('spot_private.server_transport_binding')is not null then
  if not exists(select 1 from spot_private.server_transport_binding where singleton and project_ref='zjinjtkekmaqtxsuyvho')then raise exception 'ORA_QUOTA_STAGING_BINDING';end if;
 end if;
 if exists(select 1 from spot_private.ora_spot_place_quota where used>1)or exists(select 1 from spot_private.ora_spot_place_quota group by user_id,local_date having count(*)>3)then raise exception 'ORA_QUOTA_HISTORY_REVIEW_REQUIRED';end if;
end$$;
-- Retain existing tables/FKs/deletion and retention contracts. Daily used is an
-- aggregate receipt only, never a global Spot limit. Place rows now include visits.
alter table spot_private.ora_spot_policy rename column daily_limit to location_daily_limit;
alter table spot_private.ora_spot_policy rename column place_daily_limit to spot_location_daily_limit;
alter table spot_private.ora_spot_policy alter column location_daily_limit set default 3;
alter table spot_private.ora_spot_policy alter column spot_location_daily_limit set default 1;
update spot_private.ora_spot_policy set location_daily_limit=3,spot_location_daily_limit=1;
alter table spot_private.ora_spot_policy add constraint ora_pilot_limits check(location_daily_limit=3 and spot_location_daily_limit=1);
alter table spot_private.ora_spot_place_quota add constraint ora_one_spot_per_location check(used<=1);
create function spot_private.ora_charge_visit(person uuid,place uuid,stamp timestamptz)returns void
language plpgsql volatile security definer set search_path=''as $$declare day date:=(stamp at time zone 'Europe/Rome')::date;cap integer;begin
 perform spot_private.board_lock();
 -- The existing account/day row is also a write fence: RR/serializable snapshots
 -- cannot commit a stale distinct-count after a concurrent visit/Spot.
 insert into spot_private.ora_spot_daily_quota(user_id,local_date,used)values(person,day,0)
 on conflict(user_id,local_date)do update set used=ora_spot_daily_quota.used;
 if exists(select 1 from spot_private.ora_spot_place_quota where user_id=person and place_id=place and local_date=day)then return;end if;
 select location_daily_limit into strict cap from spot_private.ora_spot_policy where singleton for share;
 if(select count(*)from spot_private.ora_spot_place_quota where user_id=person and local_date=day)>=cap then raise exception 'ORA_LOCATION_DAILY_QUOTA'using errcode='P0001';end if;
 insert into spot_private.ora_spot_place_quota(user_id,place_id,local_date,used)values(person,place,day,0);
end$$;
revoke all on function spot_private.ora_charge_visit(uuid,uuid,timestamptz)from public,anon,authenticated,service_role;
do $patch$declare body text;old text;replacement text;begin
 body:=pg_get_functiondef('spot_private.start_ora(uuid,text)'::regprocedure);
 old:='stamp:=clock_timestamp();select * into old from public.checkins where user_id=auth.uid()for update;';
 if strpos(body,old)=0 then raise exception 'ORA_VISIT_DEPENDENCY';end if;
 execute replace(body,old,old||E'\n -- Count any retained presence overlapping this Rome day before switching away.\n if old.checked_in_at<=stamp and old.expires_at>((stamp at time zone ''Europe/Rome'')::date::timestamp at time zone ''Europe/Rome'')then perform spot_private.ora_charge_visit(auth.uid(),old.venue_id,stamp);end if;\n perform spot_private.ora_charge_visit(auth.uid(),place,stamp);');
 body:=pg_get_functiondef('public.send_spot_v2(uuid,uuid,text,uuid)'::regprocedure);
 old:=E'    insert into spot_private.ora_spot_daily_quota(user_id,local_date,used)values(me,day,1)\n     on conflict(user_id,local_date)do update set used=ora_spot_daily_quota.used+1 where ora_spot_daily_quota.used<least(5,pol.daily_limit);\n    if not found then raise exception ''SPOT_DAILY_QUOTA''using errcode=''P0001'';end if;\n    insert into spot_private.ora_spot_place_quota(user_id,place_id,local_date,used)values(me,place,day,1)\n     on conflict(user_id,place_id,local_date)do update set used=ora_spot_place_quota.used+1 where ora_spot_place_quota.used<least(3,pol.place_daily_limit);';
 replacement:=E'    perform spot_private.ora_charge_visit(me,place,stamp);\n    update spot_private.ora_spot_place_quota set used=used+1 where user_id=me and place_id=place and local_date=day and used<pol.spot_location_daily_limit;';
 if strpos(body,old)=0 then raise exception 'ORA_SPOT_DEPENDENCY';end if;
 body:=replace(body,old,replacement);
 old:='if not found then raise exception ''SPOT_PLACE_QUOTA''using errcode=''P0001'';end if;';
 if strpos(body,old)=0 then raise exception 'ORA_SPOT_RESULT_DEPENDENCY';end if;
 execute replace(body,old,old||E'\n    update spot_private.ora_spot_daily_quota set used=used+1 where user_id=me and local_date=day;');
 -- Compatibility payload; both residuals refer only to the current Place.
 body:=pg_get_functiondef('public.my_ora_spot_budget()'::regprocedure);
 old:=E' select used into g from spot_private.ora_spot_daily_quota where user_id=me and local_date=day;\n';
 if strpos(body,old)=0 then raise exception 'ORA_BUDGET_DEPENDENCY';end if;
 body:=replace(body,old,'');
 body:=replace(body,'greatest(0,least(5,p.daily_limit)-coalesce(g,0))','case when place is not null then greatest(0,p.spot_location_daily_limit-coalesce(l,0))else 0 end');
 body:=replace(body,'greatest(0,least(3,p.place_daily_limit)-coalesce(l,0))','greatest(0,p.spot_location_daily_limit-coalesce(l,0))');
 if strpos(body,'least(5,')>0 or strpos(body,'least(3,')>0 then raise exception 'ORA_BUDGET_LIMIT_DEPENDENCY';end if;
 execute body;
end$patch$;
-- Seed only presently active presences; never fabricate an unavailable visit history.
do $$declare r record;begin for r in select user_id,venue_id from public.checkins where expires_at>clock_timestamp()loop
 perform spot_private.ora_charge_visit(r.user_id,r.venue_id,clock_timestamp());end loop;end$$;
notify pgrst,'reload schema';
commit;
