# Profile / Photo Authorization v2 — staging contract

Scope: branch `codex/soma-schema-v2-staging`; staging `zjinjtkekmaqtxsuyvho` only. Baseline `2b5490f55820635358be0b83fd60d61f74165560`. Product source of truth remains unchanged. No DD allocation, requests, retention activation or PHOTO processing/lifecycle change.

## API / RLS changes announced before application

Migration 036 closes the same-Tribe authorization branch. `authorized_profile(target_user)` is a minimal server-authorized projection (id, name, age, gender, occupation, opaque versioned photo references). Own `profiles` SELECT/INSERT/UPDATE remains self-only and unchanged. Legacy location directory RPCs are retired, both EXECUTE and definer bodies; `visible_profiles` is empty and revoked. Current ORA and Match projections preserve their types, but replace physical paths with opaque versioned references and omit embedded photo previews. `my_matches` delegates to the protected paged projection.

Current legitimate callers: `backend.getProfile/saveProfile` own table; `ora.people` current ORA; `backend.matchesPage/matchById/matchWith` Match; `live-social.openDetail` rechecks `authorized_profile` before opening; `backend.photoUrls/photoUrl` uses new `profile-photo` signer under staging-only flag. Legacy `locationPeople/Page/peopleHere/prefetchTribe` are unreachable in current pilot DD-placeholder flow and intentionally denied server-side. Other old Previews are fail-closed for those retired readers and direct Storage signing. The new Preview is required for photos after cutover.

`profile-photo` validates the bearer with Auth getUser, derives viewer id, accepts at most 48 opaque refs/8 KiB body, and invokes service-only `resolve_authorized_photos`. No service key reaches browser. Normal roles cannot execute resolver or assert viewer. Resolver checks the actual live graph and lifecycle-ready/current predicate, current canonical version, and object existence. Own ready drafts/raw paths remain allowed for onboarding/editing; raw paths of other users never resolve.

Storage bucket stays private. Storage SELECT policy becomes false for authenticated users, including owners, preventing direct reads/listing and client-minted arbitrarily long signed URLs. Processing/deletion use their unchanged service-owned paths. All rendering, including own photos, uses the signer. This is authorization tightening, not a change to publication/purge semantics.

## Graph

SELF remains independent of dating consent. Other access requires both existing eligible non-deleting/non-suspended/non-banned ordinary accounts, no block either direction, and OR of:

- shared live ORA same server Place, both unexpired, existing compatibility rules; no Tribe requirement;
- current ready DD pair exposure, active policy/window/catalog and exact live membership identities, consent/compatibility. Disabled DD flag denies even if stale rows exist;
- valid existing Match through existing `can_use_match`, without requiring active dating consent or membership/presence;
- future directional request seam `(viewer,target)`, currently always false. No request table/business logic/fake rows. Future implementation MUST grant recipient→sender only and undergo separate review/tests.

Same Tribe, Board participation, UUID, pending Spot and historical presence grant nothing. Block overrides Match. `photo01_can_view_photo` is consolidated onto this graph; PHOTO02's ready/current wrapper stays intact.

## URL / cache tradeoff

Server signs for **30 seconds**, not a client-supplied duration. Signer JSON has `Cache-Control: no-store`; frontend URL reuse is 20 seconds. Opaque references include a non-reversible version fingerprint of the random canonical path so replacement cannot reuse another photo's decoded cache. New protected-reference decoded cache entries expire on lookup after 20 seconds. Already displayed/downloaded pixels cannot be recalled, nor can screenshots be prevented.

Signed URLs are bearer references during their remaining lifetime. Auth loss stops new minting immediately at the backend; a previously minted reference may remain usable for its short TTL and Storage HTTP/CDN cache. PHOTO02 object cache remains 60 seconds; do not claim zero-latency revocation of already delivered bytes. Pre-migration arbitrary-duration signed tokens cannot be inventoried/revoked by RLS alone; no signing-key rotation/object renaming is authorized in this task. Record this inherited limitation separately from the enforced bound on newly minted references.

Official references: [Storage signed URLs](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl), [Smart CDN token expiry and cache independence](https://supabase.com/docs/guides/storage/cdn/smart-cdn).

## Legacy and non-dating surfaces

- `profiles` REST: retained self-only RLS, no broad other-user SELECT.
- `visible_profiles`: retired empty/revoked.
- `location_people`, `location_people_page`, `location_people_photos_page`: retired/revoked and raising `PROFILE_READER_RETIRED` even through definer callers.
- `ora_people_page`: migrated, live-only minimal refs, no private preference/precise timestamps.
- `my_matches`, `my_matches_page`, `my_matches_photos_page`: migrated; valid Match only, no physical paths.
- `photo_asset_status`: authenticated access retired; retained service-only for existing internal callers.
- `can_view_photo`/`photo01_can_view_photo`: migrated authorization dependency; lifecycle check preserved.
- `pending_photo_assets/normalization`, publication/upload/cleanup helpers and legacy processing aliases: service-only retained; no new grants.
- `my_rights_page` and its prior implementation aliases: own export retained, private aliases remain revoked; own path metadata intentionally included in RIGHTS.
- Board feed: unchanged anonymous publication without author identity. Board report author resolution remains scoped MFA/RBAC/claimed-case, never a general dating-profile permission.
- Moderation list/case tools: retained separately with role/MFA authorization; not ordinary dating readers.
- Public Storage route: private bucket denies. Authenticated object route/list/sign: denied by SELECT policy. New bounded signer is only ordinary-user minting path.
- Old `send_spot/express_interest` and prior aliases remain retired by 034; pending v2 intent is never read as permission.

## Performance / rollout

Point target lookup via profile PK; live checks use checkins(user_id) and venue index; Match uses existing pair uniqueness/user_a,user_b indexes; DD uses window/user_a and window/user_b indexes plus membership identity key. No new index without evidence. Sign references in one batch, not one client request per card. No client filtering of unauthorized profile rows. Resolver cost is bounded to 48 refs, each a point check.

Safe staging order: verify baseline/grants → deploy bounded signer (inert before RPC) → apply 036 atomically → Preview flag ON → real synthetic smoke → cleanup/integrity. Do not reopen Storage signing as a rollback: pause affected rendering and deploy compatible signer/client fixes. Transaction failure leaves old schema intact. No main/Production changes.
