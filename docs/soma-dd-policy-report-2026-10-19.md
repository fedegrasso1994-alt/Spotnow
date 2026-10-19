# DAILY DISCOVERY WINDOW POLICY + RETENTION READINESS

## A. Configured policy

Founder clarification supersedes the initial06/18 request: Europe/Rome **A[08:00,16:00), B[16:00,next00:00)**. No active/new drop00:00–08:00. DD and ORA daily quotas remain on calendar00:00–24:00 with separate counters. DD4 profiles/window,8/day globally;2 NEWSpots/window,4/day globally. Existing pending/operation retries/Match remain free.

Migration038 adds **disabled/paused policy version2**, retains original version1, and introduces no scheduler. Source of Truth updated only for these explicitly approved semantics, not to fit an implementation shortcut. Historical migrations001–037, PHOTO and ORA unchanged.

## B. Rome and DST

Private `dd_clock_at` calculates civil boundaries independently with `AT TIME ZONE 'Europe/Rome'`; no fixed UTC offset,24h addition or client time input.08/16/00 boundaries are inclusive-start/exclusive-end. The idle midnight→08 span is7 actual hours on2026-03-29,9 on2026-10-25; repeated autumn02:30 instants both stay inactive. Daytime windows stay8h. Tests include05:59,06:00,07:59,08:00,15:59,16:00,17:59,18:00,23:59,next00:00/05:59/06:00/08:00 with the **latest**, not superseded, expectations.

## C. Mid-window onboarding/admission

The allocator admits newly eligible accounts without waiting for the next boundary. Reciprocal additions may fill only never-assigned slots on both endpoints. Every newly added pair must involve a first-admitted account in this window. Existing exposure_count is never refunded after leave/block/safety/Match, so lost profiles cannot be replaced. Max4/window8/day remains global across Tribes. New users can receive partial/zero when partners have no room or eligibility/recurrence disallows pairing.

Repeated calls with no newly eligible arrivals leave allocation, seed, quotas and opportunity counts unchanged. New arrivals may grow previously partial drops; this is the explicit founder-approved exception to a completely frozen whole-window snapshot. Under failure the whole admission transaction rolls back, including both counters/new allocation/opportunity. Existing global board and sorted owner locks serialize competing admissions; existing pair uniqueness/atomic counter trigger remains. No new lock service or caller-supplied context.

Automated DB tests run normal `complete_onboarding` + Membership Engine join midway through an existing window, prove reciprocity and stable repeated fetch, full-drop/safety-loss protection, second-window admission and daily caps. Tests use synthetic isolated Postgres fixtures; no new real browser Auth/photo onboarding E2E is claimed in this configuration task.

## D. Countdown/server API

Authenticated `my_daily_discovery()` keeps no arguments. The old projection is private/revoked, not a legacy bypass. Added fields: `server_now`, `current_window_end`, `next_window_starts_at`; compatible `starts_at`, `ends_at`, `next_transition_at` remain. WindowB ends at midnight, but the **next starts08:00**, not midnight. Overnight current end is null and next start is today08:00. All eligibility, quota, generation and expiry use server time; final UI can interpolate elapsed time monotonically and resync, never authorize through client clock.

OFF returns paused/timing metadata without creating a window or exposure. After a future separately authorized activation the server creates **only the current** window on demand, no future backfill/cron. Boundary-crossing requests abort safely rather than returning expired allocation. No TRIBE frontend/timer implemented or Preview published.

## E–F. Retention design and coverage

Approved pilot target configured at30 days for exposures/allocations, pair memory and minimized per-user/day fairness aggregates. No indefinite identifiable exposure history or additional analytics/debug stream.

| Data | Proposed bounded purge eligibility |
|---|---|
|`discovery_exposures`|ended window +30 days; respect exposure/window/either-account hold and active/uncertain lease|
|`discovery_allocations`|same threshold; keep spent counters through the window/calendar day; protect linked held evidence|
|`discovery_windows`|ended +30 days, ready/closed, no lease, already empty children, no hold; generation/lease debug metadata goes with row|
|`discovery_pair_memory`|last valid exposure +30 days and due purge_after; pair/account hold wins|
|`discovery_fairness_buckets`|configured30-day purge_after; aggregate/account hold wins, expired held buckets do not rank|
|`discovery_policy`|static versioned configuration without user/exposure content, retain required configuration versions|

Private `dd_retention_preview(1..500)` is read-only, default100, aggregate counts only, deterministic/idempotent, and takes the board+existing retention lock. It distinguishes normal candidates, explicit holds and unclassified old windows requiring review. Normal windows/profiles/counters are not removed by a timeout; failed/building/leased states are excluded from ordinary purge. Hold keys/review/audit and exact semantics are in the policy contract. Expired empty parents are candidates only after child removal, so a future batch cannot cascade-delete an unbounded graph.

**No purge executor is installed in this task.** Before executing physical retention, a separate gate must implement/test child-first bounded deletion, fresh lock-protected eligibility checks, minimal separated held evidence archival (including account-delete interaction), retries/interruptions and monitoring. Keep all such jobs OFF meanwhile. This is founder-approved technical retention configuration, not a declaration of legal sufficiency or professional validation.

DD cleanup must preserve `spot_v2_intents`, operation/idempotency receipts, existing Match/chat and Tribe membership. Exposure/window reference detach may use existing SETNULL FKs; unrelated product deletion must not cascade. Existing diagnostic/security7/30-day policies and approved PHOTO/rights receipts are untouched. Existing reports/evidence were not deleted.

## G. Actual staging/scheduler state

Staging `zjinjtkekmaqtxsuyvho`: Discovery **OFF**, policy2 **disabled/paused**, global jobs_paused **true**, retention_paused **true**. PHOTO OPEN epoch12 remains unchanged, execute/cleanup/scheduler **OFF**. Actual cron inventory: `soma-photo02-staging` **inactive**, `soma-photo02-cutover-staging` **inactive**, no DD job. No scheduling API/cron was created or activated.

Hosted PostgreSQL smoke: boundaries/DST, private grants and aggregate retention preview **PASS**. Smoke ends in ROLLBACK, creates no fixture accounts or Storage data and never enables ordinary-user Discovery. Final data same as baseline: **4 Auth,4 profiles,42 photo objects,1 Match,2 messages; zero DD windows/allocations/exposures/fairness/pair memory**, zero missing/unattributed objects. Three historical PHOTO review records and all prior technical receipts/evidence preserved. No Auth/provider/GCP changes.

## H. Tests/build/typecheck

**515/515 PASS**, including11 new policy groups plus504 previous tests. Build PASS, typecheck PASS. Final results are recorded in `docs/evidence/dd-window-policy/verification.json` and the closing response. Eleven added test groups cover clock boundaries/DST, public OFF and private permissions, mid-window onboarding/reciprocity, stable refresh/no replacement, global quotas/next window, hold-aware bounded30-day preview and exact30-day boundary, rollback/retry, actual current-window RPC. The complete previous504-test regression suite also runs. Build/typecheck run using staging env. No final UI/design/style/runtime client changes.

## I–J. GitHub

Baseline `a889962ac27447f6af826681d9eb3674e66ecd8f`, branch `codex/soma-schema-v2-staging`. Implementation commit **`2e9a0d4c4caa12184f7b2aceb67267cb050f2faa`** pushed before applying038. Final report/evidence are committed and pushed separately on this same branch; final exact local/remote SHA is in the closing response (no self-referencing commit-hash rewrite).

## K. Main/Production and final gate

Main local/remote remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`; read-only Vercel inspection confirms Production deployment still `dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh`. No merge, deploy, Production env/data change, PHOTO modification, Auth change or new provider. Preview unchanged.

**DAILY DISCOVERY POLICY: GO** — all final tests/checks PASS. Readiness covers approved configuration and retention preparation, not job execution or pilot legal approval. Mandatory STOP before TRIBE frontend, SPOTTED, scheduler or Production.
