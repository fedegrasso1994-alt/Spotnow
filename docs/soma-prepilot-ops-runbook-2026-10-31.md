# SOMA pilot operations — quick runbook

**Scope: staging `zjinjtkekmaqtxsuyvho` only.** This document authorizes no Production action. Primary operator: Federico; backup/privacy professional/security fallback are not yet named. Alert/support destination already approved: `somadatingapp@gmail.com`. **Automatic email is NOT operational.** Until configured, an operator must inspect health/cron manually; no unattended coverage is promised.

## 1. Detect and triage

1. Check exact project ref, staging branch and build SHA. Provider labels such as “main/production branch” inside the **staging project** do not override the explicit ref. Do not select another project.
2. On a verified staging Preview, open `?health=1` with the dedicated ADMIN, fresh login and existing MFA AAL2. MODERATOR/ordinary/AAL1 access is not authorized. No role change or new MFA enrollment is part of diagnosis.
3. Inspect operation/source, incident rule/state, UTC timestamp and opaque request/correlation ID. Client-only failure reports are not authoritative incidents. OFF/unknown is not healthy. Do not copy raw user content, auth headers, signed URLs, push keys or secrets into tickets/email.
4. SEV1: suspected exposure/auth bypass/data-loss risk/widespread login failure → contain using already-authorized controls and contact Federico immediately; preserve minimized evidence and escalate to the designated security/privacy professional when available. SEV2: core flow unavailable → inspect boundary and provider status, assess a scoped pause. SEV3: isolated issue → record/reproduce safely. No 24/7 or legal deadline is invented.

## 2. Verify the retention tick

Read-only, from the authorized project-operator SQL console (not by granting DB access to staff):

```sql
begin read only;
select jobid,jobname,schedule,active from cron.job order by jobid;
select jobid,runid,status,start_time,end_time
from cron.job_run_details where jobid=4 order by start_time desc limit 8;
select path,operation_id,dry_run,started_at,finished_at,status,
       eligible,deleted,protected,skipped,error_code
from spot_private.retention_phase_a_runs
order by started_at desc limit 16;
rollback;
```

Expected: only `soma-retention-phase-a-staging` ON at `0 3 * * *`, GMT/UTC. PHOTO jobs/privacy legacy remain OFF, no Chance cron. Next after this audit: **1 Nov2026 03:00UTC /04:00Rome**. Four child receipts must match the daily root `a1a154ff-0000-4000-8000-YYYYMMDD0001` through the existing `retentionPhaseA` SHA-256 derivation; status completed, error_code null, no partial/follow-up hidden. Cron success means dispatch, not downstream completion. On missing/failed/busy/partial inspect Edge `operations` and receipts before claiming success. Never print cron.command or decrypted Vault values.

Do not manually replay a physical purge just to fill an evidence gap. A no-op automatic receipt proves scheduling, not large-backlog deletion performance. Existing replay/hold/cascade canaries remain in the Phase A report/tests.

## 3. Pause only the problematic authorized scheduler

For a Phase A incident requiring a pause, an authorized operator uses the existing scoped script:

```sh
supabase db query --linked --project-ref zjinjtkekmaqtxsuyvho \
  --file supabase/operations/retention-phase-a-staging-pause.sql --output json
```

Re-read cron/control state: ID4 inactive, Phase A manual/scheduler gates closed; other flags/jobs unchanged. An in-flight atomic batch may finish. A pause cannot undo a completed legitimate purge. Keep schedule `0 3 * * *`. Do **not** rerun the initial enable installer blindly; resume needs a reviewed scoped activation and smoke. Never enable PHOTO/Chance or alter constraints, RLS, locks, retention or provider credentials to hide a failure.

## 4. Alert delivery failure / storm

**Today:** `email_enabled=false`, SQL CHECK forbids true, incident email_state=`disabled_provider`; no provider/adapter/queue. Zero email is expected, not successful delivery. Inspect manually and record the delivery blocker. Do not change Auth templates or generate magic links as operational alerts.

**After approved transport implementation:** require visible attempt/terminal status, provider message/receipt ID, timestamp and incident ID, fixed recipient, one per-incident claim, bounded retries and provider-aware ambiguous-result handling. Provider acceptance is distinct from inbox receipt. Until that implementation exists, invalid secret/unavailable provider/retry/email-storm tests remain blocked. Do not place vendor raw errors or secrets in the incident. The existing open-incident dedup alone does not prove email dedup.

## 5. Support / privacy / safety routing

Use the single already-approved mailbox; do not create new accounts. Route manually using categories `SUPPORT`, `PRIVACY`, `SAFETY`, `APPEAL`, `OPS` (mailbox labels/receipt/coverage still to be verified by its custodian). A user may use the current app's “Assistenza e privacy” link. For urgent safety, prioritize confidential triage; no promise of emergency/continuous response is made.

Workflow: received → private reference/category → assigned owner → acknowledge → investigate → resolve/escalate → record outcome. Distinguish login help, technical bugs, access/export/deletion/correction/consent, abuse and manual appeal. Use existing identity verification/support rights runbook; never ask for passwords, OTP, recovery codes, dating preferences, photo URLs or bulk exports by email. Do not claim legal adequacy, complete deletion/export scope or legal deadlines without the separate professional gate. If Gmail is unavailable, the alternate channel is **unconfigured**, not silently another personal inbox.

## 6. Recovery / backup check and escalation

Use the accepted [isolated recovery final evidence](evidence/ops-phase-a/isolated-recovery-v3-final-2026-10-30.json) and [ops recovery runbook](soma-ops-runbooks-2026-10-23.md), reading newer accepted recovery evidence over older “not yet verified” notes. Check checkpoint/manifest version, UTC freshness, encryption/hash receipt and approved Storage mapping. Never infer a current ≤24h RPO from an old successful drill. If the latest backup is missing/stale or suspect, mark degraded and escalate; do not restore over staging/Production, rotate trust/MFA, restart recovery services or run new backup/purge actions under this task. A recovery action needs its own confirmed target/authorization.

## 7. Closure evidence

Record incident/ref, UTC, severity/category, authorized owner, affected operation, scoped action and outcome. Before closing: verify actual product-safe response, cron plus downstream receipts, relevant flags and privacy/access boundaries; successful retry does not erase earlier failure evidence. Close a synthetic canary only through the approved operator path with minimized receipts; do not delete ordinary evidence to make health appear green.

Current blocker checklist: choose/authorize email provider+sender/domain and any required DNS/cost/consent; configure scoped staging credential privately; implement/review delivery receipt+dedup+bounded failure path; one incident→one email canary and actual receipt; verify mailbox routing/MFA/recovery/coverage and escalation owner. No new billing, provider or DNS action is authorized by this runbook.
