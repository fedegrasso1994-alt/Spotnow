begin;
create table spot_private.moderators (
 user_id uuid primary key references auth.users(id), created_at timestamptz not null default now()
);
create table spot_private.moderation_audit (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users(id),
 report_id uuid not null references spot_private.reports(id), action text not null,
 note text not null default '', created_at timestamptz not null default now()
);
alter table spot_private.moderators enable row level security;
alter table spot_private.moderation_audit enable row level security;
revoke all on spot_private.moderators,spot_private.moderation_audit from public,anon,authenticated;
create function public.is_moderator()
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from spot_private.moderators where user_id=auth.uid());
$$;
create function public.moderation_reports()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_moderator() then raise exception 'Access denied' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(row_to_json(r)) from (
  select r.id,r.target_id,p.name as target_name,r.reason,r.details,r.created_at,r.status,
   exists(select 1 from spot_private.suspensions s where s.user_id=r.target_id and s.revoked_at is null) as suspended
  from spot_private.reports r join public.profiles p on p.id=r.target_id
  order by r.created_at desc limit 100
 ) r),'[]'::jsonb);
end $$;
create function public.moderate_report(target_report uuid,moderation_action text,moderation_note text default '')
returns void language plpgsql security definer set search_path='' as $$
declare target_user uuid;
begin
 if not public.is_moderator() then raise exception 'Access denied' using errcode='42501'; end if;
 if moderation_action is null or moderation_action not in ('review','dismiss','suspend','revoke') or char_length(coalesce(moderation_note,''))>1000 then raise exception 'Invalid action'; end if;
 select target_id into target_user from spot_private.reports where id=target_report for update;
 if target_user is null then raise exception 'Report unavailable'; end if;
 if moderation_action='suspend' then perform spot_private.suspend_profile(target_user,moderation_note);
 elsif moderation_action='revoke' then update spot_private.suspensions set revoked_at=now() where user_id=target_user and revoked_at is null;
 end if;
 update spot_private.reports set status=case when moderation_action='dismiss' then 'dismissed' else 'reviewed' end,reviewed_at=now() where id=target_report;
 insert into spot_private.moderation_audit(actor_id,report_id,action,note) values(auth.uid(),target_report,moderation_action,coalesce(moderation_note,''));
end $$;
revoke all on function public.is_moderator(),public.moderation_reports(),public.moderate_report(uuid,text,text) from public,anon;
grant execute on function public.is_moderator(),public.moderation_reports(),public.moderate_report(uuid,text,text) to authenticated;
commit;
