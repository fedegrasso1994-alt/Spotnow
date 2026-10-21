# Preview offline reload investigation — 2026-10-21

**PREVIEW OFFLINE RELOAD: BLOCKED** — the previously failing reload did not reproduce in this run. The exact service-worker fallback trigger is proven; the upstream cause of the earlier rejected navigation is not. No runtime patch or redeploy was made.

## Baseline and scope

- Branch `codex/soma-schema-v2-staging`; starting evidence HEAD `2c624b8c3999d0820ef6c6fd3185fd80d3335519`.
- Exact URL: https://spot-jpm87ufx2-fedegrasso1994-1482.vercel.app/ .
- Vercel CLI inspect resolves it to Preview `dpl_41CasDHEsSFZP3SipvfnWrYzsDsM`, project `spot-now`, owner `fedegrasso1994-1482`, status Ready.
- Deployed runtime remains `79519e72526a2f02f2a1254f3863ca000bccadb7` from the previous verified deployment; this task makes no deployment. Root asset is still `index-CQJhBGOc.js` and dynamic module `live-CVoFdrpF.js`.
- Main remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. No Production, backend, Auth configuration, feature flag, scheduler, cleanup or QoD change. No Share work.
- No new access link/bypass was generated. Normal existing Vercel CLI authentication was used only for read requests. Deployment Protection and Soma authentication remain unchanged.

## A–B. Exact proven condition versus unproven root cause

The standalone page headed **“Sei offline”**, titled **“Soma — Nessuna connessione”**, is `public/offline.html`. It has no application bundle or Auth/session bootstrap. Its retry button invokes `location.reload()`.

`public/sw.js` intercepts only same-origin GET navigation requests. Its exact path is:

`event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html') || static503))`

Therefore the prior standalone screen is consistent with a **rejected document fetch** in the service worker, followed by the cached explanation. It is not selected by inspecting HTTP status, by a failed dynamic import, by Supabase Auth state, or by `navigator.onLine`. A network rejection can have several causes; this handler cannot identify which one. The previous task's screenshot proves the fallback was shown, but does not contain the failing request/error required to prove the upstream cause.

This run: existing exact-URL tab initially showed Welcome, normal reload showed Welcome, and a forced-reload keyboard shortcut also left a working Welcome. A newly opened same-browser tab loaded Welcome, opened the email/Google Auth UI, then reloaded to Welcome. Error/warning console capture returned an empty list at these checks. A fresh tab is **not** a private/incognito session. The shortcut result is not a trace proving HTTP cache bypass.

No failing reload occurred during these bounded checks. Do not relabel this as a fixed bug merely because it currently works.

## C. Service-worker audit

- Registration: `src/main.js`, production build only, `/sw.js`, after window load (or immediately if complete). Registration errors are ignored. There is no unconditional `skipWaiting`/`clients.claim` or app-shell precache.
- Install caches only `/offline.html` in `spot-now-offline-v1`.
- Activate deletes older caches in the `spot-now-offline-` family; current version is v1. No application version change was made.
- Fetch is network-first for navigations; no JS/CSS, API, Auth, profile/photo or chat interception/caching. The worker does not store failed navigation responses or preserve an offline state between requests.
- A fulfilled 302/401/403/500 response passes through unchanged. A redirect that subsequently fails as a network operation could reject; no such failing chain was captured here.
- Next navigation always tries the network again. A missing static explanation produces the existing plain 503 fallback.
- Authenticated CLI `/sw.js` bytes equal repository `public/sw.js`. Deployed `/offline.html` begins with the complete repository document and has Vercel feedback-script injection appended; this difference is not evidence of stale application code.
- **Unavailable in the supported browser API:** active registration/controller/scope/lifecycle and cache contents at the original failure. The read-only page evaluator exposes DOM only; a request for navigator/performance returned unavailable, so no unsupported browser-state extraction or hidden CDP workaround was used.

## D–E. Vercel, assets and Auth

Normal authenticated Vercel CLI requests returned:

| Request | Status | Content type | Redirects |
| --- | --- | --- | --- |
| `/` | 200 | text/html | 0 |
| `/assets/index-CQJhBGOc.js` | 200 | application/javascript | 0 |
| `/assets/live-CVoFdrpF.js` | 200 | application/javascript | 0 |
| `/assets/bacheca-THRLbLQp.js` | 200 | application/javascript | 0 |
| `/assets/index-D2K0kXD5.css` | 200 | text/css | 0 |
| `/assets/live-DXMCAE7t.css` | 200 | text/css | 0 |
| `/sw.js` | 200 | application/javascript | 0 |
| `/offline.html` | 200 | text/html | 0 |

These statuses are **CLI observations with existing authentication, not browser HAR/status evidence**. Browser asset inventory separately observes the current scripts/styles/dynamic modules; Welcome and Auth UI work. No observed failed dynamic import, 401/403, redirect-to-login or HTML-as-JS error in this run. This does not exclude protection/cookie/redirect behavior at the earlier failure.

Soma Auth is downstream of document loading and cannot itself select the standalone offline HTML. A separate `src/diagnostics.js` banner says “Sei offline. Le nuove azioni richiedono una connessione.” when `navigator.onLine === false`; this is a different UI from the standalone page. Bootstrap timeout text is also different. Do not conflate the three observations.

Current browser tests were logged out (Welcome/Auth form). No user tokens were read, no email was sent, no fixtures created, no account login/logout forced. Logged-in reload/session hydration was not newly verified. Existing authenticated QoD interactions from the preceding task are historical evidence, not a logged-in reload PASS here.

## F–H. Fix and verification limits

**No runtime fix:** neither a stale cache, an Auth race nor a Vercel protection failure has been proven as the root cause. Changing the fallback would mask an undiagnosed request failure. Broad service-worker changes, protection weakening and new access links are out of scope.

| Check | Result |
| --- | --- |
| Exact-URL normal load / normal reload, logged out | PASS in current run |
| Forced-reload shortcut | Working Welcome observed; cache bypass not instrumented |
| New same-browser tab / Auth form / reload | PASS, no console warnings/errors observed |
| Dynamic application module boot | PASS at Welcome/Auth; matching observed modules, CLI MIME/status correct |
| Original failing document status/error/redirect chain | NOT CAPTURED; failure not reproduced |
| Private/incognito session | NOT AVAILABLE through supported browser controls; fresh tab is not equivalent |
| Actual service-worker registration/controller / navigator.onLine | NOT CAPTURED; supported evaluator does not expose browser internals |
| Logged-in reload and app-tab-switch reload | NOT RUN in this task |
| Real browser offline simulation / reconnect | NOT RUN; no supported network-emulation control. Host connectivity was not changed |
| Worker network-failure/reconnect behavior | PASS in isolated VM using the actual deployed worker source; not physical browser evidence |

To close the investigation requires a failing browser navigation trace with document status/error, redirect chain, worker/controller and console data, plus logged-in/private/offline/reconnect verification. If it proves a protection-setting change is needed, stop for separate authorization. No speculative settings change is approved by this report.

## I–L. Tests and repository delivery

Three regression tests added to `tests/pwa.test.js`, using the actual worker source:

1. HTTP 200/302/401/403/500 responses never select offline fallback just because of status.
2. Rejected navigation fetch selects cached fallback without consulting navigator/Auth.
3. Missing fallback returns 503; subsequent successful network request recovers and does not remain stuck offline.

Relevant PWA tests: **5/5 PASS**. Full suite: **651/651 PASS**, zero failed/skipped. Staging-configured build PASS; typecheck PASS. Results are recorded in `docs/evidence/preview-offline/validation.json`. No app, styles, backend or migration file changed. Only tests, this report and sanitized evidence are versioned/pushed on staging; the returned commit SHA identifies that evidence revision, not a new deployment.

Screenshot `docs/evidence/preview-offline/reload-welcome.jpg` is the actual current Preview after reload, not proof that the intermittent failure is resolved. Prior failure screenshot remains in `docs/evidence/spotted-qod-resume/screenshots/preview-reload-blocker.jpg`.

**PREVIEW OFFLINE RELOAD: BLOCKED**
