# SPOTTED Share — staging contract

Scope: share user posts/comments and QoD user answers/comments. Official Soma system questions are excluded. No public content feed, author identity, content preview, auto-join, referral attribution, new TTL or social/romantic semantics.

## Server authority and migration 048

`spot_private.spotted_share_refs(token,post_id,comment_id)` has RLS and no anon/authenticated/service-role table grants. Two independent UUID-v4 values form a 64-hex opaque reference (244 random bits); neither author nor content/Tribe UUID is encoded. One reference per post or comment is reused across callers/retries, with a global existing board lock for concurrent creation. No sender, click count, timestamp or tracking row is added. References are not authorization credentials.

`spotted_share(content_id,content_kind)` requires normal authenticated caller, existing SPOTTED readiness and live content visibility/membership. It creates at most one row per content; it uses existing technical anti-spam protection. No ordinary quota, board receipt, like, Spot, Match or request mutation.

`spotted_resolve_share(reference)` is authenticated-only. Malformed, unknown, nonmember, removed, expired, hidden or otherwise unauthorized content yields exactly `{available:false}`. It uses existing `spotted_post_visible` / `spotted_comment_visible`, including parent/QoD availability, member eligibility, sanctions and expiry. Match/profile/dating compatibility never grants social access. Successful response: `{available:true,place,post,comment}` with existing anonymous projections; `place` is returned only after authorization. No new profile authorization.

Links persist subject to live authorization, with no invented TTL. Foreign keys cascade removal on physical content purge/account deletion. Soft-deleted/expired/held content may retain its reference while the existing product row exists, but cannot be resolved. Reference rows add no creator/user history. Safety holds cannot make a removed post publicly available. Rights export continues to expose users' own underlying content; the shared reference is content-level technical routing data, not a sender relationship. Physical content retention/professional review remains separately pending as already documented, especially QoD.

## Routing and pending context

Canonical link: `https://<current-app-origin>/?s=<opaque-reference>`. No author, user, Tribe, content UUID, tracking parameter or content body. Root query routing works with current Vercel and network-first navigation worker. Public HTML/metadata stays the existing generic Soma page, never server-rendered UGC. The token can appear in ordinary infrastructure URL logs; it confers no access and is not used for analytics. Provider log minimization remains governed by the existing pre-pilot provider/retention work.

The query retains the intent through reload. `authRedirect` allowlists only valid share intent (or normalized invalid intent) alongside separately preserved QR context, never copies arbitrary queries, credentials or fragments. Supabase consumes its normal callback/session. No new localStorage content/token store. AGE, consent/minimum-profile/photo and required pilot Tribe choice stay ahead of resolution. A zero-Tribe user cannot reuse an existing ORA session to skip Share's Tribe requirement. No join is performed by the resolver/router; only normal explicit Membership Engine interaction changes membership. QR semantics remain separate and QR ingress keeps its existing priority.

After eligibility/onboarding, route to SPOTTED and resolve live. A nonmember gets the neutral “Questo contenuto non è più disponibile.” without linked Tribe identity/text. Zero-Tribe users first choose a Tribe normally, then are rechecked. No silent linked-Tribe selection or join.

## UI and native sharing

Small existing-style outline share icon + “Condividi” in the tertiary action row. Existing cards, likes/comments/romantic controls and navigation unchanged. Native share data is only `{title:'Soma — SPOTTED',url}`; no content text. Unsupported browsers use clipboard; when unavailable, a readonly selectable link is offered. User cancellation does not copy. The first explicit share tap obtains the stable reference; if a slow server reply consumes browser activation, a prepared retry tap invokes native sharing without another RPC. Real OS-sheet/device behavior remains physical-device QA, independently of SDK unit tests.

Authorized comment opens its parent thread and highlights/focuses the target, including a target beyond the first comment page. Existing paging is preserved. Refresh re-resolves shared authorization, including target removal. Pause/account changes clear target bodies. Neutral unavailable/error states reveal no removal reason or hidden author details. The URL preserves only the opaque target for a later reload; it never caches protected content.

## Compatibility / operational pause

Only additive 048 and new RPCs; no change to existing RLS/RPC definitions, PHOTOs, ORA, DD, Membership, social or romantic rules. Staging guard requires environment staging and validates project ref where available. No scheduler activated. Frontend rollback to prior staging code leaves private mapping inert; do not destructively roll back product tables. Revoke the two new RPC grants if Share must be disabled separately, after operational authorization; no such pause is performed by this task.
