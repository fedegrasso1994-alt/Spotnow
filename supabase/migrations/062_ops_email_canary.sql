-- STAGING ONLY. No Auth/PHOTO/product/retention/scheduler change or secret value.
begin;
select spot_private.board_lock();
do $$begin if not exists(select 1 from spot_private.server_transport_binding where project_ref='zjinjtkekmaqtxsuyvho')then raise exception 'STAGING_BINDING_REQUIRED';end if;end$$;
alter table spot_private.ops_control drop constraint ops_control_email_enabled_check;
-- Explicit admission: the approved synthetic incident only, never ordinary pilot collection.
alter table spot_private.ops_control add column email_incident uuid;
alter table spot_private.ops_control add constraint ops_email_admission check(not email_enabled or email_incident is not null);
alter table spot_private.ops_incidents drop constraint ops_incidents_email_state_check;
alter table spot_private.ops_incidents add constraint ops_incidents_email_state_check check(email_state in('disabled_provider','queued','sending','accepted','delivered','failed','unknown'));
alter table spot_private.ops_incidents add column email_attempts integer not null default 0 check(email_attempts between 0 and 1),add column email_claim uuid,add column email_started_at timestamptz,add column email_finished_at timestamptz,add column email_provider_id uuid,add column email_error text check(email_error in('provider_error','timeout','configuration_error','receipt_error'));
create function public.ops_email_claim(operation text,request_id uuid)returns jsonb language plpgsql security definer set search_path=''as $$declare i spot_private.ops_incidents;c spot_private.ops_control;begin
 perform spot_private.require_staging_server_transport('zjinjtkekmaqtxsuyvho');
 select *into c from spot_private.ops_control where singleton;
 if not c.email_enabled then return null;end if;
 select x.*into i from spot_private.ops_incidents x where x.id=c.email_incident and x.operation=ops_email_claim.operation and x.state='open' and x.source in('edge','job')and exists(select 1 from spot_private.ops_events e where e.request_id=ops_email_claim.request_id and e.operation=x.operation and e.source=x.source and e.result='failure'and e.error_class in('internal_error','dependency_error','timeout_error'))for update;
 if i.id is null then return null;end if;
 if i.email_attempts<>0 then
  if i.email_state='sending'and i.email_started_at<clock_timestamp()-interval '1 minute'then update spot_private.ops_incidents set email_state='unknown',email_error='timeout',email_finished_at=clock_timestamp()where id=i.id;end if;
  return null;
 end if;
 if i.email_state<>'queued'then return null;end if;
 update spot_private.ops_incidents set email_attempts=1,email_claim=gen_random_uuid(),email_state='sending',email_started_at=clock_timestamp()where id=i.id returning *into i;
 return jsonb_build_object('id',i.id,'claim',i.email_claim,'operation',i.operation,'source',i.source,'rule',i.rule,'opened_at',i.opened_at);
end$$;
create function public.ops_email_finish(incident_id uuid,claim_id uuid,outcome text,provider_id uuid default null,failure text default null)returns boolean language plpgsql security definer set search_path=''as $$begin
 perform spot_private.require_staging_server_transport('zjinjtkekmaqtxsuyvho');
 if outcome not in('accepted','failed','unknown')or outcome is null or(outcome='accepted'and provider_id is null)or(failure is not null and failure not in('provider_error','timeout','configuration_error','receipt_error'))then raise exception 'OPS_EMAIL_INPUT';end if;
 update spot_private.ops_incidents set email_state=outcome,email_provider_id=provider_id,email_error=failure,email_finished_at=clock_timestamp()where id=incident_id and email_claim=claim_id and email_state='sending';return found;
end$$;
-- Delivery attestation is separate from provider acceptance; no additional sending capability.
create function public.ops_email_delivered(incident_id uuid,provider_id uuid)returns boolean language plpgsql security definer set search_path=''as $$begin
 perform spot_private.require_staging_server_transport('zjinjtkekmaqtxsuyvho');
 update spot_private.ops_incidents set email_state='delivered'where id=incident_id and email_provider_id=provider_id and email_state='accepted';return found;
end$$;
revoke all on function public.ops_email_claim(text,uuid),public.ops_email_finish(uuid,uuid,text,uuid,text),public.ops_email_delivered(uuid,uuid)from public,anon,authenticated,service_role;
grant execute on function public.ops_email_claim(text,uuid),public.ops_email_finish(uuid,uuid,text,uuid,text),public.ops_email_delivered(uuid,uuid)to service_role;
do $$declare b text;begin b:=pg_get_functiondef('public.ops_health()'::regprocedure);b:=replace(b,'''email_enabled'',false,''email_state'',''not_configured''','''email_enabled'',(select email_enabled from spot_private.ops_control),''email_state'',case when(select email_enabled from spot_private.ops_control)then ''canary_only''else ''disabled''end');b:=replace(b,'occurrences,email_state from','occurrences,email_state,email_attempts,email_started_at,email_finished_at,email_provider_id,email_error from');execute b;end$$;
-- Existing collector RPC -> incident transition -> one pg_net dispatch. No PHOTO redeploy.
create function spot_private.ops_email_trigger()returns trigger language plpgsql security definer set search_path=''as $$declare rid uuid;k text;begin
 if new.state<>'open'or new.email_state<>'disabled_provider'or new.email_attempts<>0 or not exists(select 1 from spot_private.ops_control where email_enabled and email_incident=new.id)then return null;end if;
 select request_id into rid from spot_private.ops_events where operation=new.operation and source=new.source and result='failure'and error_class in('internal_error','dependency_error','timeout_error')order by id desc limit 1;
 if rid is null then return null;end if;
 select decrypted_secret into strict k from vault.decrypted_secrets where name='soma-modern-server-staging';
 update spot_private.ops_incidents set email_state='queued'where id=new.id;
 perform net.http_post(url:='https://zjinjtkekmaqtxsuyvho.supabase.co/functions/v1/operations',headers:=jsonb_build_object('Content-Type','application/json','apikey',k),body:=jsonb_build_object('action','ops_alert','operation',new.operation,'request_id',rid),timeout_milliseconds:=20000);
 return null;
 exception when others then update spot_private.ops_incidents set email_state='failed',email_error='configuration_error',email_finished_at=clock_timestamp()where id=new.id;return null;
end$$;
revoke all on function spot_private.ops_email_trigger()from public,anon,authenticated,service_role;
create trigger ops_email_dispatch after insert or update of last_failure_at,occurrences on spot_private.ops_incidents for each row execute function spot_private.ops_email_trigger();
notify pgrst,'reload schema';
commit;
