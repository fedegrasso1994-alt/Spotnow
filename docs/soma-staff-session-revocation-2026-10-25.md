# Staff session revocation hardening — staging

**STAFF SESSION REVOCATION: GO FOR PROVISIONING**

## Root cause and scope

The pre-055 guard trusted active role + verified factor + JWT AAL2 without
checking server session identity or grant freshness. Regranting the same UID
therefore reauthorized a still-valid old AAL2 token. The prior regression now
asserts denial rather than documenting that vulnerability as expected behavior.

Only migration `055_staff_session_revocation.sql` was applied to staging
`zjinjtkekmaqtxsuyvho`, and registered with its exact source in migration history.
No real role grants, revocations, factor changes, account deletion, custom JWT
issuance, client changes, normal-user Auth changes or global session revocation.
No main/Production operation, backup/restore, rollback execution or new provider.

## Server-authoritative model

- Private role column `session_not_before`, set by a trigger on actual role/active
  transitions. It advances monotonically at full PostgreSQL microsecond precision.
  Equal timestamps fail closed; integer JWT `iat` is never used for freshness.
- Private RLS table `staff_revoked_sessions` contains only a primary-key FK
  `session_id` to `auth.sessions`. At grant/revoke/role change, currently existing
  sessions of that principal are fenced atomically. Thus a refresh keeping the
  same session identity cannot regain privilege, even under timestamp skew.
- The receipt has no user content, duplicate account field, token, name, email,
  URL, location or session payload. Its lifetime is the corresponding live Auth
  session: `ON DELETE CASCADE` physically removes it when Auth removes that
  session/account. It must not be time-purged while the blocked session exists:
  doing so could undo the revocation guarantee. No new arbitrary retention period
  or job is introduced. One row per fenced session, not per request/refresh.
- The existing guard additionally requires well-formed provider `session_id`, a
  current Auth session of the same principal, session creation strictly after
  the role fence and not in the future, unexpired `not_after` when set, server
  session AAL2, and that session's actual TOTP factor verified. Existing active,
  non-anonymous/non-banned account and JWT AAL2 requirements remain.
- No role / missing or malformed claims / absent or foreign session / expired
  session / AAL1 / missing or unverified factor all deny. JWT signature/expiry
  validation remains at the Auth/API gateway; client parameters cannot set claims.
- Logout deletion of the authoritative Auth session makes even a not-yet-expired
  access JWT fail this privileged guard. An uncompleted/failed network logout is
  not represented as successful revocation.
- Normal refresh of an admitted current session remains usable; refresh of a
  pre-grant/revoked session remains denied. New login **after** grant, then real
  MFA, is required. Re-challenging an old pre-grant session is insufficient.

## Concurrency and API compatibility

The guard takes a transaction-shared advisory lock on the existing
`hashtextextended('moderation-roles',25)` key. The role-write trigger takes its
exclusive counterpart; existing role-set uses the same exclusive lock. In-flight
admitted transactions finish before a role transition can commit. Authorization
starting behind a transition waits and evaluates fresh state. Transactions with
pinned REPEATABLE READ/SERIALIZABLE snapshots fail closed; PostgREST uses READ
COMMITTED. Read-only transactions remain compatible (verified in staging).

Two concurrent role managers upgrading shared to exclusive locks can cause a
PostgreSQL deadlock victim; that transaction aborts atomically and cannot grant
privileges. Use the existing operation ID for a deliberate identical retry after
checking outcome; never bypass authorization. No retry worker was introduced.

RPC signatures and role privileges are unchanged. ADMIN retains existing
analytics/ops and moderation powers; MODERATOR has moderation only, cannot use
analytics/ops or manage roles. No service-role/cloud/raw DB access is granted.
Existing grants, if any at deployment, would require new login. Staging preflight
found zero roles, and postflight still confirms zero roles/zero receipts.

## Tests and evidence

- Targeted auth/role/MFA/session/inventory: **26/26 PASS**.
- Full suite: **802/802 PASS** (one final full run, no rerun-until-green).
- Build PASS; typecheck PASS; fresh exact-file reconstruction PASS (54 migration
  files, snapshot-specific029 exception unchanged;100 application tables).
- Local PostgreSQL-backed synthetic fixtures: both roles allow fresh AAL2,
  revoke denies, regrant preserves old-session denial, two old browser sessions
  denied, refreshed same-ID denied, fresh post-grant login allowed, repeat revoke
  denies, session deletion/logout denies. Role events retain existing idempotency.
- Boundary tests: exact fence denied, +1 microsecond allowed, multiple transitions
  within one second, old future-dated session still fenced, no-op retry preserves
  fresh authorization, expired session denied, FK receipt physical cascade PASS.
- Pinned old snapshots, invalid JSON/UUID/claim shape, foreign/missing session,
  AAL1, unverified factor, normal user and direct private access deny.
- Two separate real staging PostgreSQL connections: shared **actual guard** lock
  blocks exclusive write lock; inverse exclusive lock makes actual guard wait.
  Only an explicitly nonexistent synthetic principal/session was used for those
  probes; no account, Auth session or role was created. This validates the real
  locking mechanism, not a hosted role-change/login canary.
- Live migration/function body hashes match local source; guard and receipt table
  are private. Both nominated accounts retain1 verified TOTP,0 unverified factors;
  no role row. Evidence JSON contains booleans/counts/hashes only.

During development, the first targeted attempts failed because the inherited DD
fixture replaces `pg_catalog.clock_timestamp()` with a frozen value. The harness
now advances that synthetic clock explicitly beyond the fence for a fresh login;
no wall-clock sleeps, relaxed validator or runtime bypass. Exact equality remains
a separately tested denial. No failed full-suite run was rerun without a change.

## Provisioning handoff / rollback safety

Do not assign roles in this task. The subsequent separately authorized operation
must bootstrap the first ADMIN with audit, then have ADMIN log in anew and perform
MFA before normal role-set for MODERATOR. MODERATOR also needs a fresh login/MFA
**after** its grant. The previous pre-grant AAL2 confirmations remain identity/MFA
evidence but cannot authorize staff access under055.

A live privileged canary remains for that provisioning task: owner-controlled
login, direct authorized/denied RPCs, revoke/regrant of each nominated principal,
logout and old-session denial. No real token was read or replayed here.

If rollout encounters incompatibility: keep roles absent/inactive and privileged
access closed, investigate forward. Do not restore the vulnerable pre-055 guard,
remove revocation receipts for live sessions, lower TTL or purge Auth sessions as
a workaround. No destructive down migration was executed or provided.

## Sources

[Supabase session semantics](https://supabase.com/docs/guides/auth/sessions)
explicitly maps the JWT session ID to `auth.sessions` and recommends server
session existence checks for privileged operations requiring logout revocation.
[Sign-out scopes](https://supabase.com/docs/guides/auth/signout) distinguish local
and global logout; this migration changes neither scope nor token issuance.
