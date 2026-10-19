# SOMA — SPOTTED social core

Scope: staging only, branch `codex/soma-schema-v2-staging`, baseline
`699a6467b65a89a9c5bc4beca48b7304ec173414`. No main/Production changes.
Source: `SOMA_PRODUCT_UX_SOURCE_OF_TRUTH.md`, sections16–19/30/38 and founder task.
No romantic requests, QoD, share, profile authorization or Match/Spot logic added.

## Read-only inventory and reuse

Before writes:4 accounts,42 Storage objects,0 posts/comments/reports. Existing
026 supplies posts,3/day/Tribe Rome quota, receipts, reports, role/MFA/claim
moderation, safety evidence, owner rights and retention/delete hooks.027 already
supplies comments, comment quotas and nullable comment report references. No
parallel post/comment storage or moderator system was needed. Likes use a small
separate table because the legacy reaction PK/emoji model is not a content like.

Board permission remains `board_member`: eligible18+ authenticated non-anonymous
profile, nonstaff, nondeleted/nonsuspended/nonbanned, active membership and venue.
No dating-consent, gender or preference filter. Standard zero-Tribe UI presents
existing explicit join; no automatic membership. Multi-Tribe selection remains
one independent board at a time. Leave revokes reads/writes immediately; Match,
chat and Spot history are untouched. Lock order reuses board/retention→PHOTO owner;
all social writes and Membership Engine leave serialize on the existing fence.

## Migration042 and public contract

`042_spotted_social_core.sql`, applied only to `zjinjtkekmaqtxsuyvho` via SQL Editor.
Existing applied migrations are unchanged. The migration itself does not enable
any feature/job. After successful targeted tests, staging's existing
`comments_enabled` flag was enabled for social review. Discovery remains OFF.

Added: private `board_likes`, unique partial per-user post/comment indexes; report
one-target constraint and comment-report uniqueness; receipt-rate index; text
validation triggers; narrowly granted social helpers/RPCs. Existing comments and
report comment FK are reused. Existing moderation queue/action extends to comment
cases with the same MFA, claim, stale-revision, staff role and audit protections.
Owner rights adds `board_comments`/`board_likes`; account/post deletion captures
only explicitly held comment evidence before existing FK cascades. Parent purge
protects child open reports/holds and uses existing bounded policy batches.

New authenticated RPCs:
- `spotted_feed(place,after_id,page_size)` newest first, UUID cursor,20/default30/max.
- `spotted_comments(target_post,after_id,page_size)` oldest first,30/default50/max.
- `spotted_create_post(place,message_text,operation_id)` delegates existing quota.
- `spotted_create_comment(target_post,message_text,operation_id)` one-level only.
- `spotted_like(content_id,content_kind,liked,operation_id)` desired state.
- `spotted_report_comment(target_comment,reason,operation_id)` existing case queue.
- `spotted_delete_comment(target_comment,operation_id)` owner-only/idempotent.

Existing `board_operation`, `board_report`, `board_delete`, `board_moderation_*`,
`my_rights_page`, `prepare_account_deletion`, `privacy_retention_run` are reused.
All raw tables remain private/RLS with no peer grants; service role stays server-only.

Peer post fields exactly: `id,text,can_delete,likes,liked,comments`.
Peer comment fields exactly: `id,text,can_delete,likes,liked`.
No author/profile ID, avatar/photo URL, consent/preference, liker list, revision,
moderation metadata or precise timestamp is transmitted by these projections.
`can_delete` identifies only the caller's own content; no persistent anonymous
identity or cross-content author token. Internal authors remain FK-linked for
safety and are disclosed only through the claimed, audited staff case endpoint.
Text bodies themselves may self-identify; peer anonymity is not untraceability.

## Content, quotas, retries and lifecycle

Posts/comments:1–280 Unicode codepoints, trimmed plain text. Server rejects common
URL/domain, markup, mention/tag tokens. UI exclusively uses textContent; no links,
media, uploads, mention resolution or tag navigation. Existing posts remain3/day
per Tribe, Europe/Rome. Comments capped10/minute/account/Tribe using027 quota;
new comment/like/report writes bounded120 receipts/minute/account. These are
technical anti-spam bounds, not romantic budgets. Creation uses existing expiring
server nonce. Operation receipts replay without quota charge; like desired-state
updates plus unique indexes prevent duplicate counts. Old successful operation
replays do not reverse subsequent state. No popularity ordering or boosts.

Post public lifetime stays24h. Comments inherit their parent visibility; neither
comments nor likes renew expiry. Hidden/expired/ineligible parent blocks direct
thread/like/report RPCs even with a known UUID. Suspension permanently hides
existing comments as well as posts; unsuspend never republishes them.

Existing post/report/metadata retention routing stays in place. Parent purge now
respects open comment reports and explicit post/comment/report safety holds.
Account/post deletion snapshots minimal text/reason only under an explicit hold.
Comments/likes/reports/quota/receipts otherwise cascade normally. No new global
cleanup subsystem or scheduler. Existing metadata policy is7d; comment minute
quota metadata joins that cleanup. Jobs remain paused: retention activation and
long-running held/open-case review remain pre-pilot operations, not this release.

## Frontend and visual containment

New modules: `src/spotted-social.js` (RPC facade/sanitized errors),
`src/spotted-social-ui.js` (feed/composer/thread), `src/spotted-social.css`.
Small integrations: backend, pilot shell/live, rights inventory, moderation label.
Existing fonts/tokens/buttons/card styles and final nav remain unchanged. No global
CSS change or ORA/TRIBE/MATCH redesign. Legacy nonpilot board remains available.

Implements community header/context,280 counter, text composer, chronological
cards, comments, like counts/state, reports, owner delete confirmation, pagination,
empty/loading/error/retry and safe expiry/access-denial states. UI revalidates
while open every30s and on navigation. Stale network responses are invalidated by
context/account generation. Uncertain writes retain their operation for retry;
parent target is captured before awaiting a nonce. Mutation access denial clears
cached content immediately. No backend mocks/fake users in the release.

Real browser testing found the long thread CTA overlapping the existing tab bar.
Fixed only `#spotted .pilot-board-host{flex:0 0 auto}`; actual320px final scroll
measurement: CTA bottom513.90, nav top571.60, no horizontal overflow. No global
spacing or nav change.

## Verification evidence

PostgreSQL-backed tests exercise A–S and adversarial UUID/cross-Tribe/nesting/
280-character/replay/quota/suspension/rights/retention paths. Frontend tests cover
composer/thread/likes, loading/error/empty, generation races, stable uncertain
operations, zero membership, nav order, rights inventory, in-flight parent
stability and immediate clearing on access denial. Full regression covers prior
PHOTO, Auth/AGE/CONSENT, ORA, Tribe, DD039/040/041, Spot, Match/chat and moderation.
Final exact totals recorded in `evidence/spotted-social-core/validation.json`.

Real staging smoke:3 temporary confirmed synthetic Auth identities,2 isolated
synthetic Tribes. Auth confirmation setting unchanged. Normal password Auth,
AGE/consent, actual canonical PHOTO uploads, profiles and Membership Engine joins.
Real HTTP/JWT social smoke confirms second-user anonymity, nonmember denial,
8 concurrent like requests→1 count, unlike, comment retry/nesting/281 denial,
post/comment reports, peer staff denial, revoked consent access, owner rights,
actual concurrent post quota, leave access revocation and Discovery still paused.
Synthetic timestamp expiry verified normal API denial; retention dry-run protected
open reports with candidates0/purged0, transaction rolled back for dry-run metadata.

Real UI smoke uses the complete local source app against actual hosted staging
RPC/Auth/Storage (not a mock): post, two comments, like/unlike, report, reload/session,
390×844 and320×640, console clean. A DEV-only fixture login entry permits normal
password sign-in then navigates to the unmodified app entry; it contains no
credentials and is excluded from release. Hosted Preview delivery is verified
separately; no physical iPhone/Android claim is made.

## Cleanup and final staging state

All3 fixtures deleted using normal delete-account with PHOTO02; Auth unusable.
Both empty synthetic Tribes removed with explicit ownership/dependency assertions.
Final:4 original accounts,42 original Storage objects,0 fixture Auth/profile/
Storage/venues,0 board posts/comments/likes/reports/receipts/comment quota,
0 missing current photos. Six objects outside lifecycle ledger are ALL referenced
by existing photo_assets and owned by existing accounts; they are not orphaned
and were not altered. Existing minimized PHOTO receipts for the3 deleted fixture
sets remain `purged` under the established7d policy; no product/photo content left.

PHOTO epoch12 OPEN, cleanup/scheduler OFF. Retention paused/jobs paused, Discovery
OFF, controlled admission OFF/empty allowlist. Only social `comments_enabled` ON.
Requests/system posts/share remain OFF. No Auth provider/credential/Confirm email setting, GCP or new provider change.
Only the exact new owned Preview redirect was added to staging (11→12 entries);
Site URL and other redirect entries are unchanged. Confirm email ON verified via
public settings API after the synthetic smoke.

## Deployment, rollback and remaining work

Preview runtime SHA/URL and browser delivery evidence are recorded separately.
Publish only the audited dist with concrete staging Supabase host; no Production
host, test entry, credentials, admin key or fixture hook. Push code before deploy.
Main remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`; no Production deploy.

Operational pause: set staging comments_enabled OFF; new social RPCs fail closed.
Retain schema/data; do not destructively roll back042 or redeploy incompatible
moderation code. Existing post-only clients remain supported. No scheduler starts.

Remaining: professional/legal validation of anonymous UGC, reporting, safety holds
and retention; physical-device QA; later explicit retention activation; inherited
Vercel connector403 (CLI and browser verification have independent accepted paths).
No romantic requests, QoD or share implemented or started. Those are separate tasks.

## Final delivery and gate

Backend commit: `92b748d` (042 + PostgreSQL tests).
Frontend/runtime commit: `65630667276ebe947133aeeca2fdd7c92261f8fd`, pushed before deploy.
Preview: https://spot-g223pxg7o-fedegrasso1994-1482.vercel.app
Deployment: `dpl_4WGF7cDRsowfGw3xVyDwDvMvSzX5`, explicit target Preview, no Production URL.
Browser independently viewed build-info confirms this SHA and staging ref.
Normal Google login returns to this Preview, reload preserves session, SPOTTED
shows actual empty board from the existing account with no posts/data written.
Desktop1280 and measured mobile390×844 have no overflow/errors. Active content
UI mutation smoke was on the full local source app with REAL staging API, clearly
distinct from the hosted empty-state delivery check. Screenshots remain local:
`.local/spotted-social/screenshots/feed-390.jpg`, `thread-320-bottom.jpg`,
`hosted-preview-390.jpg`, `staging-preview-redirect.jpg`.

All20 new SPOTTED tests PASS; build/typecheck/release audit PASS. Initial full
suite581/581 PASS before the final2 frontend race tests were added. Final full
583-test runs reproduce a known baseline failure: DD040 first allocation returns3
where the test expects4. The standalone DD040 suite passed separately. Full runs
with and without file parallelism remain reported, not hidden by selective reruns.
No tests were weakened, skipped or patched to obtain a green result.
This test does NOT load042 (its fixture migrations stop at040); its files/allocator
were untouched by SPOTTED. Precise underlying DD cause remains a separate task.
This is not proof of a new social regression, but prevents claiming full-green QA.

Final status: `SPOTTED SOCIAL CORE: BLOCKED`.
Only unresolved technical gate: complete regression suite green / DD040 baseline
allocation assertion investigated separately. Social implementation and real
staging smoke are complete and available in Preview; no next roadmap task begun.

## Exact versioned implementation files

- `scripts/prepare-spotted-browser.mjs`
- `scripts/spotted-staging-prepare.mjs`
- `scripts/spotted-staging-smoke.mjs`
- `src/bacheca-moderation.js`
- `src/backend.js`
- `src/live.js`
- `src/pilot-ui.js`
- `src/spotted-social-ui.js`
- `src/spotted-social.css`
- `src/spotted-social.js`
- `src/user-rights.js`
- `supabase/migrations/042_spotted_social_core.sql`
- `tests/spotted-social-client.test.js`
- `tests/spotted-social.test.js`
- `tsconfig.json`
- `scripts/spotted-staging-postcheck.sql` (fixture-only teardown checks).
- This report and `docs/evidence/spotted-social-core/` (audit/verification only).
