# SPOTTED QoD — resume review, 2026-10-21

**SPOTTED QOD: BLOCKED** — functional implementation and hosted synthetic tests pass; browser reload of the approved Preview still reaches offline fallback/bootstrap timeout. This is an unresolved browser-access verification, not a demonstrated QoD contract failure. Responsive automation is DEFERRED by the founder and is not the blocker.

Branch: `codex/soma-schema-v2-staging`. Runtime reviewed: `79519e72526a2f02f2a1254f3863ca000bccadb7`. This follow-up changes test tooling and evidence only, so no new application deployment is required or claimed. The commit containing this report is the evidence revision, distinct from the deployed runtime revision.

## A–C. Draft audit, migration and reused schema

Reviewed the preserved, unapplied 045 draft in stash `fffa99c2e607d89e5db18213686958ad18389337`. It provided editorial/read primitives but lacked answer creation, durable one-answer consumption and frontend/tests. It was not restored or applied.

Migration `047_spotted_qod.sql` is already applied in staging, after 046 removed the ordinary SPOTTED product quota. No migration, RPC, RLS or application change was made in this review. Reused private `board_posts`, `board_comments`, social likes/reports, `qod_answer_claims`, existing moderation/rights/deletion and romantic requests. Ordinary `spotted_create_post` and `spotted_rate` definitions have identical pre/post hashes; the existing legacy quota row count remains one.

## D–H. Product contract and results

- One manual official Soma question per Tribe/Rome calendar day; open-ended, no poll/AI/ranking/separate feed. Official content has no user author or romantic CTA. Existing publication/close functions stay owner-only.
- `spotted_qod`, `spotted_qod_answers`, `spotted_qod_answer` enforce membership, eligibility, active question and caller-owned answered state. One durable claim per user/question; exact retry succeeds, a new second operation fails. Deleting an answer or leaving/rejoining does not refund it. New question identities and other Tribes are independent, verified by PostgreSQL tests.
- Answers max 280 Unicode characters, no media/links/tags/mentions. Existing anonymous cards, one-level comments, likes, report/delete and romantic CTA are reused. No author identifier, profile/dating data, moderation fields or presence timestamps in peer projections. Attribution remains staff-authorized with MFA/claim checks.
- Ordinary posts remain independent: five real ordinary posts were created alongside QoD; no visible quota/`remaining`, no legacy quota write. Technical anti-spam is unchanged.
- Official romantic target rejected. Eligible answer/comment uses the existing neutral request, guard/quota and unified Match system; no new romantic semantics. Existing own-content like denial remains unchanged.
- Day-end/close hides active question and rejects new answer/comment access. No physical-retention policy or scheduler was introduced. Existing claims/content retention requires dedicated approval before pilot; this technical review does not authorize indefinite production retention.

## I–J. Verification matrix

| Area | Evidence/result |
| --- | --- |
| PostgreSQL QoD tests | 11 tests PASS: member/nonmember, zero-Tribe, unique question/day, 280 boundary/bypass, first/second/retry/delete claim, next-day independence, DST, anonymous recency, no ranking, comments/nesting, romantic/unified Match, staff attribution, consent revocation, concurrency, rate limit, rights/delete, retention exclusion |
| Frontend QoD tests | 7 tests PASS: SDK intent, empty/composer/already answered, social/report/thread reuse, absent/error fallback, stale context/pause, uncertain retry, closed/second-answer refresh |
| Hosted staging Auth/onboarding | Three isolated synthetic confirmed identities, normal password login/JWT, AGE/consent, real canonical photo upload, profile and Membership Engine PASS. Confirm email was not changed |
| Hosted QoD | Official question/read, first answer/exact retry/second denial, exact anonymous payload, concurrent like uniqueness, comment/comment-like, other-Tribe and guessed UUID denial PASS |
| Hosted concurrency | Four concurrent first-answer operations produce exactly one answer. Deletion does not refund the claim PASS |
| Real Preview interaction | Empty question/composer, 281-character disabled submit, first answer/already answered, peer answer, like remove/add, comment thread/write and neutral romantic CTA PASS; screenshots below |
| Persistence | API re-read proves Preview-written answer/comment/like persist. Five ordinary posts remain separate PASS |
| Leave/rejoin | Normal leave yields zero Tribes and denied question/answer reads. Normal grace rejoin preserves consumed answer PASS |
| Manual close | Current question becomes null; new answers and comment access rejected PASS through hosted API. Closed/no-active UI has automated coverage, not a successful final browser reload |
| Browser reload | **BLOCKED**: same deployment later shows offline fallback/bootstrap timeout. Normal authorized CLI fetch returns HTTP 200 and current application asset. Exact browser-path/network cause is unproven |

Hosted evidence: `docs/evidence/spotted-qod-resume/staging-{setup,qod,concurrency,ui-postcheck,closed,cleanup}.json`. Test harness gained separate guarded run directories/prefixes and a UI-persistence/leave/rejoin phase; no mocks replaced final runtime.

## K–M. Tests, build and responsive

Final full suite: **648/648 PASS**, zero failed/skipped. Staging-configured Vite build PASS; `tsc --noEmit` PASS. No new unit-test count is claimed: existing QoD coverage was rerun and the hosted smoke phase extended.

320/390 browser automation and physical-device QA remain **DEFERRED**, explicitly accepted by the founder. Desktop screenshots are not mobile proof. The older QoD report's historical 643-test/320/390 statements are not the result of this review; this report records the current scope.

## N. Exact Preview and screenshots

- Preview: https://spot-jpm87ufx2-fedegrasso1994-1482.vercel.app/
- Deployment: `dpl_41CasDHEsSFZP3SipvfnWrYzsDsM`.
- Runtime SHA: `79519e72526a2f02f2a1254f3863ca000bccadb7`.
- Backend: staging `zjinjtkekmaqtxsuyvho` only.
- Screenshots: `docs/evidence/spotted-qod-resume/screenshots/` — peer answer, comments, empty composer, own answer and final reload blocker. These are actual Preview screenshots, with synthetic content only.

The founder-authorized temporary access link was scoped only to this deployment, used only for this review and then revoked without regeneration. The provider returned zero remaining shareable bypasses. Deployment Protection and Soma authentication were unchanged. No access URL/token is stored in source, configuration, documentation, evidence or shared logs; temporary private request/response files were removed. It did not resolve the browser reload reliably. See sanitized `temporary-access-audit.json`.

## O. Remaining blocker and separate pre-pilot follow-ups

Do not advance to Share: browser reload of this exact Preview remains unverified and visibly offline. No network/protection workaround or unrelated application patch is included. Core QoD/API PASS does not make that browser check PASS.

Physical-retention durations for official questions/answers and consumption claims, rights/legal treatment, UGC/moderation and anonymous-content disclosures remain professional/pre-pilot review items already identified in the contract. They are not silently decided here.

## Cleanup and invariant evidence

All three synthetic accounts deleted through normal account/PHOTO lifecycle; password login, old access tokens and refresh tokens all denied afterward. Synthetic questions/catalog containers removed only after no user-dependent content remained. Auth/profile/session/Storage/membership/content/claims/comment/like/report/romantic/Match/chat/validated-photo fixture rows are zero.

Baseline restored: **4 accounts, 4 profiles, 42 Storage objects, 1 existing post**. Existing profile/post hashes match preflight exactly. No new fixture orphan or missing current photo. Six previously documented old Storage review objects remain outside this task; no global zero-orphan claim is made.

Three concluded PHOTO technical receipts remain under existing seven-day lifecycle: `purged`, writer `settled`, reserved quota zero. They are not user product content and were not manually purged. PHOTO-01/02 semantics unchanged.

Final staging: QoD `system_posts_enabled=false`, Discovery OFF, jobs paused, cleanup OFF, scheduler OFF, retention paused, PHOTO phase OPEN unchanged. Confirm email ON throughout. Main remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`; Production was not modified.

See `staging-postcheck.json`, `baseline-postcheck.json`, `auth-postcheck.json`, `validation.json`, `browser-review.json` for sanitized evidence.

## P–R. Repository delivery

This report, screenshots/evidence and two staging harness changes are committed/pushed together on the existing staging branch. Use the delivery commit returned with this report for the evidence revision; the deployed application SHA remains the separate runtime SHA above. No merge to main and no new deploy.

**SPOTTED QOD: BLOCKED**
