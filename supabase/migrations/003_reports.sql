begin;
create table spot_private.reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references public.profiles(id),
 target_id uuid not null references public.profiles(id),
 reason text not null check(reason in ('harassment','fake_profile','underage','inappropriate','other')),
 details text not null default '' check(char_length(details)<=1000),
 created_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','reviewed','dismissed')),
 reviewed_at timestamptz,
 check(reporter_id<>target_id)
);
alter table spot_private.reports enable row level security;
revoke all on spot_private.reports from public,anon,authenticated;
create index reports_pending on spot_private.reports(status,created_at);
create function public.report_profile(target_user uuid,report_reason text,report_details text default '',also_block boolean default true)
returns uuid language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); report_id uuid;
begin
 if caller is null or caller=target_user then raise exception 'Invalid report'; end if;
 if not spot_private.can_view_profile(target_user) and not exists (
  select 1 from public.matches m where (m.user_a=caller and m.user_b=target_user or m.user_b=caller and m.user_a=target_user) and spot_private.can_use_match(m.id)
 ) then raise exception 'Profile unavailable'; end if;
 if report_reason is null or report_reason not in ('harassment','fake_profile','underage','inappropriate','other') or char_length(coalesce(report_details,''))>1000 then raise exception 'Invalid report'; end if;
 if (select count(*) from spot_private.reports where reporter_id=caller and created_at>now()-interval '1 hour')>=10 then raise exception 'Report limit reached'; end if;
 insert into spot_private.reports(reporter_id,target_id,reason,details) values(caller,target_user,report_reason,trim(coalesce(report_details,''))) returning id into report_id;
 if also_block then insert into public.blocks(blocker_id,blocked_id) values(caller,target_user) on conflict do nothing; end if;
 return report_id;
end $$;
revoke all on function public.report_profile(uuid,text,text,boolean) from public,anon;
grant execute on function public.report_profile(uuid,text,text,boolean) to authenticated;
commit;
