# Final staging ADMIN / MODERATOR provisioning

Closed 26 October 2026, Europe/Rome. **OPS ADMIN/MODERATOR PROVISIONING: GO**.

## Final accounts and access

Project `zjinjtkekmaqtxsuyvho`, staging only. Both identities intentionally remain
provisioned as operational accounts; neither was deleted.

| Dedicated account UID | Final role | State | Live privileged API checks |
|---|---|---|---|
| `7e8b9388-f0a1-4c7f-86f2-2746096016b9` | ADMIN | active | dashboard,ops_health,ops_recent,moderation_review_queue allowed with fresh AAL2 |
| `f6fa2d11-cc8b-42cd-abb8-f986e07d14de` | MODERATOR | active | moderation allowed; dashboard/ops and role management denied |

MFA intact: 1 verified TOTP and 0 incomplete factors per account. No factor was
enrolled, removed or reset. Owner retained custody of passwords/TOTP. Final
read-only check finds 0 eligible staff sessions for each account after logout,
while roles remain active. Next use requires normal fresh login and MFA.

No raw DB, service-role, console/IAM or cloud access was granted to either account.
ADMIN retains only its pre-existing moderation capabilities, in addition to
analytics/ops; MODERATOR gained no ADMIN/analytics capability. Existing active-role,
account, session identity/freshness, verified factor and AAL2 guards remain055.

## Server-side provisioning and audit

Starting commit `df48b33f46c75c9b55d80cdc65b3ed872af4833e`. Preflight verified055,
expected live guard hash, both nominated confirmed/non-banned/non-anonymous
accounts, no product profiles, intact MFA and no roles. No schema change,
migration application, backend/frontend product semantics change or normal-user
mutation occurred in this task.

There are exactly 6 expected staff role events, with unique operation IDs:

| Target | Transition | Method / actor | Operation ID |
|---|---|---|---|
| ADMIN | none→ADMIN | authorized founder/cloud-owner bootstrap | `b232e40e-cb30-4194-93b6-389853eb51b6` |
| MODERATOR | none→MODERATOR | normal RPC, authenticated ADMIN | `af9fd0b4-f09e-43db-bbb7-ba2de0df82f4` |
| MODERATOR | MODERATOR→REVOKED | normal RPC, authenticated ADMIN | `e028ddb1-d1f7-40ed-8690-9fedf55d750b` |
| MODERATOR | revoked→MODERATOR | normal RPC, authenticated ADMIN | `38083326-a5dc-4d09-ac70-745fad0ba8b7` |
| ADMIN | ADMIN→REVOKED | authorized founder/cloud-owner transaction | `c6c76640-19a7-4b64-9ee0-f0e7037b0d0b` |
| ADMIN | revoked→ADMIN | authorized founder/cloud-owner transaction | `9b1c6da2-cfeb-4c95-a89a-018df22e1bd8` |

The single ADMIN cannot self-revoke through role-set: this existing prohibition
was preserved. Its bootstrap/revoke/regrant used explicitly authorized owner SQL,
existing role-write advisory lock, exact nominated UID, staging/055/state/MFA
checks, normal055 trigger/fence and atomic role-event insertion. No second ADMIN
or recovery endpoint/backdoor was invented. Owner events intentionally have
`actor_id=null`; the founder's explicit authorizations in this task and operation
IDs are the external audit linkage. They are NOT represented as authenticated
app ADMIN actions before bootstrap or while revoked. MODERATOR events record the
actual ADMIN UID from the normal authenticated role-set RPC.

The MODERATOR role/fence was independently compared before/after both owner ADMIN
transitions and remained identical. Final audit confirms only the two nominated
roles exist; no normal user was promoted. Source guard hash still matches055;
role and session-receipt tables remain inaccessible to authenticated clients.

## Live canary result

Actual owner-controlled password login and TOTP challenge were performed in the
local canary. Privileged calls went to real staging APIs with the provider's
normal JWT, not fabricated SQL claims. The agent did not read credentials or
private tokens. Evidence records safe enums/booleans/timestamps only.

| Gate | ADMIN | MODERATOR |
|---|---|---|
| Fresh login AAL1 denies privileged APIs | PASS | PASS |
| Real MFA / new privileged session after grant | PASS | PASS |
| Initial allowed access / separation | PASS | PASS |
| Revoked: unchanged privileged client denied | PASS | PASS |
| Regranted: same unchanged client still denied | PASS | PASS |
| Real logout before new login | PASS | PASS |
| New login + real MFA: restored permitted access | PASS | PASS |
| Logout after restored access: original JWT read probe denied | PASS | PASS |

Each deny probe required SQL42501 from the actual RPC. JWT expiry/network failure
was not accepted as proof. Post-logout probes retained the old token only in a
private browser closure for the read probe, then cleared it. It never went to
loopback/evidence, DOM, repository or agent output. Owner confirmed the same-tab,
unchanged-client steps; server role-event timing corroborates the sequence.

- ADMIN revoked PASS07:39:14.272Z, regranted-stale PASS07:59:49.753Z,
  restored PASS08:01:54.846Z, final logout-stale PASS08:02:08.307Z26October.
- MODERATOR revoked PASS07:20:50.595Z, regranted-stale PASS07:22:05.635Z,
  restored PASS07:27:03.215Z, final logout-stale PASS07:30:09.457Z26October.

All timestamps above are explicitly UTC. No screenshots of privileged content
were collected. The dashboard/moderation proofs are real API access checks, not
an independent visual inspection of the full app's staff pages.

Anonymous direct staging RPCs (dashboard,health,recent,moderation) deny 4/4.
Normal-user, forged/malformed claims, missing/unverified factor and foreign/missing
session denial are additionally covered by PostgreSQL tests; no existing normal
staging user's credentials/account were accessed for testing.

The evidence history retains one preliminary ADMIN `allowed` probe that failed
before the later successful owner-completed login/MFA flow. It is not counted as
passing proof or silently removed; its exact cause was not captured. No runtime
patch was made in response. Final canary evidence includes a distinct fresh login,
AAL1 denial, real MFA, subsequent successful allowed/restored calls and logout.

## Tooling and privacy

`tools/staff-provisioning/` and its build script are local operator support only,
never imported into the product. Public staging configuration and operation IDs
are in ignored local files; no private key is required. Normal login/MFA goes
browser-to-Auth directly. There is no enrollment, factor removal, reset, custom
JWT, service key, client authorization override or global logout.

Server evidence endpoint is loopback Host/Origin restricted, bounded,no-store,
and accepts only predefined enum/boolean fields. Auth tokens, OTP, email,
passwords, free text and provider response payloads are not evidence. Privileged
RPC response data is discarded rather than logged. Session state is browser
memory only. The loopback server was stopped after both final logouts; port 4197
has no listener. The operator can close the test tab. Diagnostic support is not
an externally deployed endpoint and no new provider was introduced.

[Minimized live evidence](evidence/ops-phase-a/staff-provisioning-live.json)
contains complete safe probe history, summary, six server audit events and final
role/MFA/ACL counts. No private session IDs/tokens or content are included.

## Verification and Git handoff

Final rerun after live canary: targeted 28/28 PASS, full 806/806 PASS, build PASS,
typecheck PASS. No rerun-until-green or weakened assertions. Separate local tool
unit tests 4/4 PASS. These tests cover role/MFA/session revocation and local harness
constraints; live owner login/MFA is separately evidenced above.

No new migration (055 was already deployed). Main/origin main remain
`d0f515e8d2c80eeae60f2d5c33dd8901558d5287`; Production unchanged. No Production
configuration, deployment, scheduler, credential, provider, backup/restore or
Vercel rollback operation was performed. No roles or MFA were modified during
final checks. No new retention or product policy was introduced.

## Recovery remains the documented process

Normal role management uses a healthy ADMIN AAL2 on another principal, with
operation ID and audit. Single-ADMIN/no-healthy-ADMIN recovery requires explicitly
authorized owner intervention, identity/custody verification and audit. After any
grant/regrant, new login/MFA is mandatory; old sessions remain denied. Do not
fabricate AAL2, remove receipts for live sessions, reset MFA globally, grant an
extra ADMIN casually, lower TTL or restore the pre-055 guard as a workaround.
Legal/backup/provider readiness outside this task is not declared complete.

**OPS ADMIN/MODERATOR PROVISIONING: GO**
