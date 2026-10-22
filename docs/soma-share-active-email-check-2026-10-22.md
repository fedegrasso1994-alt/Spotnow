# Share email Auth — active-content final check

**SPOTTED SHARE FINAL GATE: BLOCKED**

Initial email login and reading the active synthetic post succeeded. The later manual reload/navigation/logout result is inconclusive: the founder reported that content disappeared/reappeared and supplied the neutral unavailable screenshot, but could not distinguish whether it appeared before or after logout. That screenshot alone cannot establish a defect, or a complete successful logout/cache test. No patch was made.

## Baseline and scope

- Staging branch `codex/soma-schema-v2-staging`, baseline `1d1fb528ada3390bcfe93f7a73f15326b6a543cb`.
- Exact Preview: https://spot-2rhspdi2y-fedegrasso1994-1482.vercel.app/
- Unchanged runtime SHA `e8a399d72bcc1da86ebc513e3134670a5fa5e2d7`; staging ref `zjinjtkekmaqtxsuyvho`.
- No migration, runtime/backend/style change, deploy, Auth setting, service-worker change or protection bypass. Main and Production untouched.
- Read `AGENTS.md` and `SOMA_PRODUCT_UX_SOURCE_OF_TRUTH.md` before the task.

## Minimal fixture

Exactly one new synthetic Auth identity in namespace `fea47400`, one isolated Tribe, one canonical synthetic profile photo, one ordinary synthetic SPOTTED post and one opaque content-level reference. The founder explicitly approved a separate Gmail plus-alias receiving into their mailbox; the existing Soma account was not reused or modified.

The confirmed synthetic identity was seeded with a generated temporary password; normal Auth JWTs then completed AGE, consent, real canonical PHOTO processing, Membership Engine join and onboarding. The ordinary post and reference were created through the existing authenticated RPCs. No server/admin key, alternate resolver, manual membership bypass or policy change.

The post was created **08:18:08 Europe/Rome, 2026-10-22**, with ordinary 24-hour expiry **08:18:08, 2026-10-23**. It was retained throughout the manual test and investigation. Cleanup started only after the founder had attempted the requested sequence, reported the screenshot, and confirmed the reference/account context.

## Results A–G

| Item | Result | Evidence / limit |
| --- | --- | --- |
| A. Active-content email Auth | PASS initial real/manual flow | One email request, `/otp` HTTP 200 at 08:19:05; real `/verify` HTTP 303 at 08:20:04. Founder confirmed being inside and seeing the exact synthetic post. No password/JWT callback substituted for email. |
| B. Pending deep link | PASS manual | Founder confirmed the exact new opaque reference in the address bar. No author/account/Tribe IDs encoded in the 64-hex reference. |
| C. Authorized resolution | PASS initial/manual + server | Founder saw the post and confirmed profile name `SYNTHETIC SHARE EMAIL`. Before cleanup, a normal-JWT RPC independently returned `available:true`, the exact post ID and expected synthetic text. SQL also confirmed active post, membership and reference. |
| D. Reload / navigate away-back | INCONCLUSIVE | Founder reported disappearance/reappearance and unavailable fallback. They could not identify whether fallback preceded or followed logout. There is no captured failing request or exact principal at the failing instant. |
| E. Logout / reload / fresh tab | PARTIAL, not gate PASS | Founder no longer saw the synthetic profile in the new tab; supplied fallback contains no protected body. The complete ordered sequence was not established. |
| F. False offline | Not reproduced/reported here | Screenshot shows `Questo contenuto non è più disponibile.`, not `Sei offline`. This does not close every previously intermittent transport failure. |
| G. Cache/privacy | Source/tests PASS; live sequence incomplete | Unchanged worker caches only `/offline.html`; no API/Auth/UGC cache. Existing suite includes five passing PWA tests. No runtime cache-store/BFCache inspection or complete live post-logout privacy PASS is claimed. |

## Runtime evidence and ambiguity

The actual email-authenticated session was not visible in the controlled IAB tab, which still displayed the email form. Browser inventory identified Chrome/Safari running. Attempting native Chrome inspection reported pending Accessibility/Screen Recording permissions. The founder was offered a manual sequence instead; no operating-system permission or security setting was changed by the agent.

Founder observations:

1. Confirmed the exact active synthetic post after opening the email.
2. Reported that it sometimes disappeared/reappeared, and that after re-entering Soma they saw the unavailable fallback.
3. Supplied screenshot dated 08:26:38.
4. Confirmed the correct Share reference and that the profile had been `SYNTHETIC SHARE EMAIL` before the new tab.
5. When explicitly asked whether fallback occurred before logout or only afterward, answered that they could not distinguish the moment.

The SQL active-state snapshot contains zero fixture sessions; it may follow the requested logout and **does not prove** that the earlier email authenticated a wrong account. The post remained active and its normal authenticated resolver succeeded before cleanup. Deleted content, expiry and removed membership were not the explanation at that point.

Classification: **unresolved manual sequence/session observation**, not a proven backend or service-worker defect. Do not silently patch or infer a specific race from this evidence. A future reproduction must record the ordered pre-logout reload and its resolver response/principal before claiming a root cause. Do not substitute the safe post-logout fallback for success reading active authorized content.

## H. Cleanup

After recording the failed/inconclusive manual result, the sole synthetic account was deleted through normal delete-account/PHOTO lifecycle. A guarded scoped query then removed the empty synthetic catalog/venue container. No existing staging account/content was changed.

Postcheck (`docs/evidence/spotted-share-active-email/postflight.json`):

- Baseline restored: **4 accounts, 4 profiles, 42 Storage objects, 1 existing post, 1 existing comment**.
- Existing profile and post hashes unchanged: `ad4067f19890f61846176521b32aaf92`, `6d8805370e3731f4150e414675d4ec2c`.
- Fixture Auth/profile/session/membership/posts/comments/likes/reports/requests/Match/chat/validated-photo/Storage rows zero; all Share refs zero; missing current photos zero.
- One concluded PHOTO technical receipt remains under the existing seven-day lifecycle: `purged`, `settled`, reserved quota zero. No manual receipt purge or PHOTO change.
- Pre-existing old Storage review objects untouched; no blanket zero-orphan assertion.
- Discovery OFF, jobs paused, cleanup OFF, scheduler OFF, retention paused; PHOTO OPEN unchanged. Confirm email/Auth configuration unchanged.
- Temporary fixture credentials, seed, state and diagnostic scripts removed. No mailbox contents, email links, JWTs or secrets persisted in evidence.

## I–L. Checks and delivery

- Full suite **672/672 PASS**, zero failures/skips.
- Staging-configured build PASS; typecheck PASS.
- Changed only this report and `docs/evidence/spotted-share-active-email/`; no runtime commit/deploy needed.
- Evidence is committed/pushed to the staging branch; final commit SHA and clean working-tree/remote status are returned at delivery. Main remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.

Screenshots distinguish founder-provided UI evidence from server-console evidence. They do not represent an automated browser reproduction. No analytics, notifications or subsequent product work started.

**SPOTTED SHARE FINAL GATE: BLOCKED**
