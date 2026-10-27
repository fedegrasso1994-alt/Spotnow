# SOMA — staging JWT trust cutover review

**JWT TRUST CUTOVER: BLOCKED — preflight only. No signing/session mutation performed.**

Starting branch `codex/soma-schema-v2-staging`, HEAD `92056c1ef6ce5dc15799fe24fe3c943299dd3c9c`. Explicit target `zjinjtkekmaqtxsuyvho`. Production/main excluded. No checkpoint v3 work.

## Verified provider state

Authenticated GET Management API, values filtered to non-secret metadata before output:

| Signing key ID | Algorithm | Current status |
|---|---|---|
| `aa4434fd-5d0e-4423-a6d3-6cf894d0cf41` |HS256|previously_used|
| `9646939e-e6fa-4f78-b2e2-b39bfed5767a` |ES256|in_use|

`GET /v1/projects/zjinjtkekmaqtxsuyvho/api-keys/legacy` returned200, enabled:false. `GET /v1/projects/.../config/auth/signing-keys` returned200 and exactly the two rows above. No standby key currently exists. Existing ES256 signing does not mean its current JWTs will become invalid by revoking HS256 alone.

Read-only DB metadata:30 session rows,39 refresh-token rows (counts, not a claim that all are active); two active dedicated roles ADMIN/MODERATOR; two verified MFA factors, zero incomplete factors. Session children: `auth.refresh_tokens`, `auth.mfa_amr_claims`, `spot_private.staff_revoked_sessions`, all ON DELETE CASCADE. No row/token/factor-secret content exported.

PHOTO OPEN epoch12, cleanupOFF/schedulerOFF; DiscoveryOFF; notification deliveryOFF. No control changed. Prior completed modern-key and post-disablement reports remain the baseline, not new cutover evidence.

## Exact blocking precondition

The task requires provider-supported invalidation of **all existing staging session/refresh capabilities**, while token capture is limited to synthetic fixtures and accounts/MFA/product data must survive.

Verified supported logout path is per-user: `POST /auth/v1/logout?scope=global`, presented with that user's access JWT (SDK `auth.admin.signOut(jwt, 'global')`). “global” covers the user's sessions, not every user in the project. Staging `/auth/v1/health` returned200 and GoTrue `v2.197.0`; official matching-tag routes/logout implementation inspected expose this authenticated logout and no project-wide bulk logout route in that examined API. This is evidence about the inspected API, not proof that no hosted/provider procedure exists.

Signing-key rotation/revocation is not a substitute for removing refresh capability: surviving refresh tokens can obtain access tokens signed by the new key. Capturing every existing user's JWT/refresh token would violate synthetic-only scope. Deleting users, changing passwords/bans, fabricating JWTs, shortening session policy or adding an access-token hook are not acceptable substitutions here.

Direct `DELETE FROM auth.sessions` would cascade into the three tables above and erase security/session state irreversibly. Its FK behavior is understood, but **a supported hosted bulk procedure, operational race/drain requirements and full refresh-family behavior have not been established**. No SQL DELETE/UPDATE, new RPC, Auth hook or provider patch has been executed. Do not equate an existing DB owner capability with provider support.

**Minimum prerequisite before execution:** obtain/verify the Supabase-supported bulk invalidation procedure for this hosted staging project, including in-flight refresh handling and preservation of user/identity/MFA rows. If the provider proposes owner SQL, its exact transaction/cascade/locking/scope and restore implications must be reviewed explicitly before use. No user intervention is requested for login/MFA while this technical prerequisite is unresolved. No rotation is performed merely to discover this gap later.

## Proposed sequence — NOT executed

The entire sequence below remains conditional on closing that precondition. Existing task authorization permits staging maintenance/logout; it does not validate an unverified mechanism.

1. Recheck exact project, signing-key IDs/statuses, legacyOFF, modern consumers, role/factor/product fingerprints and PHOTO/cron states. Record a maintenance boundary and a provider-approved way to handle/drain in-flight refreshes. Do not rely on hiding the frontend to stop direct Auth requests.
2. Create a provider-generated standby ES256 key using `POST /v1/projects/{ref}/config/auth/signing-keys` with `{algorithm:'ES256'}`; no imported/extracted private key. Confirm published public kid and propagation before rotation. Observe provider rate-limit/retry-after instructions; no blind retries.
3. Prepare three isolated synthetic identities: USER, fixture ADMIN, fixture MODERATOR. Privileged fixture assignments must use the existing audited owner/role-management path; no roles copied to normal accounts. Existing dedicated staff/factors remain intact. Use normal Auth/TOTP enrollment for fixture factors only. Record old USER access+current refresh and old fixture ADMIN/MODERATOR AAL2 access/session capabilities privately. Prove each intended access is allowed before revocation, plus MODERATOR boundaries.
4. Hold fixture credentials only in protected memory or an explicitly temporary owner-only encrypted store, never HTTP logs/Git/report. Disable auto-refresh for proof clients. Keep only safe role/phase/result and non-secret alg/kid/expiry evidence. Ensure negative replay occurs before token expiry; an expired token is not revocation proof. No synthetic HS256 JWT minting or reading legacy signing secret.
5. Execute the verified bulk session/refresh invalidation as a distinct provider operation before switching issuance, with the approved drain/race controls. Establish a fixed cutoff: no old session may cross the boundary by refreshing into a new-key token. Verify authoritative old-session removal/revocation and fixture refresh denial. Do not assume success from HTTP status or session-count reduction alone.
6. Rotate standby into use using `PATCH /v1/projects/{ref}/config/auth/signing-keys/{new_id}` status `in_use`. Verify new fixture login issues the expected kid; rotation alone does not satisfy the negative proof. Revoke both prior trusted keys via PATCH status `revoked`, without permanent deletion. HS256 revocation is a separate action from current ES256 retirement and from legacy API-key disablement.
7. Confirm provider state and service behavior; account for JWKS caches in verifiers. Never declare cutover complete just because a public JWKS stopped listing a key. Probe old unexpired fixture JWTs using modern `apikey` plus old JWT in Authorization across PostgREST, protected Edge and private fixture Storage. Require explicit auth rejection, not empty data/RLS denial. Probe the saved refresh capability against `/auth/v1/token?grant_type=refresh_token`; require rejection and no minted session/token.
8. Fresh USER login; fresh dedicated ADMIN/MODERATOR human login/challenge with existing factors; real AAL2 allowed proof and MODERATOR analytics/ops/role-management denial. Group these two human checks into one checklist after technical readiness. No MFA reset or recovery bypass.
9. Modern-consumer regression: exact Preview/Google/callback/reload; protected Edge; real synthetic PHOTO upload/canonicalization/ownership/delete; private Storage and modern/default-CLI recovery copy with checksum; notification proof/dispatch authorization with deliveryOFF; observability auth/OFF behavior; Phase A dry-run/auth and unchanged03UTC schedule. Preserve prior technical-receipt lifecycle. Cleanup synthetic identities, role rows and bytes through normal engines, then verify baseline integrity.
10. Run targeted/new cutover, stale-session, staff and modern-key tests; full suite/build/typecheck. Publish only safe evidence and report. STOP before checkpoint v3.

## Distinct provider controls and rollback

Supabase's signing-key lifecycle supports standby→in_use, previous key→revoked; moving a revoked key back to standby restores trust. Rotation keeps old signatures accepted until revocation. Re-trusting an old key may revive unexpired old JWTs, so it is **not** an acceptable silent recovery for this security objective. Permanent key deletion is not proposed. [Signing-key lifecycle](https://supabase.com/docs/guides/auth/signing-keys), [Management PATCH](https://supabase.com/docs/reference/api/v1-update-project-signing-key).

Session invalidation is separately non-restorable as an operational session: recovery is fresh login, never re-importing old sessions/refresh secrets. Roles/user data/MFA enrollment must be fingerprint-preserved. Fresh AAL2 failure means pause privileged operations and investigate provider/current-key/session/factor state using Management access; no role broadening, TOTP reset, old-session restoration or legacy-key re-enable. Any proposed old-trust restoration needs a separate explicit decision acknowledging token revival.

Modern API keys are independent of signing keys, but service continuity is verified rather than assumed. No modern secret rotation or Vault/cron rewrite is required by the proposed design. [API-key distinction](https://supabase.com/docs/guides/getting-started/api-keys).

JWKS delivery and client caches can delay custom verifier convergence. Supabase documents10-minute layers and20-minute considerations; these are not a universal success deadline. Existing nine JWT-verifying Edge configurations require explicit compatibility checks; do not disable their gateway protection blindly. Current ES256 product smoke is useful baseline evidence, not proof for a new kid. [JWT verification and cache guidance](https://supabase.com/docs/guides/auth/jwts).

## Maintenance impact

All staging users may need to log in again; staging interruption is acceptable under the task. No Production impact is authorized. Temporary signed-photo URLs may also be affected by trust transitions; do not rewrite PHOTO bytes, canonical paths or lifecycle rules to compensate. Roles and MFA factors must survive; only operational session/refresh capability is invalidated through the verified procedure. No maintenance window has been started in this task.

## A–Q outcome

- A procedure: proposed above, blocked on supported bulk invalidation/drain contract.
- B provider mutations: **none**. Only authenticated GET metadata and read-only DB counts/FKs.
- C/D/E/F old USER/access/refresh/ADMIN/MODERATOR negatives: **NOT RUN**. No fixture token capture, role grant or session creation yet, avoiding residual credentials/accounts while preconditions are unresolved.
- G/H/I fresh USER/ADMIN/MODERATOR after cutover: **NOT RUN**, because no cutover occurred. Prior post-disablement AAL2 proof remains valid only for its own gate.
- J modern-consumer regression: previous completed report remains baseline; no live mutation/canary repeated here.
- K rollback: not required/executed; unsafe old-session/trust restoration explicitly excluded above.
- L/M full regression838/838PASS once, zero skip/cancel/fail; existing staff/MFA/stale-session/modern-key targeted38/38PASS once. Isolated staging buildPASS (no deploy), typecheckPASS. No new live cryptographic cutover test was run or claimed; these local regressions do not prove hosted old-JWT/refresh invalidation.
- N only this report and safe metadata evidence; no schema/runtime/Auth config change, migration, signing key or checkpoint v3 change.
- O/P/Q Git SHA/push/clean-tree status in final handoff.

Primary logout/session references: [Sessions](https://supabase.com/docs/guides/auth/sessions), [Auth v2.197.0 logout source](https://github.com/supabase/auth/blob/v2.197.0/internal/api/logout.go), [Auth v2.197.0 route registration](https://github.com/supabase/auth/blob/v2.197.0/internal/api/api.go). The public health endpoint identifies that version; a matching public tag still does not independently prove every hosted provider patch or control-plane capability.
