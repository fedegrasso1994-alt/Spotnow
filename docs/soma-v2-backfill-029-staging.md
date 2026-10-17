# Controlled staging backfill — migration 029

Date: 2026-10-17. Branch: `codex/soma-schema-v2-staging`.
Approved parent: `3defa1628335147ba6df8531a6858a6ac16cbfe7`.
Only hosted target: `zjinjtkekmaqtxsuyvho`. Data-only; all v2 features OFF.

## Pre-write inventory

Read-only inventory at `2026-10-17T09:42:43.791099+00:00` matched the approved
snapshot: 3 Auth accounts, 3 profiles, 2 memberships belonging to 2 accounts,
2 active venues, 2 expired check-ins (5400 seconds each), 2 reciprocal legacy
interests, 1 match, 2 messages. No blocks, reports, suspensions, safety holds,
account deletions or Board content. All 3 age states require confirmation.
No product drift; fingerprints of original data in 14 tables also match 028.
The original pre-backfill 027 check and 028 check passed before any write.

| Place / Tribe ID (preserved) | Existing venue | Existing usage |
|---|---|---|
| `dbaab572-ad0e-4928-ab68-bb371cef9381` | TEST Università 1 | 2 members, 2 expired presences, reciprocal interests/match |
| `29484f62-7716-4d61-9f24-d8e54e04e876` | TEST Università 2 | none |

## Migration contract

`029_controlled_staging_backfill.sql` is one transaction, with 5-second lock
timeout and 60-second statement timeout. Environment/project, exact snapshot,
relationships, empty operational tables and OFF controls are checked before
writes. Board's established lock ordering and table locks prevent overlapping
legacy writes. Conflicting populated values abort instead of being overwritten.
Any intermediate failure rolls back all writes; original data projections are
compared again before commit.

Expected first-pass changes:

| Counter | Rows | Meaning |
|---|---:|---|
| catalog_inserted | 2 | same venue UUID, active/joinable |
| account_states_inserted | 2 | members only, legacy_closed, start=NULL, revision=0 |
| venues_updated | 2 | linked_tribe_id=id; ora_enabled remains NULL |
| memberships_updated | 2 | stable membership_id, source legacy |
| presences_updated | 2 | stable presence_id, source legacy |
| interests_updated | 2 | stable interest_id, origin legacy, logical_status matched |

IDs are deterministic UUIDs derived from fixed namespaces and existing row
keys using MD5. They are technical identifiers, not security tokens. No
historical first-join, visit, exposure, QR origin or operation identity is
invented. Existing created/check-in/expiry timestamps remain unchanged. New
catalog/state creation timestamps describe this backfill, not historical joins.
The nonmember gets no unnecessary state row. No rejoin guard is created.
All interest origin membership/presence/window references, operation ID and
invalidation fields remain NULL. No pending Spot is reopened and no match is
recreated. The 90-minute check-in constraint is preserved.

No DDL, function, trigger, policy, grant, frontend, worker, job, scheduler or
Auth change. 027 and 028 files remain untouched. Discovery, ORA quota and new
Spotted tables remain unused; all flags OFF, jobs paused, policy retention
parameters NULL. PHOTO/retention controls remain paused/OFF.

## Verification design

The new post-backfill checker verifies the structural/security invariants of
027/028 and the authorized populated fields. The original 027 checker is
intentionally preserved: its pre-backfill NULL/empty assertions are no longer
the correct post-backfill data gate. The original 028 checker remains valid.

Ten new automatic tests (including subtests) cover exact mapping/identities,
no nonmember state, unchanged legacy associations/timestamps/social data,
second-pass zero writes, unchanged functions/policies/grants, 028 compatibility,
legacy smoke rollback, snapshot drift rejection, conflicting identity rejection,
intermediate failure rollback and wrong environment/project rejection.

The existing generic Tribe database test uses a different synthetic snapshot.
Its migration loader skips only this snapshot-specific data migration; it
continues applying all other migrations. 029 has dedicated fixture tests,
including the same legacy journey after backfill. No runtime exclusion exists.

The reused hosted SQL smoke operates only on synthetic reserved IDs in one
transaction ending in ROLLBACK. Its Auth/MFA assertions are SQL simulations,
not real browser signup/MFA. Photo checks exercise metadata/authorization;
no actual Storage upload/delete occurs. Temporary canary/retention settings
cannot persist after rollback. This task does not require changing Confirm email.

## Hosted results and final gate

**PASS.** Applied only to hosted Soma Staging through the SQL editor. Submitted
SQL matched the repository file and the server-computed MD5:
`0b67a1d0fc9e5c9d039e8a578689ea2f`. All six first-pass counters were exactly
2: **4 inserted rows and 8 updated rows** as in the table above.

The second execution used the same SQL with the final COMMIT replaced by
ROLLBACK. All six counters were **0**. Complete row fingerprints of venues,
catalog, account states, memberships, check-ins, interests, matches and
messages were equal before/after replay: no duplicate, regenerated ID,
altered timestamp or further state transition.

The phase-aware 027/028 post-backfill gate and original 028 check passed on
hosted Postgres. All 20 new private tables retain RLS, zero client/service
policies and zero anon/authenticated/service_role table privileges. No new API
or security grant exists. Final inventory at
`2026-10-17T09:51:45.278589+00:00` retains the exact original product counts,
zero active check-ins, no safety/Board records and no synthetic account residue.
Both venue mappings and all 2-row legacy backfills passed assertions. All new
operational tables/counters remain empty; features OFF and jobs paused.

The legacy SQL smoke passed, including check_in, people/photo authorization,
Tribe, send_spot, match/chat, AGE/CONSENT/revocation, RIGHTS, Board/reactions,
moderation and retention/deletion contracts. Final reserved fixture count: 0.
Original data projections in all 14 fingerprinted tables match the pre-write
snapshot, including match/messages and exact check-in timestamps.

| Structural fingerprint | Before = after |
|---|---|
| Functions | `3662f5458ad42f1a92ad4d4e16b59869` |
| Existing policies | `e67e79d1424b7d26c09b38aa1fd885b3` |
| Existing constraints | `295c17177cf2f53899f50705141c8499` |

PHOTO control is unchanged: PAUSED, epoch 10, cleanup_all/execute/scheduler
false, no canaries. Retention paused, zero enabled policies. No Storage
operation, Auth configuration change, deploy or production endpoint access.
The optional project setting in SQL is an additional check; the operator also
verified the actual staging project URL before executing.

Validation: approved baseline **336/336**; **10 new tests**, final
**346/346 PASS**, 0 skipped/failed. Build PASS; typecheck PASS using the bundled
Node entry points specified in AGENTS.md. During development the generic Tribe
fixture initially rejected the snapshot-specific migration; its loader was
corrected as documented above, then the complete suite passed. Existing Node
experimental type-stripping warning is non-blocking.

027 SHA-256 unchanged:
`1e69ad2b2b1a483a6a32b67ce5f6681dffc268ae9a5d143d940b1397b9344fc2`.
028 SHA-256 unchanged:
`15ca0c931b5eb2de274eaf429e6bb76e4f88a140241bea32339ee12e9228ac10`.

No application/frontend/PHOTO file changed. Main remains
`d0f515e8d2c80eeae60f2d5c33dd8901558d5287`; Production and Vercel untouched.
The separate task commit contains this report, migration, SQL post-check,
dedicated tests and the narrow generic fixture-loader adjustment. No amend,
merge or push is part of this commit-only task.

## Rollback and next gate

Failure before commit rolls back all data writes. The injected intermediate
failure test verifies this. After success, keep all new metadata unused and
features OFF; do not delete IDs or reverse history automatically. Re-execution
is a verified NO-OP, not a destructive down migration.

**GO — TRIBE MEMBERSHIP ENGINE** as the next separately authorized task.
No join/leave/grace/cooldown engine, v2 ORA/Spot/Discovery/Spotted runtime,
frontend, scheduler or worker has been implemented or activated here.
