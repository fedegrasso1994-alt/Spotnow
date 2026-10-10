# PHOTO-02 — implementation and staging collaudo, 2026-10-08

**Staging implementation verified; production unchanged. NO-GO for immediate production rollout.** Scope here is PHOTO-02 only. No PHOTO-01 decoder, input limit, UI/design, social retention, or legal-policy change. No real production data copied. Baseline main remains d80b113 (production runtime baseline f477c39). Source branch: `photo02-staging`; all implementation/test/report files are published there, not merged into the production branch.

Machine-readable results: `soma-photo02-staging-results-2026-10-08.json`. Credentials, synthetic account passwords, signed URLs, and private manifests are deliberately excluded from GitHub. Results are actual observations, not an inference from the old 188-test baseline.

## A/B — Implemented lifecycle and migration017

- Durable private per-attempt ledger, immutable paths/three-object manifest, owner advisory locks, quota reservation and two-ready-draft admission limit.
- Publish locks coordinate with purge and account deletion. Old current remains until valid new publication, then retires for5min. Current never purges. Ready drafts expire24h. One-time client nonce restart for expired/missing ready replay; no raw fallback.
- Intent persists before Storage writes. Explicit terminal receipts distinguish success/definitive4xx from network/5xx uncertainty. No purge from timeout/absence alone. Active processing writers cannot reconcile. All-effect recovery verifies each immutable object's size/SHA and catalog membership; pre-intent recovery requires protocol marker, no intent, expired lease and write-intent fence.
- Exact-path purge with claim token/expiry, Storage.remove, Storage.info absence verification, SQL catalog/reference recheck, then preview/validation/assets/job cleanup. It does not use cached downloaded pixels as proof of persistent storage. Repeated cleanup and stopped-worker reclaim are safe.
- Durable account queue survives Auth cascade. Unknown writers block account success. Recursive Storage enumeration uses bounded pages without a mutating offset. Lost response after Auth deletion resumes service-side without the deleted user's JWT; success only after absence checks.
-128MiB owner quota includes active reservations, preview allowance and conservative untracked objects. Concluded technical metadata7days, current metadata retained while needed. No retention change for Tribe/check-ins/chat/Spot or provider backups.
- Untracked/missing catalog objects become private anomalies, not heuristic deletion candidates. Reconciliation rotates batches; blocked account tasks do not starve actionable tasks. One collector request per isolate; overlaps return BUSY409, cross-isolate work uses SQL claims.
- Authenticated staging-only pg_cron/pg_net scheduler, credential in Vault; legacy/alternate service credential verified by existing service-only RPC rather than trusted decoded claims. Anon/users rejected. Scheduler ends paused.

017 adds three RLS-private tables (`photo_lifecycle_sets`, `photo_cleanup_accounts`, `photo_lifecycle_anomalies`), indexes/claims/reservations and service-only RPCs; wraps PHOTO-01 begin/finish without changing codecs. It adds a publication trigger and binds the Storage read policy to the lifecycle-aware photo guard. Internal PHOTO-01 helpers are revoked, public operational calls remain server-only. Existing profile/social API shapes unchanged; no017 in production. Staging fixes were applied as replacements of017 function definitions/additive column, not a production018 migration. Fresh-database migration001–017 is exercised by the automated suite.

Final approved policy: grace300s; ready draft86400s; quota134217728bytes; max2 ready; cacheControl60; concluded metadata7days. Unknown writers require evidence, never just elapsed time.

## C/D/E — Actual verification

**213/213 automated tests PASS; build PASS; typecheck PASS.** Baseline188 grew by25 tests, including a dedicated PHOTO-02 suite plus client nonce/boundary regression coverage. Local SQL tests use PGlite; concurrent transaction evidence below is from real staging Postgres, not inferred from PGlite.

14 real staging test groups all PASS on a fresh cohort, after earlier failures were corrected:
1. service auth / anon-user denial / read-only dry-run;
2. actual JPEG normalize/upload/profile publish, three copies, metadata cache60 and authenticated HTTP cache60;
3. corrupt upload preserves current, successful valid retry;
4. QR/check-in/Ora active/expired/Tribe after expiry/reciprocal Spot/match/chat send/read;
5. two genuinely concurrent PostgREST admissions, one accepted and one PHOTO_BUSY;
6. concurrent profile replacements, current uniqueness, old read/grace/purge/double cleanup;
7. ready draft max2/expiry, interrupted claim takeover, stale-token rejection, technical metadata6day hold/8day purge;
8. concurrent exact quota reservation, only one admission; unit boundary/+1byte;
9. partial writes + lost-response uncertainty + late third Storage effect + upload/delete barrier, then explicit reconciliation/account completion;
10. active writer reconciliation rejected; no-intent fenced recovery after expired lease;
11. real partial definitive Storage failure, exact-path cleanup and valid retry;
12. double collector; untracked file preserved; intentionally missing variant detected without profile mutation;
13. recursive account deletion / preview-reference cascade / Auth absent / queue completed;
14. original three staging current profiles/photos preserved.

Additional actual cloud recovery test PASS: missing ready replay409 with restart, new valid upload, safe purge of incomplete draft; **110-object deletion including nested folders**, injected lost Auth response *after actual Auth deletion*, pending durable queue, retry without user JWT, completed queue, repeated cleanup returns no work. This is controlled fault injection, not a claim that the provider independently generated that network failure.

Scheduler pause/resume PASS: new upload/replacement works with collector paused; resume minute job actually purges due retired photo, current stays available; net responseHTTP200; pause again and delete fixture. Early scheduler503 exposed safeupdate rejecting UPDATE without WHERE; fixed to touch only old start timestamps. Early exact service-key comparison403 was fixed with verified service-only authorization. Earlier CDN-cache false retry was fixed with Storage.info. These are resolved staging findings, not hidden test passes.

Final repeated collector: completed0/reconciled0/failed0, metadata_removed0, pending3, missing0, untracked1. The3 uncertain writers and1 untracked object belong to the pre-existing staging baseline, not the13 new fixture owners; they were deliberately preserved without weak deletion heuristics. They need separate explicit reconciliation/attribution. Current baseline3 profiles/photo references unchanged and downloadable.

**All13 new synthetic accounts deleted, Storage objects0, unfinished fixture sets0, completed account tasks13.** The remaining concluded ledger/queue metadata is governed by the approved7day TTL; it is not a permanent photo copy. Temporary fixture RPCs/table removed, exact synthetic venue IDs removed, scheduler paused. Synthetic credentials and temporary stage key file removed after verification. No production account/file touched.

## F — Safe rollback actually rehearsed

Pause scheduler via service-only `photo02_staging_scheduler(false)`, stop execute calls, retain017/ledger/claims/publication checks. Normal upload/replace/current reads work while cleanup is paused. Resume reviewed code/scheduler; old queue processes. This pause/recovery path was tested. A destructive downmigration or PHOTO-01-only upload Edge against017 is **not** a safe rollback and was not attempted.

## G/H — Residual limits and recommendation

- Partial unknown writes without complete immutable effects remain fail-closed. Operator reconciliation `TERMINAL_STORAGE_RESPONSES_CONFIRMED` needs independent terminal receipts/provider evidence for *every possible write*. No time-only assertion, no object-absence assertion. If that evidence is unavailable, leave pending; quota stays reserved and account completion stays blocked. This requires a staffed operational follow-up, not just logs.
- The pre-existing staging pending3/untracked1 have not been automatically cleared. No authorization/evidence is inferred from their age or filenames.
- Client/browser/CDN pixels already delivered cannot be recalled. Cache metadata/authenticated HTTP60 was measured; the signed download in this run did not expose Cache-Control, so no claim of universal browser/CDN eviction within60s. Signed URL exposure and local cache expiry remain distinct.
- No collector cloud peak-RSS measurement, large-population load benchmark or physical Android/iPhone test was performed in this PHOTO-02 task. API/social regression and existing automated UI/cache tests passed; this is not a full device certification. No unrelated UX changes were introduced.
- No automated external alert transport or operator SLA established. Logs/queue provide retry, review and completed diagnostics; the operational owner must review pending/review/anomalies. No new provider or purchase introduced.

**NO-GO immediate production rollout.** Staging lifecycle evidence is positive, but first close explicit ownership/escalation for unknown/review, reconcile/attribute the remaining staging baseline findings with evidence, and perform the separately authorized production cutover preflight (old PHOTO-01 in-flight/failed jobs, policy/RPC dependencies, cron/Vault service authentication, deployment order and pause rollback). Do not equate an expired old lease with settled Storage. Any production-specific scheduler setup must be a reviewed production configuration, not blind reuse of the staging-only helper. No further founder change to grace/quota/TTL is requested.

Deployment provenance is recorded per function in the JSON: upload/delete bundles were generated from e7d698; collector from3f49b6; migration canonical fromfac9287. Differences in later shared-handler code are unused by the upload/delete entries; their operational write/delete hooks are identical. Generated final artifact hashes are build hashes, not a claim that all three deployed bundles are byte-identical to the newest generated bundle. All deployed sources are versioned in branch history. Decoders/migration016/CSS unchanged.

## Exact files changed versus baseline

- `docs/soma-photo02-staging-report-2026-10-08.md`
- `docs/soma-photo02-staging-results-2026-10-08.json`
- `scripts/bundle-photo-edge.mjs`
- `scripts/photo02-staging-recovery-smoke.mjs`
- `scripts/photo02-staging-scheduler-smoke.mjs`
- `scripts/photo02-staging-smoke.mjs`
- `src/photo-upload.js`
- `supabase/functions/_shared/photo-lifecycle.js`
- `supabase/functions/_shared/photo-upload.js`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/photo-lifecycle/README.md`
- `supabase/functions/photo-lifecycle/index.ts`
- `supabase/migrations/017_photo_lifecycle.sql`
- `supabase/staging/017_photo_lifecycle_scheduler.sql`
- `tests/account-deletion.test.js`
- `tests/photo-assets-auth.test.js`
- `tests/photo-authority.test.js`
- `tests/photo-lifecycle.test.js`
- `tests/photo-upload.test.js`
- `tests/staging/photo02-fixtures-teardown.sql`
- `tests/staging/photo02-fixtures.sql`
- `tsconfig.json`
