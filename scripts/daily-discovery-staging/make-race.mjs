import{readFile,writeFile}from'node:fs/promises';const round=process.argv[2]||'1',d=JSON.parse(await readFile('.local/daily-discovery/window'+round+'.json'));for(const side of['a','b']){const target=d.profiles[side==='a'?1:2].id;const q=`begin;
create function pg_temp.try_dd_spot()returns jsonb language plpgsql as $$begin return jsonb_build_object('ok',true,'result',public.send_tribe_spot('${target}',gen_random_uuid()));exception when others then return jsonb_build_object('ok',false,'error',sqlerrm,'sqlstate',sqlstate);end$$;
create temp table dd_quota_result(evidence jsonb);grant insert on dd_quota_result to authenticated;
set local role authenticated;select set_config('request.jwt.claim.sub','fea37000-0000-4000-8000-000000000001',true);
insert into dd_quota_result select jsonb_build_object('pid',pg_backend_pid(),'started',statement_timestamp(),'result',pg_temp.try_dd_spot(),'ended',clock_timestamp());
${side==='a'?'select pg_sleep(10);':''}
commit;select evidence from dd_quota_result;`;
await writeFile('.local/daily-discovery/quota-'+side+'.sql',q.replaceAll('try_dd_spot','try_dd_spot'+round).replaceAll('dd_quota_result','dd_quota_result'+round));}console.log('Prepared concurrent quota boundary round',round);
