# SOMA — pre-pilot OPS closure

**BLOCKED — email transport/sender configuration and mailbox operational proof remain external gates.** Baseline `b7773ce2f265425547d5a49f4154f9e3971c094c`, staging branch `codex/soma-schema-v2-staging`, 934 baseline tests; no product/runtime/schema/provider changes. Audit timestamp 2026-10-31 11:09:18 UTC. Only staging project `zjinjtkekmaqtxsuyvho` was queried; no Production access.

## A–C. Current architecture and exact gaps, audited before implementation

| Component | Actual current staging state | Gap / conclusion |
|---|---|---|
| Operational boundaries | `operationalHandler` / service-only `ops_record_server`; fixed enum metadata, request correlation and bounded collector wait; warning `collector_unavailable` on recorder failure | Existing architecture reused/audited. No new hosted collector canary; historical hosted timeout is not silently reclassified as resolved. |
| Collection | `ops_control.enabled=false`, `test_only=true`, `purge_ready=false`, dropped=0; events/incidents/jobs all zero | No ordinary collection or current health baseline. OFF is intentional, not evidence of healthy service. Do not enable globally to create a test. |
| Incidents | Private table/RLS, unique open `(operation,source)`; client cannot create authoritative incidents. Three unexpected failures / configured spike / two job failures, dedup through open incident | Existing local tests exercise real SQL thresholds, dedup and permission boundaries. Installed table/API permissions deny anonymous health and user server-record/raw-incident access. |
| Alert delivery | `email_enabled=false` enforced by CHECK; incident `email_state` CHECK allows only `disabled_provider`; health response hardcodes email not configured | **No sender/outbox/provider adapter, delivery outcome, email retry or email failure channel exists in the current implementation. This requires more than adding a secret. No constraint bypass performed.** |
| Email provider | Actual staging Dashboard warns built-in Auth email service is in use; no custom SMTP configured | No reusable application transactional transport evidenced. Built-in Auth delivery is not an arbitrary operational-email API. Auth SMTP and application alert delivery are separate consumers even if a future provider can serve both. |
| Secrets | Names-only Edge inventory includes Supabase keys/config and five Notifications variables; no email/SMTP provider secret. Vault names only: modern server binding plus two PHOTO credentials | No secret values read, printed or changed. Deployed function names/status were also inventoried: `operations` ACTIVE, no separate email sender function; no provider adapter in existing source. Absence of email secret names plus absent adapter/config supports **not configured here**, not a claim that the owner has no external provider account. |

The email gap matches the approved Observability freeze: use an existing safe application provider if available; otherwise leave sending OFF and ask for explicit provider setup. The alert recipient remains explicitly approved `somadatingapp@gmail.com`; no substitute recipient is invented.

Provider reference: [Supabase Auth custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) describes the built-in service as restricted/test-oriented; [Edge email example](https://supabase.com/docs/guides/functions/examples/send-emails) requires a separately configured provider credential and sender/domain. Its example provider is **not selected, approved or provisioned by this audit**. No new service, plan, billing action, domain, DNS record or credential has been created.

## D. Support/privacy/safety

- Current real contact reference: `src/privacy-phase1.js` → “Assistenza e privacy” → `mailto:somadatingapp@gmail.com`. It is not a placeholder. No safety-specific route/category selector or ticketing backend is present.
- Prior approved minimum is one mailbox for support/privacy/safety/appeals. It is **not automatically an SMTP relay or proof of monitored receipt**.
- Manual routing in the linked runbook distinguishes SUPPORT, PRIVACY, SAFETY, APPEAL and OPS with minimal category/owner/state records. No new user-facing copy or external labels/accounts were changed here.
- Mailbox receipt, authorized access/MFA/recovery and operating coverage were not independently proven in this task. Primary operator: Federico per existing ops ownership; no backup recipient/operator or professional escalation contact is invented. Security contact/fallback during Gmail outage remain open.
- Operational availability and privacy/legal adequacy are separate; no claim of legal sufficiency.

## E–F. Schedules and real automatic execution

Live `cron.timezone=GMT`. All four installed jobs inspected by name, ID, schedule, active state and command hash; no full credential-bearing command was printed.

| Job/path | Enabled / cadence | Last observed execution | Next expected | Pilot requirement |
|---|---|---|---|---|
| `soma-retention-phase-a-staging` ID4 | **ON**, `0 3 * * *`, UTC | **2026-10-31 03:00:00.221334–03:00:00.358524 UTC**, cron run20 succeeded; four downstream receipts complete by03:00:09.524268 | **2026-11-01 03:00 UTC /04:00 Europe/Rome** | Required for approved bounded Analytics/diagnostic/DD/notification-binding physical purge. |
| Analytics retention | Via ID4, daily | 03:00:08.998436–03:00:09.077954 UTC, completed, eligible/deleted0 | Same daily tick | 90d pseudonymous rows. No separate rollup purge job/anonymous rollup collection invented. |
| Observability retention | Via ID4, daily | 03:00:09.239987–03:00:09.260306 UTC, completed, eligible/deleted0 | Same daily tick | 14d Phase A subset, hold/protection semantics unchanged. Collection remains OFF; readiness flag was not auto-attested by this audit. |
| DD / Chance cleanup | Via ID4 DD path, daily | 03:00:09.346968–03:00:09.423660 UTC, completed, eligible/deleted0 | Same daily tick | 30d approved records, Chance children/dependencies and holds respected. **Not the Chance release scheduler.** |
| Notifications binding cleanup | Via ID4, daily | 03:00:09.504242–03:00:09.524268 UTC, completed, eligible/deleted0 | Same daily tick | Only eligible stale/revoked binding subtree, sending/unknown/holds protected. Not delivery activation. |
| `soma-photo02-staging` ID1 | OFF, configured `* * * * *` | No run in inspected8-day window | None while OFF | Separate PHOTO readiness gate, not enabled here. |
| `soma-photo02-cutover-staging` ID2 | OFF, configured `* * * * *` | No run in inspected window | None while OFF | Separate PHOTO gate. |
| `soma-privacy-retention-staging` ID3 | OFF, configured `* * * * *` | No run in inspected window | None while OFF | Excluded legacy privacy path, not needed to run Phase A. |
| Chance release | No cron installed; scheduler_enabled=false | None | None | Rollout remains separately gated; Chance/Discovery OFF. |
| Notifications delivery / observability collector / email alerts | No active cadence found | No ordinary collector events/jobs; no email receipt | None | Ordinary collection and alert delivery still incomplete; Notifications delivery intentionally OFF. |

**Actual tick proof, not config-only:** eight daily cron runs24–31October are `succeeded`. Latest run20 was linked to daily root `a1a154ff-0000-4000-8000-202610310001`. The existing orchestrator's SHA-256 derivation of root + path + batch0 exactly reproduces **all four** installed downstream operation UUIDs, each completed/error=null/deleted0. Therefore the actual scheduled dispatch reached the real Edge→SQL path. No manual run, canary purge, timestamp alteration or new scheduler was necessary. A retained pg_net HTTP body was not used as proof; cron success alone would have been insufficient. This task closes the old “first automatic tick not observed” documentation gap using existing receipts.

Current backlog at that tick was zero, so this is an automatic no-op execution proof. Actual deletion, hold/cascade protection, idempotency and rollback remain covered by established Phase A synthetic tests/canaries. It does not demonstrate high-backlog throughput or newly test real-user deletion. Phase A is bounded (cron batch100/max4 per path), no unbounded retry. Partial/busy/failure must be inspected, never represented as a completed purge.

## G–H. Canary and failure modes

**Alert canary: NOT EXECUTED / BLOCKED**, because no configured transport exists and SQL deliberately prohibits enabling email. Zero mail sent, zero synthetic incident inserted, zero provider errors fabricated as real delivery evidence.

| Case | Current evidence | Remaining delivery gate |
|---|---|---|
| Duplicate incident / repeated collector | Real local SQL tests: one open incident, request-id dedup; client source non-authoritative | Actual email per-incident send/delivery dedup absent. |
| Malformed payload / unauthorized caller | Local collector/Edge/retention tests fail safely; raw user data not serialized; live privileges deny server writer/raw incident tables | A new mail adapter must enforce the same closed payload model and server authorization. |
| Transient dependency/network failure | Existing collector has bounded timeout; failure recorded as minimized `collector_unavailable`; Phase A returns failed/partial/follow-up explicitly | Provider send timeout/failure outcome and retry are unimplemented/unverified, not PASS. |
| Invalid/expired email secret / provider unavailable | No configured email credential/provider to exercise | **Blocked**, no intentional bad-secret send attempted. |
| Unexpected scheduler retry | Existing deterministic operation IDs, local replay tests; actual cron daily roots/receipts mapped | Future email queue must not equate repeat tick with repeat email. |
| No alert storm / severity-state | Existing incident generation filters expected validation/auth/conflict/OFF and forged client errors; open-incident dedup | Email trigger, acknowledgement/uncertain delivery and bounded retry need explicit implementation after provider decision. |

No retry/threshold values were silently introduced. Candidate minimal future extension (not implemented): reuse current private incident IDs/rules, add minimized persistent delivery state, fixed authorized recipient/sender, one dispatch claim per incident, finite attempt budget/backoff and a visible failed/uncertain terminal state; do not automatically resend ambiguous accepted deliveries unless provider idempotency supports it. Exact transport and retry policy must be reviewed with the chosen provider. Do not weaken private ADMIN+MFA authorization or create a new observability platform.

## I. One consolidated external-action checklist

1. **Transport choice / sender authorization:** identify an already-owned transactional provider usable server-side, or explicitly approve provisioning one. Supply only provider name, authorized sender/domain and account owner; no secret in chat. Approve required cost/domain verification/DNS/provider consent before that action. No provider or price is assumed.
2. **Private configuration:** once chosen, complete required provider authorization and place its scoped staging credential through the authorized private secret path (or allow the established local/CLI setup). One service may support Auth SMTP and operational mail, but configuring only Auth SMTP does not implement alerts. Do not change Production/Auth/rate limits as a shortcut.
3. **Mailbox operational proof:** confirm who monitors `somadatingapp@gmail.com`, access/MFA/recovery, manual SUPPORT/PRIVACY/SAFETY/APPEAL/OPS routing and coverage; prove receipt from a controlled test after the transport is ready. Backup/escalation owner remains open if none is available.

Then a scoped reviewed staging schema/Edge extension is needed to replace **only** the existing hard-OFF email delivery contract, followed by one isolated incident→one real email→receipt/dedup/failure canary and cleanup. No new provider implementation can be completed under a fictitious existing credential. No request to copy secrets one-by-one, no login micro-gates in this audit.

## J–S. Verification, boundaries and files

Runbook: `docs/soma-prepilot-ops-runbook-2026-10-31.md`. Evidence: `docs/evidence/prepilot-ops-closure/audit.json`, `automatic-tick.json`, and final checks JSON. Read-only SQL and secret-list metadata were used; only names, never values/digests, are published. No screenshots containing secrets were taken. No mailbox content was read.

- Targeted ops/observability/retention/provisioning inventory: **43/43 PASS**.
- Full suite: **934/934 PASS**, zero failure/skip/cancellation, one run (186.666 seconds).
- Build **PASS**; typecheck **PASS**.
- No runtime, schema, application config, provider, user, PHOTO, recovery or legal changes. No new fixtures/assets/jobs to clean up. Chance/Discovery OFF; Notifications delivery OFF; PHOTO OPEN with cleanup/schedulers OFF; existing Phase A ON unchanged.
- Main/Production untouched. Staging read-only invariant comparison: **PASS, exact equality** against the accepted consolidated-regression snapshot: function hashes, profile/Storage/presence fingerprints, flags and cron unchanged; four profiles/42 Storage objects.
- Files added: this report; `docs/soma-prepilot-ops-runbook-2026-10-31.md`; `docs/evidence/prepilot-ops-closure/audit.json`, `automatic-tick.json`, `checks.json`. Commit/push/working-tree state returned at completion.

Residual risks: no automatic incident email and no verified support receipt/coverage; collector ordinary collection/purge-ready OFF and prior hosted collector timeout not newly cleared; no backup operator; provider-dependent delivery failure/retry/idempotency remains to implement; no high-backlog purge claim. Existing accepted recovery/backup proof remains unchanged, not rerun or extended here.

PRE-PILOT OPS: BLOCKED
