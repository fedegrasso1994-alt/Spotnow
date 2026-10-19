begin;
set local lock_timeout='5s';set local statement_timeout='60s';
select spot_private.board_lock();
do $$begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')
 or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'DD_STAGING_ONLY';end if;
 if exists(select 1 from spot_private.soma_v2_control where discovery_enabled)
 or not exists(select 1 from spot_private.discovery_policy where version=2 and not enabled and paused)then raise exception 'DD_REQUIRES_OFF';end if;
end$$;
alter table spot_private.soma_v2_control
 add column dd_controlled_admission boolean not null default false,
 add column dd_admission_changed_at timestamptz,
 add column dd_admission_changed_by text;
-- Current operational configuration, not a user/product activity history.
-- Retain revoked entries for auditable last state; account deletion cascades them.
create table spot_private.dd_admission_accounts(
 user_id uuid primary key references auth.users(id)on delete cascade,
 admitted boolean not null default true,
 reason text not null check(length(btrim(reason))between 1 and 200),
 changed_at timestamptz not null default clock_timestamp(),
 changed_by text not null default session_user
);
alter table spot_private.dd_admission_accounts enable row level security;
revoke all on spot_private.dd_admission_accounts from public,anon,authenticated,service_role;
create function spot_private.dd_admission_write_lock()returns trigger language plpgsql security definer set search_path=''as $$begin
 perform spot_private.board_lock();return null;
end$$;
create function spot_private.dd_admission_stamp()returns trigger language plpgsql security definer set search_path=''as $$begin
 if tg_table_name='soma_v2_control'then
  new.dd_admission_changed_at:=clock_timestamp();new.dd_admission_changed_by:=session_user;
 else new.changed_at:=clock_timestamp();new.changed_by:=session_user;end if;
 return new;
end$$;
-- Statement lock BEFORE row acquisition, in the allocator's lock order.
create trigger dd_admission_config_lock before update of dd_controlled_admission on spot_private.soma_v2_control for each statement execute function spot_private.dd_admission_write_lock();
create trigger dd_admission_config_stamp before update of dd_controlled_admission on spot_private.soma_v2_control for each row execute function spot_private.dd_admission_stamp();
create trigger dd_admission_accounts_lock before insert or update or delete or truncate on spot_private.dd_admission_accounts for each statement execute function spot_private.dd_admission_write_lock();
create trigger dd_admission_accounts_stamp before insert or update on spot_private.dd_admission_accounts for each row execute function spot_private.dd_admission_stamp();
create function spot_private.dd_admitted(person uuid)returns boolean language sql stable security definer set search_path=''as $$
 select coalesce((select not c.dd_controlled_admission or exists(select 1 from spot_private.dd_admission_accounts a where a.user_id=person and a.admitted)from spot_private.soma_v2_control c where c.singleton),false);
$$;
-- Surgical guarded patches: abort on any dependency drift; preserve 039/040.
do $migration$declare body text;old text;replacement text;hits integer;begin
 body:=pg_get_functiondef('spot_private.dd_build(uuid)'::regprocedure);
 old:='where spot_private.ora_eligible(m.user_id)';replacement:=old||' and spot_private.dd_admitted(m.user_id)';
 hits:=(length(body)-length(replace(body,old,'')))/length(old);
 if hits<>2 then raise exception 'DD_ADMISSION_BUILD_SOURCES';end if;
 body:=replace(body,old,replacement);
 old:='and not(a.user_id=any(exhausted))';
 if strpos(body,old)=0 then raise exception 'DD_ADMISSION_BUILD_OWNER';end if;
 body:=replace(body,old,old||' and spot_private.dd_admitted(a.user_id)');
 old:='a.user_id=q.user_id and a.window_id=w.id and a.exposure_count<4';
 if strpos(body,old)=0 then raise exception 'DD_ADMISSION_BUILD_CANDIDATE';end if;
 body:=replace(body,old,old||' and spot_private.dd_admitted(q.user_id)');execute body;
 -- Also covers the pair-insert invariant and projection of pre-existing pairs.
 -- ORA/Match authorization branches remain independent and unchanged.
 body:=pg_get_functiondef('spot_private.dd_pair_eligible(uuid,uuid,uuid)'::regprocedure);
 old:='select a<>b and spot_private.ora_eligible(a)';
 if strpos(body,old)=0 then raise exception 'DD_ADMISSION_PAIR';end if;
 execute replace(body,old,'select a<>b and spot_private.dd_admitted(a)and spot_private.dd_admitted(b)and spot_private.ora_eligible(a)');
 body:=pg_get_functiondef('public.my_daily_discovery()'::regprocedure);
 old:='if not exists(select 1 from spot_private.soma_v2_control where discovery_enabled)or not p.enabled or p.paused then';
 if strpos(body,old)=0 or strpos(body,'-- Reuse the current window under the existing board lock before any INSERT.')=0 then raise exception 'DD_ADMISSION_040_DEPENDENCY';end if;
 execute replace(body,old,'if not spot_private.dd_admitted(auth.uid())or not exists(select 1 from spot_private.soma_v2_control where discovery_enabled)or not p.enabled or p.paused then');
end$migration$;
revoke all on function spot_private.dd_admitted(uuid),spot_private.dd_admission_write_lock(),spot_private.dd_admission_stamp()from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
