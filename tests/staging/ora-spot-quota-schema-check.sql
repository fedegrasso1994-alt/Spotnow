-- Read-only 028 gate. Does not create quota rows or enable enforcement.
begin isolation level repeatable read read only;
do $$declare t text;r record;begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')then raise exception 'NOT_STAGING';end if;
 if(select count(*)from spot_private.ora_spot_policy)<>1 or not exists(
  select 1 from spot_private.ora_spot_policy where singleton and not enabled and timezone='Europe/Rome'
  and daily_limit=5 and place_daily_limit=3 and quota_retention is null
 )then raise exception 'ORA_POLICY_NOT_OFF';end if;
 if exists(select 1 from spot_private.ora_spot_daily_quota)or exists(select 1 from spot_private.ora_spot_place_quota)
 then raise exception 'UNEXPECTED_QUOTA_DATA';end if;
 foreach t in array array['ora_spot_policy','ora_spot_daily_quota','ora_spot_place_quota']loop
  select c.oid,c.relrowsecurity into r from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
   where ns.nspname='spot_private'and c.relname=t;
  if not found or not r.relrowsecurity then raise exception 'ORA_RLS: %',t;end if;
  if exists(select 1 from pg_policy where polrelid=r.oid)
   or has_table_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   or has_table_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   or has_table_privilege('service_role',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  then raise exception 'ORA_GRANT: %',t;end if;
 end loop;
 if not exists(select 1 from pg_constraint where conrelid='spot_private.ora_spot_daily_quota'::regclass
  and contype='p'and pg_get_constraintdef(oid)='PRIMARY KEY (user_id, local_date)')
  or not exists(select 1 from pg_constraint where conrelid='spot_private.ora_spot_place_quota'::regclass
  and contype='p'and pg_get_constraintdef(oid)='PRIMARY KEY (user_id, place_id, local_date)')
 then raise exception 'ORA_KEYS';end if;
end$$;
select 'PASS: ORA quota OFF; 5 global / 3 Place; Europe/Rome; zero counters; RLS private' evidence;
rollback;
