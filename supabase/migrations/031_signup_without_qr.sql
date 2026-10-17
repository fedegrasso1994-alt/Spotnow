begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'ONBOARDING_STAGING_ONLY';end if;
 if current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho'then raise exception 'ONBOARDING_PROJECT_MISMATCH';end if;
 if not exists(select 1 from spot_private.soma_v2_control where singleton and jobs_paused and not membership_enabled and not ora_enabled and not spot_enabled and not discovery_enabled and not comments_enabled and not requests_enabled and not system_posts_enabled and not share_enabled)then raise exception 'ONBOARDING_FEATURE_NOT_OFF';end if;
end$$;
-- Existing complete profiles are deliberately NOT enrolled/backfilled.
create table spot_private.account_onboarding(
 user_id uuid primary key references auth.users(id)on delete cascade,
 completed_at timestamptz
);
alter table spot_private.account_onboarding enable row level security;
revoke all on spot_private.account_onboarding from public,anon,authenticated,service_role;
create function spot_private.enroll_profile_onboarding()returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into spot_private.account_onboarding(user_id)values(new.id)on conflict do nothing;return new;
end$$;
create trigger enroll_profile_onboarding after insert on public.profiles for each row execute function spot_private.enroll_profile_onboarding();
create function public.my_onboarding_state()returns jsonb language plpgsql stable security definer set search_path='' as $$declare me uuid:=auth.uid();begin
 if me is null or not spot_private.age_eligible(me)or not spot_private.has_account()
  or not exists(select 1 from auth.users u where u.id=me and coalesce((to_jsonb(u)->>'banned_until')::timestamptz,'-infinity')<=now())
 then raise exception 'ONBOARDING_ACCESS'using errcode='42501';end if;
 return jsonb_build_object('profile_complete',exists(select 1 from public.profiles where id=me),
 'complete',exists(select 1 from public.profiles where id=me)and not exists(select 1 from spot_private.account_onboarding where user_id=me and completed_at is null),
 'tribes',(select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'name',v.name)order by v.name,v.id),'[]')from spot_private.tribe_memberships m join public.venues v on v.id=m.venue_id where m.user_id=me));
end$$;
create function public.complete_onboarding()returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform spot_private.board_lock();perform spot_private.photo_owner_lock(auth.uid());
 if not coalesce(spot_private.board_eligible(auth.uid()),false)then raise exception 'ONBOARDING_ACCESS'using errcode='42501';end if;
 update spot_private.account_onboarding set completed_at=clock_timestamp()where user_id=auth.uid()and completed_at is null;
 return public.my_onboarding_state();
end$$;
create function public.search_joinable_tribes(search_text text default '',page_offset integer default 0)returns table(id uuid,name text)
language plpgsql stable security definer set search_path='' as $$begin
 if not coalesce(spot_private.board_eligible(auth.uid()),false)then raise exception 'ONBOARDING_ACCESS'using errcode='42501';end if;
 if search_text is null or char_length(search_text)>80 or page_offset is null or page_offset<0 or page_offset>10000 then raise exception 'ONBOARDING_INPUT'using errcode='22023';end if;
 return query select c.id,v.name from spot_private.tribe_catalog c join public.venues v on v.id=c.id
 where c.active and c.joinable and v.active and strpos(lower(v.name),lower(btrim(search_text)))>0
 order by v.name,c.id limit 20 offset page_offset;
end$$;
revoke all on function spot_private.enroll_profile_onboarding()from public,anon,authenticated,service_role;
revoke all on function public.my_onboarding_state(),public.complete_onboarding(),public.search_joinable_tribes(text,integer)from public,anon,authenticated,service_role;
grant execute on function public.my_onboarding_state(),public.complete_onboarding(),public.search_joinable_tribes(text,integer)to authenticated;
notify pgrst,'reload schema';commit;
