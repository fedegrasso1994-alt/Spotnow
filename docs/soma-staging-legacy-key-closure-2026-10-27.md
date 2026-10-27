# SOMA — 057 and staging legacy-key migration closure

Starting HEAD `c9aee94cb5afded029a9e0cb954e43c01f66dfb9`; branch `codex/soma-schema-v2-staging`. Only Supabase staging `zjinjtkekmaqtxsuyvho` changed. This report supplements the 26 October report; its then-open dispatcher gate is resolved here.

## 057

`privacy_retention_dispatch(boolean)` retains signature, service-only grants, environment/paused checks, category selection, minute-derived operation IDs, JSON payload and 30s timeout. Only additions are the approved056 server-role/project binding guard, modern Vault reference and apikey header. No job, category, policy, PHOTO or Auth setting changed. Applied and registered as057 through the explicit staging Management API target. No secret literals in SQL/Git/evidence.

PostgreSQL tests prove anonymous/client denied, missing server claims denied, missing binding denied, exact body/URL/timeout preserved, correct modern server transport, missing Vault fail-closed, paused non-dry behavior unchanged. Initial test harness corrected to replace the built-in function and freeze `now()` used by the existing implementation rather than `clock_timestamp()`; no runtime workaround or relaxed assertion. Targeted057/056/inventory11/11PASS. Full838/838PASS twice, no failure/skip/cancel. TypecheckPASS, isolated staging buildPASS.

Live RPC smoke: missing401, publishable401, modern server200. Dispatched0 because no legacy policies are enabled; no categories enabled to force traffic. The packet shape and auth are proved by PostgreSQL capture; this run does not claim a new legacy-job automatic tick. Job privacy-retention remainsOFF. Only Phase A ON, unchanged `0 3 * * *`. PHOTO OPEN epoch12, cleanup/schedulerOFF; Discovery/deliveryOFF. Preexisting profile/Storage fingerprints unchanged from previous report.

## Fresh staff

Human custodian completed fresh ADMIN and MODERATOR login/challenge using existing factors. Current-date boolean/enum evidence: AAL1 denied, ADMIN permitted on approved surfaces, MODERATOR moderation only; analytics/ops and role-management denied. No grant/revoke, factor mutation, token capture or session-secret logging. Evidence contains only roles, phases, safe operation names and results.

## Consumer inventory

All ten deployed staging Edge already use named modern secret selection from056; no legacy environment key reads remain there. Explicit internal calls use apikey; genuine user JWTs retained. Notifications device/VAPID/dispatcher controls unchanged. Active Phase A and both inactive PHOTO commands use modern transport. Legacy dispatcher now modern. Its separate OFF scheduling helper still checks existence of the old Vault *name*: no secret value is read there, no legacy credential authenticated; leave unchanged under this transport-only scope.

Seven historical staging smoke tools now load credential fields from the ignored modern staging config, preserving fixture metadata, and no longer decode serverKey as JWT. Headers distinguish userJWT from secret. They are not executed: several intentionally enable old jobs or mutate synthetic lifecycle state, outside this task's activation scope. Operational Phase A enable template also modernized; NOT executed. Tests cover modern config override and fail-closed wrong-project/legacy input.

Historical migrations, portable PHOTO/Production scripts, archived evidence and old private credential files remain provenance/rollback material; not active staging key consumers. New code does not rewrite their secrets. Supabase still injects legacy reserved env variables provider-side; none of the ten deployed entrypoints reads them. Existing legacy-token-compatible authorization branches remain for rollback and are not signing-trust retirement. Legacy API keys remain enabled.

## Preview

Fresh committed-HEAD artifact/deployment and browser evidence appended after deployment. No old root dist used. Public key and core boolean flags loaded only from verified staging inputs, overriding root local Production config. No secret/Production ref in the scanned isolated artifact. No new backend/feature semantics or collection activation.

Runtime commit `ccb9d473406d71651c160bbdf73cc3762f73ccf4`, deployment `dpl_8UUYJyycJgV6bqjBnEBT4yF5dXrb`, target `staging`, READY. Exact URL: https://spot-n6zjiy9qz-fedegrasso1994-1482.vercel.app/ . All44 static file SHA-1 identifiers match the scanned local artifact; the additional deployment configuration matches too. Public key is publishable, explicitly supplied from ignored staging frontend input; no server secret or Production ref in artifact. Deployment metadata is in evidence/legacy-key-closure/preview.json.

Only this Preview's Auth redirect was added to staging following explicit user approval. Site URL, Confirm email and providers unchanged. Browser Google sign-in completed through the existing SSO session and returned to the SAME unique Preview. Authenticated reload retained session. TRIBE displayed the expected Discovery-OFF state; SPOTTED feed/composer, ORA Place selector (no presence started), MATCH empty state and Profilo rendered. Final nav TRIBE | SPOTTED | ORA | MATCH | PROFILO, no false offline or console errors observed. No post, Spot, chat, presence or membership writes performed for browser smoke. Existing prior synthetic server/product smoke covers upload/canonicalization/update/sign/delete and Storage modern-key copy; no active DD or Notifications delivery is claimed. Screenshot preview-shell.png contains no personal content. Fresh staff AAL2 proof is separate from this product-browser login.

## Deployment alias incident — restored with explicit approval

Despite requesting target `staging` and no alias, Vercel automatically assigned `spot-now-fedegrasso1994-1482.vercel.app` to this Preview at2026-10-27T07:42:42.583Z. This WAS a temporary Production-alias mutation and must not be described as Production completely untouched. Work stopped for explicit user authorization. Only that alias was restored at07:45:57.235Z to previous Production deployment `dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh`; subsequent alias metadata verified restoration. Primary Production alias `spot-now-alpha.vercel.app` remained on the original deployment throughout. No Production build, environment, backend, secret or other alias changed. No additional deployment was attempted. Before using this API deployment path again, investigate/prevent automatic project-alias assignment; target `staging` alone is insufficient protection.

Main remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. JWT signing trust, MFA and checkpointv3 unchanged; only normal authorized user login occurred. Legacy keys remain enabled for rollback. PHOTO lifecycle/data and cleanup/scheduler unchanged. Privacy jobOFF; Phase A remainsON at03:00UTC; Discovery and Notifications deliveryOFF. The final evidence commit is documentation-only, so its SHA differs from the deployed runtime SHA.

## Gate

LEGACY KEY MIGRATION: GO FOR LEGACY DISABLEMENT REVIEW

This authorizes no disablement or trust retirement. Remaining rollback-only historical material, provider reserved variables, verified legacy-JWT compatibility and name-only scheduling prerequisite are explicitly inventoried above. Disablement requires its own review and approval; automatic alias assignment is a deployment-safety follow-up before another Preview publication.
