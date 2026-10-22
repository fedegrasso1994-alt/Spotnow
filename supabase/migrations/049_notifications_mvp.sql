begin;
set local lock_timeout='5s';set local statement_timeout='60s';
do $$begin if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'NOTIFICATIONS_STAGING_ONLY';end if;end$$;
-- Downstream only. No product writer or existing policy is replaced.
create table spot_private.notification_control(singleton boolean primary key default true check(singleton),enabled boolean not null default false,delivery_enabled boolean not null default false);
insert into spot_private.notification_control default values;
create table spot_private.push_bindings(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id)on delete cascade,
 endpoint text not null unique check(length(endpoint)<2048 and endpoint~'^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com)/[^[:space:]]+$'),
 p256dh text not null check(p256dh~'^[A-Za-z0-9_-]{87}$'),auth_key text not null check(auth_key~'^[A-Za-z0-9_-]{22}$'),
 binding_key text not null unique check(binding_key~'^[a-f0-9]{64}$'),active boolean not null default true,
 expires_at timestamptz not null default clock_timestamp()+interval '30 days',created_at timestamptz not null default clock_timestamp()
);
create table spot_private.notification_events(
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in('dd','match','request','message')),
 canonical_id uuid not null,owner_id uuid not null references auth.users(id)on delete cascade,
 target_id uuid not null,reference text not null unique default replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),
 created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null default clock_timestamp()+interval '24 hours',
 unique(kind,canonical_id,owner_id)
);
create table spot_private.notification_deliveries(
 id uuid primary key default gen_random_uuid(),event_id uuid not null references spot_private.notification_events(id)on delete cascade,
 binding_id uuid not null references spot_private.push_bindings(id)on delete cascade,
 state text not null default 'ready'check(state in('ready','sending','sent','failed','unknown','cancelled')),
 lease uuid,attempts int not null default 0 check(attempts between 0 and 3),next_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),result text check(result in('accepted','expired','retry','permanent','uncertain','stale')),
 unique(event_id,binding_id)
);
create index notification_ready on spot_private.notification_deliveries(next_at)where state='ready';
create function spot_private.notification_live(e spot_private.notification_events)returns boolean language plpgsql volatile security definer set search_path=''as $$
declare ok boolean:=false;previous text:=current_setting('request.jwt.claim.sub',true);begin
 if e.expires_at<=clock_timestamp()or not exists(select 1 from spot_private.notification_control where enabled)then return false;end if;
 perform set_config('request.jwt.claim.sub',e.owner_id::text,true);
 if e.kind='dd'then
  select exists(select 1 from spot_private.discovery_exposures x where x.window_id=e.target_id and e.owner_id in(x.user_a,x.user_b)and spot_private.dd_exposure_authorized(x.id,e.owner_id,case when x.user_a=e.owner_id then x.user_b else x.user_a end))into ok;
 elsif e.kind in('match','message')then
  ok:=coalesce(spot_private.can_use_match(e.target_id),false);
  if e.kind='message'then ok:=ok and exists(select 1 from public.messages where id=e.canonical_id and match_id=e.target_id and sender_id<>e.owner_id);end if;
 else
  select exists(select 1 from spot_private.board_romantic_requests r where r.id=e.target_id and r.recipient_id=e.owner_id and r.status='pending'and r.expires_at>clock_timestamp()and spot_private.romantic_deliverable(r.sender_id,r.recipient_id))into ok;
 end if;
 perform set_config('request.jwt.claim.sub',coalesce(previous,''),true);return coalesce(ok,false);
 exception when others then perform set_config('request.jwt.claim.sub',coalesce(previous,''),true);raise;
end$$;
create function spot_private.notification_enqueue(k text,c uuid,u uuid,t uuid)returns void language plpgsql security definer set search_path=''as $$declare event uuid;begin
 if not exists(select 1 from spot_private.notification_control where enabled)or not exists(select 1 from spot_private.push_bindings where owner_id=u and active and expires_at>clock_timestamp())then return;end if;
 insert into spot_private.notification_events(kind,canonical_id,owner_id,target_id)values(k,c,u,t)on conflict do nothing returning id into event;
 if event is not null then insert into spot_private.notification_deliveries(event_id,binding_id)select event,id from spot_private.push_bindings where owner_id=u and active and expires_at>clock_timestamp();end if;
end$$;
create function spot_private.notification_event_hook()returns trigger language plpgsql security definer set search_path=''as $$declare m public.matches;u uuid;w spot_private.discovery_windows;begin
 if tg_table_name='matches'then
  perform spot_private.notification_enqueue('match',new.id,new.user_a,new.id);perform spot_private.notification_enqueue('match',new.id,new.user_b,new.id);
 elsif tg_table_name='messages'then
  select *into m from public.matches where id=new.match_id;
  u:=case when m.user_a=new.sender_id then m.user_b else m.user_a end;
  perform spot_private.notification_enqueue('message',new.id,u,new.match_id);
 elsif tg_table_name='board_romantic_requests'then
  if new.status='pending'and spot_private.romantic_deliverable(new.sender_id,new.recipient_id)then perform spot_private.notification_enqueue('request',new.id,new.recipient_id,new.id);end if;
 else
  select *into w from spot_private.discovery_windows where id=new.window_id;
  -- Deferred until commit so builder's ready state is final. No clock-only events.
  if w.state='ready'and extract(hour from clock_timestamp()at time zone 'Europe/Rome')>=8 and w.starts_at<=clock_timestamp()and w.ends_at>clock_timestamp()then
   foreach u in array array[new.user_a,new.user_b]loop
    if spot_private.dd_exposure_authorized(new.id,u,case when u=new.user_a then new.user_b else new.user_a end)then perform spot_private.notification_enqueue('dd',w.id,u,w.id);end if;
   end loop;
  end if;
 end if;return null;
end$$;
create trigger notification_match after insert on public.matches for each row execute function spot_private.notification_event_hook();
create trigger notification_message after insert on public.messages for each row execute function spot_private.notification_event_hook();
create trigger notification_request after insert on spot_private.board_romantic_requests for each row execute function spot_private.notification_event_hook();
create constraint trigger notification_dd after insert on spot_private.discovery_exposures deferrable initially deferred for each row execute function spot_private.notification_event_hook();
create function public.notification_register(endpoint_url text,public_key text,auth_secret text,device_key text)returns boolean language plpgsql security definer set search_path=''as $$declare b spot_private.push_bindings;begin
 if auth.uid()is null or not spot_private.board_eligible(auth.uid())or not exists(select 1 from spot_private.notification_control where enabled)then raise exception 'NOTIFICATION_UNAVAILABLE'using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(endpoint_url,49));
 select *into b from spot_private.push_bindings where endpoint=endpoint_url for update;
 if found then
  -- Only proof of the previous installation binding permits reassociation.
  if b.binding_key<>device_key then raise exception 'NOTIFICATION_BINDING_CONFLICT'using errcode='42501';end if;
  update spot_private.notification_deliveries set state='cancelled',result='stale',updated_at=clock_timestamp()where binding_id=b.id and state in('ready','sending');
  delete from spot_private.push_bindings where id=b.id;
 end if;
 if(select count(*)from spot_private.push_bindings where owner_id=auth.uid())>=10 then raise exception 'NOTIFICATION_DEVICE_LIMIT';end if;
 insert into spot_private.push_bindings(owner_id,endpoint,p256dh,auth_key,binding_key)values(auth.uid(),endpoint_url,public_key,auth_secret,device_key);return true;
end$$;
create function public.notification_revoke(device_key text)returns void language plpgsql security definer set search_path=''as $$begin
 delete from spot_private.push_bindings where binding_key=device_key and owner_id=auth.uid();
end$$;
create function public.notification_resolve(reference text)returns jsonb language plpgsql security definer set search_path=''as $$declare e spot_private.notification_events;r jsonb;q spot_private.board_romantic_requests;begin
 select *into e from spot_private.notification_events n where n.reference=notification_resolve.reference and n.owner_id=auth.uid();
 if not found or not spot_private.notification_live(e)then return jsonb_build_object('available',false);end if;
 if e.kind='request'then
  -- Exact target, recipient-only; never enumerate another inbox or cap at its first page.
  select *into q from spot_private.board_romantic_requests where id=e.target_id and recipient_id=auth.uid();
  select jsonb_build_object('id',q.id,'sender',(select to_jsonb(p)from public.authorized_profile(q.sender_id)p),'context',case when q.origin_kind='post'and spot_private.spotted_post_visible(q.origin_post_id)then(select body from spot_private.board_posts where id=q.origin_post_id)when q.origin_kind='comment'and spot_private.spotted_comment_visible(q.origin_comment_id)then(select body from spot_private.board_comments where id=q.origin_comment_id)else 'Una persona vorrebbe conoscerti tramite SPOTTED.'end)into r;
  if r is null then return jsonb_build_object('available',false);end if;
  return jsonb_build_object('available',true,'kind',e.kind,'request',r);
 end if;
 return jsonb_build_object('available',true,'kind',e.kind,'match_id',case when e.kind in('match','message')then e.target_id else null end);
end$$;
-- Edge-only RPCs. No endpoint/key or event enumeration for browser users.
create function public.notification_claim()returns jsonb language plpgsql security definer set search_path=''as $$declare d record;items jsonb:='[]';l uuid;begin
 if not exists(select 1 from spot_private.notification_control where enabled and delivery_enabled)then return items;end if;
 -- Never automatically resend an ambiguous external send after a worker loss.
 update spot_private.notification_deliveries set state='unknown',result='uncertain',updated_at=clock_timestamp()where state='sending'and updated_at<clock_timestamp()-interval '2 minutes';
 for d in select q.id,q.event_id,q.binding_id from spot_private.notification_deliveries q where q.state='ready'and q.next_at<=clock_timestamp()order by q.next_at limit 20 for update skip locked loop
  if not exists(select 1 from spot_private.notification_events e join spot_private.push_bindings b on b.id=d.binding_id where e.id=d.event_id and b.owner_id=e.owner_id and b.active and b.expires_at>clock_timestamp()and spot_private.notification_live(e))then
   update spot_private.notification_deliveries set state='cancelled',result='stale',updated_at=clock_timestamp()where id=d.id;continue;
  end if;
  l:=gen_random_uuid();update spot_private.notification_deliveries set state='sending',lease=l,attempts=attempts+1,updated_at=clock_timestamp()where id=d.id;
  items:=items||(select jsonb_build_array(jsonb_build_object('id',d.id,'lease',l,'endpoint',b.endpoint,'p256dh',b.p256dh,'auth',b.auth_key,'binding',b.binding_key,'reference',e.reference))from spot_private.push_bindings b join spot_private.notification_events e on e.id=d.event_id where b.id=d.binding_id);
 end loop;return items;
end$$;
create function public.notification_finish(delivery uuid,claim uuid,outcome text)returns void language plpgsql security definer set search_path=''as $$declare b uuid;begin
 if outcome not in('accepted','expired','retry','permanent','uncertain')then raise exception 'NOTIFICATION_RESULT';end if;
 update spot_private.notification_deliveries set state=case when outcome='accepted'then 'sent'when outcome='uncertain'then 'unknown'when outcome='retry'and attempts<3 then 'ready'else 'failed'end,result=outcome,next_at=clock_timestamp()+interval '5 minutes',updated_at=clock_timestamp()where id=delivery and lease=claim and state='sending' returning binding_id into b;
 if outcome='expired'and b is not null then delete from spot_private.push_bindings where id=b;end if;
end$$;
create function public.notification_check(device_key text,reference text)returns jsonb language plpgsql security definer set search_path=''as $$declare e spot_private.notification_events;begin
 select n.*into e from spot_private.notification_events n join spot_private.push_bindings b on b.owner_id=n.owner_id join spot_private.notification_deliveries d on d.event_id=n.id and d.binding_id=b.id where b.binding_key=device_key and b.active and b.expires_at>clock_timestamp()and n.reference=notification_check.reference and d.state in('sending','sent','unknown');
 if not found or not spot_private.notification_live(e)then return jsonb_build_object('available',false);end if;
 return jsonb_build_object('available',true,'kind',e.kind);
end$$;
create function public.notification_prune()returns jsonb language plpgsql security definer set search_path=''as $$declare b int;e int;begin
 delete from spot_private.push_bindings where expires_at<=clock_timestamp();get diagnostics b=row_count;
 delete from spot_private.notification_events where created_at<clock_timestamp()-interval '7 days';get diagnostics e=row_count;
 return jsonb_build_object('bindings',b,'events',e);
end$$;
do $$declare t text;begin foreach t in array array['notification_control','push_bindings','notification_events','notification_deliveries']loop execute format('alter table spot_private.%I enable row level security',t);execute format('revoke all on spot_private.%I from public,anon,authenticated,service_role',t);end loop;end$$;
revoke all on function spot_private.notification_live(spot_private.notification_events),spot_private.notification_enqueue(text,uuid,uuid,uuid),spot_private.notification_event_hook()from public,anon,authenticated,service_role;
revoke all on function public.notification_register(text,text,text,text),public.notification_revoke(text),public.notification_resolve(text),public.notification_claim(),public.notification_finish(uuid,uuid,text),public.notification_check(text,text),public.notification_prune()from public,anon,authenticated,service_role;
grant execute on function public.notification_register(text,text,text,text),public.notification_revoke(text),public.notification_resolve(text)to authenticated;
grant execute on function public.notification_claim(),public.notification_finish(uuid,uuid,text),public.notification_check(text,text),public.notification_prune()to service_role;
notify pgrst,'reload schema';commit;
