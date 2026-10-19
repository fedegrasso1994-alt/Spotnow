# DD controlled admission — staging only

Baseline: `codex/soma-schema-v2-staging`, `dd937193aa7e55b7ec2a766d0a3b8b37cfa7c6fe`.
Scope: operational server admission only. Migration041 applied exclusively to
`zjinjtkekmaqtxsuyvho`. No frontend/Preview, main, Production, PHOTO, ORA or SPOTTED changes.
Uncommitted TRIBE frontend work preserved separately in Git stash
`TRIBE frontend WIP paused before controlled admission task`; not part of this commit.

## Minimal schema and authority

- `spot_private.soma_v2_control.dd_controlled_admission boolean NOT NULL DEFAULT false`.
- Control last-change fields: `dd_admission_changed_at`, `dd_admission_changed_by`.
- Private `dd_admission_accounts`: `user_id` (PK, Auth FK/cascade), `admitted`,
  required nonempty `reason` (1–200 characters), `changed_at`, `changed_by`.
- `dd_admitted(uuid)` checks server tables only. Missing singleton fails closed.
  OFF returns true without requiring an allowlist. ON + empty list admits nobody.
- RLS enabled, no policies or grants for anon/authenticated/service_role.
  No new public RPC, client parameters, credentials or frontend flag.
- Database-owner operational writes only. Server trigger stamps time/database
  principal; caller-supplied stamps cannot spoof it. Dashboard sessions commonly
  use the shared `postgres` database principal: these fields alone do not identify
  a human. Operator must record their identity, change reason and before/after
  evidence in the rehearsal report. This is current configuration metadata,
  not a complete immutable human audit history. No dating/activity content.
- Revocation uses `admitted=false`, preserving last-change evidence; deletion of
  the disposable Auth account cascades its allowlist entry. No scheduler added.
  Do not retain configuration for deleted fixture accounts manually.

## Before allocation, not a result filter

`dd_build` filters `dd_admitted(m.user_id)` in BOTH eligible-owner enumeration
and the INSERT source for `discovery_allocations`, before fairness opportunity
creation. Thus excluded eligible C receives neither a zero-profile allocation nor
fairness/exposure/Spot debit. Owner selection and candidate selection also filter
admission, including previously existing allocation rows. No quota reset/deletion.

`dd_pair_eligible` additionally requires both admitted endpoints. This protects the
pair-insert invariant and prevents projecting a now-excluded endpoint through an
old DD exposure. It only narrows the existing DD relationship branch: it grants no
profile/photo permission, creates no Spot/Match and changes no independent ORA or
Match authorization. An existing DD assignment is never refunded on removal.
Re-admission can restore an existing still-valid pair; it does not create another
assignment/debit, reset novelty, renew pending Spot expiry or refill consumed slots.

`my_daily_discovery` returns the existing `paused` response with server timing for
an eligible excluded caller, BEFORE any current-window INSERT or builder invocation.
It exposes neither allowlist membership nor operational configuration.
The 040 read-before-insert fix and 039 `outgoing_spot_pending` projection remain.

## Serialization and concurrency

Statement-level config/allowlist write triggers acquire the existing board lock
BEFORE row locks, using the same order as public reads/builds. A committed config
change and a committed build are serialized. An already-running transaction may
finish under the previous setting; the operator must wait for the configuration
transaction to commit before starting controlled traffic. No timeout is a bypass.

Native PostgreSQL17.10, separate backend PIDs, observed real Lock waits:
- same-user simultaneous initial/public reads;
- reciprocal different-user reads;
- eight duplicate reads (zero errors/mutations);
- allowlist removal waits for in-flight read/build; after commit the removed B
  is not projected and C has zero allocations/fairness rows.
The unchanged040 native rehearsal was also rerun successfully.
PGlite tests use real PostgreSQL execution but queued requests are explicitly NOT
presented as independent-session concurrency proof.

## Frozen semantics and compatibility

08:00–16:00 /16:00–00:00 Europe/Rome; overnight pause; 4/window,8/day profiles;
2/window,4/day TRIBE Spots; reciprocal pairing, no-refill, valid never-used-slot
completion, recurrence/fairness algorithm, Spot v2/unique Match, Membership and
PHOTO are unchanged. No eligibility/preferences altered for isolation.
Only three existing function bodies change: builder, DD pair eligibility and public
read wrapper. Tests compare every other public/private function body and ACL,
including039 projection, Spot/Match, photo/ORA and civil clock.

## Operational use for a FUTURE separately authorized E2E

Nothing in this task activates Discovery or creates hosted fixture accounts.
Before a later E2E: verify staging ref and OFF controls; inventory existing windows
and any previous assignments; verify exact disposable Auth IDs and synthetic markers.
Use an owner transaction to turn controlled admission ON and admit ONLY those IDs
with a fixture-specific reason. Inspect the list and confirm no existing account
is admitted. Commit and verify before enabling Discovery under separate permission.
Never use the gate as a replacement for AGE, consent, block or suspension checks.

No public parameter may toggle admission. Do not modify user eligibility/preferences
or other catalog entries for isolation. Removing an entry must not delete existing
exposure/fairness accounting. Existing counts continue enforcing no-refill and caps.
Stop on any unexpected pre-existing assignment/allowlist entry; do not purge it.

Finish the later E2E by disabling Discovery FIRST, restoring policy disabled/paused,
then revoking fixture admission and deleting fixtures through normal lifecycles.
Verify no new allocation/fairness for excluded accounts. Keep cleanup/scheduler OFF.
Disabling controlled admission while Discovery is ON reopens ordinary global
participation: do not do that as a test cleanup shortcut.

Rollback: pause Discovery/policy; retain additive schema. With Discovery OFF,
`dd_controlled_admission=false` restores original unrestricted admission semantics.
Do not drop tables/rewrite eligibility/refund counters or roll back041 during activity.

## Hosted staging result

Applied041 transactionally; environment/OFF/dependency guards passed.
Postcheck: controlled admission OFF; empty allowlist; DD OFF; policy2 disabled/paused;
jobs paused; PHOTO epoch12 OPEN unchanged, cleanup OFF and scheduler OFF.
4 accounts,4 profiles,42 photo objects,1 match,2 messages unchanged.
Zero DD windows/allocations/exposures. Profile digest unchanged.
RLS ON, authenticated SELECT denied, service_role INSERT denied, helper execution
by authenticated denied. No hosted E2E fixture/account/config activation.
Evidence: `docs/evidence/dd-controlled-admission/`; read-only reproducible query:
`scripts/daily-discovery-staging/sql/admission-041-postcheck.sql`.

## Validation

11 new PostgreSQL-backed admission tests: default OFF; A/B reciprocal; eligible C
untouched; empty list; single admitted account; add/revoke/re-admit; no control-only
side effects; unauthorized writes/GUC spoofing; metadata/account cascade; repeated
reads; consent eligibility; unchanged remaining function bodies/ACLs.
Full suite, build and typecheck results recorded in `validation.json`.
Native evidence is separate from hosted OFF-only verification.

No production rollout or TRIBE frontend resumption authorized by this result.
