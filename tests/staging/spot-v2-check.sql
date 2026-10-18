begin read only;
do $$declare f regprocedure;t text;begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'NOT_STAGING';end if;
 if not exists(select 1 from spot_private.soma_v2_control where spot_enabled and ora_enabled and not discovery_enabled and jobs_paused and not requests_enabled and not comments_enabled and not system_posts_enabled and not share_enabled)then raise exception 'SPOT_FLAGS';end if;
 if not exists(select 1 from spot_private.ora_spot_policy where enabled and timezone='Europe/Rome'and daily_limit=5 and place_daily_limit=3 and quota_retention is null)then raise exception 'QUOTA_POLICY';end if;
 if exists(select 1 from spot_private.photo_cutover_control where phase<>'OPEN'or execute_enabled or scheduler_enabled or epoch<>12)then raise exception 'PHOTO_CHANGED';end if;
 foreach t in array array['spot_v2_intents','spot_v2_operations','spot_v2_fence','ora_spot_daily_quota','ora_spot_place_quota']loop
  if not(select relrowsecurity from pg_class where oid=('spot_private.'||t)::regclass)or has_table_privilege('authenticated','spot_private.'||t,'SELECT,INSERT,UPDATE,DELETE')or has_table_privilege('anon','spot_private.'||t,'SELECT,INSERT,UPDATE,DELETE')then raise exception 'PRIVATE_ACCESS %',t;end if;
 end loop;
 foreach f in array array['public.send_spot(uuid,uuid)'::regprocedure,'public.privacy_prior_send_spot(uuid,uuid)'::regprocedure,'public.express_interest(uuid)'::regprocedure]loop
  if has_function_privilege('authenticated',f,'EXECUTE')or has_function_privilege('anon',f,'EXECUTE')or has_function_privilege('service_role',f,'EXECUTE')then raise exception 'LEGACY_GRANT';end if;
 end loop;
 if position('SPOT_ISOLATION'in(select prosrc from pg_proc where oid='public.send_spot_v2(uuid,uuid,text,uuid)'::regprocedure))=0 then raise exception 'ISOLATION_GUARD';end if;
 if exists(select 1 from auth.users where id::text like 'fea34000-%')or exists(select 1 from public.venues where id::text like 'fea34100-%')or exists(select 1 from spot_private.discovery_windows where id='fea34200-0000-4000-8000-000000000001')or exists(select 1 from storage.objects where name like 'fea34000-%')then raise exception 'FIXTURE_RESIDUE';end if;
 if exists(select 1 from spot_private.spot_v2_intents i left join public.profiles p on p.id=i.sender_id left join public.profiles r on r.id=i.recipient_id where p.id is null or r.id is null)or exists(select 1 from spot_private.ora_spot_daily_quota where used>5)or exists(select 1 from spot_private.ora_spot_place_quota where used>3)then raise exception 'INTEGRITY';end if;
end$$;
select jsonb_build_object('result','PASS','accounts',(select count(*)from auth.users),'profiles',(select count(*)from public.profiles),'legacy_interests',(select count(*)from spot_private.interests),'matches',(select count(*)from public.matches),'messages',(select count(*)from public.messages),'storage',(select count(*)from storage.objects where bucket_id='profile-photos'),
'new_intents',(select count(*)from spot_private.spot_v2_intents),'operations',(select count(*)from spot_private.spot_v2_operations),'daily_quotas',(select count(*)from spot_private.ora_spot_daily_quota),'place_quotas',(select count(*)from spot_private.ora_spot_place_quota),'photo',(select jsonb_build_object('phase',phase,'epoch',epoch,'cleanup',execute_enabled,'scheduler',scheduler_enabled)from spot_private.photo_cutover_control),
'spot_enabled',(select spot_enabled from spot_private.soma_v2_control),'quota_enabled',(select enabled from spot_private.ora_spot_policy),'discovery_enabled',(select discovery_enabled from spot_private.soma_v2_control)) final_check;
commit;
