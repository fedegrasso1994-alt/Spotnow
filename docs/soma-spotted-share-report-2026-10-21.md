# SPOTTED Share + deep links — staging report, 2026-10-21

**SPOTTED SHARE: BLOCKED**

Implementation, backend authorization and most hosted/browser journeys pass. The task's explicit STOP condition occurred: the new protected Preview showed **“Sei offline” after normal synthetic-account logout/navigation**. No service-worker/cache/security workaround was applied. Only fixture cleanup and evidence delivery continued.

## Baseline and scope

- Branch `codex/soma-schema-v2-staging`; starting SHA `0a951d4e2fe909b2c93c7d9e9c5b409a717701e6`, 651 baseline tests.
- Runtime implementation/deployed SHA: `e8a399d72bcc1da86ebc513e3134670a5fa5e2d7` (pushed before deploy).
- Preview: https://spot-2rhspdi2y-fedegrasso1994-1482.vercel.app/
- Deployment ID: `dpl_2svcK7Ze1jPedMxB2ThMJyfF3wtG`, Ready, Preview/prebuilt, no Production URL.
- Supabase staging only: `zjinjtkekmaqtxsuyvho`.
- No main merge, Production modification, new provider, Share tracking, analytics, notifications or social/romantic semantic change. PHOTO, ORA/DD rules and Membership limits unchanged.

## A. Routing/deep-link inventory

The existing app mounts at `/`; internal history records screen/context, not public content routes. Supabase SDK restores persistent Auth sessions from normal callbacks. `authRedirect` previously carried only explicit QR context; onboarding/AGE/consent/profile/photo and Membership Engine are authoritative gates. Existing QR draft storage is distinct from Share ingress. Vercel Preview output already routes to the root app. Service worker is network-first for same-origin document navigations and caches only a static offline explanation, never API/UGC.

Share uses a root query, `/?s=<opaque-reference>`, so no path rewrite or public content endpoint is introduced. A new Share ingress does not restore an unrelated old QR draft or reuse the ORA exception to bypass required Tribe choice. Explicit actual QR context retains its existing separate behavior. The query survives reload and validated Auth redirects without new content storage in localStorage.

## B–C. Reference and authorization design

Additive **migration 048_spotted_share.sql applied only in staging**:

- Private `spot_private.spotted_share_refs(token,post_id,comment_id)`; one reference per content, not per sender/click.
- 64 hex characters from two independent UUID-v4 values: 244 random bits, no embedded author/user/Tribe/content IDs. No sequential references, timestamp, click counter or sender record.
- RLS enabled; anon/authenticated/service-role table access revoked. Only authenticated callers may execute `spotted_share` / `spotted_resolve_share`.
- Writer uses existing board serialization and technical anti-spam, with stable concurrent/retry reuse. It cannot target an official system question or unavailable content.
- Resolver checks current membership/eligibility, content type, existence, parent/QoD visibility, removal/hidden state and expiry using existing social authorization. Match/profile access does not substitute for Tribe membership.
- Invalid/missing/nonmember/expired/removed yields identical `{available:false}`; no linked Tribe identity or content is returned before authorization. Successful result has only authorized `place` plus existing anonymous post/comment projections.
- No arbitrary TTL: links remain subject to live content authorization. FK cascades remove references when content is physically removed, including normal account deletion. Soft-deleted/held rows can retain an unusable technical reference until their existing content retention completes. This is not permission to retain content indefinitely.

Hosted catalog check: RLS true; table reads false for anon/authenticated; anon RPC execution false; authenticated RPC execution true; zero orphan references. Existing RPC/RLS definitions were not rewritten.

## D. Auth/onboarding and pending target

A signed-out recipient sees ordinary Soma Auth, with no hidden text. The opaque query is preserved through Auth callbacks/errors, AGE/consent, required profile/photo and explicit Tribe selection; no auto-join. A zero-Tribe recipient first sees the normal pilot choice screen, unselected and Continue disabled. After explicit Membership Engine join, resolution is retried against live authorization. Existing revoked dating consent does not create a new Share-specific gate; social eligibility semantics are reused.

Normal password/JWT synthetic Auth and SDK callback/session restoration were exercised in the real Preview. Unit/live-navigation tests cover the mandatory-gate ordering and target preservation, including zero-Tribe + existing ORA and old QR draft conflicts. This does **not** claim a new real Google/email delivery test.

The new Preview origin is absent from the staging Auth redirect allowlist. Founder approval to add only its redirect was requested; no approval had been received when the offline STOP occurred. **It was not added.** Site URL, Confirm email, provider configuration and existing redirects were unchanged. Google/email return to this new Preview remains an operational gate; otherwise Supabase uses its old Site URL.

## E–F. Post/comment behavior

- Small outline “Condividi” control in the existing tertiary action row. No card/nav redesign.
- Official QoD system content excluded; user answers/comments reuse existing user-content authorization.
- Native share payload is only generic `Soma — SPOTTED` title plus opaque URL, never body or identity. Unsupported environments use clipboard; if unavailable, a selectable readonly link is offered. Cancellation does not copy. Slow preparation can retry with a cached reference without another writer call.
- Authorized post opens its existing thread. Comment opens parent and highlights/focuses the exact comment, including one beyond the first page. Highlight scroll/focus occurs once after rendering, not on every poll.
- Refresh re-resolves live shared authorization before displaying target content. Pause/account reset clears target bodies; no persistent UGC cache.

The real Preview rendered both post and highlighted comment. Share buttons were triggered, but the controlled browser did not expose a verifiable OS-sheet or clipboard completion; no physical native-share PASS is claimed. Native/copy/cancel/retry paths have automated test coverage. Physical-device/native-sheet QA remains deferred.

## G–H. Anonymity, metadata and unavailable fallback

Hosted member payload excludes author/user identifiers, timestamps, revision/security data and private profile/preferences. URLs contain only the opaque reference. Public HTML/title/meta remains generic Soma and has no UGC/identity preview. No public social feed, redirect context leak or tracking parameter was added. Token URLs may enter existing provider access logs; log minimization remains part of the provider/retention work and no new analytics use is authorized.

Real nonmember and expired links showed exactly “Questo contenuto non è più disponibile.” A removed post/comment initially encountered a network/import anomaly; one normal UI retry then showed the same neutral fallback. Neither removal reason nor author data appeared. Hosted API deletion/expiry checks passed independently.

## I. Adversarial results

| Check | Result / scope |
| --- | --- |
| Member post/comment creation and stable opaque reference | PASS hosted + PostgreSQL |
| Nonmember, zero-Tribe, guessed UUID/token, modified token | PASS hosted + PostgreSQL; exact neutral response |
| Bounded nearby-token enumeration by eligible member | PASS: valid link works; up to 16 neighboring guesses fail, synthetic probe then deleted |
| Anon RPC and raw private-table access | PASS denied; hosted anon and catalog/PostgreSQL grants checks |
| Pre-Auth / pre-AGE / missing profile / pre-membership read | PASS tests; browser Auth and zero-Tribe screen show no content |
| No auto-join, leave revocation, existing Match not a bypass | PASS normal hosted leave/rejoin + PostgreSQL + live-navigation tests |
| Expired, removed comment/parent, hidden parent, closed QoD | PASS PostgreSQL; hosted expiry/delete; UI neutral states noted above |
| URL/metadata/anonymous projections | PASS tests + hosted payload + browser DOM |
| Comment parent context / target outside first page | PASS tests; actual comment highlight in Preview |
| No Spot/Match/request/like/quota side effects | PASS PostgreSQL counts before/after sharing/resolving |
| Concurrent writer/retry | PASS one content-level reference, existing lock reused |
| Purge / normal account-deletion preparation + Auth cascade | PASS PostgreSQL; hosted account cleanup leaves zero refs |
| Service worker protected-content cache | PASS source/tests: no API/asset/UGC caching. Later document fallback STOP remains open |
| Native OS share / desktop clipboard result | Unit paths PASS; actual sheet/clipboard outcome NOT CONFIRMED in controlled browser |

## J–K. Hosted E2E and Preview stop

Three synthetic confirmed Auth fixtures were seeded in two isolated synthetic Tribes, without changing Confirm email. Normal Auth JWTs completed AGE/consent, actual PHOTO upload/canonical profile and Membership Engine setup. No Discovery needed.

Real Preview evidence:

1. Signed-out Share link -> Welcome/Auth with retained opaque target, no content.
2. Member Auth callback -> correct anonymous parent + targeted comment.
3. Authenticated comment reload -> same target, PASS.
4. Fresh same-browser tab for post -> correct thread; reload PASS. This was not incognito.
5. Other-Tribe fixture -> neutral fallback, no parent/body.
6. Zero-Tribe fixture -> mandatory normal choice; explicit synthetic rejoin -> pending target resolves.
7. Expired -> neutral fallback.
8. Removed -> first attempt network error; normal retry -> neutral fallback.
9. Public metadata generic, no content/identity.
10. Final logout/navigation -> **“Soma — Nessuna connessione / Sei offline”**. STOP honored, no further feature verification or workaround.

A console entry before STOP reported a failed dynamic import of this deployment's `/assets/install-app-Bu95iobc.js`. That request is outside the service-worker asset interception scope; its failure and the later rejected document navigation are observations, not a proven common root cause. No historical failure status/redirect chain was invented. The neutral retry recovered, but the later offline screen means Preview transport/reload is not reliably closed.

Screenshots/evidence: `docs/evidence/spotted-share/`, including `auth-required.jpg`, `post-thread.jpg`, `comment-target.jpg`, `nonmember-neutral.jpg`, `zero-tribe-gate.jpg`, `expired-neutral.jpg`, `removed-neutral.jpg`, `preview-fetch-error.jpg`, `offline-stop.jpg` under `screenshots/`. `preview-console.json` has query context scrubbed; no Auth tokens are retained.

## L–N. Tests/build/responsive

**672/672 full-suite PASS**, zero failed/skipped, on the final implementation plus adversarial tests. Baseline 651 -> 21 new tests (9 PostgreSQL, 8 Share client/UI, 4 live-navigation scenarios). Staging-configured build PASS; typecheck PASS; release scanner PASS (staging only, no production ref/server secret/test credential; self-hosted fonts).

The VM live-navigation harness was updated to inject the new module and dispose its UI polling; initial harness import/teardown failures were corrected without changing app eligibility/business rules. A temporary SQL fixture-guard string-escaping error was corrected before seed; its failed transaction wrote no fixture data. These were test-preparation defects, not decoder/Auth policy changes.

No new 320/390 physical responsive PASS is claimed. Existing wrap/min-width/tap-target language is reused; actual desktop screenshots show the integrated controls. Device responsive/native-sheet QA remains deferred, not the sole gate blocker.

## O–P. Preview, remaining blockers and cleanup

Preview remains the URL above, using only staging and unchanged Vercel Authentication. No temporary access link, security weakening, Production deploy or main merge.

Blockers:

1. **Required STOP:** document offline fallback reproduced on the new deployment after logout. Needs separately scoped Preview/network investigation; no service-worker workaround in Share.
2. New exact-origin Auth redirect not yet authorized/applied. Real Google/email return to this deployment is not complete.
3. Native OS share and clipboard outcome still require manual device verification; automated paths pass. This is reported separately from the reproduced offline blocker.

All three synthetic accounts deleted via normal delete-account/PHOTO lifecycle. Old password logins/access/refresh tokens rejected afterward. Fixture posts/comments/likes/reports/requests/Match/chat/membership/profile/Auth/session/Storage rows and **all Share references = 0**. The two synthetic catalog/venue containers were removed only after dependency guards passed.

Staging restored to **4 accounts, 4 profiles, 42 Storage objects, 1 post, 1 comment**. Existing profile/post hashes exactly match preflight. Zero missing current photo or new fixture orphan. Pre-existing old Storage review objects remain untouched; no global-zero-orphan claim.

Three minimal concluded PHOTO receipts remain under the existing seven-day lifecycle: state purged, writer settled, reserved quota zero. No manual purge or PHOTO semantic change. Discovery OFF, jobs paused, cleanup OFF, scheduler OFF, retention paused, QoD flag OFF, PHOTO phase OPEN unchanged. Confirm email ON throughout.

Private synthetic credential/seed/callback/state files removed; no credentials in repo/report/chat. Normal client/session tests used only synthetic accounts, never admin/service-role credentials.

## Q–S. Git delivery and exact scope

Implementation commit `e8a399d72bcc1da86ebc513e3134670a5fa5e2d7` was pushed before Preview deployment. The follow-up evidence commit contains the additional hosted-smoke harness phases, an expanded enumeration assertion and this report; application runtime remains unchanged from the deployed SHA. Final returned evidence SHA is distinct from runtime SHA. Everything is pushed to the same staging branch; no main merge. Working tree is checked clean after delivery.

Runtime files: `src/spotted-share.js`, `src/spotted-social.js`, `src/spotted-social-ui.js`, `src/spotted-presentation.js`, `src/spotted-social.css`, `src/pilot-ui.js`, `src/live.js`, `src/auth-preview.js`.

Server: `supabase/migrations/048_spotted_share.sql` only. No Edge deployment or existing RPC/RLS rewrite.

Tests/tooling: `tests/spotted-share.test.js`, `tests/spotted-share-client.test.js`, `tests/live-navigation.test.js`, `scripts/share-staging-smoke.mjs`, `scripts/prepare-share-preview.mjs`.

Documentation: `docs/soma-spotted-share-contract.md`, this report, sanitized `docs/evidence/spotted-share/`.

Main remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. Production unchanged. No analytics/notifications work begun.

**SPOTTED SHARE: BLOCKED**
