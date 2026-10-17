# Soma schema v2 — 027, additive preparation only

Date: 2026-10-17. Source baseline: `codex/bacheca-01-staging`,
`2db1a75cf300851842ed6acea42e901eeabdc34e`.
Implementation branch: `codex/soma-schema-v2-staging`.
Only authorized hosted target: Soma Staging `zjinjtkekmaqtxsuyvho`.

## Scope and compatibility

`027_soma_v2_schema_off.sql` is one transaction with 5-second lock and
60-second statement timeouts. It requires `privacy_environment=staging` and
also rejects a different project ref if the hosted setting exposes one.
The operator must verify the actual dashboard project ref regardless of that
optional setting. No production application of this candidate is authorized.

There are no CREATE/ALTER FUNCTION, product triggers, RLS policies, workers,
scheduled jobs, external providers, frontend edits or application backfills.
Only two technical configuration rows are inserted: all v2 feature flags OFF,
jobs paused, discovery policy disabled/paused, with no approved operating hours
or physical retention defaults filled in.

All appended columns on existing tables are nullable, have no default and
remain NULL. Existing check-in/venue composite row shapes gain nullable fields;
the current client ignores these additive fields. Peer projections and Board
JSON output do not gain private fields.

## New private tables (17)

- `soma_v2_control`: eight disabled feature flags and `jobs_paused=true`.
- `tribe_catalog`: stable venue-backed identity, inactive/non-joinable by default.
- `tribe_account_state`: unstarted/started/legacy_closed; a start date exists
  exactly when the configuration state is started. No existing account seeded.
- `tribe_rejoin_guards`: account/Tribe and future rejoin deadline, no history.
- `discovery_policy`: versioned inactive configuration; Europe/Rome; approved
  recurrence floor 72h and normal target 168h. Retention and hours NULL.
- `discovery_windows`: immutable future identity by local date/slot, policy ref,
  valid interval and generation state; unique date/slot independent of policy.
- `discovery_allocations`: account/window counts, nonnegative only.
- `discovery_exposures`: ordered reciprocal account pair, window, Tribe and two
  membership references; no profile snapshots.
- `discovery_fairness_buckets`: temporary opportunity/exposure counts; no app
  visits, popularity, likes, orientation or location data.
- `discovery_pair_memory`: one latest-exposure record per ordered pair and an
  explicit purge deadline; no indefinite event history.
- `board_comments`: post, internal author, body, hidden/removal state/revision;
  no nesting, no independent expiry extending the parent post.
- `board_preferences`: private opt-out preference, separate from dating consent;
  no rows and no implicit product default chosen.
- `board_request_quota`: account/day counter, no active 6/day enforcement.
- `board_comment_quota`: account/venue/time bucket, no rate/duration selected.
- `board_request_attempts`: operation receipt/fingerprint, source reference,
  private processing/claim fields and required purge deadline. No worker.
- `board_romantic_requests`: sender/hidden recipient, source kind/references,
  lifecycle status, timestamps and purge deadline. No content body snapshot.
- `board_request_pair_guards`: ordered pair, retry deadline and bounded purge.

Each new table has RLS enabled, **zero policies** and **no grants** to PUBLIC,
anon, authenticated or service_role. No new service/admin API is provided;
the database owner remains able to administer schema. Future backend grants
must be explicitly scoped when the relevant writer is introduced.

## Appended columns and foreign keys

| Existing table | Appended columns |
|---|---|
| `public.venues` | `ora_enabled`, `linked_tribe_id` → tribe_catalog, SET NULL |
| `tribe_memberships` | `membership_id`, `membership_source` manual/qr/legacy |
| `public.checkins` | `presence_id`, `presence_source` manual/qr/legacy/unknown |
| `interests` | `interest_id`, `origin_kind`, origin membership/presence/window refs (SET NULL), `logical_status`, `invalidated_at`, reason code, `operation_id` |
| `board_posts` | `post_kind` user/system, `editorial_key` |
| `board_reactions` | `comment_id` → board_comments, CASCADE |
| `board_reports` | `comment_id` → board_comments, CASCADE |
| `board_audit` | `content_kind`, comment/request refs, SET NULL |
| `board_evidence` | `content_kind` only; no new identity or content snapshot |

Account-owned new rows cascade on Auth deletion. Content references in attempts
and requests use SET NULL so content purge does not extend public content life.
Exposure rows cascade with their membership/window/account. Minimal metadata
retention and evidence capture are **not operational yet**, because the tables
are empty, inaccessible to clients and have no product writers.

## Indexes / constraints now vs later

Now: PKs/FKs, source/state allowlists, nonnegative counters, positive intervals,
ordered/non-self pairs, at-most-one source reference (both may become NULL after
purge), unique attempt sender/operation, unique window date/slot. Nullable
membership/presence/interest identity indexes allow all existing NULL rows and
all current writers. Lookup indexes cover exposure/window/user, comment paging
and request inbox/pair. No index reinterprets existing Spot uniqueness.

Deferred until adapters and writers are ready:

- max-three Tribe enforcement, immutable-start lifecycle, grace and cooldown;
- replacement of exact 90-minute check constraint with max-four-hour semantics;
- pending Spot person-level uniqueness, expiry, origin and idempotent writer;
- exposure pair/day uniqueness, degree 4, daily 8, Spot 2, membership-account
  correspondence and recurrence rules;
- reactions PK/target exclusivity changes needed for comment-only reactions;
- comment report target rules and downstream moderation/evidence integration;
- nullable system-post author and user/system conditional invariant, editorial
  uniqueness and system publication projections;
- comment maximum/rate policy, romantic 6/day, pending unordered-pair uniqueness,
  seven-day acceptance guard, anti-harassment and preference behavior;
- temporary request-recipient profile authorization;
- retention/purge workers and all related explicit backend grants.

Existing exact-90m constraint, contextual Spot PK, reaction PK and four emoji,
Board author NOT NULL, functions, policies, publication, rights and photo gates
are intentionally retained. No earlier migration is edited.

## Share

`board_posts.id` already defaults to `gen_random_uuid()`. No share token, table,
record, click graph or link is generated. Authorized deep-link resolution and
generic unauthenticated landing remain a later application phase.

## Validation and operational rollback

Baseline suite: 312/312 PASS. Added PostgreSQL schema tests cover unchanged
function/policy/trigger definitions, retained legacy rows, NULL new columns,
denied client/service access, empty new structures/OFF flags, legacy Board
positional INSERTs/reactions/report/RIGHTS, 90-minute check-ins, contextual Spot
duplicates and more-than-three legacy memberships, structural rejection,
integrated AGE/CONSENT/PHOTO/social/RIGHTS/MODERATION rehearsal and wrong-env
rollback. The staging checker is read-only and shared with the local tests.

## Live staging evidence — PASS

Applied successfully through the staging SQL editor as a complete transaction.
The pasted SQL was checked against the repository file before execution:
MD5 `aba61d0219eba499cd4100960112a5e4`, SHA-256
`1e69ad2b2b1a483a6a32b67ce5f6681dffc268ae9a5d143d940b1397b9344fc2`.
The editor's static warning did not recognize RLS inside the final DO loop;
the exact original transaction was run without an editor rewrite. The actual
post-check confirmed RLS on all 17 tables and no client/service grants/policies.

Hosted post-check result:
`PASS: 17 private tables; 15 empty; two OFF configuration rows; no backfill`.
No catalog/account state/presence/Spot backfill; all 23 appended legacy fields
are NULL. Eight explicit lookup/nullable-identity indexes were created, plus
the PK/unique indexes of the new tables. Structural FK/allowlist constraints
do not activate any product rule or change an existing writer.

Before/after counts: 3 Auth accounts, 3 profiles, 2 memberships, 2 check-ins,
2 interests, 1 match, 2 messages, 0 Board posts/reactions. Hashes of the original
data projections in 14 legacy tables matched after the migration and after
the smoke rollback (new NULL columns excluded). No personal contents exported.

| Definition fingerprint | Before | After |
|---|---|---|
| All public/private functions | `3662f5458ad42f1a92ad4d4e16b59869` | identical |
| Existing RLS policies | `e67e79d1424b7d26c09b38aa1fd885b3` | identical |
| Original check-in/Spot/match/reaction constraints | `5a5427f8d6eafef9d7f4cfc0fe28312a` | identical |

`tests/staging/soma-v2-legacy-smoke.sql` passed against actual staging Postgres:
17 blocked / 18 accepted, consent/revocation, QR/Ora/Tribe/photo projections,
Spot/match/messages (including after consent revocation), all current RIGHTS
sections, Board post size/quota/idempotence/anonymous projection, reactions,
report, role/MFA-claim authorization, author lookup, suspension/reversal,
retention dry-run/purge and account deletion.

This script uses only synthetic reserved IDs in an explicit transaction ending
in ROLLBACK. Existing PHOTO canary and retention test controls are changed only
inside that uncommitted transaction, then restored by rollback; no global
opening or configuration change is committed. It refuses nonempty Board data
and acquires the existing Board/retention lock before the rehearsal. The final
fixture count is zero. No Storage object or actual image is uploaded/deleted.
Both live rehearsal scripts were also checked byte-for-byte through server MD5:
schema checker `aedc4ffb4ec50565e128f53f0ab6f7fa`, legacy smoke
`22cd621047dfe776945defc836240bd7` (matching the repository files).

Post-smoke PHOTO control remains PAUSED, epoch 10, cleanup/execute/scheduler
false, canary list empty; retention remains paused. Auth confirmation is not
modified. No real account/data is edited by the smoke.

Final suite: **325/325 PASS** (312 baseline + 13 added, including subtests).
Build PASS; typecheck PASS. Existing Node experimental stripTypeScriptTypes
warning is non-blocking. Historical migrations and all application/frontend,
photo functions and cutover sources have no diff against the baseline.

No claim of authenticated browser/MFA or actual image re-upload is made by SQL
rehearsals; they test database contracts only. Existing Auth config is unchanged.

Rollback is **leave the empty private structures unused**. No destructive down
migration is supplied. A DDL error aborts this transaction; do not run partial
statements or apply it twice. Confirm catalog state first after any transport
failure. No backfill is authorized as part of this task.

## Next gate

**GO** to BACKFILL STAGING CONTROLLATO after the task commit. No backfill is
performed here. Operational rollback remains leaving these private structures
unused. All runtime implementation remains out of scope. No merge or deployment;
main remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. No production access or
Vercel changes were made. This task requests a branch commit, not a main merge.
