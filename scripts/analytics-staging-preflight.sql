do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or exists(select 1 from spot_private.soma_v2_control where discovery_enabled or not jobs_paused)or exists(select 1 from spot_private.photo_cutover_control where execute_enabled or scheduler_enabled)or exists(select 1 from spot_private.notification_control where enabled or delivery_enabled)then raise exception 'ANALYTICS_UNSAFE_STAGING';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='spot_private'and c.relname like 'analytics_%')then raise exception 'ANALYTICS_ALREADY_INSTALLED_OR_COLLISION';end if;
end$$;
select true staging_only,true no_collision;
