# SPOTTED Share — final Auth / reload verification

Verification performed 2026-10-21 Europe/Rome; cleanup verification and report completed 2026-10-22.

**SPOTTED SHARE FINAL GATE: BLOCKED**

This is an evidence gap, not a newly established Share/backend defect. Real Google login, real email verification, server authorization, and the exercised Google logout/reload path passed. A continuous real-provider journey ending in an authorized member opening still-live shared content was not completed: the synthetic content was deleted before the founder returned from email. Do not infer that the prior intermittent offline problem has been permanently fixed from one successful run.

## Baseline / environment

- Branch: `codex/soma-schema-v2-staging`, starting HEAD `b672aff16b6da04247f5090998b5eb1817443841`.
- Exact Preview: https://spot-2rhspdi2y-fedegrasso1994-1482.vercel.app/
- Runtime: `e8a399d72bcc1da86ebc513e3134670a5fa5e2d7`, deployment `dpl_2svcK7Ze1jPedMxB2ThMJyfF3wtG`.
- Supabase: `zjinjtkekmaqtxsuyvho` only. No migration, deploy, Auth setting, protection/bypass, application source or service-worker change.
- Main remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`; Production untouched.
- Discovery OFF, jobs paused, cleanup OFF, scheduler OFF, retention paused. PHOTO OPEN unchanged.

## Results A–K

| Item | Result and evidence boundary |
| --- | --- |
| A. Google Auth | PASS real provider. Existing Google SSO completed after the actual Google CTA. Returned to the same Preview with the exact pending synthetic comment reference; Auth fragment was subsequently cleared. Auth logs show `/authorize` 302, external-provider redirect, `/callback` 302 and `/user` 200. No new OAuth/GCP configuration. |
| B. Email Auth | PASS actual request and verification: `/auth/v1/otp` 200 and `Mail.send`; founder opened the email and confirmed return to Soma. Staging logs: `/verify` 303 at 20:24:43, `/user` 200 at 20:24:45–46. The founder screenshot shows the authenticated SPOTTED fallback. This is not a PASS for reading a still-live member-only target. |
| C. Pending target | Google exact query preservation verified before and after login/reload. Email request redirect contains the same Share target, and founder returned to SPOTTED; exact post-callback URL/session was not inspected in the founder's browser. No synthetic JWT callback was substituted for either provider result. |
| D. Authorized member | PASS hosted API using new isolated synthetic A/B normal Auth JWTs: post/comment resolution, correct parent/target, stable reference and anonymous projection. Current-run authorized browser resolution after real Google/email remains NOT COMPLETED. Prior hosted/browser implementation evidence remains historical, not a new run. |
| E. Unauthorized/non-member | PASS hosted other-Tribe, zero-Tribe, anonymous, guessed/modified-reference checks. Google account was outside the synthetic Tribe and the actual Preview showed only the uniform neutral fallback. |
| F. Authenticated reload | PASS normal reload of the Google-authenticated non-member fallback: same target, session restored, no offline page. Reload/fresh-tab/away-and-back after *successful authorized content resolution* was not rerun. Hard reload with proven cache bypass was not available in the controlled browser. |
| G. Logout / reload | PASS exercised Google session: ordinary profile logout, stable Welcome, normal reload, fresh root tab, then fresh Share navigation. No protected synthetic content displayed. |
| H. False offline | NOT REPRODUCED in the exercised paths. This does not erase the earlier intermittent failure. No patch or security workaround. |
| I. SW/cache privacy | Source plus 5/5 PWA tests PASS: cache only `/offline.html`, no API/Auth/UGC/photo/asset interception or document caching. Post-logout fresh browser navigation showed Welcome without shared content. No live cache-store inventory or exhaustive BFCache/hard-reload claim. |
| J. Genuine offline | DEFERRED: supported browser tooling did not provide network emulation; host connectivity was not modified. Unit tests simulate fetch rejection/reconnect and pass. This is not the reason for BLOCKED. |
| K. Native share sheet | DEFERRED to physical-device QA, explicitly not a blocker for this gate. No emulated native-sheet success. |

## Email error diagnosis

The founder initially reported “Operazione non riuscita. Riprova.” The failed operation was a **new email request**, not the verification callback. Provider evidence:

- 20:16:10: first OTP request HTTP 200; 20:16:11 `Mail.send`.
- 20:16:27: repeated request HTTP 429, “For security purposes, you can only request this after 43 seconds.”
- 20:16:30: repeated request HTTP 429, same message with 40 seconds.
- 20:24:43: emailed link verified successfully, HTTP 303.

The resend cooldown was working. The generic user-facing failure copy did not explain it. No rate-limit, SMTP, Auth or error-copy change is included. A future scoped UX fix can distinguish resend cooldown from a generic error without weakening security.

## Redirect evidence

Observed Google chain, with credentials/ephemeral parameters excluded:

`Preview /?s=<synthetic-comment-reference>` → staging Auth `/authorize` (302, Google requested by the real CTA) → external provider SSO → staging Auth `/callback` (302) → same Preview and reference → SDK clears Auth fragment → authorized shell / neutral non-member fallback.

Provider-internal Google redirect hops were too fast to capture as a complete network trace; no HTTP status for those hops is invented.

Email chain:

same Preview Share context → staging `/auth/v1/otp?redirect_to=<same-preview-and-share>` (200) → email delivery → founder opens link → staging `/verify` (303) → founder confirms Soma/SPOTTED fallback; `/user` 200 corroborates a valid session. Exact final URL in the founder's browser was not inspected.

Only public origins, methods, paths, timestamps, statuses and cooldown messages are persisted. No Auth code, JWT, provider token, refresh token, mailbox content, credentials, IP or user-agent are retained in this report/evidence.

## Fixture cleanup and the incomplete journey

Three new temporary synthetic accounts (`fea47300` namespace), two isolated synthetic Tribes, canonical synthetic photos and ordinary synthetic post/comment content were created. Normal JWT workflows completed AGE, consent, PHOTO and Membership Engine; no Discovery activation or existing-account membership change.

All three fixtures were deleted through the normal delete-account/PHOTO lifecycle at 20:23:48, 20:23:50 and 20:23:52. This happened **before** the founder's successful email verification at 20:24:43. That cleanup was premature for an end-to-end content-read test. Consequently the founder's neutral screenshot cannot prove opening live content or distinguish non-membership from deletion. No live authorization relaxation was used to compensate.

Final scoped postcheck:

- 4 existing Auth accounts, 4 profiles, 42 Storage objects, 1 existing post and 1 comment.
- Existing profile/post hashes exactly match preflight (`ad4067f19890f61846176521b32aaf92`, `6d8805370e3731f4150e414675d4ec2c`).
- Fixture Auth/profile/session/photo/Storage/Tribe/post/comment/like/report/request/Match/chat dependencies zero; Share refs zero; missing current photos zero.
- No new fixture orphan. Pre-existing old Storage review objects were not changed; no blanket zero-orphan assertion.
- Three concluded PHOTO technical receipts remain under unchanged seven-day lifecycle: `purged`, `settled`, reserved quota zero. Cleanup/scheduler remain OFF; no manual receipt purge.
- Private fixture credential/seed/state files removed after cleanup. No secret/server key was read or exposed to the client.

A stale SQL editor buffer initially reran the old seed guard, which rejected with `FIXTURE_ALREADY_EXISTS` before fixture inserts. The buffer was then replaced in full, clipboard-compared to the expected scoped postcheck, and the correct postcheck succeeded. No schema or lifecycle workaround.

## L–O. Validation / delivery

- Full suite: **672/672 PASS**, zero failed/skipped, same baseline runtime.
- Build PASS; typecheck PASS; dedicated PWA suite **5/5 PASS**.
- Changed files: this report and sanitized `docs/evidence/spotted-share-final/` only. No runtime, schema, CSS or product change; no new deploy.
- Evidence commit is returned with delivery; it does not represent a new Preview runtime. Working tree/remote are checked after commit/push to the staging branch only.

## Remaining gate

Complete a real-provider/member journey with a still-live synthetic target retained until all assertions finish: target resolved in browser, authenticated reload/fresh tab/away-and-back, then logout/reload and protected-content denial. Email final-URL preservation must be observed in that same browser. Mandatory onboarding gates have automated coverage but a fresh real-provider onboarding run was not performed here.

No new backend behavior, Share semantics, scheduler, analytics or notification work is authorized by this report.

**SPOTTED SHARE FINAL GATE: BLOCKED**
