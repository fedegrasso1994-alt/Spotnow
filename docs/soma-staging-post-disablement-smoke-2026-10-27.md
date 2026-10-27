# SOMA — staging post-disablement smoke

Branch `codex/soma-schema-v2-staging`, starting HEAD `a31ae63ec7a52eaf6e52845ec590f0200be04058`. Staging only `zjinjtkekmaqtxsuyvho`. No deployment, runtime/schema/policy change or JWT trust cutover.

## Enforcement

The preceding read-only diagnosis confirmed Management API `enabled:false` and explicit gateway “Legacy API keys are disabled”. Provider error timestamp:2026-10-27T16:18:44.269907Z. This task ran one new post-disablement probe after that diagnosis: legacy anon401, legacy service_role401, publishable200 on Auth settings; modern secret200 on privacy dispatcher dry-run. Historical immediate post-toggle failure is preserved in the prior report/evidence and was not silently replaced with a success. No retry loop or re-enable action.

## Live smoke matrix

| Check | Result / evidence |
|---|---|
| Exact Preview | https://spot-n6zjiy9qz-fedegrasso1994-1482.vercel.app/ ; existing runtime `ccb9d473406d71651c160bbdf73cc3762f73ccf4`, deployment `dpl_8UUYJyycJgV6bqjBnEBT4yF5dXrb`; no new deploy |
| Existing browser session after disablement |Authenticated reload PASS; same staging shell|
| Google OAuth |Initiated a new request through staging `/auth/v1/authorize?provider=google` with exact Preview redirect. Existing Google SSO completed callback to that Preview; rendered authenticated shell. No sign-out/session revocation; no Google Cloud config change. This is real provider flow, not a mock; did not repeat app login-button interaction because session already existed.|
| Reload / sections |Reload continuity PASS. TRIBE expected Discovery-OFF state; SPOTTED empty feed/composer; ORA three-Place selector without starting presence; MATCH empty state; Profilo rendered. No product write through browser.|
| Real synthetic Auth / user JWT |Two distinct synthetic accounts created privately; password login with modern publishable; A refreshed its own session successfully, retaining owner access. No global session revocation.|
| AGE / consent |A completed adult declaration and versioned consent challenge/accept before profile/photo. No Auth global-config change.|
| PostgREST owner / other user |A profile insert/read allowed; unrelated B cannot read A's row (error or empty filtered result accepted as no exposure).|
| PHOTO real upload / process |Strict valid fixture prevalidation; upload via user JWT + publishable; ready canonical photo under A ownership; owner profile and signed-photo resolver PASS. No decoder/lease/admission change.|
| PHOTO ownership |B photo resolver returns no signed photo for A. B private Storage download denied. Public object URL does not expose private bytes.|
| Normal account delete |A delete-account engine PASS; Auth/profile/Storage removed. B delete-account engine PASS even without product profile. No forced DB/Storage cleanup.|
| Storage CLI explicit modern |Canonical fixture copied with modern key override; SHA256 equals modern SDK download.|
| Recovery/checkpoint Storage access |Repeated copy of same synthetic bytes with ambient override removed, matching capture-staging's CLI selection; current CLI2.121.0 picks modern service key from provider metadata; SHA256 matches. No actual checkpoint or restore run, no change to checkpoint contract. Both plaintext fixture copies removed locally.|
| Protected Edge |Normalizer rejects missing/malformed/publishable server credentials; modern secret200. PHOTO lifecycle dry-run200. No execute/cleanup activation.|
| Retention Phase A |Modern server dry-run200 with bounded batch/max-batches; no-server credentials401/403. Dispatcher dry-run200; privacy job remainsOFF.|
| Notifications |Invalid synthetic device proof→200 available:false with configured origin; dispatch/prune without dedicated dispatch secret→401 even with modern API key. Real deliveryOFF, no new real subscription or push sent.|
| Observability collector/auth |Missing/publishable server recorder denied401; valid modern server→200 false, consistent with collectionOFF/test-only. No event inserted or collection activation. This proves auth/reachability/OFF behavior, not an enabled collector storage canary.|
| Fresh ADMIN / MODERATOR AAL2 |PASS. Human custodian completed fresh login/challenge using existing factors. Recorded ADMIN allowed2026-10-27T17:27:44.288Z, MODERATOR allowed17:28:35.839Z. Both AAL1 phases denied. ADMIN approved dashboard/ops/moderation read surfaces allowed; MODERATOR moderation allowed, analytics/ops/role management denied. ADMIN normal logout/stale check also PASS, initiated by the custodian. No operator role/factor change or global session-revocation action. Safe enum/boolean evidence: fresh-staff.json.|

## Final data/control integrity

Two temporary Auth fixtures deleted normally. Live DB counts for their Auth/profile/age/consent/Storage records allzero. Profile fingerprint `ad4067f19890f61846176521b32aaf92`, Storage fingerprint `128acb8f9ce4913cb47119e75d8b72e0`, identical to preflight. Existing staging profile/Storage data preserved. Only approved minimized seven-day PHOTO technical receipts may remain under existing lifecycle; this is not a claim of immediate zero technical metadata. No new membership/Spot/chat content created.

PHOTO OPEN epoch12; cleanupOFF/schedulerOFF. DiscoveryOFF. Notifications enabledOFF/deliveryOFF. Observability collectionOFF/test-only. Phase A ON unchanged `0 3 * * *`; privacy and both PHOTO cron jobsOFF. No key re-enable, signing-key change, MFA change or role mutation. Main and Production unchanged in this task.

## Verification

Full suite838/838PASS once; targeted key/056/057/staff/MFA/provisioning38/38PASS once. No skip/cancel/failure or rerun-until-green. BuildPASS using isolated staging artifact (no deploy, scan zero Production ref/secret); typecheckPASS. Verification-tool additions only in `scripts/staging-key-product-smoke.mjs`, adding negative ownership/RLS, refresh, default recovery-CLI copy and removal of local photo bytes. No product runtime edits. Safe status-only evidence under `docs/evidence/post-disablement/`; passwords/JWT/signed URLs/secret values not persisted there or printed.

Fresh post-disablement staff evidence is complete and independently checked against the local canary file, alongside the custodian's confirmation. No remaining blocker in this task. This closes post-disablement smoke only, not JWT trust cutover or general pilot operational readiness. Discovery/delivery/collection remainOFF; enabled observability ingestion and real push delivery are not claimed by these OFF-path checks.

Final gate: **LEGACY KEYS: DISABLED IN STAGING — GO FOR JWT TRUST CUTOVER REVIEW**.

Commit/push and clean working-tree SHA are reported in the handoff. No additional deployment is needed: all changes here are verification tooling and evidence; Preview runtime stays atccb9d47. STOP before JWT signing-trust changes.
