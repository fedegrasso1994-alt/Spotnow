# Soma — PHOTO-01 production rollout, 2026-10-07

## A. Deploy outcome

PHOTO-01 is live at https://spot-now-alpha.vercel.app/. Production deployment `dpl_CBB5C8SDuxM92KxkthHHpUrZMcQN`, immutable URL https://spot-5syr8i7ok-fedegrasso1994-1482.vercel.app, promoted at approximately 19:31 CEST. Scope excludes PHOTO-02, retention, legacy normalization and unrelated feature changes.

Coordinated sequence: three internal format workers; exact migration 016 transaction; `photo-assets`; `delete-account`; prepared frontend promotion. All deploys completed. Existing photo references continued to work; new uploads could be temporarily unavailable between the database and frontend flip. No raw fallback was enabled.

The public HTML and its three directly referenced assets match the local build by SHA-256; manifest name remains Soma. Browser inspection confirmed the public landing screen. Full evidence: `soma-photo01-production-rollout-evidence-2026-10-07.json`.

Preflight compared staging/production: all 37 existing function definitions matched; pre-existing columns, RLS and private bucket settings matched. After deployment, all public/private function definitions and grants, policies, columns, RLS flags and bucket configuration match staging exactly. Auth configuration and gateway verification were preserved; synthetic end-user ES256 sessions successfully invoked the endpoint. No new provider, purchases or plan upgrades.

## B. Migration 016 — exact changes

Only `016_authoritative_photo_uploads.sql` was applied, in a committed transaction. SHA-256: `41dc5d3983d23027e9e5d231726098cec99daa6d3dc9927ea9a746e496169e22`. Production has no historical Supabase migration ledger: this was applied through the SQL editor, verified against the resulting schema, without inventing ledger entries for 001–015.

- Four private RLS tables: `photo_legacy` freezes current references only; `photo_upload_accounts` tracks admission; `photo_upload_jobs` tracks hashes, leases, retries and status; `validated_photos` records authoritative canonical validation and preview.
- Two profile triggers: reject unvalidated publication; attach server-generated variants and preview on successful profile publication.
- Three existing policies changed: `profiles_insert` and `profiles_update` additionally require server-validated or current frozen legacy references; `photos_insert_own` denies direct client uploads.
- Authenticated execution of `save_my_photo_preview(text,text)` revoked: client-generated preview is no longer authoritative.
- Four private helper/trigger functions and nine public service functions added. Public functions: `begin_photo_upload`, `fail_photo_upload`, `finish_photo_upload`, `publish_normalized_photo`, `pending_photo_normalization`, `photo_needs_normalization`, `photo_upload_lease_active`, `photo_deletion_barrier`, `photo_processing_authorized`. All are service-role-only. The private publication predicate alone is granted to authenticated for profile policy checks.
- Existing check-in, 90-minute filter, QR, discovery, Tribe, Spot, match and chat functions are unchanged. No legacy image bytes are rewritten by the migration.

The entry point now hardcodes `normalizeLegacy:false`. Current-owner legacy JSON compatibility returns the existing path without downloading/decoding its original; service backfill returns 409. This gate was added and tested before rollout to comply with the instruction not to normalize legacy photos.

## C. Verification

All production tests used two disposable synthetic accounts, synthetic images and an isolated temporary venue. No real photos, accounts or chats were used for smoke tests.

| Production smoke | Result |
|---|---|
| Valid JPEG, PNG and WebP | PASS: upload, profile publication, canonical/detail/thumb JPEG assets |
| Corrupt JPEG | PASS: 422 INVALID; current photo unchanged |
| Retry after error; same-file idempotent retry | PASS |
| Input exceeding side/pixel limits | PASS: 422 PIXELS |
| Actual binary request of 8 MiB + 1 byte | INCONCLUSIVE: SDK transport failure, then HTTPS 60-second timeout; no HTTP 413 observed |
| Existing photo replacement | PASS: new reference, original synthetic legacy object retained |
| Direct raw Storage upload | PASS: denied |
| Direct normalizer invocation by end user | PASS: denied |
| Service-role legacy backfill | PASS: disabled, 409 |
| Delete account | PASS for both accounts: Auth removed, profile removed, UID Storage folder empty |
| QR and 90-minute check-in / renewal | PASS |
| Ora and LOC-01 timestamp suppression | PASS |
| Tribe membership and existing offline discovery behavior | PASS |
| Expired synthetic peer | PASS: excluded from Ora, remains discoverable in Tribe |
| SEC-01 peer profile isolation | PASS |
| Private peer photo access | PASS |
| Spot, reciprocal match, chat send/read | PASS before and after deploy |

Final local suite: **185/185 tests pass**, build PASS, typecheck PASS, diff whitespace check PASS. The real production 8 MiB transport case remains unverified; unit/staging results do not substitute for this missing production HTTP observation. Smoke used real backend/frontend adapters and synthetic password-auth sessions, not physical phone camera or an interactive Google OAuth login. No claim that every physical device or all possible inputs have been tested.

Cleanup verified zero synthetic accounts, zero temporary venues and zero synthetic validation entries. The real profiles/photo-path fingerprint remained unchanged. Zero legacy-normalization jobs were observed. No user originals were normalized or removed.

## D. Errors and logs

Inspected upload and JPEG/PNG/WebP worker log views showed boot/shutdown events without observed OOM, uncaught exception or worker-limit messages. Intended 403/409/422 responses are expected rejection tests. Log inspection is bounded, not a guarantee that every platform event was seen.

The >8 MiB SDK attempt returned no HTTP status; a separate HTTPS attempt timed out at 60 seconds. Treat this as an unresolved transport verification, not a confirmed safe backend 413 and not proof of an OOM. No profile publication resulted from this case. The initial social harness assumed active users would appear in offline Tribe discovery; it was corrected to the existing server semantics, without app changes.

## E. Rollback

Conservative rollback was rehearsed on staging: deploy `.local/photo01-rollout/rollback-photo-assets.ts` as `photo-assets` to pause new uploads with a clear 503 message, while current references, profiles and Tribe remain usable. Restore the reviewed PHOTO-01 source to resume; all three formats passed after rehearsal. The artifact hash and rehearsal evidence are recorded in the evidence JSON.

Keep migration 016, validated assets, publication controls and deletion barrier. Do not reopen raw Storage uploads, drop 016, or restore only the old frontend/old photo endpoint. This rollback intentionally pauses new-photo onboarding instead of restoring the unsafe contract. The previous immutable frontend and old function sources are retained privately for diagnosis, not a safe standalone rollback recipe. [Vercel promotion documentation](https://vercel.com/docs/cli/promote) documents immutable deployment promotion.

## F. Residual risks and stop point

- Production >8 MiB HTTP rejection requires a repeat from a reliable upload connection. This specific check is still open; no blanket “all tests regular” conclusion.
- Legacy photos retain their pre-existing metadata/privacy exposure until separately authorized normalization. Their current references were preserved and the normalization gate remains OFF.
- Cached open clients must reload to use the new upload contract; no raw compatibility path is available.
- Memory caps constrain native WASM heaps, not every allocation in the isolate. Deadline/admission rejection can reject complex otherwise-valid files within the nominal ceilings. The corpus and production smoke showed no observed OOM, not a universal proof.
- Partial writes can leave private unpublished objects; cleanup/retention is deliberately deferred to PHOTO-02. Existing documented color-management/orientation limitations remain.
- Rollback pauses new uploads; it cannot undo already sanitized photo bytes or automatically restore old references.

Stop here. Do not normalize production legacy photos. First close or explicitly accept the outstanding transport verification, then request separate authorization for legacy normalization. No PHOTO-02 work has started.

### Follow-up: oversize verification completed

See `soma-photo01-oversize-production-verification-2026-10-07.md`. The former inconclusive transport test now has correlated production evidence: application rejection 413/SIZE, delivery-path empty 503/reset/timeout, no writes, existing photo preserved, valid retry and recovery. The fail-safe verification is complete; deterministic 413 delivery for forced requests remains a documented Supabase runtime/relay limitation, not a verified guarantee. No legacy normalization was enabled.
