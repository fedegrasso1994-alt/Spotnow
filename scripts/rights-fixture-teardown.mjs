/** Explicit teardown for TWO proven temporary fixtures. Never a product retention policy. */
const valid=value=>typeof value==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export function rightsFixtureTeardown({owners,venueId,caseIds=[],operationId,pausedOperationId}){
 if(!Array.isArray(owners)||owners.length!==2||new Set(owners.map(o=>o.id)).size!==2||owners.some(o=>!valid(o.id)||o.deleted!==true)||!valid(venueId)||!valid(operationId)||!valid(pausedOperationId)||caseIds.length>16||caseIds.some(id=>!valid(id)))throw Error('EXACT_COMPLETED_FIXTURES_REQUIRED');
 const ids=owners.map(o=>`'${o.id}'::uuid`).join(','),targets=[...owners.map(o=>o.id),...caseIds].map(id=>`'${id}'`).join(',');
 return `begin;
do $$declare u uuid; c spot_private.photo_cutover_control; dry jsonb; replay jsonb; paused_result jsonb; begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging') then raise exception 'STAGING_ONLY';end if;
 select * into c from spot_private.photo_cutover_control where singleton;
 if c.phase not in('CANARY','PAUSED') or c.execute_enabled or c.scheduler_enabled or (select paused from spot_private.retention_control where singleton) is distinct from true then raise exception 'SAFE_GATES_REQUIRED';end if;
 if c.phase='CANARY' and (cardinality(c.canary_users)<>2 or not(c.canary_users @> array[${ids}])) or c.phase='PAUSED' and cardinality(c.canary_users)<>0 then raise exception 'FIXTURE_FENCE_REQUIRED';end if;
 foreach u in array array[${ids}] loop
  if exists(select 1 from auth.users where id=u) or exists(select 1 from public.profiles where id=u) or exists(select 1 from storage.objects where bucket_id='profile-photos' and split_part(name,'/',1)=u::text) then raise exception 'FIXTURE_NOT_DELETED';end if;
  if exists(select 1 from spot_private.photo_upload_jobs where user_id=u) or exists(select 1 from spot_private.photo_lifecycle_sets where user_id=u and (state<>'purged' or writer<>'settled' or reserved_bytes<>0 or claim_token is not null or claim_until is not null)) or exists(select 1 from spot_private.photo_cleanup_accounts where user_id=u and (state<>'completed' or claim_token is not null or claim_until is not null)) or exists(select 1 from spot_private.photo_cutover_attempts where user_id=u and writer<>'settled') or exists(select 1 from spot_private.photo_cutover_deletions where user_id=u and not completed) then raise exception 'UNCLASSIFIED_FIXTURE_WRITER';end if;
 end loop;
 if exists(select 1 from spot_private.safety_holds h where released_at is null and (target in(${targets}) or exists(select 1 from unnest(array[${ids}]) x(id) where strpos(h.target,x.id::text)>0))) then raise exception 'HELD_FIXTURE_REVIEW_REQUIRED';end if;
 -- Real job dry-run/replay; live execution remains paused and cannot touch other accounts.
 dry:=public.privacy_retention_run('checkins','${operationId}',true);
 replay:=public.privacy_retention_run('checkins','${operationId}',true);
 paused_result:=public.privacy_retention_run('checkins','${pausedOperationId}',false);
 if replay->>'replay' is distinct from 'true' or paused_result->>'paused' is distinct from 'true' then raise exception 'RETENTION_GATE';end if;
 if exists(select 1 from auth.users where id=any(array[${ids}])) or exists(select 1 from public.checkins where user_id=any(array[${ids}])) or exists(select 1 from public.profiles where id=any(array[${ids}])) then raise exception 'RECREATED_FIXTURE';end if;
end$$;
-- Remove only receipts of known completed disposable fixtures, AFTER normal deletion proof.
-- This does not claim ordinary delete has zero receipts or change the seven-day PHOTO policy.
delete from spot_private.photo_review_audit where split_part(path,'/',1)=any(array[${ids}]::text[]);
delete from spot_private.photo_lifecycle_anomalies where split_part(path,'/',1)=any(array[${ids}]::text[]);
delete from spot_private.photo_cutover_audit where owner_id=any(array[${ids}]) or split_part(path,'/',1)=any(array[${ids}]::text[]) or split_part(previous_path,'/',1)=any(array[${ids}]::text[]);
delete from spot_private.photo_cutover_deletions where user_id=any(array[${ids}]) and completed;
delete from spot_private.photo_cutover_attempts where user_id=any(array[${ids}]) and writer='settled';
delete from spot_private.photo_lifecycle_sets where user_id=any(array[${ids}]) and state='purged' and writer='settled' and reserved_bytes=0;
delete from spot_private.photo_cleanup_accounts where user_id=any(array[${ids}]) and state='completed';
delete from spot_private.retention_runs where operation_id='${operationId}';
do $$begin
 if exists(select 1 from public.checkins where venue_id='${venueId}') or exists(select 1 from spot_private.tribe_memberships where venue_id='${venueId}') or exists(select 1 from public.matches where venue_id='${venueId}') then raise exception 'LIVE_FIXTURE_VENUE';end if;
 if (select phase from spot_private.photo_cutover_control where singleton)='CANARY' then perform public.photo_cutover_set('pause','rights-http','fixture-smoke-completed');update spot_private.photo_cutover_control set canary_users='{}',cleanup_all=false where singleton and phase='PAUSED';end if;
end$$;
delete from public.venues where id='${venueId}' and name='RIGHTS SYNTHETIC VENUE' and address='Synthetic staging only';
commit;
select jsonb_build_object('accounts',(select count(*) from auth.users),'profiles',(select count(*) from public.profiles),'photo_objects',(select count(*) from storage.objects where bucket_id='profile-photos'),'fixture_accounts',(select count(*) from auth.users where id=any(array[${ids}])),'fixture_storage',(select count(*) from storage.objects where bucket_id='profile-photos' and split_part(name,'/',1)=any(array[${ids}]::text[])),
'fixture_receipts',(select count(*) from spot_private.photo_lifecycle_sets where user_id=any(array[${ids}]))+(select count(*) from spot_private.photo_cleanup_accounts where user_id=any(array[${ids}]))+(select count(*) from spot_private.photo_cutover_attempts where user_id=any(array[${ids}]))+(select count(*) from spot_private.photo_cutover_deletions where user_id=any(array[${ids}]))+(select count(*) from spot_private.photo_cutover_audit where owner_id=any(array[${ids}]) or split_part(path,'/',1)=any(array[${ids}]::text[])),
'fixture_venue',(select count(*) from public.venues where id='${venueId}'),'unexpected_unknown',(select count(*) from spot_private.photo_lifecycle_sets where writer='unknown' and state<>'review'),'preserved_review',(select count(*) from spot_private.photo_lifecycle_sets where state='review'),
'untracked',(select count(*) from storage.objects o where bucket_id='profile-photos' and not exists(select 1 from spot_private.photo_lifecycle_sets s where o.name in(s.photo_path,s.photo_path||'.detail.jpg',s.photo_path||'.thumb.jpg')) and not exists(select 1 from public.profiles p where o.name in(p.photo_path,p.photo_path||'.detail.jpg',p.photo_path||'.thumb.jpg')) and not exists(select 1 from spot_private.photo_assets a where o.name in(a.photo_path,a.thumbnail_path,a.detail_path)) and not exists(select 1 from spot_private.photo_upload_jobs j where o.name in(j.photo_path,j.photo_path||'.detail.jpg',j.photo_path||'.thumb.jpg'))),
'missing',(select count(*) from spot_private.validated_photos v cross join lateral unnest(array[v.photo_path,v.photo_path||'.detail.jpg',v.photo_path||'.thumb.jpg']) p(path) where not exists(select 1 from storage.objects o where o.bucket_id='profile-photos' and o.name=p.path)),
'phase',(select phase from spot_private.photo_cutover_control where singleton),'cleanup',(select execute_enabled from spot_private.photo_cutover_control where singleton),'scheduler',(select scheduler_enabled from spot_private.photo_cutover_control where singleton),'retention_paused',(select paused from spot_private.retention_control where singleton)) as final_checks;`;
}
