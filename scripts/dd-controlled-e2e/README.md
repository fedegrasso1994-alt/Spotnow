# Manual controlled hosted DD E2E

Executed once on 2026-10-19 against Soma Staging `zjinjtkekmaqtxsuyvho`.
Not imported by the app/CI. No service-role/admin secret; normal password sign-in,
unchanged AGE/consent, PHOTO, onboarding/Membership, DD, profile authorization,
Spot and Match APIs. No frontend work or build deployment.

The fixed `fea41000-*` namespace is disposable synthetic evidence for THIS run.
DO NOT rerun it while technical tombstones remain; this is not an automatic runner.
`prepare.mjs` writes random passwords and an owner SQL seed under ignored `.local/`,
mode0600. Seed is guarded for staging, no existing fixture/account/lifecycle rows,
Discovery/admission OFF and empty allowlist. Auth rows are explicitly confirmed
synthetic accounts: the global Confirm email configuration remains ON throughout.
Never print/commit credentials, session tokens or signed URLs.

`setup.mjs` strictly prevalidates the synthetic JPEG through PHOTO-01, then uses
real hosted canonical upload and normal APIs for exactly two fixture profiles,
AGE/consent and shared IULM membership. No venue or existing-user edits.

Before controlled activation, record `snapshot.sql` (counts/digests, no raw user
content). Record exact eligible nonfixture IDs only in private local evidence;
Git evidence contains count + comparison hashes. Insert ONLY the two fixture IDs
into the private allowlist; turn admission ON while Discovery remains OFF. Verify
list and snapshot equality before separately guarded policy2/Discovery activation.
Cleanup/scheduler stay OFF. No product/window/quota edits.

`smoke.mjs` executes once: reciprocal current allocation, repeated reads, authorized
profile/signed photo HTTP200, pending state, quota, fresh login/re-read, original
Spot-operation retries, reciprocal Match, both empty-chat reads and the existing
`matchPreview` helper using the REAL Match payload. It does not claim a browser
frontend E2E. The original pending operation receipt is immutable: after a Match,
its replay still returns that original pending receipt (not a new Match result).
This is unchanged idempotency semantics, not an E2E failure.

Immediately restore Discovery OFF + policy2 disabled/paused, then admission OFF
and clear only fixture allowlist entries. Verify flags and snapshot equality.
`cleanup.mjs` checks fixture ownership/label, verifies DD paused, runs the existing
PHOTO/delete-account dry-run and normal deletion. It never bypasses409/leases.
On error STOP and retain marked fixtures; do not invent a purge path.
`postcheck.sql` records zero fixture product/Storage rows and normal technical
receipts. The empty global window remains technical evidence, not a user profile.
`auth-postcheck.mjs` verifies Confirm email ON read-only.

Snapshot rows use full serialized-row digests for comparison; not user content
exports. No SQL trigger/function/schema or runtime changes made by this rehearsal.
Operator: Federico-authorized Codex run; all writes restricted to synthetic owners
and approved private staging controls. Main and Production are never called.
