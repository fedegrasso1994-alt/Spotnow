# Final staging ADMIN / MODERATOR provisioning — checkpoint

Status: **LIVE CANARY PENDING — NOT CLOSED**.

## Scope and verified baseline

Branch `codex/soma-schema-v2-staging`, starting commit
`df48b33f46c75c9b55d80cdc65b3ed872af4833e`. Migration055 already applied;
no migration/schema/role-model changes in this task. Main/Production untouched.
No backup/restore or deployment rollback.

Read-only staging preflight: project `zjinjtkekmaqtxsuyvho`, environment staging,
055 present and expected guard source hash. Both dedicated accounts are confirmed,
non-anonymous/non-banned, without product profiles, one verified TOTP each, zero
incomplete factors. Initially no roles.

## Provisioning performed

First ADMIN bootstrap executed atomically by authorized cloud-owner SQL:
- target `7e8b9388-f0a1-4c7f-86f2-2746096016b9`, role ADMIN active;
- shared role-write advisory lock, explicit environment/055/zero-roles checks;
- both nominated account/MFA prerequisites rechecked inside the transaction;
- normal055 trigger fences pre-grant sessions, no bypass;
- operation `b232e40e-cb30-4194-93b6-389853eb51b6`, event timestamp
  `2026-10-25T19:19:46.033568Z`;
- app audit `actor_id=null`: this is an explicitly authorized founder/cloud-owner
  bootstrap, NOT an authenticated ADMIN action before the first ADMIN exists.
  Authorization is Federico's explicit final-staging-provisioning request in this
  chat, linked to this operation ID; no false authenticated actor was invented.

No role/database-console/service-role privileges are granted to the account.
MODERATOR `f6fa2d11-cc8b-42cd-abb8-f986e07d14de` remains unassigned pending fresh
ADMIN AAL2 canary. Its grant will use normal `moderation_role_set` from that live
ADMIN session, with a fixed operation ID for exact retry, not owner SQL.

## Live canary helper

`tools/staff-provisioning/` is a local-only operator module, never imported by
Soma. Build: `node scripts/build-staff-provisioning.mjs`; local server:
`node tools/staff-provisioning/server.mjs`, bound127.0.0.1:4197.

Configuration/public key/nominated IDs/operation IDs are local ignored files.
Normal staging Auth login/MFA occurs directly browser-to-provider. No enrollment,
factor removal, reset, custom JWT or account creation is offered. No credentials,
OTP or session payload goes to loopback or evidence. Sessions are in browser memory
only; reload loses them. The post-logout canary temporarily retains the original
access token in a private browser closure for a single read-only probe, then
clears it; agent/model never reads it. It is never rendered, printed or persisted.

Only explicit staging Auth/RPC paths are allowed. Canary probes call actual
admin dashboard/health/recent/moderation APIs, discard returned content, and retain
only operation enums and boolean results. Denial must be PostgreSQL42501; token
expiry is not accepted as proof of055. MODERATOR role-management probe uses
invalid/null inputs so it cannot mutate a target even if authorization regresses.

Loopback evidence accepts only strict operation/role/phase enums and booleans,
requires local Host + Origin, bounded input, and no-store. Unknown fields,
including tokens/free text, are rejected. Evidence files are ignored and only
minimized results will be copied to the final report. UI evidence alone is not
proof of DB authorization: normal provider/API checks and DB audit are separately
verified.

## Checks completed

- Anonymous direct real staging RPCs: dashboard, ops_health, ops_recent,
  moderation_review_queue all DENIED (4/4). No authenticated/user data response
  was obtained.
- Targeted role/auth/MFA/session/local-harness tests28/28 PASS.
- Full suite806/806 PASS; build PASS; typecheck PASS.
- Local helper dedicated tests4/4 PASS after adding explicit MODERATOR
  revoke/restore controls. No application/backend semantics changed.

## Required next steps — no success claimed yet

1. Owner opens a new local canary tab, selects ADMIN, fresh password login:
   all privileged AAL1 reads must deny. Real TOTP verification -> AAL2.
2. ADMIN phase `allowed`: dashboard/ops/moderation surfaces must allow.
3. ADMIN grants MODERATOR via normal RPC; retain ADMIN client in this same tab.
4. MODERATOR fresh login/AAL1 denial -> real MFA -> phase `allowed`:
   moderation allowed, dashboard/ops/role management denied.
5. ADMIN uses revoke control for MODERATOR; unchanged MODERATOR client probe
   phase `revoked` denies. ADMIN restore control; same MODERATOR client phase
   `regranted_stale` still denies. MODERATOR logs out, logs in anew and challenges
   MFA; phase `restored` allows moderation only, then logout-stale probe denies.
6. For the single ADMIN, owner-authorized audited revocation/regrant (self-role RPC
   is intentionally prohibited) with unchanged ADMIN client proving both denial
   phases; then fresh login/MFA and restored surfaces; logout-stale probe.
7. Read-only final audit/roles/factors/session-fence checks; no ordinary accounts
   or MFA factors altered. Keep both dedicated accounts with final correct roles.

If a real allowed/denied assertion fails: STOP, preserve exact minimized evidence,
no reset/backdoor. Keep recovery as the existing owner-authorized provisioning /
role-revocation process plus055; no alternative recovery endpoint.

Final live role/session canary, revoke/regrant and logout proofs remain PENDING
owner Auth interaction. This checkpoint is not a provisioning GO.

## Checkpoint 26 October — MODERATOR complete, ADMIN cycle in progress

The local enum/boolean evidence records MODERATOR AAL1 denial, authorized
moderation-only access, revoke denial, regrant-stale denial, real logout-stale
denial, new login/AAL1 denial, restored moderation-only access, and a final
logout-stale denial. ADMIN fresh login/MFA allowed probes also PASS.

There is intentionally no ADMIN self-revoke button: existing role-set prohibits
changing one's own role. With only one nominated ADMIN, the documented authorized
owner procedure is required. No extra ADMIN or client bypass was introduced.

Only ADMIN was revoked server-side in a locked transaction, using existing055
trigger/fence and atomic role-event audit. Actor is null for this owner operation;
the founder request to complete the ADMIN cycle is the external authorization.
Operation `c6c76640-19a7-4b64-9ee0-f0e7037b0d0b`, event `2026-10-26T07:36:41.942501+00:00` (UTC).

Postcheck: ADMIN inactive; MODERATOR active with identical role/fence to precheck;
verified factor counts unchanged (one each). No MFA/account/schema/runtime change.

Current gate: owner must use the UNCHANGED ADMIN browser session, phase `revoked`,
to prove actual RPC denial. Regrant SQL is prepared but NOT EXECUTED. It will only
be executed after that evidence PASS. Then the same session must also pass the
`regranted_stale` denial before real logout and fresh login/MFA/restored checks.
No task completion or final provisioning GO is claimed at this checkpoint.

Last code baseline remains806/806 tests PASS, targeted28/28, build/typecheck PASS.
This checkpoint changes documentation only; no additional runtime tests needed.

### ADMIN regrant checkpoint — 26 October

Owner-confirmed `ADMIN revoked: PASS` is independently present in minimized local
canary evidence (2026-10-26T07:39:14.272Z), four actual RPCs denied. Only then
owner regrant was executed with operation
`9b1c6da2-cfeb-4c95-a89a-018df22e1bd8`, using the prepared exact-UID transaction,
staging/055/state/MFA guards and atomic audit. ADMIN is active again; postcheck
confirms MODERATOR role/fence and verified factor counts unchanged.

Pending: same ADMIN client `regranted_stale` denial, real logout, fresh login/MFA
and `restored` success, then final audit. No final provisioning GO yet.
