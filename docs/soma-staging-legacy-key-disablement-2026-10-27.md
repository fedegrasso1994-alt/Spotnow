# SOMA — staging legacy key disablement review

Status: **LEGACY KEY DISABLEMENT: BLOCKED**. This is NOT permission for JWT trust cutover.

Starting branch `codex/soma-schema-v2-staging`, HEAD `d5006df7511d10d317e95f6bedfb98e6dfacaf7f`. Explicit provider target: `zjinjtkekmaqtxsuyvho`. Main unchanged. No Production mutation or deployment in this task.

## Action and stop

After the preflight below, used the staging Dashboard's **Disable JWT-based API keys** confirmation. Only the legacy API-key toggle changed. Dashboard then displayed **Re-enable JWT-based API keys**, establishing provider configuration disabled. JWT signing keys/trust, user sessions and MFA were not changed.

The first immediate post-toggle negative probe sent legacy anon in `apikey` to `/auth/v1/settings` and received HTTP200, failing the expected401/403. The script stopped at that assertion. No rerun-until-green, wait-and-retry loop, fixture creation, post-toggle PHOTO mutation or fresh staff login was attempted.

A single read-only diagnostic on a different surface (`/rest/v1/profiles?select=id&limit=0`, returning no personal rows) gave:

| Credential class | HTTP | SQL code |
|---|---:|---|
| missing / malformed |401|none|
| legacy anon |401|42501|
| legacy service_role |401|42501|
| modern publishable |401|42501|
| modern secret |200|none|

The42501 results indicate permission denial, not an independently proven API-key rejection. They must not be promoted to negative authentication proof merely because the status is401. The modern secret remains usable. The Auth200 could involve endpoint behavior or propagation; exact provider cause is **UNRESOLVED**. No assertion that the toggle is fully enforced across services is made.

Final state: legacy keys **disabled in provider configuration; enforcement gate unresolved**. No rollback performed: no critical modern consumer outage was demonstrated, so re-enabling credentials solely to erase a failed security proof was not necessary. Next single step: a separate bounded, read-only enforcement investigation with an appropriate credential-rejection oracle, including supported propagation semantics; no signing-key operation. If a real critical consumer failure is demonstrated, restore only this toggle using the Dashboard's Re-enable control, verify modern consumers, and retain the failure evidence. No data rollback, session revocation, MFA reset or redeploy is required by that rollback.

## Remaining-reference inventory

Classification A active blocker; B inactive historical reference; C rollback-only configuration; D irrelevant documentation/test fixture.

| Surface/reference | Current evidence | Classification |
|---|---|---|
| Current Preview | `dpl_8UUYJyycJgV6bqjBnEBT4yF5dXrb`, runtime `ccb9d47`; preceding report verified44 exact static hashes, staging publishable, no Production ref/server secret |No active legacy dependency found|
| Vercel Preview branch env |Current metadata query returned empty env list, no decrypted values requested; artifact explicitly built from staging input |No active legacy dependency found|
| Ten deployed Edge |Current version/update metadata unchanged since migrated deployment: photo-assets19, delete-account13, JPEG12, PNG10, WebP10, lifecycle16, privacy-retention8, profile-photo9, notifications10, operations8. Prior verified modern sources/smokes therefore still apply; no redeploy here |No active legacy dependency found|
| Edge reserved `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` |Names still present provider-side; migrated entrypoints read named `SUPABASE_SECRET_KEYS.default`, not these reserved legacy vars |C|
| Edge `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS` |Names present; modern default key metadata verified |Modern|
| Active Phase A cron |Live catalog: modern Vault name, active, schedule `0 3 * * *`, no legacy Vault reference |Modern|
| PHOTO cron/helper paths |Live catalog: both jobsOFF, modern Vault;056 transport; no admission/cleanup change |Modern inactive|
| Privacy dispatch |Live definition reads modern Vault, no Authorization/Bearer transport; pre-toggle modern dry-run200 |Modern|
| `privacy_retention_schedule` |Live definition mentions old Vault name but does not read decrypted secrets or construct Authorization; jobOFF |B, name-only prerequisite|
| Vault `photo02_staging_scheduler_key`, `soma-photo02-cutover-staging-key` |Only names inspected; retained unused credential values not read |C|
| Vault `soma-modern-server-staging` / private binding |Live owner binding fixed staging; cron and modern dispatch consume it |Modern|
| Admin/moderation/Observability |Modern frontend/RPC transport and existing AAL2 guards; previous fresh human canary PASS; this task's local auth/staff tests PASS |No active legacy dependency found; live post-toggle not completed|
| Notifications |Deployed v10 unchanged; device proof/dispatcher controls distinct from API-key migration; deliveryOFF |No active legacy dependency found|
| Operational staging smoke scripts |Modern ignored config loader from057; historical scripts not executed because some activate jobs |Modern; old copies B/C|
| Storage CLI / recovery capture |CLI2.121.0. Capture invokes `storage cp` with process environment, no explicit override. Ambient override absent. Official exact-version `resolveStorageCredentials` requests API-key list; `extractServiceKeys` prefers modern secret with role service_role over legacy names. Current staging metadata includes default secret with that role |No active legacy dependency found, no recovery source patch needed|
| Prior explicit CLI smoke |Modern override + SHA256 PASS in preceding migration task; does not by itself prove capture fallback. Fallback independently checked above |Evidence only|
| Recovery DB access |CLI/DB connection path separate from legacy Data API keys; checkpoint contract unchanged; no new checkpoint/restore performed |No active legacy dependency found|
| CI |Workflow build uses example URL and publishable placeholder; no live staging legacy credential path found |D|
| Historical migrations / old Preview artifacts / archived private inputs |Not current staging runtime; no blanket claim that old previews remain functional after disablement |B/C/D as applicable|

No active legacy-key consumer was identified. The blocking issue is incomplete **provider enforcement proof**, not a demonstrated legacy runtime dependency. This audit cannot prove the absence of unknown external/off-repository consumers.

## Configuration and invariant checks

Modern publishable/secret both worked in pre-toggle probes. Pre-toggle legacy keys also returned200, proving the test used actual current legacy classes without printing values. API-key metadata selected only type/name/role. Secret values were held privately in process memory, never put in report/Git. The probe writes status/class only.

Live cron inventory: Phase A ON03UTC, privacy OFF, PHOTO02 OFF, PHOTO cutover OFF. Existing current baseline PHOTO OPEN epoch12, cleanupOFF, DiscoveryOFF, Notifications deliveryOFF was not modified. No PHOTO data, retention policy or purge executor changed. Production project alias read-only metadata still points to original `dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh`; no alias reassignment in this task.

Preview remains https://spot-n6zjiy9qz-fedegrasso1994-1482.vercel.app/ . No new deployment, redirects or Vercel env change. Its preceding login/reload PASS is baseline evidence, **not a claimed post-disablement browser PASS**.

## Tests and incomplete live matrix

- Full suite **838/838 PASS**, one run, zero skip/cancel/fail; includes PHOTO, staff/MFA, retention/ops. Completed before the provider toggle; local suite is not proof of hosted toggle enforcement.
- Targeted server-key/056/057/staff suite **20/20 PASS**, one run.
- Isolated staging build PASS; scans zero Production ref/secret. Build only, no deploy.
- Typecheck PASS.
- Post-toggle probe **FAIL** (legacy anon Auth200); separate read-only Data API diagnosis recorded without rerun.
- Post-toggle Google/reload, user JWT/RLS, protected Edge, PHOTO upload/process/delete, private bytes/CLI recovery copy, fresh ADMIN/MODERATOR AAL2, Notifications auth, Observability and retention dry-run: **NOT COMPLETED after stop**. Prior passes are not substituted.
- No new Auth/profile/photo fixture or byte copy created, no fixture cleanup required in this task.

## Files and evidence

Added `scripts/staging-key-disablement-probe.mjs` (operator verification only), this report, and safe JSON in `docs/evidence/legacy-key-disablement/`. No runtime, schema, RLS, API or product semantics patch. No new migration. Commit/push and clean-tree SHA reported in handoff.

## Primary references

- [Supabase legacy API-key toggle](https://supabase.com/docs/reference/api/v1-update-project-legacy-api-keys): reversible toggle distinct from signing trust.
- [Supabase migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys): migrate consumers before deactivation.
- [Exact CLI2.121.0 Storage credential selection](https://github.com/supabase/cli/blob/v2.121.0/apps/cli/src/command-internal/storage-credentials.ts).
- [Exact CLI2.121.0 modern-key preference](https://github.com/supabase/cli/blob/v2.121.0/apps/cli/src/command-internal/tenant-keys.ts).

No documented propagation bound or readiness signal was established here. Do not invent one or infer signing-trust retirement from API-key configuration state.
