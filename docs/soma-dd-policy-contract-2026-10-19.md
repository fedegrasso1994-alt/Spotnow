# Daily Discovery policy and retention readiness

Approved founder clarification supersedes the earlier06/18 proposal: Europe/Rome calendar day, A[08:00,16:00), B[16:00,next00:00), inactive[00:00,08:00). ORA calendar day/counters unchanged. DD remains OFF, no frontend/deployment/scheduler.

## Migration038 impact (announced before application)

Add disabled/paused policy version2 with local times08/16/00 and30-day exposure/fairness/pair-memory parameters; retain version1 as historical configuration. No historical migration edits, PHOTO changes or deletion/backfill.

Replace only DD allocator/pair trigger to append reciprocal pairs involving first-admitted accounts in that window. First admission creates one allocation row; existing exposure_count is never decremented. A new eligible arrival can fill never-assigned free slots on either side; an assigned profile lost through safety/leave/Match is never replaced. New users may receive fewer/zero. Repeated fetch without new eligible arrivals is stable. Fairness opportunities charged once per window/user. Existing uniqueness, sorted owner/global board locks, atomic4/window8/calendar-day and2/window4/calendar-day NEWSpot charge remain. Existing pending/retry/Match are free, ORA independent.

The existing current projection becomes private (`dd_current_projection`, all client/service grants revoked). Public `my_daily_discovery()` remains authenticated/owner-derived/no client clock argument; it calculates current civil boundaries, creates only the current draft window on demand after activation, invokes the projection/allocator, exposes server_now, current_window_end, next_window_starts_at and backward-compatible starts_at/ends_at/next_transition_at. OFF returns paused + timing metadata, creates no windows. Night returns waiting_window with next08:00, no profiles or new drop; prior evening access expires at midnight. No cron, next-day precreation or client-authoritative time. Each boundary is independently converted with `AT TIME ZONE Europe/Rome`; never fixed UTC offsets or add86400s. Overnight idle is7h on spring change,9h on autumn change; active daytime windows remain8h.

## Retention readiness — no purge executor installed

All normal DD user-linked history is bounded by30 days; fairness uses existing minimized per-user/day aggregate opportunities/exposures, no extra pair/event history and no longer-lived identifiable archive. The candidate preview is private/admin SQL only, strict batch1..500 (default100), aggregate output only, read-only and retry-safe. Existing safety holds are read under the shared retention lock. Configured intervals are not a claim that physical purge is running.

| Table / state | Normal eligibility / semantics |
|---|---|
|discovery_exposures|window ended at least30 days ago; no active lease; hold by exposure/window/either account blocks candidate|
|discovery_allocations|same window-end30-day threshold; own account/window/allocation or linked held exposure blocks candidate; spent counters preserved through current calendar day/window|
|discovery_windows|ended30 days ago, ready/closed, no lease, **already no child allocations/exposures**, no window hold; includes generation/technical lease metadata|
|discovery_pair_memory|last valid exposure at least30 days ago and purge_after reached; exact pair/account holds block candidate; never drop memory before72h/7d guard|
|discovery_fairness_buckets|configured30-day purge_after, per-day aggregate only; account/aggregate hold blocks candidate; expired held aggregates excluded from ranking|
|discovery_policy|static versioned configuration, no user/pair/history content; keep required configuration versions, not an indefinite user archive|

DD debug state is limited to window/generation metadata above; no new persistent debug/event table. Existing diagnostic/security logs retain existing7/30-day rules. Existing approved PHOTO/rights/technical receipts and checked-in evidence are untouched.

Canonical hold keys: `dd_exposures`/exposure UUID; `dd_allocations`/windowUUID/userUUID; `dd_windows`/windowUUID; `dd_pair_memory`/sortedUserA/sortedUserB; `dd_fairness`/userUUID/bucketDate; `dd_account`/userUUID. Holds remain explicit, reason/case/review_at/audit through existing safety engine, invisible to discovery. Released holds restore ordinary eligibility; mere age does not authorize deleting failed/building/leased/unclassified state (preview flags review).

Future executor must share board→retention→sorted owner locking, revalidate each candidate under lock, process children in bounded batches, and remove a parent only in a later pass when already empty. No cascading parent delete to evade batch bounds. Hold acquisition wins under shared locking; archive only minimal explicitly held safety evidence before product/account deletion, using the existing separated safety model, never repurpose held data for ranking. Failed transactions roll back; retries and double runs must be idempotent. This task implements the preview/design, **not** the executor, safety archival extension or job activation. Before pilot, implement/test/authorize that purge path and operational monitoring; do not claim physical30-day deletion while jobs are OFF.

DD purge must preserve Spot intents/operation receipts, Match/chat and Tribe membership. Existing exposure/window SETNULL references are detach semantics, not permission to delete unrelated records. Existing receipt replay remains governed by the separate Spot lifecycle.

## Gates and rollback

Apply only in verified staging with Discovery OFF and no active windows. On any gate failure keep OFF and stop. Operational rollback = leave Discovery/policy paused and jobs OFF; retain additive schema/config and receipts. No destructive schema downgrade or PHOTO rollback. Source of Truth updated narrowly only for these explicit founder-approved semantics. Final TRIBE/Figma remains separate.
