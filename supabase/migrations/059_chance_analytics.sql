begin;
select spot_private.board_lock();
-- Same first-party collection switch, owner scope, 90d purge and no partner/preference dimensions.
alter table spot_private.analytics_events drop constraint analytics_events_event_check;
alter table spot_private.analytics_events add constraint analytics_events_event_check check(event in('signup_completed','auth_success','profile_complete','onboarding_complete','tribe_join','ora_start','spot_created','spot_matched','match_created','first_match','message_sent','conversation_started','post_created','qod_answer','comment_created','like_added','romantic_attempt','romantic_delivered','romantic_accepted','screen_view','dd_view','share_shared','share_copied','share_cancelled','share_resolved','chance_released','chance_revealed','chance_viewed','chance_spot_sent','chance_expired_seen','chance_expired_unseen','chance_match_created'));
alter table spot_private.analytics_events add column chance_slot integer,add column chance_released_at timestamptz,add column chance_revealed_at timestamptz,add column chance_spot_at timestamptz,add column chance_expires_at timestamptz;
alter table spot_private.analytics_fairness drop constraint analytics_fairness_slot_check;
alter table spot_private.analytics_fairness add constraint analytics_fairness_slot_check check(slot in('morning','afternoon')or slot~'^c[1-9][0-9]*$');
create function spot_private.chance_emit(exposure uuid,person uuid,event_name text)returns void language plpgsql security definer set search_path=''as $$declare w spot_private.discovery_windows;s spot_private.chance_state;begin
 if not spot_private.analytics_admitted(person)then return;end if;
 select d.*into w from spot_private.discovery_windows d join spot_private.discovery_exposures e on e.window_id=d.id where e.id=exposure;
 select *into s from spot_private.chance_state where exposure_id=exposure and user_id=person;
 if s.user_id is null or w.id is null then return;end if;
 perform spot_private.analytics_emit(person,event_name,'tribe',exposure::text,event_name in('chance_revealed','chance_viewed','chance_spot_sent'));
 update spot_private.analytics_events set chance_slot=w.chance_number,chance_released_at=w.starts_at,chance_revealed_at=s.first_revealed_at,chance_spot_at=s.spot_sent_at,chance_expires_at=w.ends_at where user_id=person and event=event_name and dedupe=md5(person::text||':'||exposure::text);
 exception when others then begin update spot_private.analytics_control set dropped=dropped+1;exception when others then null;end;
end$$;
create function spot_private.chance_state_analytics()returns trigger language plpgsql security definer set search_path=''as $$begin
 if tg_op='INSERT'then perform spot_private.chance_emit(new.exposure_id,new.user_id,'chance_released');return null;end if;
 if old.first_revealed_at is null and new.first_revealed_at is not null then perform spot_private.chance_emit(new.exposure_id,new.user_id,'chance_revealed');end if;
 if old.first_viewed_at is null and new.first_viewed_at is not null then perform spot_private.chance_emit(new.exposure_id,new.user_id,'chance_viewed');end if;
 if old.spot_sent_at is null and new.spot_sent_at is not null then perform spot_private.chance_emit(new.exposure_id,new.user_id,'chance_spot_sent');end if;
 if old.expiry_observed_at is null and new.expiry_observed_at is not null then perform spot_private.chance_emit(new.exposure_id,new.user_id,case when new.first_viewed_at is null then 'chance_expired_unseen'else 'chance_expired_seen'end);end if;
 return null;
end$$;
create trigger chance_state_analytics after insert or update on spot_private.chance_state for each row execute function spot_private.chance_state_analytics();
create function spot_private.chance_match_analytics()returns trigger language plpgsql security definer set search_path=''as $$declare s record;begin
 if new.state='matched'and old.state is distinct from 'matched'and new.exposure_id is not null then
  for s in select user_id from spot_private.chance_state where exposure_id=new.exposure_id loop perform spot_private.chance_emit(new.exposure_id,s.user_id,'chance_match_created');end loop;
 end if;return null;
end$$;
create trigger chance_match_analytics after update of state on spot_private.spot_v2_intents for each row execute function spot_private.chance_match_analytics();
create function spot_private.chance_expiry_observe()returns void language plpgsql security definer set search_path=''as $$begin
 perform spot_private.board_lock();
 update spot_private.chance_state s set expiry_observed_at=clock_timestamp()where(s.exposure_id,s.user_id)in(select c.exposure_id,c.user_id from spot_private.chance_state c join spot_private.discovery_exposures e on e.id=c.exposure_id join spot_private.discovery_windows w on w.id=e.window_id where c.expiry_observed_at is null and w.ends_at<=clock_timestamp()order by w.ends_at,e.id,c.user_id limit 500);
end$$;
do $$declare body text;begin
 body:=pg_get_functiondef('spot_private.chance_release_due()'::regprocedure);
 if strpos(body,'for d in select generate_series')=0 then raise exception 'CHANCE_ANALYTICS_DEPENDENCY';end if;
 execute replace(body,'for d in select generate_series','perform spot_private.chance_expiry_observe();for d in select generate_series');
end$$;
revoke all on function spot_private.chance_emit(uuid,uuid,text),spot_private.chance_state_analytics(),spot_private.chance_match_analytics(),spot_private.chance_expiry_observe()from public,anon,authenticated,service_role;
notify pgrst,'reload schema';commit;
