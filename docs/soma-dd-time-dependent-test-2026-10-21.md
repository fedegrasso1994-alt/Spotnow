# DD time-dependent test investigation — 2026-10-21

Classification: **TEST FLAKE**. No DD engine defect was demonstrated. Scope: local tests/harness and this evidence only; no runtime, schema, API, live config or deployment changes.

Baseline: `codex/soma-schema-v2-staging`, `dcce61b7c4ec86c7d627202eb56f6414e7df98aa` (previous full suite 621/622). Main remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.

## Exact failure and cause

Test: `tests/daily-discovery.test.js`, “DD window collision/mutation and incomplete policy fail closed; no final clock times configured” (baseline line 58).

Original assertion:

```js
await assert.rejects(
  d.query("update spot_private.discovery_windows set ends_at=ends_at+interval '1 minute'where id=$1", [w]),
  /DD_WINDOW_IMMUTABLE/
);
```

`tests/helpers/discovery-database.js::window()` reads PostgreSQL `clock_timestamp()` directly. It creates a legacy-037 test window ending at the earlier of now + 20 minutes and the next Europe/Rome midnight. Its dates are relative to now, not explicit fixed instants. There is no JS clock dependency in this fixture.

Near midnight the fixture's end is capped at midnight. Adding one minute violates both the calendar-day constraint and ready-window immutability. In migration 037, `spot_private.dd_window_guard()` checks `DD_WINDOW_DAY` before `DD_WINDOW_IMMUTABLE` (lines 40 and 42). Returning `DD_WINDOW_DAY` is correct fail-closed engine behavior; the test incorrectly assumes the immutable guard must always fire first.

This helper intentionally loads migrations only through 037, before final window policy 038. Its arbitrary short test window is not a product window. The failure is not evidence that final 08:00/16:00 policy or midnight quotas are wrong. Each test gets a fresh local database: no stale shared rows. No UTC/Rome mismatch or countdown discrepancy was found.

## Controlled reproduction before correction

Each row used a fresh disposable PGlite database, explicit `2026-10-21T<time>+02:00`, and the original test operations/guards. No staging data was read or changed.

| Europe/Rome time | Original +1 minute result | Original assertion | Frozen product policy |
| --- | --- | --- | --- |
| 07:59 | DD_WINDOW_IMMUTABLE | PASS | No drop; next start 08:00 |
| 08:00 | DD_WINDOW_IMMUTABLE | PASS | Morning, 08:00–16:00 |
| 15:59 | DD_WINDOW_IMMUTABLE | PASS | Morning, ends 16:00 |
| 16:00 | DD_WINDOW_IMMUTABLE | PASS | Afternoon, 16:00–00:00 |
| 23:59 | DD_WINDOW_DAY | FAIL | Afternoon, ends next midnight |
| 00:00 | DD_WINDOW_IMMUTABLE | PASS | No drop; next start 08:00 |

Overlap and incomplete-policy assertions returned `DD_WINDOW_OVERLAP` and `DD_POLICY_INCOMPLETE` in every row. Machine-readable reproduction is in `docs/evidence/dd-time-investigation/validation.json`.

## Minimal test-only correction

- New `tests/helpers/discovery-test-clock.js`: freezes PostgreSQL server time inside one disposable local PGlite instance. Rejects non-PGlite connections; accepts only explicit ISO instants. Not imported by runtime or packaged as a migration. Normal tests that exercise real elapsed time are unaffected.
- Existing failing test: freezes the worst-case 23:59 fixture, subtracts one minute to isolate the immutable guard and still requires exactly `DD_WINDOW_IMMUTABLE`. Separately adds one minute and requires exactly `DD_WINDOW_DAY`. Existing overlap, policy-completeness and no-allocation assertions remain.
- New `tests/dd-time-dependence.test.js`: all six clock cases assert the original error, corrected immutable error, no persisted mutation, and overlap rejection. A separate final-policy database checks `dd_clock_at()` slot, local date, start, end and next-window start against explicit expected UTC instants.
- DST cases cover both sides of the spring change and both repeated autumn 02:30 instants. Both remain overnight, with the correct Rome 08:00 UTC target (06:00Z in spring; 07:00Z in autumn).
- The matrix directly asserts that PostgreSQL sees the requested frozen time. An initial helper implementation failed that assertion and was corrected before the final matrix and consecutive verification runs. No assertion was relaxed to accept arbitrary errors.

The corrected assertions still detect removal of immutability or midnight validation. The exact 08:00/16:00/00:00 boundaries, quotas, allocation/fairness, Spot, Match and authorizations remain untouched.

## Verification

- Corrected failing test: **20/20 consecutive PASS**, separate Node processes and new PGlite databases, fail-fast runner; no retry-until-green loop.
- Boundary/DST suite: **3/3 tests PASS**, six boundary cases plus four DST instants and the local-database guard.
- Build and typecheck: **PASS**.
- Release integrity: **PASS**, 37 release files and 9 local font assets; no fixture hooks, server secrets or test clock in release.

## Scope and operational state

No remote Supabase/GCP/Vercel requests, migrations or deploys were performed. Therefore the baseline Discovery OFF, cleanup OFF and scheduler OFF were not changed. Production, main, SPOTTED migration 046, legacy Bacheca quota, PHOTO and ORA are unchanged. QoD was not resumed and draft 045 was not applied.

Changed files: the existing DD test, two new test/harness files, this report and one JSON evidence file. No style/product files changed. A staging Preview update is unnecessary for a test-only correction.

SPOTTED targeted regression command:

```sh
node --test tests/spotted-*-client.test.js tests/spotted-beauty.test.js tests/spotted-micro-polish.test.js tests/spotted-social.test.js tests/spotted-romantic.test.js
```

Result: **57/57 PASS**, including >3 ordinary posts, unchanged technical rate limiting and romantic/social behavior.

## Pre-existing unapplied draft housekeeping

Draft `supabase/migrations/045_spotted_qod.sql` was untracked before this task. To preserve its bytes without including it in the DD commit while delivering a clean working tree, only that path was put in a local stash: `fffa99c2e607d89e5db18213686958ad18389337` (`^3` contains the untracked file). SHA-256 before and after preservation: `f6aee4ef113bf9584d35fa350c375764e5c521553c7c20e6b0081c4c0487b8c2`.

This is local preservation, not a QoD implementation, application, branch commit or schema change. Restore only that path from the stash's `^3` tree if explicitly resuming the draft later; do not apply the whole stash indiscriminately. QoD remains stopped.

## Final gate

Full suite `pnpm test`: **625/625 PASS**, zero failed/cancelled/skipped, 127737 ms. This includes the unchanged DD concurrency/idempotent read/outgoing Spot tests, SPOTTED quota-removal tests and core regressions. Targeted SPOTTED: **57/57 PASS**. `pnpm build`, `pnpm typecheck` and release integrity check: **PASS**.

Git diff against baseline is empty for `src/`, `supabase/`, application markup and dependency manifests. No changes to runtime DD logic, migrations 039/040/046, PHOTO, ORA, permissions or final window policy. No staging/production deploy was needed or attempted.

**DD TIME-DEPENDENT TEST: GO**. Stop here; do not resume QoD or apply 045.
