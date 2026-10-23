# Soma — Observability MVP staging report

Implementation: `30674c4`. Baseline: `b550f27c135df15f42543b55c4f4a2017dcded26`, branch `codex/soma-schema-v2-staging`. Main/Production excluded. Scope: first-party minimum operational diagnostics, not a full monitoring platform. Audit: `soma-observability-mvp-audit-2026-10-23.md`. Final contract: `soma-observability-mvp-contract-2026-10-23.md`.

## A–B. Inventory and silent failures

The audit maps all requested Auth, Edge/API, PHOTO/Storage, DD/TRIBE, ORA, SPOTTED, Match/chat, Notifications, Analytics and Moderation boundaries. Existing assets: 30 RAM-only diagnostic events; bounded network/read queues; PHOTO ledger/receipts/review/cron summaries; notification delivery outcomes/attempts; retention run receipts; Analytics dropped counter; moderation role/MFA/case audit. Gaps were reported before coding: swallowed client errors, missing shared correlation, transactional rollback evidence, HTTP200 partial job failures, absent automatic alert delivery and purge heartbeat, vendor log TTL/access not verified.

Read-only cloud inventory found all three existing staging cron jobs inactive and no recorded run in the last 24 hours available. No previously OFF feature was enabled for this task. No provider configuration or secret was read/changed to implement email.

## C–E. Logging, privacy and correlation

- Closed operation/result/class enums, bounded duration, server time, random per-request correlation; no account ID is needed. Source client vs service-owned edge/job is explicit.
- No body/message/post/comment/name/email/phone/photo URL/dating preference/location, raw error/stack, token, push endpoint/key or secret enters operational records. Error-code inspection is transient/bounded, then reduced to an enum/phase; successful client product bodies are not inspected.
- Known allocator/Match-constraint/audit-relation failures can be attributed coarsely; unknown internal causes remain at the outer mutation rather than being fabricated. Direct PostgREST/Auth observation is client-reported, not authoritative backend security evidence. Failed DB transactions cannot preserve their own INSERT log; provider/outer-boundary diagnostics remain necessary for some root causes.
- Same correlation ID in a real hosted invalid PHOTO request/response/server event was verified. No business nonce/lease/request ID was changed, and no cross-session identity is stored.
- Error handling is fail-open for observation. Hosted background collectors do not delay product responses; decoder workers use native fetch without an additional SDK. The non-hosted fallback wait is bounded; collector failure does not replace a successful product response. Client cancellation, user validation/authorization/conflict and expected OFF are not unexpected server failure alerts.
- The unchanged service worker still caches only the static offline explanation. A one-bit tab-local offline fallback observation is reported on a later successful load; old cached HTML may lack it. No new false-offline defect or universal offline visibility is claimed.

## F. Alerts and founder decisions

Approved operational retention is **14 days**, separate from all product/Analytics retention. Approved thresholds: three consecutive unexpected failures in ten minutes; or >=5 failures and >=20% on >=20 observed attempts in ten minutes. Active job incident after two consecutive unexpected failures. One failed job is already degraded in the read-only health state; this is separate from the two-failure incident threshold.

One open incident per operation/source; retries update the same incident and successful retry is recorded distinctly. User errors and OFF features do not create incidents. Forged client failures cannot create authoritative incidents. Email is **hard OFF**, including a database constraint: no existing server-side application email adapter was evidenced and no provider/credentials were introduced. The explicit future recipient is somadatingapp@gmail.com, not an implicit support destination. No backup recipient is configured, and **no email was sent**.

Pre-pilot: authorized email transport/sender setup, tested receipt, failure/retry/dedup/escalation policy and human coverage. Current incident generation/view can be reviewed independently of that delivery gate; it is not an operational paging guarantee.

## G–I. Job health, private view and retention

Private `?health=1` uses existing ADMIN + verified MFA/AAL2 authorization and a separate Auth storage namespace. Normal user and ADMIN without MFA were denied. Real TOTP, role revocation and logged-out denial passed. Read-only overview and correlation-ID lookup clear data on logout/session change/page hide; browser logout left zero displayed technical records.

The ten requested health groups show degraded/intentionally off/unknown according to available evidence. Lack of recent telemetry is unknown, never a fabricated healthy status. Client counts are unverified. Jobs can show healthy only after observed recent success with a known cadence; failed/stale jobs are degraded. Configured PHOTO/privacy cron interval is one minute but both stay OFF. Notification dispatch/prune, Analytics purge and diagnostic purge have no invented operational cadence. Last success/failure/class/duration and next expected execution are present where known. Never-run/no-anchor jobs remain unknown.

`ops_purge` dry-run/physical deletion/repeated execution covers operational events, admission and incident/job metadata at 14 days, bounded event/incident batches. It never invokes product retention or purges PHOTO receipts. No scheduler was added/enabled. Ordinary collection is prevented until purge_ready is explicitly attested; final collection OFF/test_only=true/purge_ready=false protects existing staging users. A callable purge is not proof of automatic deadline enforcement: monitored purge cadence remains a pre-pilot operational gate.

Provider Auth/DB/Edge/CDN log fields, raw IP/UA/context, TTL and admin access remain manual PROVIDER/INCIDENT checks. The 14-day application policy does not silently alter vendor retention or security/product retention.

## J–K. Adversarial and staging evidence

Evidence in `evidence/observability-mvp/` distinguishes real hosted traffic from injected failures:

1. Actual synthetic password Auth/TOTP, ADMIN+MFA, normal/AAL1 denial.
2. Actual controlled invalid Auth/API calls for ORA, chat, SPOTTED, moderation, DD and Analytics, with no product mutations.
3. Actual hosted PHOTO safe rejection and correlation, without changing validation/decoder rules.
4. Actual notification dispatch rejection without its dedicated secret, with Notifications still OFF.
5. Internal server failures injected through the real boundary handler locally, written through the actual hosted recorder via authorized CLI SQL. They were not a real Supabase/provider outage. One deduplicated incident and distinct successful retry were verified; no email send occurred.
6. Hosted physical diagnostic expiry/purge and repeated purge using synthetic diagnostic timestamps only; no current product/evidence dates changed.
7. Actual local frontend → hosted staging browser view, MFA, health/incident rendering, exact request lookup and logout. This was not a new Vercel Preview deployment. Screenshots contain synthetic operational records only.
8. Role revocation rejected an existing JWT; normal fixture delete-account and baseline integrity were checked.

The local suite additionally covers false client source, malicious operation/code/payload sentinels, forbidden fields, expected OFF including PHOTO/ORA, summary failure despite HTTP200, job failure/stale detection, threshold denominator and dedup, readonly permissions, physical retention/retry and disabled email. Notification ON/uncertain outcomes are exercised only in disposable local PostgreSQL, not by enabling hosted delivery. Hosted DD/Notifications/Analytics remain OFF: their normal active feature journeys or real Web Push delivery are not falsely claimed here.

### Runner failures and recovery — not hidden as PASS

A development smoke failed its incident assertion because the CLI-based injected recorder was asynchronous relative to the response deadline; it completed normal fixture cleanup. The harness was changed to serialize SQL and await writes explicitly; the following API/browser smoke passed with normal cleanup.

A later verification attempt encountered runner `ECONNRESET` before TLS to the staging API. A missing immediate rejection handler in the test harness aborted the process before normal finally cleanup. The collector was immediately set OFF. Two surviving Auth fixtures were identified by both the exact ops-053 synthetic tag and the a1a15300 prefix; preflight proved zero profile/photo/Storage/active photo set/hold and no ambiguous ownership. Existing deletion barrier, claim, prepare and finish functions were used around deletion of only those verified synthetic Auth rows. No lease, quota, writer, lifecycle or product gate was bypassed/changed. Technical deletion receipts follow the existing PHOTO policy. No provider-wide outage or data loss was inferred from this runner error.

The harness now tracks/handles pending promises, drains them before cleanup, bounds collector network waits and keeps temporary generated fixture credentials in an ignored 0600 file for recoverability, removed after successful cleanup. It never prints credentials. Final evidence/checks below record the last actual result, not merely the earlier success.

## L–N. Automated checks and migration

Migration **053_operational_observability.sql**, staging only. Adds private operational control/admission/events/incidents/job-policy/job-state, safe collectors, ADMIN+MFA health/recent readers and service-only diagnostic purge. Includes explicit physical-purge-readiness gate and fixed email OFF. Candidate was developed through narrow staging completions; fresh isolated PostgreSQL tests apply the final SQL in one transaction. Final function-body hash checks verify hosted state against the candidate.

Only boundary entry points, shared client diagnostics, private view, static fallback marker and test tooling changed. `src/live.js`, `src/live-social.js`, `src/backend.js`, CSS, `public/sw.js`, PHOTO decoders/lifecycle shared implementations, product schema and business RPC definitions were not refactored or changed. Package dependencies unchanged.

Final test/build/typecheck totals and exact staging counts are recorded in `delivery-checks.json` and `server-final.json`. Earlier full runs exposed the known intermittent DD notification assertion in notifications.test.js:24/26; one run also found six VM-harness import errors corrected without changing delete behaviour. Subsequent complete runs passed. The DD/Notifications flake is not claimed fixed or reinterpreted as a product change in this task.

## O–Q. Git and stop boundary

Runtime/schema/tests/contract are committed separately from hosted evidence/report. Final response supplies the pushed branch SHA and confirms a clean tree/remote equality. Main stays `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`; Production never accessed/deployed/modified.

No retention/purge operationalization, legal/privacy work, new product feature or next roadmap task starts here. GO FOR REVIEW, if final checks pass, is a staging review gate only: it does not approve pilot opening, email delivery, ordinary collection, new jobs or production rollout.

## Final measured result

- **756/756 full tests PASS**, zero failures/skips; 19 new operational tests, with the existing deletion VM harness updated for the new boundary import. Build/typecheck/whitespace PASS.
- A prior complete hosted controlled API smoke **PASS** and actual browser health/MFA/correlation/logout smoke **PASS** are preserved separately. The final hosted background-lifetime variant is **BLOCKED**: after its Auth/MFA gate, the harness collector request reached its ten-second deadline without an HTTP response. This does not establish whether the cause is runner/network, gateway or backend; no production outage or runtime defect is inferred. No blind patch or automatic retry follows this result. The hardened finally cleanup restored the baseline on this final attempt.
- Final read-only check: all **8** operational function bodies match candidate 053. All raw-table/server-write/purge privilege probes for normal/anonymous users are false. Candidate applied through scoped completions is covered from scratch by the PostgreSQL tests.
- Baseline restored: **4 Auth accounts, 4 profiles, 42 objects**, same profile/storage hashes. Zero synthetic Auth/profile/Storage rows, zero new missing current photos, zero pending synthetic deletion, zero staff grants. No new product or Storage orphan. Existing unrelated state preserved.
- Operational tables: **0 events, 0 incidents, 0 admission, 0 job-state rows**. Six non-personal job-policy configuration entries remain. Collector OFF/test_only=true/purge_ready=false; email OFF. Discovery, Analytics, Notifications/delivery, cleanup and scheduler OFF; retention paused; active cron **0**.
- **10 completed synthetic deletion receipts** remain only under the existing PHOTO seven-day technical policy, not as product/account/photo fixtures. No force purge or retention change was performed.
- No new Vercel Preview or Production deploy. Ten staging Edge entry points (including the new service-only operations function and existing privacy-retention boundary) are deployed with the diagnostic wrappers; no decoder/lifecycle implementation changed. Frontend browser evidence used localhost → hosted staging, and the local server was stopped.

**OBSERVABILITY MVP: BLOCKED** — implementation is versioned/deployed in staging, but final background persistence/E2E remains unverified after the timeout. Next work must diagnose that exact request path and rerun only the missing gate; do not reopen unrelated product semantics. Email transport/delivery, physical-purge operational cadence/readiness, actual provider log retention/access, real operational ADMIN/MFA/recovery/coverage and the previously known DD/Notifications test flake remain explicit pre-pilot or separate-review items. No operational collection, automatic email delivery, new scheduler or Production rollout is approved by this result.

Final timeout cleanup was normal, not the earlier manual recovery: no synthetic credential file, Auth/profile/photo/storage fixture, event, admission, incident or active job remains. Both runtime and evidence are committed/pushed on the staging branch; no main merge. Email transport and purge-cadence conditions were explicitly approved as pre-pilot conditions; they are not the reason for this verification BLOCKED status.
