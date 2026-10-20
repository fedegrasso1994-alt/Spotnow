begin;
set local lock_timeout='5s';set local statement_timeout='60s';
select spot_private.board_lock();
do $patch$declare body text;old text:=' charged:=found;';replacement text:=$new$ charged:=found;
 -- An over-quota call is not a valid accepted attempt. Do not accumulate receipts
 -- for it; replay of the six accepted attempts is handled before this branch.
 -- Neutral response remains identical; no delivery predicate has been evaluated.
 if not charged then return jsonb_build_object('submitted',true);end if;$new$;
begin
 if not exists(select 1 from spot_private.privacy_environment where environment='staging')or
 (current_setting('supabase.project_ref',true)is not null and current_setting('supabase.project_ref',true)<>'zjinjtkekmaqtxsuyvho')then raise exception 'ROMANTIC_STAGING_ONLY';end if;
 body:=pg_get_functiondef('public.spotted_romantic_submit(uuid,text,uuid)'::regprocedure);
 if (length(body)-length(replace(body,old,'')))<>length(old)then raise exception 'ROMANTIC_043_DEPENDENCY';end if;
 execute replace(body,old,replacement);
end$patch$;
notify pgrst,'reload schema';commit;
