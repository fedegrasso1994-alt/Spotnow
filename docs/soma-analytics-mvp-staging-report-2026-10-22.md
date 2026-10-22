# Soma — Analytics MVP staging report

Branch: `codex/soma-schema-v2-staging`; starting HEAD `51a53b5c9019e95ca1e4f0581348e57307cce2ef`. Main baseline `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. Environment: only Supabase staging `zjinjtkekmaqtxsuyvho`.

## Scope and contract

Implementation: [Analytics contract](soma-analytics-mvp-contract-2026-10-22.md). Founder decisions applied: authenticated visible consultations count as active days (Rome civil calendar); 90-day physical retention for pseudonymous events/account-days/minimal fairness counters; 24-calendar-month cap only for genuinely anonymous future rollups. Product retention unchanged.

Migration `050_analytics_mvp.sql`: six private RLS tables, explicit OFF/test-only control, admitted fixture IDs, canonical downstream triggers, fixed authenticated observer RPC, service-only summary/purge, own-rights extension with Auth-cascade delete. No product writer, quota, eligibility, matching rule, PHOTO decoder/lifecycle or CSS changed. Existing rights API is wrapped additively; all former sections delegate unchanged. Existing service accounts receive no raw table grants.

Candidate staging application was followed by two narrow Analytics-only definition alignments: signup server events do not copy the client's channel/entry hint; Match-global creation is separated from first observed Match for each participant. Final function body hashes are compared with the final migration source in evidence. This is not a new product migration or a Production rollout.

Frontend: dedicated `src/analytics.js`, explicit staging flag OFF by default, small hooks in session/navigation, foreground/user interaction, DD nonempty paint, native Share outcomes and rights. No arbitrary payload API. Failures do not block the product and no offline analytics queue is introduced.

## Test coverage

- PostgreSQL/PGlite executes the migration against the existing complete staging-candidate chain. The local synthetic Auth schema is augmented with the real hosted Auth `created_at` column for cohort tests, without modifying hosted Auth schema.
- OFF defaults/admission isolation, no browser raw read, no anonymous/client purge, canonical spoof denied, free-form dimensions rejected.
- Server clock and owner, view dedup, one active day, no passive receiver/allocation activity, genuine DD allocation vs view, no exposed-pair or dating segmentation copy.
- Real canonical post/like and rollback, romantic attempt/delivery/accept, ORA presence/v2 Spot pending/retry/matched transitions.
- Unique Match; first observed Match for each participant; first conversation once globally across senders; message nonce replay.
- Own export after consent revocation; counterpart/internal dedup excluded; Auth-delete cascade; purge does not recreate data.
- 90-day physical deletion, 24-calendar-month rollup fixture, dry-run/retry, preservation of non-due days and product rows; Europe/Rome DST dates; mature D7 denominator.
- Client module: flag isolation, visible authenticated consultations vs hidden/anonymous/logout, navigation-armed DD view vs polling, native handoff/copy/cancel distinction, scalar RPC arguments, non-blocking network failure.

**716/716 full-suite tests PASS** (699 baseline + 17 Analytics tests), build PASS, typecheck PASS. Final Git SHA is verified in the delivery; no mock is substituted for the hosted Auth/RPC evidence below.

## Hosted staging E2E

Harness: `scripts/analytics-staging-smoke.mjs`; disposable `a1a15000` fixture prefix. Three new synthetic identities, of which only A/B admitted. C authenticates normally but produces zero analytics. No existing account is admitted, modified or used to simulate eligibility. Confirm email configuration unchanged: each disposable identity is prepared confirmed individually, no real email sent, no administrator secret read.

PASS using actual Auth JWT/RPC and existing PHOTO processing:

1. Login, AGE checkbox, separate consent, real valid JPEG upload/canonicalization, profile, existing Membership Engine, onboarding completion.
2. Concurrent repeated observation produces one view and active day; client cannot read private table/API or choose another owner.
3. SPOTTED content → deliverable romantic request → recipient acceptance → unique Match → committed messages from both users; nonce retry unchanged.
4. Exact canonical Match/conversation/message/signup counts; no text/email copied into analytics.
5. Dating revocation → own-rights export still succeeds without peer metadata.
6. One owned synthetic analytics row aged beyond 90 days → dry-run candidate → physical delete → repeat zero; product records unaffected.
7. Normal delete-account/PHOTO lifecycle removes all three fixture accounts and their product/analytics records; disposable catalog entry removed.

Hosted E2E includes **real Auth/API/Storage** plus the actual frontend served only on `http://127.0.0.1:4179` with staging environment and Analytics flag ON. The synthetic callback was bootstrapped with a full reload (a fragment-only transition does not restart Auth). The browser reached the frozen shell and consulted TRIBE/SPOTTED; a separate database read confirmed exactly one client view of each surface, zero records outside the fixture admission, and Discovery/cleanup/scheduler still OFF. Browser console had no errors/warnings. Real logout returned to welcome. Screenshot and counts: `evidence/analytics-mvp/browser.json`, `browser-spotted.png`. This is not a new Vercel Preview or a real-device/native Share-sheet claim. The local test server and agent test tab were closed.

The optional browser setup initially hit an occupied local port (left untouched) and one failed CLI baseline read before any fixture creation. A fresh read-only postcheck succeeded, and testing continued on a separate local port. After browser logout, the harness initially reused the logged-out session for Edge account deletion and received a non-2xx response; the original HTTP status was not retained, so no specific backend/PHOTO error is asserted. Fresh normal fixture logins then completed all three normal deletions successfully, without a lease bypass, policy change or manual Auth purge. The harness now refreshes its test login before cleanup. The final catalog deletion checked for active references first. Final hashes/counts are independently reverified after this cleanup recovery.

DD positive allocation/fairness and ORA Spot instrumentation are tested against the complete local Postgres implementation. Discovery was never enabled on hosted staging, so no hosted DD allocator E2E is claimed in this task. Existing full DD/Spot/PHOTO regressions remain part of the complete suite.

## Cleanup and final state

Evidence: [hosted results](evidence/analytics-mvp/staging-results.json), [baseline comparison](evidence/analytics-mvp/postcheck.json), [final server definitions/state](evidence/analytics-mvp/server-final.json), [browser evidence](evidence/analytics-mvp/browser.json).

Original state restored: 4 accounts, 4 profiles, 42 Storage objects, 1 Match, 2 messages, 1 post. Profile/Storage hashes equal their pre-test baseline. Zero disposable Auth/profile/Storage/catalog/social/analytics residuals. Six minimal purged/settled PHOTO receipts from the three completed fixture batches, with zero reservation follow existing PHOTO retention; no ad-hoc receipt purge, original-photo retention extension or scheduler activation.

Analytics OFF, test-only ON, admission empty. Discovery/Notifications/cleanup/scheduler OFF; product jobs and retention remain paused. No new Storage object orphan or missing current reference. No real account/fixture credential, Auth callback/token or device proof is emitted by the harness; private credential/query files removed in cleanup. Public evidence contains only counts, statuses, metadata hashes and an empty board screenshot with the synthetic catalog label.

## Limitations and pre-pilot gates

- No public anonymous collector or pre-auth identifier: abandoned unauthenticated signup starts are unmeasured. Do not report a complete signup-start abandonment funnel from authenticated returns.
- Auth channel is a client flow hint (or unknown), not a provider-audited login assertion. Share native promise resolution is a handoff, not proof of receipt.
- Global coarse ORA metrics; no per-account Place history or unreviewed long-lived per-Place aggregate.
- First Match is an observed milestone within retained instrumentation history, not an indefinite all-time user ledger. Cross-surface Match origin is not guessed; matched Spot-intent participation is distinct from unique Match count.
- No automatically generated 24-month rollups: genuine anonymity requires validation. Private summaries of 90-day pseudonymous data are not anonymous exports.
- Purge function is ready/tested but no scheduler is activated. Monitored purge cadence/backlog handling must be operational before real collection; do not claim an automatic 90-day deadline while jobs remain paused.
- First-party analytics/privacy documentation and any required professional validation remain separate from technical staging success. No legal basis or cookie/consent exemption is chosen here.
- No Admin dashboard, marketing attribution, notification delivery work, new provider, main merge or Production change.

**ANALYTICS MVP: GO WITH CONDITIONS — technical staging instrumentation verified; pre-pilot operations/privacy gates and the measurement limitations above remain explicit.**

## Exact versioned files

- `docs/SOMA_PRODUCT_UX_SOURCE_OF_TRUTH.md`
- `docs/evidence/analytics-mvp/browser-spotted.png`
- `docs/evidence/analytics-mvp/browser.json`
- `docs/evidence/analytics-mvp/postcheck.json`
- `docs/evidence/analytics-mvp/server-final.json`
- `docs/evidence/analytics-mvp/staging-results.json`
- `docs/soma-analytics-mvp-contract-2026-10-22.md`
- `docs/soma-analytics-mvp-staging-report-2026-10-22.md`
- `scripts/analytics-staging-postcheck.sql`
- `scripts/analytics-staging-preflight.sql`
- `scripts/analytics-staging-smoke.mjs`
- `src/analytics.js`
- `src/backend.js`
- `src/live.js`
- `src/pilot-ui.js`
- `src/spotted-social-ui.js`
- `src/supabase-client.js`
- `src/user-rights.js`
- `supabase/migrations/050_analytics_mvp.sql`
- `tests/analytics-client.test.js`
- `tests/analytics.test.js`
- `tsconfig.json`
