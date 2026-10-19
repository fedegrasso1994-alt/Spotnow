# DD_WINDOW_OVERLAP investigation / idempotent public reads

Baseline: `255f6d6b7113173b3188fcf900c4f2461f107f53`, branch `codex/soma-schema-v2-staging`, migration039 present. Scope: wrapper correctness only; no frontend, SPOTTED, policy/activation, PHOTO, ORA, allocation architecture or production changes.

## Root cause — reproduced before the fix

`public.my_daily_discovery()` from038 always executes `INSERT ... ON CONFLICT(local_date,slot) DO NOTHING`, even if that civil window already exists. PostgreSQL runs the existing `discovery_window_guard` BEFORE INSERT trigger (`spot_private.dd_window_guard()`,037) before conflict resolution. The attempted row receives a fresh UUID. The guard sees an existing different-ID active row with intersecting bounds (`w.starts_at < new.ends_at AND w.ends_at > new.starts_at`) and raises `DD_WINDOW_OVERLAP`. The INSERT never reaches ON CONFLICT. The second read aborts atomically.

This is repeated **window creation**, not duplicate allocation, DST, wrong timestamp boundaries, missing locks or039. The private projection does not execute the INSERT and can reuse/build the existing ready window normally. Existing board lock serialization is correct but cannot stop a single transaction from deliberately attempting the same INSERT on every request.

## Exact fix — additive migration040

Under the **unchanged existing board lock**, SELECT the `(local_date,slot)` window first. Only when no row is found, perform the original INSERT/ON CONFLICT and re-read. Then execute the existing exact policy-version/bounds/state validation, projection, elapsed-window check and server timestamps.

Only the public wrapper function body changes. No new API/arguments, tables, grants, RLS or caller authorization. No caught/suppressed overlap exception, frontend retry, alternate allocator, client cache or bypass. A truly distinct overlapping window is still rejected by the unchanged trigger; ready/closed bounds remain immutable. Existing isolation check and lock precede all window lookup/creation. Two legitimate cooperating concurrent callers serialize, and the waiter observes the committed window before considering insertion.

Migration guards: staging environment/ref, Discovery OFF, policy2 disabled/paused,039 projection present, exact expected wrapper fragment and existing lock. Dependency drift or rerun aborts the transaction. Historical migrations are unchanged. Restore the preflight public function definition while OFF if operational rollback is required; no data/schema rollback is necessary.

## PostgreSQL tests

Nine new automatic groups, real SQL through PGlite:

- Original public second-read failure reproduced without040, with no partial persistent mutation.
- Full drop: first and five repeated public calls succeed with identical profiles/window, unchanged allocation/exposure/Spot/operation/fairness/pair-memory snapshots.
- Eight queued duplicate requests succeed, one window and bounded counters. **This alone is not multi-session proof.**
- Two reciprocal users reread safely; two-user partial pool never manufactures filler.
- Spot debit/outgoing039 state preserved. Safety loss + newcomer cannot recycle a previously assigned slot; no quota refund.
- Valid newcomer completes only previously unassigned reciprocal slots; later reads stable.
- Real overlapping distinct window and ready-window boundary edit still rejected.
- Original Rome07:59:59/08:00/15:59:59/16:00/23:59:59/00:00 boundaries unchanged; existing DST and daily/window-cap suite also runs.
- All private function bodies/ACLs identical before/after040, including039; private projection still not executable by authenticated; public OFF path remains paused and empty.

Active public-path CI fixtures use synthetic fixed current bounds **only inside disposable local databases**, so tests work overnight. The real Rome boundary tests use the original clock. No hosted clock or Discovery flag is changed.

## Genuine multi-session concurrency

Opt-in manual harness `scripts/daily-discovery-staging/dd040-native-fixture.mjs` records existing synthetic fixture setup; `dd040-native-concurrency.py` replays it into a disposable loopback-only native PostgreSQL17.10 cluster. No hosted connection, Auth credentials or additional runtime dependency. Temporary registry binary package: `@embedded-postgres/darwin-arm64@17.10.0-beta.17`, SHA512 checked against npm metadata; package source [embedded-postgres](https://github.com/leinelissen/embedded-postgres). Binaries stay outside the repository under `/tmp`; the cluster stops and its data directory is removed in finally.

Observed distinct backend PIDs71138/71139 and an actual `wait_event_type=Lock` with blockers while the first transaction held the existing board lock. Same-user initial-allocation race and two reciprocal users both PASS: same single window, no duplicate allocation, identical quota/exposure snapshots after the waiting transaction finishes. Additional8-connection duplicate burst PASS, zero errors or persistent mutation. Evidence: `docs/evidence/dd-idempotent-read/native-concurrency.json`. This does not claim activation or concurrent active-user testing on hosted staging.

Reproduce locally with a PostgreSQL17-compatible binary package in `/tmp`:

```sh
node scripts/daily-discovery-staging/dd040-native-fixture.mjs /tmp/soma-dd040-fixture.json
python3 scripts/daily-discovery-staging/dd040-native-concurrency.py --native-dir /tmp/soma-dd-postgres/package/native --fixture /tmp/soma-dd040-fixture.json
```

## Hosted staging / final gate

Migration040 applied only to `zjinjtkekmaqtxsuyvho`, after implementation commit `d42d3c9` was pushed. Public wrapper fingerprint changed from `2c2db04c922cc390953380583fd9e158` to `cba80d729a9efae2be50d6ca7eeff715`. Private projection039, allocator, window guard and Rome clock fingerprints all remain identical. No new grants, schema changes, flags or product rows.

**532/532 PASS** (523 baseline +9 new groups), build PASS, typecheck PASS. Evidence: `docs/evidence/dd-idempotent-read/verification.json`. Hosted before/after:4 Auth,4 profiles,42 Storage objects,0 DD windows/exposures; Discovery false, policy2 disabled/paused, jobs_paused true. PHOTO OPEN epoch12, cleanup/scheduler false, unchanged. No hosted fixture or active-user Discovery smoke: active/read/concurrency proof uses isolated synthetic PostgreSQL only, as required by the activation ban.

Git branch remains `codex/soma-schema-v2-staging`; code and evidence pushed without merge. Main remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. No Production operations, frontend/ORA/SPOTTED changes, PHOTO changes, new app dependencies or Auth settings changes. Final report commit is returned separately to avoid a self-referential SHA.

**DD IDEMPOTENT READ: GO**. STOP before TRIBE frontend or any Discovery activation.
