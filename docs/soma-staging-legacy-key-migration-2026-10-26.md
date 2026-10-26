# SOMA — staging legacy API key migration

Status: **BLOCKED — completed stages below are live; legacy disablement NOT approved**.
Branch `codex/soma-schema-v2-staging`; starting HEAD `ac1ff1f38eca31a6f8fb1bd4ad197990418a7fb4`.
Only project `zjinjtkekmaqtxsuyvho` mutated. Main/Production, Auth trust, sessions and MFA untouched. Legacy keys remain enabled.

## Applied stages and evidence

- 056 applied and registered atomically with owner-provisioned Vault credential. Private `server_transport_binding`: fixed project/ref and Vault name, RLS enabled, all table grants revoked from anon/authenticated/service_role. Only owner can install/change it. Definer guard requires the actual PostgREST role plus verified role claims; no client parameter or key-format check grants privilege.
- Both existing scheduler RPC signatures preserved. No Bearer extraction or JWT `ref` decoding. Existing cutover lock/smoke/execute gates preserved; PHOTO remains OPEN epoch12, cleanup/scheduler OFF. RPCs called only with `false` during live smoke. Inactive PHOTO job commands updated to apikey transport; no job activated.
- New Vault entry `soma-modern-server-staging`; existing legacy entries preserved for rollback. Credential obtained through authenticated CLI into ignored owner-only config. SQL transaction receives it via temporary COPY input; no credential literal in SQL, process arguments, tracked files or evidence. Temporary input dropped at commit. No other provider secrets changed.
- All 10 existing staging Edge deployed: photo-assets, three normalizers, photo-lifecycle, profile-photo, delete-account, privacy-retention, operations, notifications. All select named `default` from SUPABASE_SECRET_KEYS; fail closed on absent/invalid config or non-staging origin. No Edge gateway JWT setting changed. photo-assets-bridge source updated for compatibility, NOT newly deployed.
- Internal explicit fetches send secret only in apikey. SDK wrapper strips only the API-key Bearer fallback and retains genuine user JWTs. Handlers explicitly compare the authorized configured server credential; merely resembling a secret grants nothing. Existing verified RPC authorization remains for supported legacy/staff transitional callers. Notifications VAPID/device/dispatch authentication unchanged; delivery OFF.
- Retention Phase A transport migrated only after SQL/Edge PASS. Its job was paused/updated/resumed atomically, schedule unchanged `0 3 * * *`; no policy/executor/activation-control change. DB pg_net smoke request19: HTTP200, completed, no timeout/error, dry-run. This proves transport, not a newly observed automatic tick.

Safe evidence: `evidence/legacy-key-migration/`.

## Live smoke

- RPC056: modern server apikey allowed; public, missing and malformed credentials denied; wrong project denied.
- JPEG normalizer: modern apikey HTTP200; negative credentials denied. PHOTO lifecycle dry-run HTTP200. Retention orchestrator dry-run HTTP200. Notifications prune without dispatcher secret HTTP401.
- One synthetic Auth account: real password login with publishable key; AGE checkbox, consent challenge/accept; real PHOTO upload and worker canonicalization; owner profile insert; authorized-photo endpoint; Storage CLI download using explicit SUPABASE_AUTH_SERVICE_ROLE_KEY modern override. SHA256 matched modern SDK download. Explicit override bypasses API-key lookup/legacy fallback.
- Normal delete-account engine removed fixture Auth/profile/Storage. Temporary downloaded photo removed locally. Only approved short-lived technical deletion receipts may remain under existing PHOTO semantics; no receipt retention altered.
- Preexisting profile hash unchanged `ad4067f19890f61846176521b32aaf92`; Storage hash unchanged `128acb8f9ce4913cb47119e75d8b72e0`, 42 objects before/after. Synthetic Auth purpose count0. Dedicated operational staff accounts preserved; no grants, sessions or factors changed.
- Real fresh staff AAL2/browser OAuth smoke not performed in this task; staff authorization regression tests PASS.

## Stop gate and next exact proposal

Live catalog confirms `public.privacy_retention_dispatch(boolean)` still reads legacy Vault `soma-photo02-cutover-staging-key` and constructs Authorization Bearer. Its cron `soma-privacy-retention-staging` remains OFF. 056 authorization expressly covered the two PHOTO scheduler configurators; do not silently extend that applied migration or mutate this third definer function.

Before completing migration request approval for a separate versioned staging-only transport patch (candidate057): preserve signature/service-only grants, staging environment gate, category/paused checks, operation-id generation, payload and timeout; change ONLY outgoing headers to apikey and Vault reference to `soma-modern-server-staging`. No retention policy, purge executor or scheduler activation. Test normal/anonymous denied, server allowed, missing binding/config denied, fixed staging destination and job still OFF. Do not edit already applied056. Historical SQL/templates remain provenance; operational enable templates must subsequently select modern transport.

Other unfinished implementation steps: replace legacy operational configuration inputs (request wrappers now support modern transport, historical private files intentionally not rewritten), final modern-only usage audit, fresh committed-HEAD Preview deployment, complete authenticated browser/staff smoke. Do not claim readiness for legacy disablement before these pass.

## Frontend/artifact

Existing frontend already accepts publishable keys. New isolated build script explicitly overrides root Production URL/key with staging public config and reuses boolean flags of the hash-verified prior staging artifact. No root dist reused or overwritten. Isolated build PASS; entire output scanned for Production ref/secret, none found. Expected staging core flags preserved, including Google/AGE/RIGHTS/moderation/onboarding/ORA/Spot/profile-auth/board; Notifications UI flag true but server delivery remains OFF. No new collection flag enabled.

**No Preview deployed**: stopped at the additional SQL scope gate. Local candidate is not evidence of a deployment of the final commit. Rebuild from the committed staging SHA before later deployment, retain manifest/hash evidence, keep target Preview and Production aliases untouched.

## Validation

- Initial targeted PHOTO/staff/Retention/056:136/136PASS.
- First full run:825/833PASS,8fail: six deletion VM tests needed the new imported selector injected, two inventory expectations needed migration/table count updates. No assertion weakened; same security tests rechecked. These are migration-related harness changes, not runtime bypasses.
- Corrected targeted set:19/19PASS. Final full suite:834/834PASS,0fail/skip/cancel (159.3s).
- Typecheck PASS. Isolated staging build PASS. No rerun-until-green: changes and causes above explicit.

## Rollback

Keep legacy keys, legacy Vault entries and pre-change Git sources. Re-deploy previous Edge sources/config to staging only if required. Restore the previous Retention command for this job from the parent commit while preserving schedule and OFF states elsewhere. Revert the two SQL helper definitions via reviewed CREATE OR REPLACE scripts from pre056 sources; binding can remain unused, no destructive DROP required. No product data rollback, Auth logout/MFA change or signing-key operation needed. Rollback documented, not executed.

Commit/push and clean-tree result are reported in the final handoff. STOP: no legacy disablement, JWT retirement, checkpoint v3 or Production work.
