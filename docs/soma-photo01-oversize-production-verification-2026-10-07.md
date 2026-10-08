# PHOTO-01 — 8 MiB + 1 byte production verification

Date: 2026-10-07. Scope: production oversize behavior only. No limit changes, raw acceptance workaround, migration, PHOTO-02, legacy normalization, provider or frontend deployment.

## A. Cause: confirmed facts and limits of attribution

The application **does enforce 8,388,608 bytes**. Direct synthetic requests with 8,388,609 bytes reached production `photo-assets`. Temporary nonce-allowlisted diagnostics recorded, in correlation with the request:

- `received`;
- `read_start`: `declared:"8388609"`, `max:8388608`;
- `read_reject`: `code:"SIZE"`, `status:413`;
- `response_created`: `status:413`.

This locates rejection exactly in `readPhotoBody`, before SHA computation, `begin_photo_upload`, any decoder invocation or any Storage write. With an oversized declared length it rejects before allocating the bounded body buffer. Without a trusted length the existing bounded reader independently checks actual streamed bytes; the unit tests cover this branch. The wire-chunked production request was surfaced by the relay to the application with a computed Content-Length of 8,388,609, so this production test does not claim to exercise a headerless application stream.

The log detail for the true wire-chunked test has `request_id=01a11792-fecf-7bc8-9b3f-e874dc305bb1`, exactly the `sb-request-id` on the client’s 503 response. It identifies `supabase-edge-runtime-1.77.0 (compatible with Deno v2.1.4)`, region `eu-central-2`, and application `SIZE / 413`. This provides provider-side correlation, not only matching timestamps or a synthetic nonce.

The remaining failure is **HTTP delivery after the application has created its rejection response**. This is in the Supabase runtime/relay HTTP path, not Vercel, browser size validation, image decoding or an observed OOM. Vercel hosts static assets; `createPhotoUpload` invokes `https://qlucwdjcjomwyziegxrn.supabase.co/functions/v1/photo-assets` directly. No verified upstream infrastructure “8 MiB body limit” was found; 8 MiB is the application limit.

The likely mechanism is returning early with an unread request body: [Supabase issue #39287](https://github.com/supabase/supabase/issues/39287) describes the same hangs/connection failures when an Edge response precedes request-body consumption. **This is a supported inference, not proof of the precise internal relay implementation or a provider-confirmed root cause.** Exposed logs cannot distinguish relay internals from the runtime response bridge. Do not describe a named Cloudflare/Kong cap or OOM as established.

## B. Client and server behavior

Payload was 8,388,609 synthetic bytes, not a real photo. The reader must reject its size before format/decode checks. One disposable synthetic account had a previously published PHOTO-01 JPEG and its three canonical assets.

| Transport | Observed client result | Application evidence |
|---|---|---|
| HTTPS, `Expect: 100-continue` | 100 Continue received; full body submitted; local idle timeout after approximately 61 s total | No definitive correlated diagnostics for this initial attempt |
| HTTPS, ordinary inferred/explicit Content-Length | Connection reset observed in initial attempt; diagnostic repeat returned **503**, empty body, **166.236 s** | Correlated **413 / SIZE** created by app |
| Initial “chunked” harness | Node inferred Content-Length; repeat returned empty **503**, 167.148 s | Correlated **413 / SIZE**; not a true headerless test |
| HTTPS, explicitly wire-chunked | Empty **503**, **216.867 s** total, including 56.503 s send time | Relay supplied Content-Length; correlated **413 / SIZE** |
| Normal app upload helper, 8 MiB + 1 byte | Immediate local rejection; no function request | Existing `File.size` check; targeted test proves zero backend calls |

503 response headers observed: `Content-Length: 0`, `Server: cloudflare`, `X-Served-By: base/server`, `sb-request-id` and `cf-ray` (exact values in evidence). No application JSON body was received on these oversized diagnostic calls. The intended app error body, verified by source and unit tests rather than on the wire, is `{code:"SIZE",error:"Usa una foto fino a 8 MiB."}`. Initial transport errors were ECONNRESET/EPIPE or local timeout, not application status codes.

[Supabase limits](https://supabase.com/docs/guides/functions/limits) document runtime memory and duration constraints; they do not establish a body cap responsible for this case. Do not equate an observed 503 or an elapsed time with proof of a specific documented timeout. Function invocation log UI had no data and warned of up to 24-hour refresh latency; correlated console diagnostics were available.

## C. Storage, tables and previous photo

Production snapshots inspected **all** rows for the synthetic UID in `photo_upload_jobs`, `photo_upload_accounts`, `validated_photos`, `photo_assets`, `photo_legacy`, the profile and Storage object metadata.

- Exact before/after snapshot equality following oversized attempts: **PASS**.
- Three pre-existing synthetic canonical objects, one ready job and one validation entry unchanged; no extra raw/partial file, failed job, lease, admission-counter change or inconsistent registry entry.
- Previous profile and photo-assets unchanged: **PASS**.
- After the valid retry, the only new job was the valid retry nonce, ready; exactly three new canonical objects and one validation entry. No oversized nonce appeared in jobs.
- After the final wire-chunked attempt, snapshot still exactly matched the post-valid-retry snapshot: **PASS**.

Final new valid upload/publication was followed by delete-account cleanup: Auth, profile and UID folder removed, private jobs/registry zero. Real profile/photo-reference fingerprint unchanged; global legacy-normalization jobs zero. No real photo bytes were read or transformed.

## D. Retry and worker health

First correlated valid JPEG retry: HTTP 200/ready, approximately **2.266 s**, with successful bounded read and `response_created:200` in diagnostics. Previous profile remained unchanged until explicit publication.

After all oversized attempts and restoring the original production function, a **fresh valid JPEG upload plus profile publication** succeeded in **3.475 s**. Exactly three more canonical objects were created; deletion then removed all nine synthetic objects. No persistent busy state, failed lease, OOM or worker-limit event was observed. This proves endpoint recovery and successful processing, not that every request ran on the same physical isolate or that arbitrary workloads can never OOM.

Temporary diagnostics logged only three synthetic nonce values and event/status/size fields; no credentials, image bytes, real user IDs or request headers. The original production `photo-assets` artifact was restored and its deployment confirmed. Existing auth verification and `normalizeLegacy:false` remained unchanged throughout.

## E. Minimum UX recommendation

No additional client size guard is necessary: it already exists and blocks `file.size > 8388608` before calling the backend. It is UX only; the server independently enforces the same ceiling. Never rely on MIME, extension or client checks as security authorization.

Optional copy-only improvement: show **“8 MiB”** instead of the current **“8 MB”** in the client validation message, consistently with the exact limit. Not implemented in this verification task. The current UI already displays an understandable immediate rejection; transport errors on forced requests display a safe “foto non salvata / precedente disponibile” message. No redesign, provider change or workaround to accept oversized bodies.

## F. Closure status

**The residual verification is closed as a documented fail-safe result**, not as a promise of deterministic HTTP 413 delivery for forced oversized requests. Actual production rejection, absence of writes, previous-photo preservation, client preventive guard, valid retry and recovery are verified. The Supabase response-delivery limitation remains a known operational constraint; the exact internal provider subcomponent has not been proven.

If “completely closed” requires deterministic HTTP 413 for every forced request, **no**: that acceptance criterion is not met by the current provider path. The normal app flow has deterministic preventive rejection. This task does not close the remaining legacy-photo privacy exposure; normalization remains separately authorized work and OFF. No PHOTO-02 work was performed.

Added tests in `tests/photo-upload.test.js`: exact 8 MiB / +1 client boundary and valid subsequent retry; server declared/streamed oversize rejection before jobs, worker calls or Storage. Final suite **187/187 PASS**, build PASS, typecheck PASS, whitespace diff check PASS. No committed runtime source file changed in this task. Evidence: `soma-photo01-oversize-production-evidence-2026-10-07.json`.
