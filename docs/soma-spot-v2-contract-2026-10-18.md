# Spot v2 + ORA quotas — staging contract

Baseline branch `codex/soma-schema-v2-staging`, SHA `ab532d99b11b9f366cf7186d8363ea861e545c79`.
IA gate GO. Product source of truth read first, not changed. No Production/main or PHOTO changes.

## A–B. Environment and legacy audit

Staging only `zjinjtkekmaqtxsuyvho`. Preflight: 4 Auth accounts, 4 profiles, 2 legacy interests,
1 Match, 2 messages, 42 photo Storage objects. PHOTO OPEN epoch12; cleanup/scheduler OFF.
Migration 027 prepared nullable legacy provenance, 028 prepared private empty quota tables.
Old `send_spot(uuid,uuid)` → `privacy_prior_send_spot` used a person/location key and same-location
reciprocity; `express_interest` was an old alternate entry. Old discovery readers consult interests.
New ledger leaves historical interests/matches/messages unchanged. All three old writer bodies and
EXECUTE grants are retired; an INSERT trigger fences even an old in-flight compiled function body.
No legacy writer can bypass quotas after cutover. Cached old clients fail closed; no legacy fallback.
Legacy discovery/photo authorization stays as-is for the NEXT profile/photo authorization v2 task.

## C–F. Model, idempotency and Match

- `spot_private.spot_v2_intents`: UUID, sender, recipient, origin ora/tribe/legacy, known context,
  presence/exposure/membership where real, created_at, valid_until, state, match_id.
- Partial unique `(sender_id,recipient_id) WHERE state='pending'`, independent of context.
- `spot_v2_operations`: `(sender_id,operation_id)` → request fingerprint fields and original JSON result.
  Receipt is private, not an exposure/click analytics history. Auth/profile FKs cascade erasure.
- `spot_v2_fence`: one aggregate write revision, no personal data.
- `send_spot_v2(target_user,operation_id,origin_kind='ora',exposure_id=null)` returns only
  `{spot_id,match_id,state}`. No recipient provenance or presence timestamps exposed.
- Same operation returns original result while both accounts remain authorized; conflicting
  target/origin/exposure with same operation is rejected. New operation to same valid pending reuses
  logical intent without resetting time or charging. A receipt that originally said pending stays
  stable even after reciprocity; current Match is read through existing Match APIs.
- Pending expires logically after 720 hours (30 elapsed days), checked at use, without physical purge.
  Expired direction is marked expired lazily; a new valid action can create a new intent/charge.
- Reverse active pending creates/reuses existing UNIQUE `(user_a,user_b)` Match with ON CONFLICT DO
  NOTHING. Never resets Match age, context or first_message_at. No second conversation table.
- Historical pending is imported conservatively only if uninvalidated, no newer ledger direction
  exists, and original timestamp is <= now and within 30 days. Earliest still-valid known historical
  row represents the direction; origin legacy, original timestamp and known venue retained, no
  fabricated presence/membership/window. Historical rows themselves remain untouched.

## G–J. Authorization, quotas, time and concurrency

Server derives sender from Auth; checks AGE, account/ban/suspension/deletion/staff, consent, blocks,
profile and current surface authorization. New ORA requires live sender/recipient in current same
active ORA-enabled Place. Place/presence are selected server-side under account locks. Reject extra
Place/sender/date inputs and ORA exposure spoofing. Current wall time is read after locks.

A new ORA intent charges exactly one global + one Place credit, including a new reciprocal intent.
Limits: 5/account/day and 3/account/Place/day from migration028 policy, hard ceiling 5/3. Server date
is `(clock_timestamp() AT TIME ZONE 'Europe/Rome')::date`, including DST. Retry, reuse, existing Match,
failed auth, quota failure and rollback do not charge. Exit/re-entry/switch cannot reset counters.
`my_ora_spot_budget()` exposes only the caller's remaining and current-Place remaining budget.

Lock order follows existing board/retention/delete protocol: board global transaction lock, sorted
photo-owner pair locks, feature row SHARE, write fence, and quota writes in the same transaction.
Global serialization is intentionally conservative for the MVP and shares the existing board lock;
benchmark/wait-time observation is needed before increasing traffic substantially. No distributed lock.
New-intent inserts and quota increments roll back together; no partial commit.

035 explicitly requires READ COMMITTED for the public writer. Advisory locks cannot refresh a stale
REPEATABLE READ/SERIALIZABLE snapshot after consent/AGE changes. Such SQL transactions fail with
SPOT_ISOLATION before writes and must retry in a fresh READ COMMITTED transaction. Normal PostgREST
uses that isolation. Do not claim a write fence alone solves stale consent snapshots.

## K–L. Tribe, leave, grants and erasure

TRIBE is structurally supported only with a ready current reciprocal exposure, matching current
membership IDs, active policy, consent/compatibility and discovery feature gate. Ordinary UI has
no Tribe Spot path. No directory-based Spot authorization and no allocation/quota DD implemented.
Controlled synthetic contexts are used only for tests; discovery flags are never left globally ON.

BEFORE DELETE membership hook invalidates only its sender's pending Tribe intents with that exact
membership ID. Received, ORA-origin and matched intents are unchanged. It also handles membership
cascade without retaining visit history. Matched chat persists. Membership max3 unchanged.

All new private tables have RLS with no client policies and all direct privileges revoked from
PUBLIC/anon/authenticated/service_role. Only authenticated public RPCs; private helpers revoked;
SECURITY DEFINER functions use empty search_path. Raw origin provenance is not publicly projected.
Own `spots` RIGHTS section includes own v2 intents (id/time/validity/state), alongside legacy data,
not received intents/private receipts. Other rights sections delegate unchanged. Ordinary erasure
cascades ledger/receipts/quota through existing account/profile FKs; another sender's charged quota
is not refunded merely because its target deletes their account.

## M. Frontend scope

Staging-only `VITE_SPOT_V2=true` plus existing ORA/privacy flags wires the dedicated `spot-v2.js` API.
Existing ORA Mi Interessa CTA calls only v2 with stable operation ID across in-session retries.
Double tap remains serialized; existing Match uses existing chat/UI. No new timers/cards/navigation,
styles, profiles, quote dashboard or new Match frontend. Quota errors are neutral Italian messages.
Budget RPC exists; no new counter UI in this task. No production flag/environment changes.

## N–P. Evidence and fixture semantics

See `tests/spot-v2.test.js`, `tests/live-social.test.js` and `tests/staging/spot-v2-*` for executable cases.
Local PGlite tests use real PostgreSQL SQL functions but one connection: Promise.all there is a queued
rehearsal, NOT independent MVCC evidence. Real staging uses two independent SQL sessions, backend
PIDs and observed wait time, with baseline credits generated through actual successful RPCs.

Synthetic principals `fea34000-*`, Places `fea34100-*`, controlled window/exposure `fea34200/fea34300-*`.
They contain no passwords, real photo files or Storage objects. Profile/photo metadata is synthetic
server-fixture setup, NOT evidence of a new PHOTO decode or browser signup. Auth configuration,
Confirm email and actual user photos/presences are not changed. Dedicated teardown rejects wrong
fixture markers or any unexpected Storage file. Regular user data is never a teardown target.

## Q. Migrations and rollback

034: new ledger/receipts/fence + public writer/budget, grants/RLS, leave hook, old-writer fence and
retirement, own-data RIGHTS projection. Ships flags OFF. 035: writer isolation guard only. Historical
001–033 untouched. Separate staging activation turns on only Spot + ORA quota policy.

Safe rollback is operational: set soma_v2_control.spot_enabled=false and ora_spot_policy.enabled=false;
optional Preview feature flag OFF. Keep schema/ledger intact; NEVER restore a legacy writer once new
intents exist. No destructive down migration and no scheduler. Receipt history and new intents require
an approved physical-retention integration later; this task deliberately does not select periods.
Deleting new tables or undoing retirement is not a safe rollback.

## Known boundaries before pilot

- Full profile/photo authorization v2 is NEXT, including elimination of broad historical Tribe reads.
- No DD engine, DD budget, Spotted requests, notifications/analytics or retention job activation.
- Physical retention of v2 intents/receipts/quotas is a separate decision/task. Do not equate 30-day
  logical validity with deletion. Receipt volume should be monitored; no anti-abuse rate limit added.
- Existing Match required venue column uses the action's real known context for new Match attribution;
  it never becomes a romantic identity key. Old Match context remains unchanged.
- Performance/load at wider scale is not proved by boundary/race tests; global lock is conservative.
- Real browser new-account/PHOTO onboarding already belongs to prior gates. New Spot smoke uses
  authenticated SQL principals, not a claimed Google login or two physical devices.

Final counts, staging outcome, Preview/runtime SHA and GitHub checkpoint are recorded in the report.
