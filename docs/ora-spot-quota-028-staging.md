# ORA Spot quota — migration 028, schema only / OFF

Date: 2026-10-17. Branch: `codex/soma-schema-v2-staging`.
Source commit: `bcbc22068937f6204f8969b267451cafa6cd2eea` (027).
Only hosted target authorized: `zjinjtkekmaqtxsuyvho`.

## Schema

`028_ora_spot_quota_schema_off.sql` creates only three private tables:

| Table | Fields / keys |
|---|---|
| `ora_spot_policy` | singleton PK; enabled=false; timezone=Europe/Rome; daily_limit=5; place_daily_limit=3; quota_retention=NULL |
| `ora_spot_daily_quota` | PK(user_id,local_date); nonnegative used; user FK to auth.users ON DELETE CASCADE |
| `ora_spot_place_quota` | PK(user_id,place_id,local_date); nonnegative used; Place FK to public.venues ON DELETE CASCADE; composite account/day FK to daily quota ON DELETE CASCADE |

The three PKs provide unique indexes. An additional
`ora_spot_place_account_day(user_id,local_date)` index supports parent lookup
and cascade without a full child-table scan. No duplicate UNIQUE constraint.
All PK columns are implicitly NOT NULL.

The only inserted row is a disabled technical policy. No user counter or
retention duration is seeded. Limits are positive, per-Place <= global;
counters do not have hardcoded upper bounds: the future writer must enforce
the configured limits atomically. The counter representation is not an active
quota service.

RLS is enabled explicitly on each table with **zero policies**. All table
privileges are revoked from PUBLIC, anon, authenticated and service_role.
The DB owner retains SQL administration; no new backend/API grant is created.
Clients cannot supply dates, Places or counters through any new API, because
there is no new API.

The migration requires staging environment, rejects an explicit wrong hosted
project setting and requires the 027 controls OFF/paused. The operator still
checks the actual project URL: the optional hosted project setting is not the
sole environment protection. DDL is transactional with lock_timeout=5s and
statement_timeout=60s. Failure aborts before any partial schema is committed.

No ALTER of existing application tables/functions/policies/triggers, no
historical migration edits, backfill, operation receipts, visit timestamps,
GPS/click events, worker, scheduler or frontend changes. A future per-Place/day
usage counter is itself contextual personal data: it stays private and needs
short approved retention before operational writes are enabled.

## Future atomic writer (not implemented)

For an authenticated replay of an already known operation, resolve the original
operation/result before deriving a new presence or date; never execute it as a
fresh Spot because the user changed Place, left ORA or crossed midnight.
The following steps apply to a new operation:

1. Validate the sender's active ORA presence and current eligibility; derive
   the charged Place from that presence, never from an unchecked client value.
2. Coordinate with presence replacement, account deletion and person-pair
   operations using the established consistent owner/pair locking order.
3. Resolve idempotency and existing pending/match before charging. The
   `interests.operation_id` column from 027 is reused; it is **not yet** a
   complete idempotency implementation. The Spot v2 phase must introduce the
   appropriate unique operation/pending constraints and replay lifecycle.
   No second receipt infrastructure is introduced here.
4. Capture server time once; derive local_date with Europe/Rome, independent
   of the session/client timezone. A retry around midnight must first resolve
   its original operation rather than charge a new day.
5. Lock/create the account/day row, then the account/Place/day row in a
   consistent order. All Places share the same global parent row.
6. Check 5 global and 3 Place credits; create the new valid ORA interest and
   increment both counters in the same transaction. Any failure rolls back all.

Changing presence_id, leaving/re-entering or changing Place cannot create a
new account/day budget. Returning to a Place reuses its same daily PK. The
global row serializes fifth/sixth concurrent attempts across devices/Places;
the Place row serializes its third/fourth attempts. Those enforcement races
must be tested with the **future writer**; this schema task does not claim to
have implemented that runtime guarantee.

Existing pending interests, existing matches and technical retries do not
charge. Daily Discovery's 2/window and Spotted's 6 attempts/day use their own
tables; no universal Soma budget is introduced. Removing a Place cannot refund
the global row. Current-day counter purge must never be permitted by the
future retention worker; physical retention is still to be approved/configured.

## Validation

Baseline: 325/325 PASS. New tests exercise structure, PK/FK/indexes, denial of
actual SQL reads/writes for client/service roles, policy OFF, unchanged data
and function/policy/trigger definitions, duplicate-row protection, malformed
values, mutable limits, Europe/Rome/DST dates, legacy unmetered writer,
the original 027 gate and transaction-rollback legacy smoke.

## Hosted staging evidence — PASS

028 applied successfully in a single transaction in Soma Staging. The SQL
submitted to the editor matched the file, server MD5
`a177d8b1436ad6bcd94555099895fd01`. The schema check confirms three RLS tables,
zero policies/grants for anon/authenticated/service_role, correct PKs, one OFF
policy with 5/3 and Europe/Rome, NULL physical-retention parameter, zero global
or Place counters. The original 027 schema check also passes, with all v2
features still OFF and no backfill.
The exact staging check script was verified by server MD5 as well:
`da788ea39c4c620814e0ca516d71be1e`, matching the repository file.

The reused legacy SQL smoke passed on actual staging Postgres with zero
synthetic accounts remaining. It covers AGE boundary, consent/revocation,
QR/Ora/Tribe/photo projections, Spot/match/chat, RIGHTS, Board post quota/text,
reactions/report, simulated MFA/role authorization, suspension/reversal,
retention dry-run/purge and account deletion. No quota row was created.

Before/after: 3 accounts, 3 profiles, 2 memberships, 2 check-ins, 2 interests,
1 match, 2 messages, zero Board posts/reactions. Fingerprints of original data
projections in 14 tables matched. No contents/credentials were exported.
All function definitions, existing RLS policies and original constraints match:

| Fingerprint | Before and after |
|---|---|
| Functions | `3662f5458ad42f1a92ad4d4e16b59869` |
| Policies | `e67e79d1424b7d26c09b38aa1fd885b3` |
| Existing check-in/Spot/match/reaction constraints | `295c17177cf2f53899f50705141c8499` |

PHOTO controls remain PAUSED, epoch 10, cleanup/execute/scheduler false,
no canary users. Retention stays paused. Auth configuration is untouched.
027 file SHA-256 remains
`1e69ad2b2b1a483a6a32b67ce5f6681dffc268ae9a5d143d940b1397b9344fc2`.

Final suite: **336/336 PASS** (325 baseline + 11 new including subtests).
Build PASS; typecheck PASS. Existing Node experimental stripTypeScriptTypes
warning is non-blocking. No application, frontend, PHOTO or old migration diff.

The reused `soma-v2-legacy-smoke.sql` uses synthetic reserved IDs only and ends
with ROLLBACK. Its temporary canary/retention changes exist only inside the
uncommitted test transaction; no opening/config change persists. It tests SQL
contracts (including simulated Auth/MFA), not a new real browser login or image
upload. No actual Storage object is created/deleted.

## Rollback / next gate

Operational rollback: leave the new private tables unused and policy OFF.
No destructive down migration. No backfill or runtime activation is authorized.
**GO** to BACKFILL STAGING CONTROLLATO after the separate task commit. No
backfill is performed here. Main/Production/Vercel/PHOTO remain unchanged.
Main stays at `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. No merge, deployment
or billing/configuration change; no production endpoint was used. No push is
part of this commit-only task.
