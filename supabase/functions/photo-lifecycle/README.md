# PHOTO-02 lifecycle — staging implementation

Migration017 is additive to PHOTO-01. Production has NOT been deployed. Decoders,8MiB/8192px/JPEG12MP/PNG12MP/WebP6MP and native memory caps are unchanged.

Approved policy: replacement grace5min; unpublished ready24h; quota128MiB per owner including9MiB reservation+32k preview budget per pending attempt and conservative unknown Storage objects; max2 ready drafts; HTTP cacheControl60; concluded technical metadata7days. Unknown writers NEVER become purgeable just because time passes.

`photo-lifecycle` accepts POST only, existing service credential only, gateway JWT verification ON. `{dry_run:true}` is read-only; execute requires `{dry_run:false}`. Batch20 eligible sets and20 account tasks; diagnostics inventory100 noncurrent sets. Scheduler is staging-only pg_cron/pg_net with existing credential in Vault, no literal secret in source. Setup service RPC starts disabled; same RPC can pause. Use `supabase/staging/017_photo_lifecycle_scheduler.sql`; its project guard rejects production. Do not promote this staging setup blindly to production.

Every attempt has immutable path, owner, nonce, lease, manifest, byte reservation and writer state. Intent must persist before the three immutable upsert:false Storage requests; receipts are terminal only for success or definitive4xx, not network/5xx. Pre-intent decoder errors have explicit no-write receipt. A request timeout never purges unknown state.

Reconciliation:
- All three immutable effects can settle unknown only after each Storage object's bytes/length/SHA match the persisted manifest. SQL also requires catalog membership.
- No-write recovery requires protocol marker, no intent manifest, expired upload lease AND the SQL write-intent fence. This is not a timer-only heuristic.
- Partial uncertain writes stay pending. `reconcile_photo_writer(...,'TERMINAL_STORAGE_RESPONSES_CONFIRMED')` is operator/service-only and must be called ONLY with independent terminal receipts/provider evidence proving no future write. Never call it on the basis of object absence, lease expiry or a client abort alone. Preserve the incident evidence privately; no personal paths/keys in public logs.

Owner locks coordinate admission, publication, purge and account-delete start. Published current never claims purge. Retired/purging sets cannot republish; old client upserts still run through the trigger. Draft expiry signals a bounded one-time nonce restart in the existing upload adapter; no raw fallback. Storage mutations use Storage API only. Purge verifies API absence and SQL absence before registry/preview deletion. Collector leases use token fencing and recover from interruption. Errors become retries, then review after10 set failures; account tasks remain pending with error code and can resume without the user's JWT. Account deletion waits on unknown writers, recursively deletes the owner folder, preserves ordinary prepare/cascade rules and acknowledges success only after Auth/Storage verification. Photo remains mandatory: no standalone current-photo removal UX.

Canonical/detail/thumb Storage, both DB previews and per-attempt metadata are governed. HTTP/CDN/client pixels already delivered are not remotely recallable. Existing RAM photo cache remains bounded and clears on signout/owner change/block; service worker caches only offline.html. No new persistent client photo cache or original raw Storage. Unknown/untracked objects are anomalies, not timer-purge candidates. Missing records generate diagnosis, not account deletion or fabricated HD recovery. Never delete SQL storage.objects to remove real files.

Rollback rehearsal: pause cron with `photo02_staging_scheduler(false)`, stop execute calls, keep017/ledger/tombstones/publication checks and authoritative upload endpoint. New uploads and current photos remain available while cleanup is paused. Resume reviewed PHOTO-02 code and scheduler. Do not deploy PHOTO-01-only Edge code against017: it lacks intent/receipt and fails closed. Destructive down-migration is not the safe rollback.

Observability: PHOTO02 aggregate completed/reconciled/pending/failed/anomalies, bounded private task state/error codes/retries. No photo bytes/preview/token/email/signed URL in logs. Pending unknown and review require operational follow-up; logs alone are not a staffed alert channel or a guaranteed SLA. Production recommendation must account for this dependency.

Tests: tests/photo-lifecycle.test.js plus adjusted deletion/upload contract tests, real staging fault/race suite and report under docs. No guarantee of universal failure-free execution: every completed claim must have its database and Storage effects verified.
