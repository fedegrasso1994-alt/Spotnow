# PHOTO-01: authoritative private profile photos

Deploy only after migration 016. PHOTO-01 was rolled out to production on 2026-10-07 after staging verification; see `docs/soma-photo01-production-rollout-2026-10-07.md` for results and remaining verification limits. No external image provider is used.

## Input contract

All limits apply together: **8,388,608 bytes (8 MiB)**, **8192 px per side**.

| Format | Additional requirements | Pixels | Native memory |
|---|---|---:|---:|
| JPEG | RGB8 / three components; baseline or progressive; strict entropy/MCU validation | 12,000,000 | WASM hard maximum 96 MiB |
| PNG | static, 8-bit, non-interlaced; grayscale, RGB, indexed, gray+alpha, RGBA | 12,000,000 | streaming, two scanlines |
| WebP | static; exact RIFF length and consistent canvas/image dimensions | 6,000,000 | WASM hard maximum 64 MiB |

PNG 16-bit, animation, unsupported formats/coding, corrupt or inconsistent payloads are rejected. MIME/extension/header alone never authorizes publication. PNG CRCs and exact expanded row length are checked; JPEG Huffman/scan/restart/entropy checks precede native decode; native output geometry is checked again. WebP payload is validated by the capped native decoder after container checks.

Limits are admission ceilings, not a guarantee that every file under the ceilings is accepted. Deadline or memory-pressure rejection remains valid and safe. JPEG validation has a 600 ms budget, PNG streaming 900 ms, post-decode 1000 ms, total processing/encoding 1700 ms. The encoder checks its deadline per MCU row. These conservative guards leave headroom below the [Supabase Edge 2 s CPU and 256 MB memory limits](https://supabase.com/docs/guides/functions/limits). Wall time is not the same as CPU time. Native WASM cannot be preempted synchronously; preflight, hard linear-memory caps, bounded output and admission guards mitigate this limitation. No claim of a universal OOM impossibility is made.

## API and publication

New uploads: authenticated, non-anonymous `POST /functions/v1/photo-assets`, raw binary body, `Content-Type: application/octet-stream`, UUID `X-Photo-Request-Id`. The original is processed in memory and **never uploaded to Storage**. Browser-side preprocessing/variant generation is not authoritative and is no longer used in the live upload flow.

Successful response: `{ready:true, photo_path, preview}`. The returned flat `userId/randomUuid.jpg` is authorized by the server before a profile exists. Only then may the client save the profile. Registry, jobs and account locks are private, RLS enabled, no client grants. Direct authenticated Storage inserts and the old client preview-attestation RPC are denied. Three private objects are written with `upsert:false`: canonical `.jpg`, `.jpg.detail.jpg`, `.jpg.thumb.jpg`; registration follows all three successful writes. Partial writes cannot become profile photos.

Output: metadata-free JPEG, canonical/detail max side 1600, quality 85, max 4 MiB; thumbnail max 480, quality 78, max 1 MiB; inline preview max 120, quality 65, max 11,000 bytes / 16,000-character URI. Canonical/detail currently share identical sanitized bytes to preserve the existing readers. EXIF orientation is baked into JPEG pixels; EXIF/GPS/comments/ICC/source chunks are not copied. Alpha is composited onto white; resizing is proportional with bilinear sampling. No ICC color management is performed; wide-gamut colors can shift.

Each format has a dedicated service-only Edge worker, so a worker never retains both JPEG and WebP native heaps. Workers keep legacy JWT verification ON and additionally require the existing service credential or a service role verified through the service-only `photo_processing_authorized` RPC. End-user and anonymous credentials cannot invoke a normalizer. `photo-assets`/`delete-account` retain their existing gateway configuration and verify end-user sessions server-side with `auth.getUser`, including the project's signing algorithm. Never disable authentication to get a test working.

One active lease per account; technical limit 10 distinct upload jobs/hour; same immutable file/nonce/hash retries do not count again, max three attempts. Failed leases remain reserved for 45 seconds before retry, and deletion waits for processing/failed leases to quiesce. No cumulative 128 MiB quota, retention, orphan purge or PHOTO-02 work is included. SDK Storage calls have 15 s deadlines, normalizer calls 20 s. Failure preserves the previous published photo.

Errors: `{code,error}` with Italian messages (`SIZE`, `FORMAT`, `PIXELS`, `DEPTH`, `ANIMATED`, `INVALID`, `BUSY`, `RATE`, `TIME`, `MEMORY`, `UPLOAD`). Existing toast/error components display these safely; no redesign. A complex file may require the user to choose/export a smaller photo. A 4032×3024 photo exceeds the approved exact 12 MP ceiling.

## Legacy compatibility and deletion

Migration 016 freezes only current profile references as legacy exceptions. Existing photos remain readable and unchanged edits/upserts remain possible. The deployed entry point explicitly sets `normalizeLegacy:false`. Own-current JSON `{photo_path}` returns the existing reference without reading or decoding the original. `{backfill:true}` returns 409, including service-role requests. The separately implemented compare-and-swap normalization route remains disabled until explicit founder authorization and a separate deployment; it has not processed production legacy photos. Once replaced, a legacy reference cannot be restored or newly forged. Original legacy objects are retained: no purge/retention change.

All new objects remain flat in the user's folder. Account deletion uses the existing folder pagination/removal and auth cascade, with a photo-processing barrier added before removal. An interrupted Storage operation can leave private unpublished objects; their retention/purge belongs to PHOTO-02. The validation registry/leases/frozen exceptions cascade on auth-user deletion.

## Reproducible runtime artifacts

- ImageScript JPEG 1.3.0 reduced decoder, MIT: embedded upstream bytes verified by SHA-256 before deterministic memory-section capping to 96 MiB.
- jSquash WebP 1.5.0, Apache-2.0: packaged decoder bytes verified before the same capping to 64 MiB. This changes the WASM memory maximum, not decoder instructions.
- pako 2.2.0, MIT: `Inflate.onData` streams bounded chunks into scanlines; no full decoded source raster.
- jpeg-js 0.4.4, BSD-3-Clause: reproducible bounded encoder derivative with output/deadline guards. Source license retained.

Run `node scripts/build-photo-wasm.mjs --jpeg=/path/to/pinned/jpeg.wasm` and `node scripts/build-photo-jpeg-encoder.mjs`; hashes/provenance accompany generated modules. `node scripts/bundle-photo-edge.mjs` creates dashboard-compatible artifacts in `/tmp/soma-photo01-edge` from reviewed source, keeping pinned npm imports. `build-photo-staging-probe.mjs` produces a service-only, hardcoded staging-only, no-Storage reuse probe; **never deploy it to production**. It is not a product endpoint.

## Rollout

Stage verification precedes any production change. A production release must coordinate migration 016, all four photo functions, delete-account and the frontend. Cached clients using old raw uploads must refresh to the new client; retaining a raw fallback would reopen PHOTO-01. Do not roll back only the frontend or only the authority migration. Controlled legacy normalization must be verified before calling the production finding closed.
