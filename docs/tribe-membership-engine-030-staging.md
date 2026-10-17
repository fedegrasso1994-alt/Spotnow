# Tribe Membership Engine — 030, staging only

Date: 2026-10-17. Branch: `codex/soma-schema-v2-staging`.
Parent: `1ea21e3e80aca84013bf3f8173a864495fbcef69`.
Only hosted target: `zjinjtkekmaqtxsuyvho`.

## Scope / compatibility

030 adds `join_tribe(uuid) -> jsonb`, `leave_tribe(uuid) -> jsonb`, two private
helpers and one account-state immutability trigger. No table, history journal,
policy, scheduler, worker, frontend or new QR behavior. 027–029 are untouched.
Existing function definitions, including `my_tribes()`, check_in, send_spot,
Board, RIGHTS, delete-account and all PHOTO functions are preserved.

`my_tribes()` is deliberately reused, rather than replaced with an incompatible
JSON result. Its existing owner-filtered rows remain
`id,name,address,member_count,live_count`; there are no guards, history or other
users' private fields. This fulfills the current-membership read contract.
The new join response adds the caller's membership ID/source, synthetic grace
boolean and used/remaining slots; no internal cooldown time or first-join
anchor is exposed. No new frontend consumes these RPCs. Future UI work may
extend own-state reads separately, preserving this legacy signature.

All soma_v2 flags, including membership_enabled, remain false. RPCs are
installed and callable for controlled staging tests; they are not wired into
an enabled v2 application flow. No production migration/deploy is authorized.

## Join contract

- Derive user from auth.uid(), never a user/source/clock parameter.
- Require normal nonanonymous account, profile, AGE eligibility, no active
  sanction/deletion, no dedicated moderator principal. Reuse Board eligibility;
  dating consent is intentionally not required for self-declared membership.
- Validate actual catalog + venue active, catalog joinable, with row share locks.
  Even a duplicate join to an unavailable Tribe is denied.
- Count every current membership row toward 3, including unavailable catalog
  memberships, until explicitly left. This avoids oversubscription on later
  venue reactivation.
- Duplicate join returns the existing ID/source without resetting anchor or
  incrementing state revision. NULL legacy identities fail closed with
  `TRIBE_LEGACY_RECONCILIATION_REQUIRED`, never silently rewritten.
- Missing state + no memberships is unstarted; only a successful first join
  starts the one global 24-hour anchor. Existing legacy membership without a
  state gets legacy_closed, never invented first-join history.
- New membership gets server UUID and source manual. The schema supports qr;
  no client source override or trusted QR writer is implemented here.
- New joins enforce account limit and any live account/Tribe cooldown.
- Clock captured after locks, once per call. Grace is strictly `< start+24h`.
  Exactly 24h is outside. Leaving all memberships never resets the anchor.
- An immutability trigger prevents started/legacy_closed anchors/states from
  being overwritten. Revision changes remain possible for serialization.

## Leave contract

Missing membership is a neutral NO-OP, creates no state/guard and does not
extend cooldown. An actual leave frees the slot in the same transaction.
During initial grace no guard is created. Outside grace, including legacy_closed,
upsert the account/Tribe guard to server time + 720 hours (exact 30 elapsed days,
independent of session timezone/DST). Only an actual later leave can replace
that expiry. A live guard blocks only that Tribe; other slots remain usable.
Expired guards are removed opportunistically on join/leave. There is one
current control row per account/Tribe, not a join/leave event log.

After leave, existing Board membership checks deny new feed/actions. Existing
posts and their moderation/expiry lifecycle are not rewritten. Match/chat and
legacy interests are preserved. Spot v2 pending invalidation is NOT implemented:
its future writer must invalidate pending interests attributed to the specific
membership before deletion (the prepared FK can SET NULL); no retroactive
origin is inferred here.

## Serialization / authorization

Reuse established lock order: Board/retention global advisory lock, then
photo_owner_lock(account), then state row lock. The same owner lock is used
by check_in, eligibility, consent, moderation and deletion. The existing global
Board lock also coordinates leave versus Board mutations and deletion. It is
intentionally conservative; no new lock hierarchy or PHOTO change.
A successful new join/actual leave increments account-state revision, acting
as a write fence under REPEATABLE READ/SERIALIZABLE: stale writers must fail
with 40001 rather than insert a fourth membership. Normal READ COMMITTED
waiters see the newly committed count. Clients must retry 40001 as a fresh
transaction; no internal retry with an old snapshot.

SECURITY DEFINER entry points use empty search_path and fully qualified tables.
Only authenticated gets RPC EXECUTE; PUBLIC/anon/service_role are revoked.
Private helpers are not client-callable. Existing RLS/grants on membership,
state and guards remain unchanged, with no direct client reads/writes.
No arbitrary owner, membership_source, anchor, legacy state or guard input.

## RIGHTS / delete / privacy

Current membership remains in the existing RIGHTS tribes category. The current
automated export does not add internal state/guards; those remain subject to
owner-only manual access review if requested, not categorical legal exclusion.
No RIGHTS redesign is made. Existing FKs already cascade membership via profile,
and state/guards via Auth. Tests cover deletion and no remaining user rows.
Safety evidence/holds and PHOTO deletion semantics are unchanged.

The anchor is account configuration time, not presence/visits. No visit
last_checkin_at is reintroduced. A rejoin guard is sensitive control metadata;
it is not used for discovery/analytics. Expired guards on inactive accounts
still need integration with the configurable retention collector before pilot;
this task adds no scheduler/purge API. Opportunistic expiry cleanup is not
claimed as a guaranteed periodic physical purge.

## Concrete transition incompatibility (HIGH)

The unchanged `privacy_prior_check_in` still inserts legacy membership after
QR. It does not consult v2 slots/cooldown and can recreate a left membership
with NULL v2 identity. This is reproduced in an automatic test. The shared
owner lock orders it with RPC calls but cannot give an unchanged legacy writer
new v2 semantics. Thus **max 3 and cooldown are enforced by this engine, not a
global invariant across the legacy QR writer**.

Do not enable the combined v2 flow while that writer remains an alternate
membership path. The separately scoped QR/onboarding cutover must separate
presence from membership and reconcile any resulting legacy NULL identities.
No guard trigger is added to check_in because it would change legacy behavior
explicitly excluded by this task. This is a documented activation blocker,
not an assertion that the bypass has been fixed.

A delayed leave after a completed leave + later new membership is a new intent
under this UUID-only API; there is no unbounded operation receipt/history.
Before UI retries across leave/rejoin cycles, use the current membership ID as
an optimistic precondition in a separately approved API extension if needed.
Ordinary retries while absent are verified idempotent and do not extend guards.

## Tests / hosted execution

**PASS**, hosted migration applied after local checks. Server MD5 of submitted
030 matches the repository file: `412b617821f5e97a43797cfe713b7f4b`.
Preflight validated the exact approved 029 data, private schema and OFF controls.

- SQL smoke in one rollback transaction: join 1/2/3, fourth denied, duplicate,
  global grace without reset, leave/retry, synthetic legacy identity/source,
  legacy_closed NULL anchor, 30-day guard, my_tribes and Board denial after leave.
  Two temporary Auth principals and four venue fixtures: zero residual rows.
- Real separate PostgreSQL sessions, one committed synthetic principal:

| Pair | Backend A / B | B wait | Result |
|---|---|---:|---|
| Competing third/fourth join | 1065940 / 1065941 | 9874 ms | third succeeds, fourth TRIBE_LIMIT |
| Concurrent leave + cooldown rejoin | 1065971 / 1065972 | 9648 ms | one leave, retry NO-OP, rejoin TRIBE_COOLDOWN |
| Duplicate join | 1066013 / 1066014 | 9752 ms | identical membership ID/source/result, total stays 2 |
| REPEATABLE READ competing join | 1066029 / 1066030 | 9858 ms | A third succeeds, B fails safely with 40001 |

The leave guard timestamp was identical in both session results, proving no
retry extension. The strict-isolation case explicitly expired only the named
synthetic guard before the race. No real account was used or adjusted.
Session scripts and exact fixture setup/teardown are versioned under
`tests/staging/tribe-membership-*`.

The committed fixture was necessary for visibility across distinct database
sessions. It used a clearly marked `@example.invalid` Auth principal, synthetic
profile and photo metadata only; no password, email delivery or Storage file.
PHOTO CANARY was transaction-local during setup and restored before commit;
other sessions never saw open admission. Setup/teardown were rehearsed locally,
including repeated teardown. All fixture Auth/profile/membership/state/guard,
venue/catalog and synthetic photo metadata/audit rows were removed. No original
legacy record was modified outside rollback tests.

The original legacy smoke then passed on hosted Postgres: check_in, discovery/
Tribe/photo authorization, send_spot/match/chat, AGE/CONSENT/revocation, RIGHTS,
Board/reactions/report/moderation and retention/deletion contracts. Final
legacy fixture count 0. Auth/JWT/MFA in these tests are SQL simulations, not
real browser login/MFA or image uploads. No Confirm email change was needed.

Post-checks: original 028 checker, phase-aware 029 structural/data gate and
030 RPC/security/immutability gate all PASS. Complete legacy-row fingerprints
(venues, catalog, memberships, account states, presence, interests, match/chat)
match pre-030; membership_id/source, NULL legacy anchors, exact expired 90-minute
presences and social data are unchanged. All 14 original data-projection hashes
also match. All 14 photo/Storage table row counts and full-row hashes match,
including **39 Storage object metadata rows**. No Storage operation occurred;
this demonstrates no newly introduced orphan, not a claim that historical
staging diagnostics/objects were globally purged.

| Legacy structural fingerprint, before = after | Value |
|---|---|
| All preexisting functions (excluding only the four newly added names) | `3662f5458ad42f1a92ad4d4e16b59869` |
| Existing policies | `e67e79d1424b7d26c09b38aa1fd885b3` |
| Existing constraints | `295c17177cf2f53899f50705141c8499` |

Final counts: 3 Auth accounts/profiles, 2 original memberships, 2 venues,
2 expired check-ins, 2 reciprocal interests, 1 match, 2 messages, zero Board
content. Retention paused. PHOTO PAUSED/epoch 10; cleanup/execute/scheduler OFF,
no canaries; original changed_at unchanged. All v2 controls remain OFF/paused.

Approved baseline **346/346**; **16 new automatic tests**, final
**362/362 PASS**, zero fail/skip. Build and typecheck PASS. Existing Node
experimental type-stripping notice is non-blocking. New tests also cover
inactive/nonjoinable/invalid Tribe, exact 24h boundary, cooldown expiry, missing
AGE, suspension/ban/staff/deleting denial, consent absence/revocation allowed,
client cross-owner/direct-write denial, immutability, rollback of failed first
join, revision fences, RIGHTS/delete cascade, legacy QR incompatibility and
fixture setup/teardown. The one-connection PGlite queue tests are not presented
as proof of multi-session locking: the hosted races above provide that evidence.

## Final gate / remaining conditions

**GO WITH CONDITIONS — SIGNUP / ONBOARDING SENZA QR, staging only.**
The server RPC engine is implemented and verified; no new UI or production
activation is approved by this result. Before enabling the combined membership
flow, resolve the HIGH legacy QR alternate-writer incompatibility described
above. Before pilot, integrate physical expiry of inactive-account guards with
the dedicated retention collector (MEDIUM); do not add a scheduler in this task.
Spot v2 attributed-pending invalidation and robust delayed UI retry semantics
remain explicitly future integration work, not silently implemented behavior.

Operational pause if necessary: revoke authenticated EXECUTE on the two new
RPCs; leave schema/data/immutable anchors intact. All runtime flags remain OFF;
no destructive down migration or reset of legacy state. No pause was required.

This task ends with its separate commit. Main remains
`d0f515e8d2c80eeae60f2d5c33dd8901558d5287`; no merge/push, production access,
Vercel change, PHOTO code change or Google Cloud action. Historical 027–029
files unchanged. No onboarding, QR separation, ORA v2/4h, quota enforcement,
Spot v2, Daily Discovery, Spotted runtime, navigation, worker or scheduler was
implemented. The approved source changes are exclusively 030, its tests/SQL
rehearsals and this contract/report.
