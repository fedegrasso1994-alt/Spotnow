# ORA: one Spot/Place/day + three visited Places/day

Staging only: `zjinjtkekmaqtxsuyvho`, branch `codex/soma-schema-v2-staging`.

## Scope and previous behavior

The initial read-only audit confirmed the old 5 global Spots/day and 3 Spots/Place/day. It also established that a three-distinct-Place limit did not exist: the actual staging `start_ora` accepted a fourth Place, reproduced in an isolated synthetic database. Founder explicitly approved adding the missing distinct-Place enforcement. Current ORA duration is four hours and stays four hours; the legacy 90-minute mode is not restored.

## Single server policy and enforcement

Migration 061 reuses the existing private policy and counter tables, their RLS, FKs, account-deletion cascades and retention configuration. No new table or scheduler. Policy fields are renamed to `location_daily_limit=3` and `spot_location_daily_limit=1`; old 5/3 defaults and runtime controls are removed. Policy values are constrained to the approved pilot rules.

A row in `ora_spot_place_quota(user_id, place_id, local_date)` represents a visited Place with `used=0`, or its consumed Spot with `used=1`. The existing account/day parent remains a FK anchor/write fence and aggregate receipt; its `used` is never used as a global Spot cap. No new wallet.

Private `ora_charge_visit` runs under the existing global lock and account/day write fence. Same Place/day is idempotent; a fourth distinct Place raises `ORA_LOCATION_DAILY_QUOTA` before changing the live presence. Manual and QR share `start_ora`; returning, switching, logout/reentry or replacement presence cannot reset the ledger. A retained presence overlapping the current Rome day is counted before switching away, including one which has just expired. Active same-Place retry keeps its original presence and expiry.

`send_spot_v2` changes only the ORA quota branch: ensure current-day visit, atomically increment that Place if below one, otherwise `SPOT_PLACE_QUOTA`. No global Spot comparison remains. Existing nonce replay, person-level pending behavior, existing Match, reciprocal Match/chat, transaction rollback, safety/eligibility and every TRIBE/Chance branch are preserved.

`my_ora_spot_budget` keeps its signature and compatibility keys. `remaining` and `place_remaining` describe only the current Place (zero/null without an active presence). UTC timestamps and server `AT TIME ZONE Europe/Rome` derive the day after existing locks. Client timezone/day/actor cannot choose the quota key. Rome calendar days can be 23 or 25 hours.

## UI

Dedicated `src/ora-spot-quota.js` reads the real RPC residual, invalidates stale detail reads, disables initiative while loading/exhausted/unavailable, and never stores a client allowance. Minimal wiring in existing `live-social.js`; an existing Match still opens chat regardless of budget. Updated only exhausted-Spot and fourth-Place messages. No layout/CSS redesign. No Chance/SPOTTED change.

## Test evidence

- Targeted ORA/Spot, Chance, SPOTTED 1/day and exact migration replay: 65/65 PASS.
- UI targeted: 29/29 PASS. After adding midnight carry-over coverage, final focused set: 37/37 PASS.
- Native PostgreSQL 17.11 with genuine independent authenticated sessions: one allowed/one denied for concurrent third/fourth Places, one allowed/one denied for two Spot initiatives in one Place, concurrent re-check-in cannot reset it, nonce replay free, midnight race one new-day credit only. Maximum measured Place count 3 and Place Spot usage 1. `docs/evidence/ora-one-day/native-races.json`.
- Native harness initially reached the official image's temporary socket-only initialization server and lost its connection during normal shutdown; a PID-name check was also incorrect for the Nix wrapper. Read the official entrypoint and changed readiness to TCP (temporary bootstrap does not listen on TCP). No quota race was executed by those failed bootstrap attempts. Final and final-migration native proofs PASS; containers, volumes and temporary random credentials removed. No blind runtime retry or PHOTO operation.
- Existing historical migration tests remain version-specific. New dedicated `ora-quota-database` applies 061 over the established fixture; full migration replay also applies 061 exactly. Historical migrations are immutable.

## Rollout and limitations

Migration fails closed on incompatible historical counters (any Place used >1 or more than three recorded Places/day), instead of clamping/deleting receipts. Current active presences are seeded into today's visit ledger; absent earlier deleted presence history is not fabricated. Enforcement applies from cutover, with overlapping retained presence accounted for on subsequent entry. No new retention duration is invented: existing ORA quota-retention configuration remains unchanged.

No new staging synthetic users, photos or content are needed. No modification to PHOTO, recovery, Match/chat, Chance, SPOTTED, auth, legal, main or Production. Deployment/test evidence and final results follow below.

## Final staging validation

- Full final suite **927/927 PASS**, no failures/skips/cancellations; build PASS; typecheck PASS. Previous complete pre-carry-over run also passed 926/926; final run includes the new carry-over regression.
- Migration 061 applied and registered in staging. No incompatible historical counters (zero Place quota rows); no active presence to seed. Source fingerprint comparison confirms all 4 profiles, 3 existing expired presence rows and 42 Storage objects unchanged.
- Deployed submit definition compared byte-for-byte after normalizing only the intended ORA quota replacement. Manual/QR public wrappers and every unrelated public/private function definition unchanged. Private helper/policy/counter access denied to ordinary clients; anonymous submit denied; authenticated RPC preserved; CHECK validated.
- Chance/Discovery OFF; Chance scheduler OFF/no job. PHOTO OPEN, cleanup and schedulers OFF. Retention Phase A remains active at `0 3 * * *`; no other cron changed.
- No auth/session/MFA or legal/retention policy changed. No staging synthetic fixtures/photos created. Only isolated disposable local test fixtures were used, all removed. No authenticated browser E2E claim; server correctness is proved with deployed-definition equivalence, real independent-session PostgreSQL races and PostgreSQL-backed regressions.
