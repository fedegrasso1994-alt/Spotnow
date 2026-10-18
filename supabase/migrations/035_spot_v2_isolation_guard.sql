begin;
set local lock_timeout='5s';set local statement_timeout='60s';
do $$declare body text;begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or(current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'SPOT_STAGING_ONLY';end if;
 body:=pg_get_functiondef('public.send_spot_v2(uuid,uuid,text,uuid)'::regprocedure);
 if strpos(body,E'begin\n if me is null')=0 or strpos(body,'SPOT_ISOLATION')>0 then raise exception 'SPOT_WRITER_DEPENDENCY';end if;
 -- Advisory locks do not refresh a REPEATABLE READ snapshot after consent/AGE changes.
 -- Public PostgREST transactions are READ COMMITTED; fail closed for SQL callers using fixed snapshots.
 body:=replace(body,E'begin\n if me is null',E'begin\n if current_setting(''transaction_isolation'')<>''read committed''then raise exception ''SPOT_ISOLATION''using errcode=''25000'';end if;\n if me is null');
 execute body;
end$$;
notify pgrst,'reload schema';commit;
