# TRIBE → Chance staging report — 2026-10-30

Baseline `89183ece34a5291ae244551065547ce472936599`. Work only on `codex/soma-schema-v2-staging`. No ORA/SPOTTED quota patch, no recovery change, no main/Production mutation.

## Implementation

The previous 4+4 gallery RPC is replaced in the pilot shell by a dedicated Chance API/state/controller/CSS. Existing avatars, authorized profile detail, Spot/Match presentation, typography, colors and bottom navigation are reused. No global CSS refactor.

Migration058 adds private Chance control/day snapshots/directional owner receipts and policy3. Existing DD exposures remain single unordered reciprocal introductions. Existing builder/ranking, compatibility, membership identity, controlled admission, fairness/pair memory and no-refill locks are reused. Legacy caps remain unchanged on legacy policies; Chance uses degree1/release and global configured day cap4. Shared modifications are narrow conditional integration points; direct Spot APIs share the same reveal/expiry/one-Spot fence. ORA quota logic is unchanged.

Migration059 adds seven minimized Chance events and slot/timing fields to existing first-party Analytics. No counterpart/dating/location dimensions copied. Release/expiry events are passive; explicit reveal/view/Spot are active interactions. Existing90d Analytics retention, DD30d retention, physical purge and safety holds remain authoritative. New child state is explicitly enumerated by the existing fail-closed Phase A FK guard.

Configuration defaults: OFF; four ordered Europe/Rome release times10:00/14:00/18:00/21:30; UTC storage, per-day pinned schedule, exactly86,400 elapsed seconds per introduction. First activation is server stamped. Clients send no peer/owner/time/expiry/cap parameters. Unrevealed RPC metadata contains no profile identity/Tribe. Voluntary directional reveal returns exactly one currently authorized profile. Continue/revisit sends no rejection or product-state mutation.

Founder clarification is preserved: four NEW Chance/day globally, no extra Spot-action daily cap. A still-valid yesterday Chance can receive its Spot today in addition to today's introductions.

## Tests

Final full suite: **914/914 PASS**, zero skipped/cancelled. Build PASS; typecheck PASS. Chance engine15, UI9, Analytics/retention/scheduler4 and artifact guard1 tests pass. Legacy Auth/onboarding/QR/membership/ORA/SPOTTED/Match/chat/moderation/SEC-01/LOC-01/PHOTO/recovery suites remain green. Three initial full-suite failures were obsolete migration/table-count assertions and old TRIBE copy; assertions updated to exact new inventory/text. Initial scheduler helper ambiguity corrected before deployment. No runtime assertions weakened.

Tests cover same-slot reciprocity, directional reveal, four-global backlog, three memberships, zero/small pools, carryover fifth Spot action, exact expiry, pinned-snapshot denial, Rome/DST civil conversion, no pool/profile API before reveal, block/leave/delete/suspension/consent, Match/retry receipts, no future release, repeated release, safe retention cascade/hold, and scheduler defaultOFF/private server binding. Local PostgreSQL-backed tests are PGlite, not multi-session concurrency proof.

## Live staging

058/059 applied and registered atomically, source statements retained in the migration ledger. Initial policy/controlOFF and no new cron proved by `evidence/tribe-chance/install.json`.

Two new synthetic users completed real password authentication,18+ attestation, dating consent, strict PHOTO upload/canonicalization, profile save and IULM membership. Existing users were excluded server-side by controlled admission. Temporary canary config uses one nearby release and daily cap1; restored pilot config at end.

Live PostgREST smoke uses genuinely concurrent HTTP requests: reciprocal same slot/TTL, no counterpart metadata, duplicate reveal idempotence, other side remains unrevealed, two distinct concurrent Spot operations exactly one succeeds, reverse Spot creates the unified Match. Evidence: `setup.json`, `runtime-smoke.json`. Two enable preparation SQL errors (missing required allowlist reason, then generated IN-list typo) rolled back entirely before the successful enable; no policy guard bypass.

The LAN DNS resolver failed to resolve staging. Public DNS and normal TLS/project header confirmed the same staging endpoint. Only the test process used a scoped staging-host lookup, including an explicitly verified address; no Mac DNS/app/Edge configuration changed. Initial failed Auth create returned transport status0 before account creation. No request email or human login needed.

## Preview and browser

URL: https://spot-qmggd6u98-fedegrasso1994-1482.vercel.app/
Deployment: `dpl_Hs1wtmuH9XNYaE8EjfdNcYYFvTrH`, READY, genuine Preview targetnull, aliaslist empty.
Served artifact commit: `aba1f69d672b0cf852c82095c79a2964018840f7`, independently read from `/build-info.json` on that exact URL. Source: isolated build, empty envDir, explicit staging publishable key and verified pilot flags. Artifact scan rejects Production refs, server credentials/private keys and server-role JWT values, while allowing harmless SDK explanatory role text.

The earlier dangerous `target: staging` alias path was avoided: normal Preview deployment was used. Both Production aliases remained on `dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh`, with unchanged alias timestamps before/after. No Production env read or changed; no domain promotion/protection change. No Auth redirect/SiteURL/Confirmemail/key/trust/MFA change.

Authenticated browser smoke eventually completed bootstrap: correct five-tab nav, Chance copy/server countdown/waiting state after Match, and unified Match row `❤️ Nuovo match!`. The full reveal-card/revisit visual flow was NOT witnessed before the automated reciprocal Match; do not count it as passed. Screenshot: `preview-waiting.png`. Browser bootstrap used the synthetic password session; this is not a new Google/email E2E claim. The browser observation automatically included a temporary synthetic session fragment; it was not persisted in code/evidence/report. URL cleaned and those fixture sessions are retired with account cleanup. No source/staff credentials involved.

Responsive320/390 remains **BLOCKED**: IAB exposes no viewport control; native Chrome reports `Computer Use permissions are not granted`. No physical-device QA claimed.

## Scheduler and remaining review gates

The SQL configuration helper and private native tick exist, defaultOFF; no new provider/Edge/secret. Automatic review rejected temporary live scheduler activation under the existing scheduler-OFF canary constraint. **No Chance cron was created or activated**; no indirect workaround attempted. Scheduler config/private binding/OFF behavior pass PostgreSQL tests; live scheduled offline release remains UNVERIFIED. On-demand catch-up/runtime concurrency passed.

To complete the remaining review: explicitly authorize a separate controlled Chance scheduler canary if desired, keeping all other jobs unchanged, and provide browser computer-control access for the responsive/reveal visual pass. Do not treat on-demand catch-up as automatic delivery proof. No ordinary-user rollout is approved here.

## Final-state verification

Final postflight PASS (`postflight.json`): zero synthetic Auth accounts/profiles/Storage objects/Chance owner-state; zero nonfixture Chance allocations; allowlist empty. Normal delete-account engine removed both fixtures and their protected content; no lease/lifecycle bypass. Retired synthetic passwords removed from the ignored fixture definitions. Empty canary policy3 windows/day snapshots were removed only after zero-account/exposure/allocation guards; new Chance control restored to initial OFF/null activation/four pilot times. No historical DD windows or preexisting product data removed.

Original Auth/profile/Storage fingerprints are identical, including all42 original Storage objects. PHOTO phaseOPEN, cleanupOFF and schedulerOFF unchanged. Cron inventory identical: only Retention Phase A active at03:00UTC; privacy/PHOTO jobsOFF; no Chance cron. Discovery/Chance/admissionOFF. All existing effective feature flags unchanged. The expected `dd_admission_changed_at` audit timestamp records this controlled test; it was not forged back to its old value.

One parallel read-only CLI verification failed because concurrent CLI initialization rotated the same temporary `cli_login_postgres` credential. Verification was repeated sequentially after this harness cause was identified; no application Auth password/session/MFA was changed. Control-stop execution also encountered automatic-review timeouts before execution; final successful stop and postflight are verified. This is separate from the explicit scheduler-activation rejection.

No indefinite fixture user content remains. Existing approved technical delete/PHOTO receipts follow their own lifecycle, not ad hoc deletion. No PHOTO/recovery files changed.

## Files and evidence

Source: `src/chance-api.js`, `chance-state.js`, `chance-ui.js`, `chance.css`; narrow integration in `backend.js`, `pilot-ui.js`, `live.js`. Schema:058/059. Tests: Chance engine/UI/Analytics-retention/artifact and two helpers; exact migration inventory and pilot-copy expectations updated. Operational canary/build modules under `scripts/chance-staging/`. Canonical product contract and Chance contract updated. All evidence is under `docs/evidence/tribe-chance/`; no private fixture credential/config file is tracked.

Remaining blockers are verification/authorization only: live automatic release not exercised; real reveal-card/revisit responsive320/390 not observed. No ordinary rollout, ORA1/location/day, SPOTTED1/day, new notification or recovery work started.

## Commits and scope

`c1bdc5e` backend, `801f02c` UI, `e60bff0` Analytics/tests/contract, `aba1f69` artifact/canary tooling. The final evidence commit may differ from the immutable Preview runtime commit. No recovery source/contract/archives changed. Existing canonical PHOTO lifecycle, cleanup and signing trust remain unchanged.

TRIBE CHANCE: BLOCKED
