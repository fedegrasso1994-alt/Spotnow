-- Executes real staging RPCs as authenticated SQL principals, then rolls back ALL test operations.
begin;
set local statement_timeout='60s';
set local role authenticated;
select set_config('request.jwt.claim.sub','fea34000-0000-4000-8000-000000000001',true);
do $$declare r jsonb;s jsonb;p jsonb;op uuid:=gen_random_uuid();u uuid;n integer;begin
 r:=public.send_spot_v2('fea34000-0000-4000-8000-000000000002',op);
 if r->>'state'<>'pending'then raise exception 'PENDING';end if;
 if public.send_spot_v2('fea34000-0000-4000-8000-000000000002',op)<>r or public.send_spot_v2('fea34000-0000-4000-8000-000000000002',gen_random_uuid())<>r then raise exception 'RETRY';end if;
 for n in 3..4 loop perform public.send_spot_v2(('fea34000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,gen_random_uuid());end loop;
 begin perform public.send_spot_v2('fea34000-0000-4000-8000-000000000005',gen_random_uuid());raise exception 'FOURTH_ALLOWED';exception when raise_exception then if sqlerrm<>'SPOT_PLACE_QUOTA'then raise;end if;end;
 if public.my_ora_spot_budget()->>'remaining'<>'2' then raise exception 'PARTIAL_QUOTA_WRITE';end if;
 p:=public.my_presence();perform public.end_ora((p->>'presence_id')::uuid);perform public.start_ora_manual('fea34100-0000-4000-8000-000000000001');
 begin perform public.send_spot_v2('fea34000-0000-4000-8000-000000000005',gen_random_uuid());raise exception 'REENTRY_RESET';exception when raise_exception then if sqlerrm<>'SPOT_PLACE_QUOTA'then raise;end if;end;
 for n in 5..7 loop perform set_config('request.jwt.claim.sub',('fea34000-0000-4000-8000-'||lpad(n::text,12,'0')),true);perform public.start_ora_manual('fea34100-0000-4000-8000-000000000002');end loop;
 perform set_config('request.jwt.claim.sub','fea34000-0000-4000-8000-000000000001',true);perform public.start_ora_manual('fea34100-0000-4000-8000-000000000002');
 for n in 5..6 loop perform public.send_spot_v2(('fea34000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,gen_random_uuid());end loop;
 begin perform public.send_spot_v2('fea34000-0000-4000-8000-000000000007',gen_random_uuid());raise exception 'SIXTH_ALLOWED';exception when raise_exception then if sqlerrm<>'SPOT_DAILY_QUOTA'then raise;end if;end;
 if public.my_ora_spot_budget()->>'remaining'<>'0'or public.my_ora_spot_budget()->>'place_remaining'<>'1'then raise exception 'QUOTA';end if;
 perform set_config('request.jwt.claim.sub','fea34000-0000-4000-8000-000000000002',true);perform public.start_ora_manual('fea34100-0000-4000-8000-000000000002');
 s:=public.send_spot_v2('fea34000-0000-4000-8000-000000000001',gen_random_uuid());if s->>'state'<>'matched'or s->>'match_id'is null then raise exception 'MATCH';end if;
 if public.my_ora_spot_budget()->>'remaining'<>'4'then raise exception 'RECIPROCAL_CHARGE';end if;
 if public.send_spot_v2('fea34000-0000-4000-8000-000000000001',gen_random_uuid())->>'match_id'<>s->>'match_id'then raise exception 'DUPLICATE_MATCH';end if;
 perform public.send_message((s->>'match_id')::uuid,'SYNTHETIC SPOT V2',gen_random_uuid());
 if jsonb_array_length(public.my_rights_page('spots')->'items')<>1 then raise exception 'RIGHTS';end if;
 begin perform public.send_spot('fea34000-0000-4000-8000-000000000001','fea34100-0000-4000-8000-000000000001');raise exception 'LEGACY_ALLOWED';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if(select count(*)from public.matches where user_a::text like 'fea34000-%')<>1 then raise exception 'MATCH_UNIQUE';end if;
 if exists(select 1 from spot_private.ora_spot_daily_quota where used>5)or exists(select 1 from spot_private.ora_spot_place_quota where used>3)then raise exception 'QUOTA_OVERFLOW';end if;
 if exists(select 1 from public.messages where body='SYNTHETIC SPOT V2'and sender_id::text not like 'fea34000-%')then raise exception 'MESSAGE_SCOPE';end if;
 if exists(select 1 from spot_private.tribe_memberships where user_id::text like 'fea34000-%')then raise exception 'AUTO_JOIN';end if;
end$$;
rollback;
select 'PASS real PostgreSQL: pending/retry/place3/global5/reentry/switch/reciprocal/match/chat/rights/legacy-denied; smoke rolled back' evidence,
 (select count(*)from spot_private.spot_v2_intents where sender_id::text like 'fea34000-%')residual_intents;
