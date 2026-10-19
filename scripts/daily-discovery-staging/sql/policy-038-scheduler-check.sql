create function pg_temp.dd_job_inventory()returns jsonb language plpgsql as $$declare data jsonb;begin
 if to_regclass('cron.job')is null then return jsonb_build_object('cron_table_present',false,'DD_jobs',0);end if;
 execute 'select coalesce(jsonb_agg(jsonb_build_object(''name'',jobname,''active'',active)),''[]''::jsonb)from cron.job where jobname ilike ''%discovery%''or jobname ilike ''%photo%'''into data;
 return jsonb_build_object('cron_table_present',true,'relevant_jobs',data);
end$$;
select pg_temp.dd_job_inventory()evidence;
