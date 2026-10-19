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
