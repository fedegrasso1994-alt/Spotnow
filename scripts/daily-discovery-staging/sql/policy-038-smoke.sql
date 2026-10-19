begin;
do $$declare c record;begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'STAGING_ONLY';end if;
 if exists(select 1 from spot_private.soma_v2_control where discovery_enabled or not jobs_paused)then raise exception 'DD_NOT_OFF';end if;
 select *into c from spot_private.dd_clock_at('2026-10-19 07:59:59 Europe/Rome');if c.slot is not null then raise exception 'BEFORE08';end if;
 select *into c from spot_private.dd_clock_at('2026-10-19 08:00 Europe/Rome');if c.slot<>'morning'or c.ends_at<>'2026-10-19 16:00 Europe/Rome'::timestamptz then raise exception 'AT08';end if;
 select *into c from spot_private.dd_clock_at('2026-10-19 15:59:59 Europe/Rome');if c.slot<>'morning'then raise exception 'BEFORE16';end if;
 select *into c from spot_private.dd_clock_at('2026-10-19 16:00 Europe/Rome');if c.slot<>'afternoon'or c.ends_at<>'2026-10-20 00:00 Europe/Rome'::timestamptz or c.next_window_starts_at<>'2026-10-20 08:00 Europe/Rome'::timestamptz then raise exception 'AT16';end if;
 select *into c from spot_private.dd_clock_at('2026-10-20 00:00 Europe/Rome');if c.slot is not null or c.next_window_starts_at<>'2026-10-20 08:00 Europe/Rome'::timestamptz then raise exception 'MIDNIGHT';end if;
 select *into c from spot_private.dd_clock_at('2026-03-29 00:00 Europe/Rome');if c.next_window_starts_at-'2026-03-29 00:00 Europe/Rome'::timestamptz<>interval '7 hours'then raise exception 'SPRING_DST';end if;
 select *into c from spot_private.dd_clock_at('2026-10-25 00:00 Europe/Rome');if c.next_window_starts_at-'2026-10-25 00:00 Europe/Rome'::timestamptz<>interval '9 hours'then raise exception 'AUTUMN_DST';end if;
 if has_function_privilege('authenticated','spot_private.dd_current_projection()','execute')or has_function_privilege('anon','public.my_daily_discovery()','execute')or has_function_privilege('authenticated','spot_private.dd_retention_preview(integer)','execute')then raise exception 'UNEXPECTED_GRANT';end if;
 if not has_function_privilege('authenticated','public.my_daily_discovery()','execute')then raise exception 'RPC_UNAVAILABLE';end if;
end$$;
select jsonb_build_object('project','zjinjtkekmaqtxsuyvho','calendar_DST','PASS','private_grants','PASS','discovery_enabled',(select discovery_enabled from spot_private.soma_v2_control),'jobs_paused',(select jobs_paused from spot_private.soma_v2_control),'preview',spot_private.dd_retention_preview(100),'policy2',(select to_jsonb(p)from spot_private.discovery_policy p where version=2))evidence;
rollback;
