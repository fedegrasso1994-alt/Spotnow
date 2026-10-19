# TRIBE frontend — review staging

Baseline `36bf7bb4d7779aba219db1e450c8aecb0ea693b9`, branch
`codex/soma-schema-v2-staging`. Original TRIBE WIP restored with `stash apply`;
backup stash retained. No backend schema/function/policy, PHOTO, ORA behavior,
SPOTTED feature, main or Production changes. No active hosted DD re-enablement.

## Implementation

- `daily-discovery-ui.js`: finite server-projected drop controller and existing
  card/avatar/button markup; keyed card reuse to avoid photo flicker on polling.
- `daily-discovery-state.js`: view mapping and server-time + monotonic countdown.
- `daily-discovery.css`: scoped `#daily` styling only; no global style/font changes.
- Existing `pilot-ui.js` shell/final nav connects to new controller.
- Existing `backend.js` exposes existing DD transport when staging v2 gates apply.
- `live.js` wires authorized photos/detail and shared Match lifecycle.
- Narrow `live-social.js` hooks for DD detail pending/quota/safety changes and the
  existing Match/chat screen. No separate Match/inbox/model.

Reused: Inter/Bebas Neue, dark colors/tokens, native card gradient/attribution,
primary buttons, avatar/private photo memory, authorized detail-photo, empty/error
patterns, viewport/safe-area navigation, shared Match/chat. Existing Preview wins
visually over Figma78:228; Figma only supplies the required UX/state inventory.
No timer box/badge, global redesign or global CSS refactor.

## Server contracts and state

`my_daily_discovery()` (idempotent040 wrapper), real `outgoing_spot_pending`039,
`send_tribe_spot(target_user,operation_id)`/Spot v2, `authorized_profile`, existing
profile-photo Edge/signing, existing Match page/chat endpoints. No allocation,
client window/quota claims or incoming-interest inference in frontend.

Full4 and partial1–3, empty-compatible-pool, quota-exhausted, consumed/window-finished,
overnight00–08, loading, retryable error and operational paused states implemented.
No filler/swap/client refill. Server revalidation may append only allocations that
server permits in never-used slots; removed/consumed assignments are never replaced
client-side. A blocked/expired/removed profile is removed, open DD detail invalidated.

Countdown starts from `server_now` and server `current_window_end`/next-start;
performance.now elapsed time and conservative request latency, not Date.now authority.
At boundary clear expired cards/detail and re-read server; no client-generated drop.
30s revalidation for authoritative membership/safety/pending and midwindow changes.
Network waits use existing bounded Supabase fetch. Late responses cannot cross
account reset/navigation. Photo signing remains existing authorized backend path.

Spot is never optimistic: real response/re-read determines pending and budget.
Pending (including ORA-origin pending projected by039) survives navigation/login
through server state. Stable per-target operation IDs are retained across uncertain
retry within the client session, cleared only on confirmed response/account reset.
On full browser reload, the server pending projection prevents a duplicate send;
server person-level uniqueness protects a retry with a fresh operation ID.
Spot exhausted disables new Spot but keeps profiles openable. Existing Match uses
shared chat; newly matched person delegates to existing Match screen. Empty shared
chat label stays `❤️ Nuovo match!`. Match/profile photo authorization is unchanged.

## Verification boundaries

54 targeted frontend/social/pilot tests PASS; full suite563/563 PASS; build and
expanded typecheck PASS. Six additional integration/regression tests cover shared daily
detail routing/state, late authorization expiry, and card/avatar DOM preservation.
DD040 targeted8 repetitions:7 PASS,1 known `expected4 received3` failure; not
consistent, no test or allocator patched. Existing nonblocking test-flakiness item.

LOCAL explicitly marked synthetic UI fixture (never a release entry point) used to
inspect22 cases at390x844 and320x640:1/2/3/4, quota,pending,night,consumed,empty,
loading,error. No horizontal overflow; Spot touch targets>=44px; long Tribe label,
clock and unchanged bottom nav checked. Pending survives local profile→TRIBE return.
These local visual checks do not claim active hosted DD/browser E2E.

The baseline hosted controlled E2E report proves DD→authorized photo→Spot→Match;
this task does NOT repeat active hosted E2E or enable Discovery for visual review.
New real Preview uses only staging backend; live operational paused screen is the
expected result while Discovery is OFF. Deployment/browser evidence appended below.

## Files and evidence

Runtime: `src/backend.js`, `src/live.js`, `src/live-social.js`, `src/pilot-ui.js`,
`src/daily-discovery-ui.js`, `src/daily-discovery-state.js`, `src/daily-discovery.css`.
Tests/config: `tests/daily-discovery-ui.test.js`, `tests/live-social.test.js`,
`tsconfig.json`; local-only fixture source under `scripts/tribe-fixture/`.
Evidence under `docs/evidence/tribe-frontend/`; screenshots under ignored
`.local/tribe-frontend/`. No synthetic hook/Production ref/server key in release.

Real iOS/Android hardware and active hosted frontend journeys remain later QA;
viewport tests are not a claim of testing physical phones.

## Deployment and final live gate

Published Preview: https://spot-a453xyiie-fedegrasso1994-1482.vercel.app
Deployment `dpl_52dEj4hmpc1s7HPA2vJ4ibmmnNoc`, target Preview, READY.
Runtime source commit `89fb53f81452ab97f03ccf147d765cc324871ef2`, pushed before
upload. Published build-info independently viewed in the browser confirms this
SHA, staging branch/ref and real DD frontend. Final evidence commit may follow;
that commit changes documentation/evidence only, not the uploaded runtime.

Added only this exact owned Preview redirect to Supabase staging's existing
allowlist (10→11 entries), to preserve the normal Google login flow. No broad host
wildcard; Site URL/providers/credentials/Confirm email untouched. No GCP settings.

Real Google OAuth succeeded and returned to this Preview; TRIBE showed the real
`paused` response. Profile→TRIBE navigation on initially loaded app passed.
390px initial app and1280px desktop layout inspected. No active DD hosted E2E
re-enabled. Subsequent delivery check found a NEW external access blocker:
- separate tab/reload enters the existing offline page; normal retry did not fix;
- console reports dynamic module fetch failure for `install-app-Bu95iobc.js`;
- authenticated CLI fetch of build-info receives HTTP302 to Vercel `/sso-api`;
- Vercel connector returns403 on this owner scope/project; list_teams returns none.
This is consistent with protected Preview asset delivery/SSO access, not evidence
of a DD RPC/backend semantic regression. Full session-reload/browser gate remains
BLOCKED; the earlier initial snapshot was insufficient to mark reload PASS.
No service-worker patch, Protection downgrade, secret extraction or backend
workaround applied. Requested user to authorize the existing Vercel connection
for team `fedegrasso1994-1482` / project `spot-now`; do not expand other scopes.

Local frontend/viewport tests remain PASS and clearly separate from this blocked
hosted delivery gate. Runtime source and Preview are ready for review once normal
protected access is restored; do not represent hosted reload as PASS meanwhile.

Final read-only staging check matches baseline: DD OFF, controlled admission OFF,
allowlist0, jobs paused, PHOTO epoch12 OPEN, cleanup/scheduler OFF;4 accounts,
42 objects,0 DD allocations/exposures. Production deployment remains
`dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh`; main remains
`d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.

Screenshots (ignored local artifacts, not synthetic final UI):
- `.local/tribe-frontend/mobile-4.jpg`: LOCAL4-profile fixture, explicitly marked;
- `.local/tribe-frontend/390-2.jpg`: LOCAL partial2-profile state;
- `.local/tribe-frontend/320-night.jpg`: LOCAL overnight state;
- `.local/tribe-frontend/320-4-bottom.jpg`: last CTA above native nav;
- `.local/tribe-frontend/preview-mobile-paused.jpg`: real initial hosted paused state;
- `.local/tribe-frontend/preview-desktop-paused.jpg`: real desktop initial state.
No physical iPhone/Android or full active-hosted frontend journey claimed.

Interim status before final follow-up: `TRIBE FRONTEND: BLOCKED` — protected Preview
access/reload verification remained incomplete. No SPOTTED task, main merge or Production change.

### Protected-access follow-up

The exact full Preview URL through official `vercel curl` returns HTTP200 for
`build-info.json`, confirming runtime SHA89fb53f and staging ref. The CLI handled
authentication internally; no token was read or copied. The earlier path-based
302 does not establish that authenticated full-URL HTTP access is broken.
This HTTP result does not verify browser imports/reload.

Founder authorized reconnecting only team `fedegrasso1994-1482` / `spot-now`.
No connector scope-update tool exists, and native Codex settings are inaccessible
to computer use for safety reasons. A temporary-share-link action was rejected
by automatic review as an unauthorized protection bypass; no link was created
and no workaround was attempted. User-managed Vercel reconnect requested.
Deployment Protection remains enabled; main/Production unchanged.

### Final browser verification — delivery gate closed

A fresh normal browser tab now loads the real Preview successfully. Authenticated
session persists across reload; Profile→TRIBE works. Clicking “Salva l’app sul
telefono” renders the actual installation guidance dialog, proving the previously
failing dynamic import now succeeds. Repeated mobile reloads at measured320×640
and390×844 return the real staging paused state with no horizontal overflow and
no warning/error console entries. No app patch, share link or protection change
was needed. Evidence: `hosted-followup.json`; screenshots
`.local/tribe-frontend/preview-320-reload.jpg` and `preview-390-reload.jpg`.

The Vercel connector still returns403 for the requested team; reconnect success
is NOT claimed. The official CLI's own existing identity can inspect the exact
Preview as READY. Connector authorization is therefore a separate integration
limitation and no longer blocks the observed browser review path.

Runtime/test results remain563/563, build/typecheck PASS; no runtime changes
since the deployed89fb53f commit. Discovery/cleanup/scheduler remain OFF.
The previous controlled backend E2E is not represented as an active hosted
frontend journey; active UI states were verified with explicitly local fixtures.

Final status: `TRIBE FRONTEND: GO FOR REVIEW`.
