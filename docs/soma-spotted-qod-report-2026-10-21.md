# SPOTTED QoD — implementation and staging review

**SPOTTED QOD: GO FOR REVIEW** — technical staging review only; no production/pilot approval.

Baseline: branch `codex/soma-schema-v2-staging`, `a06cb564b0b043114d5d85f6b7796faacc0ecc18`. Runtime implementation: **`fe448204287888f070ac695faf36ceb0bbf122b0`**, pushed before Preview. Final evidence/test-support is versioned separately on the same branch.

## A–D. Audit, migration and reuse

The stashed, unapplied 045 was inspected first. It contained editorial/read primitives but lacked answer creation, durable one-answer enforcement and frontend/tests. It was not applied or restored. **047 replaces it**, after applied 046; no applied migration was rewritten. The original draft remains unchanged in its dedicated local stash.

047 was applied only through the verified Soma Staging dashboard `zjinjtkekmaqtxsuyvho`. It adds `question_day`, `parent_qod_id`, official nullable-author shape constraints, unique Tribe/day question index, answer paging index and private RLS-protected `qod_answer_claims`. New authenticated RPCs: `spotted_qod`, `spotted_qod_answers`, `spotted_qod_answer`. Owner-only publish/close helpers and narrow guard/visibility/feed/retention adjustments support the new content kind. See `docs/soma-spotted-qod-contract.md` for exact contracts and compatibility.

Reused: board posts/comments/likes/reports/receipts, signed nonces, existing 120/min anti-spam, moderation MFA/claim/author resolution, sanctions, safety evidence, owner rights categories, normal delete-account and unchanged romantic request/Match infrastructure. No second comment or romantic architecture. Ordinary writer `spotted_create_post` and `spotted_rate` hashes match the preflight exactly.

## E–I. Product, privacy and lifecycle

- One manual official question per Tribe/Europe/Rome date, including after close. Local midnight boundaries handle 23/25-hour DST days. No AI/editorial scheduler/CMS.
- One valid answer per account/question. Existing board/owner locks plus the question/user PK serialize claims. Exact retries replay; new second operations fail. Answer deletion sets the claim's content pointer NULL and never refunds the answer. Next-day/other-Tribe identities are independent.
- Answers: text only, 1–280 Unicode characters, existing no-link/markup/mention validator. Comments remain one level. Existing likes remain social feedback only; newest-first ordering never depends on likes.
- No `board_create`/`board_quota` call in answer creation. Ordinary SPOTTED remains quota-free and has no `remaining` counter. Legacy Bacheca quota is preserved (one existing quota row before/after; fixtures add none).
- Question projection contains no user author. Answer/comment allowlists expose content UUID, text, own delete/like state and aggregate counters; no author/profile IDs, timestamps, pseudonyms or moderation metadata. Author remains in private board records for authorized moderation only.
- Official question has no social/romantic action row and cannot be a romantic request target, including direct RPC. User answers/comments use the existing uniform CTA and neutral request backend. Existing guards/quotas/delivery privacy/explicit acceptance/unified Match are unchanged.
- Close/day expiry removes the current module and denies new answers/comments/likes by direct ID. Leave and safety/eligibility rules revoke access. Dating-consent revocation alone preserves social QoD access.
- No physical retention duration invented. Questions/answers are excluded from ordinary post purge until a dedicated physical-retention policy is approved. User deletion still cascades ordinary content/claims; held evidence uses existing capture. No cleanup subsystem or scheduler was added/activated.

## J. Automated and adversarial results

**11 new PostgreSQL-backed tests + 7 frontend tests.** Full suite: **643/643 PASS**, zero failed/skipped, 177101 ms. Complete SPOTTED targeted regression: **75/75 PASS**. Build, typecheck and release integrity: **PASS** (37 release files, 9 self-hosted font assets, no test hooks/server keys/production Supabase ref in staging bundle).

| Requirement / attack | Result / evidence |
| --- | --- |
| Member reads official question; nonmember/zero-Tribe/guessed cross-Tribe IDs denied | PASS — PostgreSQL and hosted JWTs |
| Duplicate question same Tribe/day | PASS — unique index, private owner-only publisher |
| First answer/retry/direct second answer | PASS — PostgreSQL, hosted JWTs and UI |
| Delete answer / ordinary receipt purge cannot reset allowance | PASS — PostgreSQL; real hosted delete also tested |
| Queued simultaneous claims / actual concurrent hosted requests | PASS — exactly one answer; hosted test uses real Postgres connections |
| Next-day and other-Tribe allowance independent | PASS — explicit server-clock PostgreSQL tests |
| Rome DST 23/25-hour editorial days | PASS — explicit PostgreSQL instants |
| More than 3 ordinary posts, no shared quota | PASS — PostgreSQL and 5 real hosted publications |
| >280, links, markup, mentions and nested/direct official-comment bypass | PASS — server tests; UI 281 boundary disabled |
| No author/private metadata in peer payload | PASS — exact allowlist and hosted assertions |
| Moderation author resolution only after authorized MFA/claim | PASS — PostgreSQL staff fixture tests; not a new real-MFA browser enrollment |
| Like answer/comment; no ranking; no Spot/Match from answer/like | PASS — PostgreSQL and hosted social operations |
| Official romantic request denied; answer/comment requests reuse existing system | PASS — PostgreSQL and hosted JWT/UI |
| Explicit acceptance reuses unified Match | PASS — PostgreSQL existing romantic model; no hosted Match rewrite |
| Closed/expired content / leave authorization | PASS — PostgreSQL; real manual close/JWT/UI verified |
| Absent/failing QoD preserves ordinary feed/composer | PASS — frontend tests; real closed module disappears with ordinary posts retained |
| Stale-answer error, uncertain retry nonce, late context/account response | PASS — frontend tests |
| Rights owner post/comment inventory, account delete and safety compatibility | PASS — PostgreSQL and real normal account deletion |

The PGlite concurrency case is queued/single-session and is not presented as multi-session proof; the additional hosted concurrent answer test supplies real PostgreSQL concurrency evidence.

## K/N/O. Hosted staging and responsive UI

Preview: **https://spot-pm8z8r3gh-fedegrasso1994-1482.vercel.app/**

Deployment: **`dpl_J9pke5q2xZj24sstZtuUvEPFt1if`**, READY, Preview only; Vercel Authentication protection retained. Source artifact is the runtime commit above and uses only staging Supabase. Vercel connector returned 403 for the team; the official CLI with its existing authorized credentials completed project inspection and the scoped Preview deployment. No tokens were manually obtained/passed to Vercel and no protection/billing/account settings were changed.

Three synthetic normal Auth accounts and two isolated synthetic Tribes were prepared. Normal AGE/consent/photo processing/profile/onboarding/Membership Engine passed. Confirm email was never changed. No existing staging account was joined/modified; Discovery never enabled.

Hosted JWT smoke passed question read, first answer, exact retry, second-answer rejection, peer anonymity, likes, one-level comments, cross-Tribe denial, ordinary >3 posts, existing romantic answer/comment requests and direct official-target denial. Real four-request concurrent B answer test yielded exactly one answer; deleting it did not refund the claim. Two manual fixture questions were used, one per isolated Tribe.

Actual Preview browser (no mocks): A own-answer state; B peer anonymous answer and CTA; C empty-question composer and successful answer submission; already-answered state persisted after reload. Comment submission, two-comment thread and neutral romantic CTA response were exercised. Existing Auth bootstrap was awaited before actions after account changes/reload. Console error log: zero. A normal logout was completed before deleting fixtures.

**320 px and 390 px: PASS**, no document horizontal overflow or overwide buttons. Existing dark theme, Inter/Bebas Neue, coral cards/actions and bottom nav unchanged. Screenshots under `docs/evidence/spotted-qod/screenshots/`:

- `qod-own-390.jpg` — official module and own answer.
- `qod-peer-390.jpg` — anonymous peer answer, liked heart and existing romantic CTA.
- `qod-composer-320.jpg` — question without answers/composer.
- `qod-comments-320.jpg` — answer/thread.
- `qod-comment-cta-320.jpg` — comment heart, romantic CTA and reachable composer above nav.
- `staging-postcheck.jpg` — dashboard cleanup evidence.

## Cleanup and final state

Three fixture accounts were deleted through the **normal** delete-account/PHOTO lifecycle. All fixture Auth/profile/session/Storage/Tribe/answer/claim/post/comment/like/report/request/guard/quota/match/message/validated-photo records are absent. Both synthetic official questions and Tribe catalog/venue records were then removed with explicit dependency guards. All 9 new photo objects were removed. No new orphan/missing reference was introduced.

Before/after preserved baseline: **4 accounts, 4 profiles, 42 Storage objects, 1 post, 1 legacy quota row**. Missing current photo references: zero. Three existing-policy PHOTO technical receipts from this test remain `purged`, `writer=settled`, reserved quota zero; their normal seven-day metadata retention was not bypassed or changed.

Final flags: **Discovery OFF, cleanup OFF, scheduler OFF, jobs paused, retention paused, QoD OFF (restored baseline), Confirm email ON**. The Preview therefore normally shows no current question after disposable prompts are removed; this is the required absent-QoD state. Publishing real editorial content/activating it requires a later explicit operational step.

A callback diagnostic initially printed a temporary synthetic A Auth token. It was not included in source/bundle/evidence artifacts. The fixture account/session was removed; old token user lookup and refresh both fail, and all three fixture password logins fail. Private generated passwords, seed SQL and launch links were removed locally. No real account credential was accessed or exposed.

### Separate existing staging Storage finding

A global ledger coverage check found **6 pre-existing untracked Storage objects**, created **2026-10-06 19:40:54–19:41:01 UTC**, before the QoD fixture setup on 2026-10-21. They have zero QoD fixture ownership, current-profile references or validated-photo references. They were **preserved**, classified `PRE_EXISTING_STAGING_REVIEW_OUTSIDE_QOD_SCOPE`. It would be incorrect to claim the entire staging bucket has zero historical orphan objects. QoD introduced zero new orphans. No PHOTO cleanup/normalization was started; separate attribution/cleanup authorization is needed for those old objects.

## P–S. Remaining gates and Git

No remaining QoD implementation blocker for technical review. Before pilot: approve dedicated QoD physical retention/claim metadata treatment and legal/UGC/safety documentation. The unrelated six old staging objects remain a separate review item. No Share or next roadmap task started.

Main remains **`d0f515e8d2c80eeae60f2d5c33dd8901558d5287`**. Vercel Production remains **`dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh`** before/after. No Production Supabase/GCP work, merge, production deploy/env change or PHOTO-01/02 logic change.

Runtime commit `fe448204287888f070ac695faf36ceb0bbf122b0` is pushed. Final report/evidence and small fixture-support corrections are committed separately on the same staging branch; final remote SHA and clean working tree are reported at handoff. Preview runtime does not differ because of documentation/test-support-only commits.

## Exact changed-file inventory

- `docs/SOMA_PRODUCT_UX_SOURCE_OF_TRUTH.md`
- `docs/evidence/spotted-qod/auth-postcheck.json`
- `docs/evidence/spotted-qod/dependent-postcheck.json`
- `docs/evidence/spotted-qod/preflight.json`
- `docs/evidence/spotted-qod/production-invariant.json`
- `docs/evidence/spotted-qod/screenshots/qod-comment-cta-320.jpg`
- `docs/evidence/spotted-qod/screenshots/qod-comments-320.jpg`
- `docs/evidence/spotted-qod/screenshots/qod-composer-320.jpg`
- `docs/evidence/spotted-qod/screenshots/qod-own-390.jpg`
- `docs/evidence/spotted-qod/screenshots/qod-peer-390.jpg`
- `docs/evidence/spotted-qod/screenshots/staging-postcheck.jpg`
- `docs/evidence/spotted-qod/staging-cleanup.json`
- `docs/evidence/spotted-qod/staging-closed.json`
- `docs/evidence/spotted-qod/staging-concurrency.json`
- `docs/evidence/spotted-qod/staging-postcheck.json`
- `docs/evidence/spotted-qod/staging-qod.json`
- `docs/evidence/spotted-qod/staging-setup.json`
- `docs/evidence/spotted-qod/storage-review.json`
- `docs/evidence/spotted-qod/validation.json`
- `docs/soma-spotted-qod-contract.md`
- `docs/soma-spotted-qod-report-2026-10-21.md`
- `scripts/prepare-qod-preview.mjs`
- `scripts/qod-staging-postcheck.sql`
- `scripts/qod-staging-prepare.mjs`
- `scripts/qod-staging-smoke.mjs`
- `src/spotted-qod-ui.js`
- `src/spotted-qod.js`
- `src/spotted-social-ui.js`
- `src/spotted-social.css`
- `src/spotted-social.js`
- `supabase/migrations/047_spotted_qod.sql`
- `tests/helpers/qod-database.js`
- `tests/spotted-qod-client.test.js`
- `tests/spotted-qod.test.js`

**SPOTTED QOD: GO FOR REVIEW**
