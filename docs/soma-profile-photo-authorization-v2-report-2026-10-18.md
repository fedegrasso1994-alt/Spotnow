# PROFILE / PHOTO AUTHORIZATION V2 — final staging report

**Gate: GO WITH CONDITIONS to DAILY DISCOVERY ENGINE development. STOP after this checkpoint.**

## A. Baseline

- Branch `codex/soma-schema-v2-staging`, initial clean HEAD `2b5490f55820635358be0b83fd60d61f74165560`.
- Staging only: `zjinjtkekmaqtxsuyvho`. Initial 4 Auth accounts, 4 profiles, 42 photo objects, 1 Match, 2 messages.
- Main remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287` locally/remotely.
- Production deployment before/after: `dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh`.
- PHOTO processing/lifecycle/limits unchanged; admission OPEN epoch12, cleanup/scheduler OFF. Spot v2 semantics and quota gate remain unchanged/GO.

## B. Authorization graph

`spot_private.can_view_profile`: SELF OR guarded current ORA OR guarded current DD exposure OR existing valid Match OR future directional seam (currently deny-all). Non-self requires eligible existing ordinary accounts, no deleting/suspended/banned account and no block either direction. Same Tribe alone is absent from the graph. No pending-intent lookup grants permission.

## C. Profile minimization

New `authorized_profile(target_user)` returns only `id,name,age,gender,occupation,photo_path,thumbnail_path,detail_path`. The photo fields carry opaque versioned references, not Storage keys. The id is the existing product profile target key used by Spot/Match; no Auth identities/provider metadata/email/session fields are added. Other-user ORA/Match projections also carry opaque references; embedded preview payloads are NULL. Own full profile continues through self-only RLS for editing, without reusing that shape for another user.

No preference, consent, quota, operation, precise presence, private membership or provenance data is returned by the new profile projection. Unknown and known-but-unauthorized UUIDs both return no rows.

## D–E. Photo boundary / Storage / RLS

New `profile-photo` Edge endpoint validates Auth getUser, derives subject and invokes a **service-only** batch resolver. Input body is bounded to 8 KiB/48 references; viewer/authorization/expiry claims from the client are ignored. Resolver checks current version, actual authorization, object existence and the existing PHOTO ready/current guard. Own ready photo paths continue to work before profile creation.

The private bucket remains private. Authenticated Storage SELECT is disabled: direct object reads/list/sign and arbitrary-duration client signing no longer provide an alternate route. All ordinary rendering, including SELF, uses the new signer. `photo01_can_view_photo` now delegates non-self decisions to the shared graph; PHOTO02's lifecycle wrapper is unchanged.

New URLs expire after **30 seconds**, enforced server-side. JSON response `no-store`; frontend URL cache20s; protected decoded-reference entries expire20s on lookup. Version fingerprint prevents a replaced canonical photo from reusing an old decoded cache identity. Server rejects a stale version even when the pair remains matched.

Important bounds: already issued bearer URLs, downloaded pixels and Storage HTTP/CDN cache cannot be retrospectively recalled. PHOTO02 object cache stays60s. Do not claim immediate revocation of already delivered pixels or treat token TTL as CDN cache TTL. Previously minted pre-036 arbitrary-duration signed URLs cannot be inventoried/revoked by RLS; no key rotation/path migration was performed. Fresh references now have the enforced bound. See [official signed-URL documentation](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl) and [cache/expiry independence](https://supabase.com/docs/guides/storage/cdn/smart-cdn).

## F. ORA

Real staging smoke: two zero-Tribe accounts enter the synthetic Place via QR, with no auto-join or second presence confirmation, and read profile/canonical/thumbnail/detail. Target exits: profile and new photo references immediately denied. Local SQL tests additionally cover different Place, expired viewer/target and historical presence. ORA duration, quota, QR, presence engine and pagination remain unchanged.

## G. Match

Real reciprocal Spot creates one Match. Both leave ORA and Tribe: profile/photo remain readable through that Match; chat and own RIGHTS still work. Dating consent revocation does not remove the existing Match access. Unit tests verify block/suspension overrides. Existing baseline Match/messages remain1/2.

## H. DD structural readiness

Uses027 exposure/window/policy and exact membership identities. Requires ready current window, enabled unpaused policy/catalog, current eligible/consenting compatible pair. Expired window, removed membership or DD feature OFF denies. Controlled tests run only in isolated PGlite databases. **No runtime exposure/window fixture was installed and discovery remains OFF.** No allocator/scheduler/timer UI implemented.

## I. Future SPOTTED directionality

Explicit helper `(viewer,target)` currently returns false. Local isolated test substitutes only the helper to demonstrate recipient→sender without reverse grant; no request rows are created, no runtime feature is enabled. This is structural readiness, not a tested implementation of deliverable requests. A future request task must implement its actual eligibility/deliverability/revocation checks and anonymous-author protection.

## J–L. Pending Spot / directory / enumeration

Real API tests prove pending ORA Spot survives as intent but does not preserve profile/photo browsing after exit. Same-Tribe membership plus known UUID still denies at RPC, RLS and signer boundaries. Retired directory RPC fails rather than relying on the UI. Local tests additionally exercise arbitrary UUID, Board-derived author ID, stale exposure, historical presence, stale canonical version and unauthorized raw path. Temporary relation + Match composition retains access only through the Match.

## M. Block / safety

Existing block predicate overrides all ordinary non-self relationships. Existing `can_use_match` is reused; non-self account safety is also checked through the current eligible-account helper. Tests cover block, Auth ban, suspension and missing AGE. Board/moderation author identity remains a separate scoped MFA/RBAC/claimed-case capability and never becomes a dating-profile permission. No new block or moderation system was built.

## N. Legacy audit

Full list of candidate public readers and actual hosted role grants is retained in `evidence/profile-auth-v2/reader-grants.json`; detailed classification is in the contract.

| Reader | Final classification |
| --- | --- |
| profiles REST SELECT / own edit | Intentionally retained, self-only RLS |
| authorized_profile | New minimized boundary |
| ora_people_page | Migrated, live graph + opaque refs |
| my_matches / my_matches_page / my_matches_photos_page | Migrated, existing Match + shared safety boundary |
| visible_profiles | Retired, revoked and empty even for definer caller |
| location_people / location_people_page / location_people_photos_page | Retired, revoked and raising even for definer caller |
| photo_asset_status | Ordinary-user EXECUTE retired; service-only retained |
| Storage public object | Private bucket, denied |
| Storage authenticated object/list/sign | Denied; no direct client signing |
| profile-photo / resolve_authorized_photos | Migrated bounded signer / service-only resolver |
| can_view_photo / photo01_can_view_photo | Lifecycle wrapper retained / authorization dependency tightened |
| upload/publication/cleanup/normalization RPCs | Intentionally retained, service-only; no processing/lifecycle changes |
| own RIGHTS / privacy / onboarding RPCs | Intentionally retained, own-data scope |
| moderation_queue / moderation_release | Intentionally retained, existing staff authorization; no broad dating permission |
| legacy moderation_reports / moderate_report | Already revoked by025, still unreachable |
| Board publication / author resolution | Retained anonymous peer / scoped authorized moderation contract |
| old Spot writers / prior aliases | Already retired by034/035, still unreachable |
| old backend directory methods/prefetchTribe | Unreachable in current pilot placeholder shell; denied on server if called |
| PHOTO canary diagnostic canonical reader | Migrated from direct Storage download to bounded signer; test semantics unchanged |

## O. Performance

One batched client request per group of at most48 refs; no per-card network authorization or client-side profile filtering. Bounded server resolver uses keyed profile/object checks; existing PKs, checkins venue/expiry, Match pair/user indexes and DD window/user indexes are reused. No speculative new index and no DD allocation work. This is not a large-scale load benchmark.

## P. Migration / deploy

**036_profile_photo_authorization.sql**, applied successfully only in staging, after the source push. New guards are staging-specific. No tables, old migrations, PHOTO ledger, decoder, limits, retention, quota or writer changes. Edge `profile-photo` added with JWT gateway verification ON and explicit getUser validation. Existing7 Edge deployments untouched. New signer deployed before the restrictive migration; new Preview then uses staging-only authorization flag.

## Q–R. Automated verification

**477/477 PASS**, 0 failures/skips. Baseline461 plus16 additional tests:14 authorization groups,1 detail-opening race/denial UI test,1 protected-cache expiry test. Groups cover multiple mandatory matrix cases. Build PASS (Vite102 modules), typecheck PASS; release validation40 assets/9 local font files PASS. No style file changed, no new provider/dependency.

The future-request cases are local structural tests, not a claim of runtime SPOTTED acceptance. Existing full-suite Auth/onboarding/mandatory pilot selection/QR/ORA/Spot quotas/Match/chat/Board/RIGHTS/moderation/PHOTO tests remain green.

## S. Real staging smoke / browser

Sanitized evidence is in `evidence/profile-auth-v2/{setup,smoke,replacement,delete}.json`.

- Two explicitly synthetic verified Auth identities seeded for password sign-in; real ordinary Auth login, AGE declaration and consent RPCs. Confirm email remained ON. No external email or new MFA/signup claim.
- Strict unchanged PHOTO fixture prevalidation5/5; real uploads, decoder/canonical publication, profile creation.
- Shared zero-Tribe QR ORA → permitted; target exit + pending Spot → denied; same Tribe only → denied.
- Direct authenticated Storage read/list/year-long signing and public URL bypass → denied.
- Canonical/thumb/detail signed reads → HTTP200 and valid JPEG; expired reference on uncached request → rejected; authorized refresh → HTTP200.
- Unique reciprocal Match; ORA exit/Tribe leave and consent revoke preserve Match/photo/chat; own rights access works.
- Own metadata update and replacement preserve old current until publication. New version succeeds; old opaque version is denied after publication.
- Normal delete-account succeeds for both fixture accounts; fresh Auth login denied.
- Actual Google login to final Preview and reload/session persistence PASS. Own existing photo decoded1080px. No new OAuth/GCP resource/config changes.
- Mobile390×844: document width390, no horizontal overflow; pilot shell unchanged. Browser console error count0.

Initial OAuth callback immediately after adding the allowlist entry returned the existing staging Site URL. One later controlled retry returned the new Preview; no Auth logic or Site URL change was made and propagation cause is not proven. Only the exact final Preview host was added to staging redirects.

Operational note: a diagnostic URL read caught the transient OAuth callback before cleanup. Its credential values are not copied to repository/evidence/report. The normal app logout was performed and Google login recreated. That existing logout uses account-global staging sign-out, so other staging Previews can require login again; Production is a separate project and unaffected.

## T. Cleanup / exact residue

Final baseline: **4 accounts,4 profiles,42 objects,1 Match,2 messages**, matching before. New fixture Auth/profile/object/job/presence/membership/Spot/operation/quota/Match/message counts all0. Synthetic Place/catalog/QR all0. Unattributed objects0 when checked against all authoritative current/assets/validated/job/lifecycle/cutover references; missing current0.

Expected PHOTO technical residue only: **13 records**, no image bytes/product content:

| Technical receipt | Count |
| --- | ---: |
| purged lifecycle sets, reserved_bytes0 | 3 |
| completed account cleanup | 2 |
| settled cutover attempts | 3 |
| completed cutover deletion receipts | 2 |
| cutover audit events | 3 |

These retain only the existing lifecycle/idempotency metadata under PHOTO02's seven-day policy. Cleanup/scheduler remain OFF as required; expiry eligibility does not mean physical purge will run while paused. No ad-hoc deletion of receipts was performed. Temporary synthetic credentials and private seed SQL were removed locally.

Three **historical review** records remain unchanged (documented by the previous canary report), not new unknown writers: fixture review/unknown0. No unrelated data was cleaned up.

## U–W. GitHub / Preview

Runtime implementation commit pushed before deploy: **39969a4a03765c67049c076e82ddb117d16ab6c2**.

Final Preview: **https://spot-c92wr6fgh-fedegrasso1994-1482.vercel.app/**

Deployment: **dpl_6Wbqq2UQ4Nnh9DQqiDD8L5fB6C5q**, READY, target Preview; CLI inspection confirms READY/Preview; the CLI output does not expose Git metadata. The deployment was submitted with the exact runtime SHA metadata, and browser-served build-info confirms staging ref, authorizationV2/Spotv2 ON, DD engine OFF. Earlier superseded Preview had a commit-metadata transcription error; final deployment was resubmitted with the correct metadata and its served runtime SHA verified. No Production alias was promoted.

The subsequent test/diagnostic/evidence/report checkpoint is pushed on the same staging branch; final local/remote HEAD is returned in the final handoff. There are no later app-runtime changes beyond the deployed source commit.

## X–Y. Invariants / remaining conditions

- Main and Production unchanged; bundle contains no production project ref/URL/key or service credential. No Google Cloud edits; Luigi not used.
- PHOTO01/02 decoder, processing, canonicalization, limits, lifecycle, leases, retention and scheduler policy unchanged. Only the authorization dependency and diagnostic reader are adapted.
- Cleanup/scheduler OFF, jobs_paused true; DD/requests/comments/share/system-post flags OFF. No DD engine, future romantic requests, new product task or design change.
- Existing signed tokens and downloaded/cache-held pixels have the inherited limitations described above. A future production rollout needs its own controlled handling of pre-cutover references; do not infer immediate revocation from policy changes.
- Historical review and paused technical-receipt purge remain operationally explicit; not swept away to obtain a zero counter.
- New DD and SPOTTED features must consume this boundary and implement their own allocation/deliverability rules. Neither is activated here.

**GO WITH CONDITIONS to the next separately authorized DAILY DISCOVERY ENGINE task; no Production rollout authorized.**

![Staging pilot shell at390px](evidence/profile-auth-v2/preview-mobile.png)

## Exact modified/added files

```text
docs/evidence/profile-auth-v2/delete.json
docs/evidence/profile-auth-v2/preview-mobile.png
docs/evidence/profile-auth-v2/reader-grants.json
docs/evidence/profile-auth-v2/replacement.json
docs/evidence/profile-auth-v2/setup.json
docs/evidence/profile-auth-v2/smoke.json
docs/evidence/profile-auth-v2/staging-final.json
docs/evidence/profile-auth-v2/staging-final.png
docs/evidence/profile-auth-v2/staging-function.png
docs/evidence/profile-auth-v2/technical-receipts.json
docs/soma-profile-photo-authorization-v2-contract-2026-10-18.md
docs/soma-profile-photo-authorization-v2-report-2026-10-18.md
scripts/photo-admission-staging-canary.mjs
scripts/profile-authorization-staging-smoke.mjs
src/backend.js
src/live-social.js
src/photo-memory.js
src/profile-authorization.js
src/supabase-client.js
supabase/config.toml
supabase/functions/_shared/profile-photo.js
supabase/functions/profile-photo/index.ts
supabase/migrations/036_profile_photo_authorization.sql
tests/live-social.test.js
tests/photo-memory.test.js
tests/profile-authorization.test.js
tsconfig.json
```
