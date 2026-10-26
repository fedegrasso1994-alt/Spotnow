# OPS ADMIN/MODERATOR provisioning gate — 2026-10-25

> Stato corrente26ottobre: provisioning live staging completato.
> [Report finale](soma-final-staging-staff-provisioning-2026-10-25.md): entrambi i
> ruoli attivi, canary revoke/regrant/logout e nuovo login/MFA PASS. Le indicazioni
> sotto di stato BLOCKED/ruoli assenti descrivono checkpoint storici, non lo stato
> attuale. Recovery corrente usa055 e il processo owner autorizzato documentato.


> Evidenza storica del blocker pre-055. Risoluzione: [hardening staging](soma-staff-session-revocation-2026-10-25.md).
> Il provisioning reale resta non eseguito; il nuovo guard è pronto per quel task separato.

Status: **OPS ADMIN/MODERATOR PROVISIONING: BLOCKED**.
Scope: staging only. No grants, revocations, factor mutations or account deletions
were executed. Both nominated accounts remain dedicated staging accounts without
roles. No main/Production operations, backup/restore or deployment rollback.

## Preflight evidence

Read-only query explicitly targeting project `zjinjtkekmaqtxsuyvho` confirmed:
- privacy environment staging;
- zero active ADMIN roles;
- ADMIN `7e8b9388-f0a1-4c7f-86f2-2746096016b9` and MODERATOR
  `f6fa2d11-cc8b-42cd-abb8-f986e07d14de` exist, confirmed, non-anonymous,
  with verified MFA and no role row;
- live `spot_private.moderation_role()` has the same stateless guard documented
  below. No credentials, TOTP material or session token was read.

## Existing authorization model

Private/RLS role tables; server RPC authorization; no client email special case.
ADMIN can access analytics/ops and moderation, including existing ADMIN-only
ban/release/reopen and role management for other principals. MODERATOR can access
moderation within existing case/claim/revision rules, not analytics/ops or role
management. Neither app role grants raw DB, cloud console or service-role access.
Both require active role, existing non-anonymous/non-banned Auth account, verified
MFA factor and `aal2` claim. The first ADMIN requires audited owner bootstrap;
normal MODERATOR provisioning is by an authenticated ADMIN AAL2 via role-set RPC.

## Blocking requirement

The current guard does not bind privileged access to a currently valid server
session or grant generation. Revoking the role denies access immediately while
inactive. Restoring the same UID also restores authorization for a still-valid
old AAL2 JWT. Logout/refresh revocation alone does not prove immediate rejection
of every stateless access JWT. This conflicts with the requested stale-session
and restore-only-with-valid-session gates.

Reproduction already exists in `tests/ops-readiness.test.js`, test
“OPS Phase A: revoked ADMIN cannot retain access; recovery on new principal never
reauthorizes old AAL2 claims”: grant B, call ops/dashboard with B AAL2, revoke B,
verify denial, regrant B, reuse previous B AAL2 claims, ops succeeds. This is a
PostgreSQL-backed local authorization reproduction, not a cloud JWT replay or
real logout claim. Live guard inspection confirms no additional session check.
The documented limitation predates this task; see staff provisioning/recovery
runbook section “Revoca immediata e limite JWT”.

No attempt was made to obtain or replay the owners' real JWTs. No live privileged
surface access, revocation/restore or provisioning audit can be reported PASS:
roles were intentionally left absent before the known-failing gate.

## Required follow-up before provisioning

Design and authorize a narrow staging authorization hardening change. Candidate:
verify the provider-issued session identity against authoritative live session
state for privileged RPCs, and fence prior privileged tokens across role
revocation/regrant using a grant/session generation or equivalent robust server
rule. Define ordering and races, including logout propagation, expiry, refresh,
concurrent revocation and grant, account/factor removal and valid reauthentication.
Do not rely on a browser flag, fabricated AAL2 claims, shorter JWT TTL, waiting an
arbitrary duration or an extra ADMIN identity as a substitute.

This requires shared server authorization/schema/API compatibility review before
implementation; no candidate migration or runtime patch is included here.
Retest both roles with real owner-controlled login/MFA and direct RPCs after
hardening, including old-session denial on regrant and logout, then provision
with atomic nominated owner bootstrap and normal ADMIN role-set path.

## Verification

Targeted auth/role/MFA/moderation suite: 35/35 PASS.
Full suite: 797/797 PASS. Build PASS. Typecheck PASS.
Passing current tests must not be interpreted as passing the requested new
stale-session security property: the limitation test asserts existing behavior.
