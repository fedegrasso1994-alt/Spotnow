begin;do $$begin if not exists(select 1 from spot_private.privacy_environment where environment='staging')or exists(select 1 from spot_private.board_posts)then raise exception 'STAGING_EMPTY_BOARD_REQUIRED';end if;end$$;
create or replace function public.board_operation(place uuid)returns uuid language plpgsql security definer set search_path='' as $$declare stamp text;raw text;begin
 if not coalesce(spot_private.board_member(place),false)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 stamp:=lpad(to_hex(floor(extract(epoch from clock_timestamp())*1000)::bigint),12,'0');raw:=replace(gen_random_uuid()::text,'-','');return(substr(stamp,1,8)||'-'||substr(stamp,9,4)||'-7'||substr(raw,14,3)||'-'||substr(raw,17,4)||'-'||substr(raw,21,12))::uuid;end$$;
create or replace function spot_private.board_operation_valid(op uuid)returns boolean language plpgsql stable security definer set search_path='' as $$declare raw text:=replace(op::text,'-','');stamp timestamptz;duration interval;begin
 if op is null or substr(raw,13,1)<>'7'then return false;end if;
 stamp:=to_timestamp((('x'||substr(raw,1,12))::bit(48)::bigint)/1000.0);select p.duration into duration from spot_private.retention_policies p where category='board_metadata';return stamp<=clock_timestamp()and stamp>=clock_timestamp()-duration;end$$;
create or replace function public.board_create(place uuid,message_text text,operation_id uuid)returns uuid language plpgsql security definer set search_path='' as $$declare text_value text:=btrim(message_text);fp text;prior spot_private.board_receipts;pid uuid;stamp timestamptz;d date;begin
 perform spot_private.board_lock();perform spot_private.photo_owner_lock(auth.uid());
 if not coalesce(spot_private.board_member(place),false)then raise exception 'BOARD_ACCESS'using errcode='42501';end if;
 if not coalesce(spot_private.board_operation_valid(operation_id),false)then raise exception 'BOARD_OPERATION_EXPIRED';end if;
 if operation_id is null or text_value is null or char_length(text_value)not between 1 and 280 then raise exception 'BOARD_TEXT';end if;
 fp:=md5(place::text||':'||text_value);select * into prior from spot_private.board_receipts r where r.user_id=auth.uid()and r.operation_id=board_create.operation_id;
 if found then if prior.action<>'create'or prior.fingerprint<>fp then raise exception 'BOARD_OPERATION_CONFLICT';end if;return prior.result_id;end if;
 stamp:=clock_timestamp();d:=(stamp at time zone 'Europe/Rome')::date;
 if coalesce((select used from spot_private.board_quota where user_id=auth.uid()and venue_id=place and day=d),0)>=3 then raise exception 'BOARD_DAILY_LIMIT';end if;
 insert into spot_private.board_quota values(auth.uid(),place,d,1)on conflict(user_id,venue_id,day)do update set used=board_quota.used+1;
 insert into spot_private.board_posts(venue_id,author_id,body,created_at,expires_at)values(place,auth.uid(),text_value,stamp,stamp+interval '24 hours')returning id into pid;
 insert into spot_private.board_receipts(user_id,operation_id,action,fingerprint,result_id)values(auth.uid(),operation_id,'create',fp,pid);return pid;end$$;

revoke all on function public.board_operation(uuid),spot_private.board_operation_valid(uuid)from public,anon,authenticated;grant execute on function public.board_operation(uuid)to authenticated;notify pgrst,'reload schema';commit;