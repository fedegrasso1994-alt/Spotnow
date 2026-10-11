begin;
-- RIGHTS-01 candidate, staging only. No new data tables or persistent exports.
create function public.my_rights_page(section text,after_key text default '',page_size integer default 100)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid();items jsonb;last_key text;more boolean;
begin
 if me is null or not exists(select 1 from auth.users where id=me) then raise exception 'RIGHTS_AUTH' using errcode='42501';end if;
 if not exists(select 1 from spot_private.privacy_environment where environment='staging') then raise exception 'RIGHTS_STAGING_ONLY' using errcode='42501';end if;
 if page_size is null or page_size not between 1 and 100 or after_key is null or length(after_key)>200 then raise exception 'RIGHTS_INPUT';end if;
 if section not in('account','profile','age','age_history','consent','consent_history','photos','checkins','tribes','spots','matches','messages','blocks','reports','moderation') then raise exception 'RIGHTS_SECTION';end if;
 with records as materialized (
 select 'account' category,'self' k,jsonb_build_object('id',u.id,'email',to_jsonb(u)->>'email','phone',to_jsonb(u)->>'phone','created_at',to_jsonb(u)->>'created_at','anonymous',u.is_anonymous) value from auth.users u where u.id=me and section='account'
 union all select 'profile','self',jsonb_build_object('name',p.name,'age',p.age,'gender',p.gender,'dating_preference',p.preference,'occupation',p.occupation,'updated_at',p.updated_at) from public.profiles p where p.id=me and section='profile'
 union all select 'age','self',jsonb_build_object('status',a.status,'declared_age',a.declared_age,'statement_version',a.statement_version,'method',a.method,'attested_at',a.attested_at) from spot_private.account_eligibility a where a.user_id=me and section='age'
 union all select 'age_history',e.operation_id::text,jsonb_build_object('status',e.status,'at',e.created_at) from spot_private.age_events e where e.user_id=me and section='age_history'
 union all select 'consent','self',jsonb_build_object('status',s.status,'version',s.version,'changed_at',s.changed_at) from spot_private.consent_state s where s.user_id=me and section='consent'
 union all select 'consent_history',e.operation_id::text,jsonb_build_object('action',e.action,'version',e.version,'at',e.created_at) from spot_private.consent_events e where e.user_id=me and section='consent_history'
 union all select 'photos',s.photo_path,jsonb_build_object('path',s.photo_path,'state',s.state,'current',exists(select 1 from public.profiles p where p.id=me and p.photo_path=s.photo_path),'copies',(select coalesce(jsonb_agg(jsonb_build_object('path',o.name,'bytes',o.metadata->'size')),'[]'::jsonb) from storage.objects o where o.bucket_id='profile-photos' and o.name in(s.photo_path,s.photo_path||'.detail.jpg',s.photo_path||'.thumb.jpg'))) from spot_private.photo_lifecycle_sets s where s.user_id=me and s.state<>'purged' and section='photos'
 union all select 'checkins',c.venue_id::text,jsonb_build_object('venue_id',c.venue_id,'venue',v.name,'checked_in_at',c.checked_in_at,'expires_at',c.expires_at) from public.checkins c join public.venues v on v.id=c.venue_id where c.user_id=me and section='checkins'
 union all select 'tribes',m.venue_id::text,jsonb_build_object('venue_id',m.venue_id,'venue',v.name) from spot_private.tribe_memberships m join public.venues v on v.id=m.venue_id where m.user_id=me and section='tribes'
 union all select 'spots',i.recipient_id::text,jsonb_build_object('sent_at',i.created_at,'venue_id',i.venue_id) from spot_private.interests i where i.sender_id=me and section='spots'
 union all select 'matches',m.id::text,jsonb_build_object('id',m.id,'venue_id',m.venue_id,'created_at',m.created_at,'first_message_at',m.first_message_at) from public.matches m where me in(m.user_a,m.user_b) and section='matches'
 union all select 'messages',m.id::text,jsonb_build_object('id',m.id,'match_id',m.match_id,'body',m.body,'created_at',m.created_at) from public.messages m where m.sender_id=me and section='messages'
 union all select 'blocks',b.blocked_id::text,jsonb_build_object('at',b.created_at) from public.blocks b where b.blocker_id=me and section='blocks'
 union all select 'reports',r.id::text,jsonb_build_object('id',r.id,'reason',r.reason,'status',r.status,'created_at',r.created_at) from spot_private.reports r where r.reporter_id=me and section='reports'
 union all select 'moderation','self',jsonb_build_object('suspended',s.revoked_at is null,'created_at',s.created_at,'revoked_at',s.revoked_at) from spot_private.suspensions s where s.user_id=me and section='moderation'
 ),page as materialized (select k,value from records where category=section and k>after_key order by k limit page_size+1),shown as(select * from page order by k limit page_size)
 select coalesce((select jsonb_agg(jsonb_build_object('key',k,'data',value)order by k) from shown),'[]'::jsonb),(select max(k)from shown),(select count(*)>page_size from page) into items,last_key,more;
 return jsonb_build_object('owner_id',me,'version','rights-staging-v1','section',section,'items',items,'next_key',case when more then last_key else null end,'generated_at',clock_timestamp(),'scope','Own-data automated subset; protected third-party/safety data requires manual review. Photo binaries and provider copies are separate.');
end $$;
revoke all on function public.my_rights_page(text,text,integer) from public,anon;
grant execute on function public.my_rights_page(text,text,integer) to authenticated;
notify pgrst,'reload schema';commit;
