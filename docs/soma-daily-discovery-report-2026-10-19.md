# DAILY DISCOVERY ENGINE — final staging report

**GO WITH CONDITIONS** to **DAILY DISCOVERY WINDOW POLICY + FIGMA CORE / TRIBE FRONTEND**. Engine implemented and verified in hosted staging; final schedule/UI remain intentionally unactivated. No next task started.

## A. Baseline / environment

Branch `codex/soma-schema-v2-staging`, clean initial HEAD `0d48f0cfe4f15fdab9da68fd6f1d677943308049`; only Supabase staging `zjinjtkekmaqtxsuyvho`. Spot v2 GO and Profile/Photo Authorization v2 GO WITH CONDITIONS remain valid. Main local/remote `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`; Production deployment before/after `dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh` unchanged. Source of Truth unchanged.

## B. Migration

New candidate037 only (`037_daily_discovery_engine.sql`), over existing027 structures; no historical001–036 edits. New reciprocal uniqueness, degree/credit constraints, indexes, private guards/allocator/charging, two authenticated RPCs. Necessary scoped changes to TRIBE branch of `send_spot_v2` and DD-only profile authorization were announced before application. ORA/Match authorization and PHOTO functions untouched. During this task037's two new DD helpers were corrected in place before task closure; only their exact final CREATE OR REPLACE definitions were reapplied, not table/index creation or historical migrations.

## C–H. Windows, eligibility, pairing, fairness, novelty, scarcity

Rome calendar date + morning/afternoon identity, explicit configurable timestamps, non-overlap and immutable ready/closed identity. No final clock times, cron or activation. First request atomically builds the whole current-window snapshot; ready reads never reshuffle/refill, late join waits. Current AGE/consent/profile eligibility, existing bilateral M/F/ALL compatibility, active shared membership, no block/suspension/Match. One unordered pair row gives both directions, one deterministic active Tribe attribution even with multiple shared Tribes.

Lowest retained exposure-load opportunities are served first; candidates ordered by fairness, pair novelty, current attribution diversity, saved random generation seed hash. No popularity, engagement or inactivity gate. Greedy constrained pairing, not an optimizer promising a maximum-cardinality graph or equal romantic outcomes. Fresh feasible tier exhausted before72h–7d fallback; sameRome-day and<72h prohibited, preferred168h. Small pools return fewer, never fake/incompatible fill. Test pool2 returned1;71h pair returned0. Legacy membership gains no invented past visits/exposures.

## I–K. Quotas and Spot v2

4/window and8/day allocated profiles per account globally across Tribes. Both endpoints must have room. 2/window and4/day NEW TRIBE Spots, charged only inside the atomic NEW-intent insert branch. Existing pending, operation replay, existing Match are free. ORA5/day3/Place remains independent. Server derives exposure/window/Tribe/membership; client sends target+operation UUID only. Existing direct `send_spot_v2` route shares the same DD guard and charge, no bypass through the older API.

## L. Profile/photo authorization and discovered clock edge case

Current DD exposure authorizes existing v2 profile/photo endpoints. Pending alone does not. Match/shared live ORA remain independent valid relations. Hosted HTTP proved fresh profile/photo requests denied after closing the prior exposure despite pending. A stronger8s real-expiry test within a single long SQL batch initially found `statement_timestamp` remained fixed while the DD API clock already reported waiting_window. Corrected only the new DD authorization helper to VOLATILE + `clock_timestamp`, and DD delegator volatility. Re-run: waiting_window and visible_profile_count0. Added automatic long-request regression. No PHOTO decoder/lifecycle/security limit changes; earlier cached-content limitation remains accepted.

## M–P. Concurrency, multi-Tribe, leave, performance

READ COMMITTED enforcement; existing board transaction advisory lock serializes generation, Spot and safety operations; sorted owner locks coordinate existing lifecycle. Atomic reciprocal trigger updates both allocations, fairness and pair memory, with full rollback on failure. Ready is terminal. Membership UUIDs are exact, leave removes relevant authorization/pending through the existing scoped engine, preserves Match and unrelated ORA. Backend max3 untouched, global budget not multiplied by memberships.

Shared-Tribe indexed candidate search, deduplicate per candidate, no full-database Cartesian pair materialization; pair/window uniqueness, owner-window and time-interval indexes added. Retained fairness totals and pair memory are bounded/configurable. Inside a very large common Tribe candidate work may approach quadratic; whole-window lock can queue other operations. Hosted test was12 synthetic accounts, not a mass-scale throughput certification. No claim of arbitrary growth performance.

Independent PostgreSQL sessions observed:

| Race | PIDs | Outcome |
|---|---|---|
| Current allocation |1257543 /1257544|same ready window,4 profiles each; second waited~11.75s on intentional12s hold|
| Second/day allocation |1257637 /1257638|day remaining0 on both, no ninth; second waited~12.66s|
| Last window Spot |1257572 /1257574|one success, other `DD_WINDOW_SPOTS`|
| Last day Spot |1257686 /1257688|one success, other `DD_DAY_SPOTS`|

Before leave/cleanup:24 allocations,47 pair rows over two windows, no duplicate, no asymmetric row/counter relationship, no degree/credit overrun; A allocated8 and spent4. Some other users had a smaller feasible second drop. **Zero preexisting users allocated**: baseline catalog entries were hidden only in uncommitted fixture transactions, restored before commit, never externally changed. Authenticated role has no private exposure SELECT grant.

## Q–S. Compatibility / automated verification

**504/504 PASS**, including27 new DD tests plus477 prior tests. Build PASS; typecheck PASS, new client transport included. Tests cover reciprocal pools, quotas, no refill, preference/consent/safety,0–3 Tribe contexts, recurrence/fresh fallback, deterministic fairness/no popularity, owner-only projections, invalid contexts, atomic failure rollback/retry, direct legacy quota guard, delete cascades, Rome midnight identity, wall-clock expiry and transport. Full prior suite includes Auth/onboarding mandatory pilot Tribe and external QR, ORA, Spot v2, authorization v2, PHOTO lifecycle, Match/chat, Bacheca, rights/moderation/retention. No new Google/MFA browser login is claimed; actual fixture password login and real canonical upload were tested without changing Auth config.

## T. Real staging smoke

12 clearly marked disposable `example.invalid` identities; normal Auth sign-in, AGE/consent, canonical JPEG upload/profile and engine membership join. Reciprocal pool>4, stable HTTP refresh/re-login, current profile and fresh photo HTTP200, small pool,8/day no ninth,2/window and4/day boundaries, pending/replay free, ORA→TRIBE unique Match/chat, loss of profile/photo authorization after exposure,71h protection, actual timed expiry, and independent PG races all PASS. After corrected clock, repeated HTTP quota/Match/leave/chat passed. Match remains after leave and chat persisted exactly once. Evidence JSON files are synthetic-only and contain no credentials or signed photo URLs.

## U. Cleanup and final state

All12 fixtures deleted via normal delete-account; Auth no longer usable. Removed their two controlled windows and synthetic Place/catalog. Final counts match initial baseline: **4 Auth /4 profiles /42 Storage objects /1 Match /2 messages**. Zero fixture Auth/profile/photo objects/jobs/presence/membership/Spot intents/Spot receipts/quota/Match/messages. Zero DD windows/allocations/exposures/fairness/pair memory. Zero missing current objects, zero unattributed Storage objects.

Precisely **60 existing-policy technical PHOTO receipts** remain for these deleted fixtures:12 purged lifecycle tombstones,12 completed cleanup receipts,12 settled cutover attempts,12 completed cutover deletions,12 audit receipts. No product photos/content or active quota; existing seven-day metadata lifecycle applies. With cleanup/scheduler deliberately OFF, do not claim they have already been physically purged or force an ad hoc sweep. Prior13 technical receipts and three historical PHOTO review records are preexisting, preserved; zero new fixture uncertain/review writers. Local temporary passwords/private seed removed.

PHOTO OPEN epoch12 unchanged; execute/cleanup/scheduler OFF. Discovery OFF; policy disabled/paused, original NULL clock and retention values restored; jobs_paused true. Confirm email ON, Google ON, untouched; no GCP changes. No production/main changes.

## V–Y. GitHub and Preview

Engine source commit `65dd56e`; server-clock correction `04017c7ea991d12f04b36d997a206d59aa19aebc`. Final evidence/harness/report and refined regression are committed on the same staging branch; final local/remote SHA is supplied in the closing response (and reproducible with `git rev-parse HEAD` / `git ls-remote`). No merge main.

**Preview intentionally unchanged:** https://spot-c92wr6fgh-fedegrasso1994-1482.vercel.app/ (`dpl_6Wbqq2UQ4Nnh9DQqiDD8L5fB6C5q`, previous frontend runtime39969a4a…). New transport module is not imported into app rendering. Backend-first scope does not require a new frontend build/deployment or final DD cards/timer. No redesign, style file or existing UI controller changed.

## Z. Conditions / next gate

1. Founder must approve actual clock schedule and operating window policy; none chosen here.
2. Finite DD exposure/fairness/pair-memory retention values and physical purge need separate approval/implementation. Synthetic2d/14d/14d are tests only. Keep quota authority through the Rome day and pair memory through recurrence; no retention jobs started.
3. Final Figma Core/TRIBE frontend/countdown still separate; server exposes current time/end/next transition/budgets.
4. Before broader pilot, benchmark larger shared pools/lock latency; current successful synthetic rehearsal is not a universal load guarantee.
5. Existing Profile/Photo Authorization cached-content condition remains, not reopened.

**GO WITH CONDITIONS** to DAILY DISCOVERY WINDOW POLICY + FIGMA CORE / TRIBE FRONTEND. STOP: no final schedule/frontend, SPOTTED v2, Question of Day, share links, notifications, analytics/admin, retention jobs or Production.
