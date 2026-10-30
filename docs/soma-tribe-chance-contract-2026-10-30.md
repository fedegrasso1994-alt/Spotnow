# TRIBE → Chance: technical contract

Baseline `89183ece34a5291ae244551065547ce472936599`, staging branch. Founder-approved task and clarification: four new introductions/Rome day, one Spot/Chance, **no extra action-day Spot cap**, including yesterday's still-valid Chance. Recovery/main/Production/PHOTO remain outside this task.

## Impact before implementation

1. Previous DD: current 08–16/16–24 RPC creates reciprocal whole-window drops, up to 4 profiles/window and 8/day; two new Spots/window, four/day. No active DD cron.
2. Reused tables: discovery_policy/windows/allocations/exposures, fairness buckets, pair memory; membership identities and existing context FKs.
3. Reused engine: dd_pair_eligible and dd_build ranking, shared board/owner locks and reciprocal insertion invariant. Chance parameterizes degree to 1, daily cap to the pinned server config; legacy branch keeps its original caps.
4. Scheduling: native PostgreSQL Chance tick, one dedicated optional cron; existing Retention/PHOTO jobs untouched. Initial scheduler OFF. On-demand catch-up is a consistency fallback; automatic offline release requires enabling the dedicated job after its gate.
5. Spot/Match: same send_spot_v2, intents and immutable operation receipts. Only a conditional Chance fence and no-extra-quota branch; ORA counters and unified Match uniqueness unchanged.
6. UI: dedicated Chance API/state/controller/CSS; pilot shell selects it. Existing detail/modal, avatar, safe signed photos, Match presentation and bottom nav reused. No global refactor/redesign.
7. Analytics: first-party gates/emitter/fairness/purge reused. New Chance events and slot/timing fields, no counterpart/dating/location dimensions.
8. Additive migration 058 backend/config/state, 059 analytics. No old migration rewritten. Public legacy DD remains available only while Chance OFF; when ON its gallery RPC is denied.
9. Regression risks: stale snapshot/privacy authorization, cross-surface pending/Match, expiry races, hidden profile APIs, FK cascade/purge, analytics fairness slot constraints. Explicit tests required.
10. Size: meaningful backend lifecycle change, contained in TRIBE and narrow shared integration points; no non-Tribe refactor required.

## Data and authority

- chance_control: private configuration, OFF by default; four ordered Rome times and configurable daily limit. Initial activation stamped by the server; no retroactive pre-activation Chance.
- chance_days: non-personal server snapshot of each day's schedule, preserving already-issued slot identity during configuration changes.
- Policy 3: disabled/paused by default, Chance marker; retains approved DD 30-day product exposure/fairness/pair-memory periods.
- Chance uses one existing discovery_exposures row for A↔B, one immutable window per configured release slot, exactly 24 elapsed hours. Overlapping Chance windows are intentional; legacy non-overlap guard remains.
- chance_state: owner-direction reveal, first view, Spot operation and expiry-observed receipts. Private RLS/no client table grants. FK to exposure/account; existing held parent protects normal purge. Known new child explicitly added to Phase A's fail-closed FK allowlist; no general cascade exemption.
- Existing deletion/safety guards remain authoritative. No precise presence/join timestamps are introduced or inferred from minimized last_checkin_at (LOC-01).

RPCs: my_chances (only own opaque IDs, slot/timestamps/booleans/count); reveal_chance (one authorized profile after voluntary action); chance_viewed (idempotent owner observation); send_chance_spot (Chance ID + operation only). No owner/peer/clock/expiry selection by clients. Private builder/configuration/helpers are revoked from clients. Repeatable-read snapshots are denied for Chance reads/writes; live profile context requires READ COMMITTED.

Spot fencing applies to direct send_spot_v2 as well as the new wrapper. Unknown/foreign/unrevealed/expired Chance are denied. Successful operation receipts are retryable while temporally valid, including after Match; no new Spot or quota charge. A different operation cannot send a second Spot on the same Chance. Spot v2 retains the original 30-day person-level pending; this never renews Chance visibility. No additional daily Chance Spot cap is imposed.

## UI

Unrevealed backlog exposes count only. One voluntary reveal loads one profile; navigation clears the previous profile/photo and never prefetches upcoming peers. Continue is UI navigation only, including an end-of-list resting state with revisit; it never sends decline/delete/rejection. Expiry clears visible profile/detail immediately and rechecks the server. A server-derived next-release timestamp drives a monotonic countdown; Rome formatting is display only. No new auth, onboarding, ORA/SPOTTED, bottom-nav or global styling changes.

## Analytics semantics and retention

chance_released/revealed/viewed/spot_sent/expired_seen/expired_unseen/match_created are deduplicated by owner + Chance + event using existing hashed receipts. Release/expiry/Match background events do not create active_day. Explicit reveal/view/Spot do. Expired_seen means an acknowledged first view; reveal alone is distinct. Expiry observation is bounded (500 owner receipts/tick) and retry-safe; actual expires_at remains authoritative even if observation occurs later.

Analytics fields: slot and released/revealed/Spot/expiry timestamps; no peer IDs or Tribe/location copy. Product exposure already contains source_tribe_id. Per-slot funnels/latencies and minimized per-account fairness remain derivable. A Chance conversion follows the linked Spot intent/exposure; multiple historical introductions can be associated with one eventual Match. Global unique Match counts remain the canonical existing event and must not be summed from participant Chance conversion events.

Existing Analytics retention 90d and anonymous aggregate policy 24 months unchanged. Product Chance state follows DD expiry+30d physical retention and holds via existing parent purge; no new legal duration or hold auto-release.

## Rollout / rollback

Apply 058/059 only to `zjinjtkekmaqtxsuyvho`. All new controls default OFF. Controlled synthetic admission only for active smoke; preserve existing accounts and restore controls afterward. Confirm email, keys/trust/MFA, PHOTO admission/cleanup/scheduler and existing Retention schedule stay unchanged.

A new Preview must use the staging publishable key, zero server secrets/Production references and no Production alias assignment. Stop before deploying if preventing the previously observed automatic alias reassignment cannot be demonstrated. No promotion/main merge.

Rollback: disable Chance/scheduler, retain private receipts; previous frontend and legacy DD branch remain available behind their existing independently controlled settings. Do not automatically enable old DD or erase state for rollback. The validated pre-Chance historical recovery archive remains unchanged; a future checkpoint including new schema needs its own inventory/restore validation, not a rewrite of this task's recovery proof.
