# Consolidated adversarial romantic-surface regression

Baseline: `codex/soma-schema-v2-staging`, `d47d13d358ca1d2efdb4a1a94e57d939406ea69a`; clean tree; 930 baseline tests. Staging project `zjinjtkekmaqtxsuyvho`. This is regression work, not rollout, visual work or a new feature. No application, migration, RLS, provider configuration or product changes.

## A. Read-only audit: server sources of truth

| Surface | Server authority | Scope / fence | Time |
|---|---|---|---|
| Chance | 058: `chance_control`, immutable day snapshots `chance_days`, `chance_release_due`, `dd_build`, allocation/exposure guards; `send_chance_spot` / `chance_spot_gate` | Four **new introductions globally**, not per Tribe. One directional Spot per actual Chance; no extra calendar-day Spot wallet. `chance_state`, exposure/allocation counters and operation receipts. | Server Rome release slots, UTC instants, exactly 24 elapsed hours. |
| SPOTTED | 060: private `spotted_romantic_daily_limit()` = 1; `spotted_romantic_submit`, settings and CHECK use it | `board_request_quota(user_id, day)` independent of board. Sender/operation receipt fingerprint; atomic conditional UPSERT after board lock. | Server `clock_timestamp()` after lock → Europe/Rome date. |
| ORA | 061: `ora_charge_visit`, `start_ora`, `send_spot_v2`, `my_ora_spot_budget` | `ora_spot_place_quota(user_id, place_id, local_date)` records visits and one Spot. Max three distinct rows/account/day. Daily row is a write fence/receipt anchor, **not a global Spot cap**. | Server Rome date, stamp after lock; existing presence four hours. |

The common board/pair locks serialize writes; they are not a shared wallet. Chance and ORA share person-level Spot intents and operation receipts. SPOTTED has separate neutral attempt/request records and explicit acceptance. All converge on the existing unique unordered-pair Match and messages keyed by that Match. Common account/consent/publication, compatibility, explicit-profile-block and suspension guards remain in place. Anonymous SPOTTED block stays separate from nominal/profile blocking.

Read-only **installed staging** definitions were checked, not just repository text: 058–061 present; romantic limit 1; ORA limits 3/1; no `least(5,...)`, `least(3,...)` or `board_request_quota.used<6` in the inspected current quota functions. Hash-only/boolean contract evidence is in `docs/evidence/romantic-surfaces/server-contract.json`. No key, token, account content or secret is included.

## B–F. Isolation and mixed sequences

Four new PostgreSQL-backed tests apply **059 + 060 + 061 together** through the existing full synthetic scaffold:

- Chance Spot and same-nonce retry leave romantic and ORA counters byte-for-byte unchanged. SPOTTED first attempt/retry/neutral over-quota leave Chance and ORA counters unchanged. ORA A/B Spots leave Chance and SPOTTED counters unchanged.
- Exhaust SPOTTED, then Spot every actually allocated valid Chance, then enter ORA. Valid allocated slots are not rejected by another surface's quota. Repeated reads/tick preserve the allocation; second new operation on a spent Chance is denied.
- Carryover Chance followed by new-Rome-day SPOTTED and ORA works under a spoofed session timezone. Expired Chance is rejected at the exact expiry instant.
- A Chance pending followed by accepted SPOTTED request and ORA lookup keeps one canonical Match/chat. Once matched, **a new Chance action/reveal is correctly unavailable**; that is eligibility/context closure, not cross-surface quota leakage.

A partial allocation is valid: four is a ceiling, not a guarantee or refill entitlement. Existing tests separately exercise four new global introductions across three memberships and more than four same-day Spot actions using valid carryover.

## C–E, H–I. Adversarial coverage

| Area | Exercised coverage / evidence |
|---|---|
| Chance | `chance-engine.test.js`: global cap across Tribes, reciprocal same slot/expiry, directional reveal, stable backlog, duplicate tick, no refill, carryover, expired/spent action denial, block/leave/delete/suspension/consent, existing Match exclusion, no pool/private table access, client-time parameter denial, fixed-snapshot rejection, Rome DST and 24h TTL. |
| SPOTTED | `spotted-romantic-quota.test.js`, `spotted-romantic.test.js`: global same/other board, nonce replay, neutral beyond-quota response with **no additional durable attempt/delivery**, day reset and both DST transitions, spoofed timezone, non-romantic reads/likes/comments/reports not charged, direct actor/day/limit/table bypass denied, explicit accept and singular Match/chat. |
| ORA | `ora-location-quota.test.js`: A/B/C allowed, D refused; same presence, exit/re-entry/new presence, expired/retained presence crossing midnight, no free renewal, same-location Spot refusal, manual and QR, server-only quota writes, new Rome day and both DST transitions, four-hour duration, reciprocal Match/chat, rollback/pending retry. |
| Shared safety | Existing full-suite authorization, moderation, anonymous block, publication/photo, membership/max3/rejoin, consent/age, deleted user, staff/session/AAL2 separation, RLS, SEC-01/LOC-01 tests. No bypass or guard was changed. Anonymous block intentionally does not globally suppress an unrelated known-profile relationship. |
| Outside scope | Full suite also covers Auth/onboarding/QR, PHOTO, recovery tooling, rights/delete, analytics/admin/observability/retention/notifications. This is automated regression, not a fresh human Google/MFA/device or provider PHOTO certification. |

UTC instants stay UTC; the client supplies no authoritative quota date, release or expiry. Clock substitutions exist only in disposable test DBs. The new mixed fixture uses coherent test clock/statement time; no production clock function or migration changes.

## G, J. Native multi-session concurrency / idempotency

`scripts/romantic-surfaces/native-proof.mjs --run-disposable-proof` ran **once** on isolated PostgreSQL 17.11. The image has no network and receives no staging credentials. Each race uses independent authenticated DB sessions, waits until both are actually observed blocked on the real advisory lock, then releases the barrier.

PASS:

- Third/fourth Place: one allowed, one `ORA_LOCATION_DAILY_QUOTA`; maximum three distinct visited Places.
- Two ORA Spots in one Place: one allowed, one `SPOT_PLACE_QUOTA`; maximum used = 1.
- Same operation retry remains idempotent; concurrent re-check-in does not reset credit.
- Two queued ORA Spots crossing server Rome midnight: exactly one accepted in the new day.
- Two SPOTTED requests on different boards: both public responses neutral; **one durable attempt, one quota charge**. ORA rows unchanged.
- Concurrent Chance public reads plus repeated release tick preserve exactly the same pairs and leave both other counters unchanged.

Receipt: `docs/evidence/romantic-surfaces/native-races.json`. Native tests preserve actual lock/UPSERT/RLS/guard logic; only time reads are redirected to an owner-only clock inside the disposable DB. Auth/Storage use the established synthetic DB scaffold; this is not a real GoTrue or PHOTO upload test. No provider scheduler or staging Chance job was created.

## K. Legacy logic audit

No obsolete quota was found in the inspected installed live quota paths.

| Reference | Classification |
|---|---|
| 028/034 global5/place3, 043 romantic6, old DD window limits | Historical migrations. Later migrations replace active enforcement; do not rewrite history. Historical version-specific tests intentionally replay those versions. |
| Replacement needles containing old constants in 058/060/061 | Migration compatibility checks/patch inputs, not parallel active caps. |
| Prior DD functions retained under `chance_prior_*` | Explicit older-DD compatibility branch; current Chance path is gated by 058 and blocks the old public DD client while Chance is enabled. Not an extra Chance quota. Staging Discovery remains OFF. |
| `src/domain.js` `LIVE_WINDOW=90m`, `src/app.js` demo90 | Legacy/demo helpers; `livePresence` has no live-app consumer. Explicit `?demo=1` loads the demo; real ORA uses server presence/expiry and 061 RPCs. Not live ORA enforcement. |
| `scripts/load-review.mjs` 90m | Separate synthetic legacy load fixture, not a deployed presence writer. Not executed here. |
| `scripts/romantic-timing.mjs` six-sample diagnostic labels `quota_used:6` | **Stale historical diagnostic output assumption**, not quota enforcement or a deployed consumer. It now imports the 1/day helper, so those labels must not be reused as current evidence. Not executed/changed in this task. |
| Source of Truth §13 “no daily Place-count limit”, §20 “6 attempts/day” | **Stale documentation**, contradicted by the founder-approved latest §15/roadmap I, migrations060/061 and this task's frozen contract. Reported, not silently interpreted as product authority or rewritten here. |

These documentation/diagnostic inconsistencies remain cleanup notes; they are not evidence of a second live wallet. No stale active product enforcement found.

## L. Analytics consistency

050 emits from durable inserts/state transitions, with event dedupe; 059 adds Chance lifecycle events. Retrying an operation does not create another durable initiative, Match or canonical event. Combined Match test proves one `match_created`, one `romantic_attempt`, one message/chat and zero analytics dropped errors. Chance per-participant `chance_match_created` records and the single canonical global `match_created` have different grains: **do not sum them as extra Matches**. Existing Chance analytics tests verify release/reveal/view/Spot/expiry dedupe and passive release not inventing active days. Existing notification Match/intent dedupe remains covered by the full suite; real push delivery is not recertified.

No new analytics event/field or collection activation was added.

## M. UI sanity / freeze

Automated Chance UI/romantic client/ORA quota-client tests pass. Server residuals drive CTA state; ORA prefers Place residual and fails closed during loading/error, ignores stale responses after clear. SPOTTED disables at remaining=0 and retains 1/day copy. Chance uncertain retry keeps its operation identity; monotonic server-derived expiry clears an expired card before the subsequent read. No client wallet added.

No frontend file, CSS, screenshot, navigation or visual freeze changed. No deployment or browser login was needed for test/tooling-only changes. No claim that an older immutable Preview serves a newly deployed artifact; browser/device visual evidence remains the accepted frozen visual report.

## N, R–S. Data safety / cleanup

Only disposable synthetic local test DBs were mutated. No ordinary staging user was involved and no staging fixture/photo upload was created. Native DB/container, generated local credentials and private working directory were removed. No orphan can remain outside the removed disposable database/volume; no Storage upload was performed. Existing recovery containers/archives/tooling and PHOTO lifecycle were not used or changed.

Staging pre/post read-only fingerprint verification: **PASS, exact equality**, including function hashes, data fingerprints, flags and cron (`staging-invariants.json`). Confirmed original four profiles, 42 Storage objects, three expired presence rows; Chance/Discovery OFF; Chance scheduler absent; PHOTO OPEN, cleanup/schedulers OFF; only already-approved Phase A retention remains active at `0 3 * * *`. That existing retention job was not disabled or changed by this task.

Main/origin-main remain `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. No Production access/config/deployment/alias operation.

## O–Q. Execution and failure classification

- Targeted combined/Chance/SPOTTED/ORA/UI/analytics: **73/73 PASS**.
- Native independent-session proof: **PASS, one execution**.
- Full suite: **934/934 PASS**, zero failures/skips/cancellations; one post-fix full run (154.166 seconds).
- Build: **PASS**. Typecheck: **PASS**.

New-test development failures were classified **before** changes:

1. **C — FIXTURE BUG:** activation initially occurred after the release slots, correctly producing no historical Chance (`start_at >= activated_at`). Fixed only setup order: activate at 09:00 Rome, advance to 21:31.
2. **B — TEST/HARNESS BUG:** a fixed actor / then a four-allocation owner was incorrectly assumed guaranteed in a six-person greedy fixture. Read-only inspection showed valid partial allocation versus four on another matching. The test now explicitly uses **all actually allocated valid Chance**, asserts `0 < count <= 4`, and preserves every charge/isolation/idempotency assertion. Existing global-four tests remain unchanged.
3. **B — TEST/HARNESS BUG:** a new Chance action after an accepted Match was incorrectly expected allowed. Actual `dd_pair_eligible` excludes an existing Match; the test now asserts that denial and verifies canonical Match reuse through the permitted ORA path. No product workaround.
4. One supplemental read-only metadata query named `notifications_control` rather than the actual singular `notification_control`; removed the unrelated clause. Query failed without writes; no runtime fault inferred.

All development logs retained locally; no failed execution is represented as passing, and no unchanged failing command was retried until green. Full suite is one post-fix execution.

## T–W. Changes / residual limits

Files added:

- `tests/helpers/romantic-surfaces-database.js`
- `tests/romantic-surfaces-consolidated.test.js`
- `scripts/romantic-surfaces/native-proof.mjs`
- `docs/evidence/romantic-surfaces/native-races.json`
- `docs/evidence/romantic-surfaces/server-contract.json`
- `docs/evidence/romantic-surfaces/staging-invariants.json`
- `docs/evidence/romantic-surfaces/results.json`
- `docs/soma-romantic-surfaces-consolidated-regression-2026-10-31.md`

New combined test helper, four mixed regression tests, explicit-opt-in native concurrency script, minimized evidence and this report. No runtime/migration/shared API changes; historical tests/migrations untouched.

Residual notes: stale documentation and unused historical diagnostic labels above; real device/push/provider PHOTO investigation and broader ops/legal work are not part of this regression. Review does not authorize enabling Chance/Discovery or any new scheduler.

Commit/push and final clean-tree state are supplied with completion; commit targets only the staging branch.

ROMANTIC SURFACES CONSOLIDATED REGRESSION: GO FOR REVIEW
