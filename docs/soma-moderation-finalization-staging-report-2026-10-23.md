# Soma — MODERATION FINALIZATION staging report

Date: 2026-10-23. Branch: `codex/soma-schema-v2-staging`. Implementation commit: `d38d498`. Technical result: **MODERATION FINALIZATION: GO FOR REVIEW**. No production rollout or main merge.

## A–B. Inventory and approved decisions

The read-only inventory is in `soma-moderation-finalization-audit-2026-10-23.md`; the correlation diagnostic/decision freeze is in `soma-moderation-finalization-decision-freeze-2026-10-23.md`. The executable contract is `soma-moderation-finalization-contract-2026-10-23.md`.

Existing entry points cover SPOTTED posts/comments and QoD answers/comments, reportable profiles, romantic sender safety and the chat interlocutor. Existing private report queues, staff claims/revisions, profile sanctions, content suppression, safety evidence, rights and retention remain the foundation. The existing five-reason server taxonomy is preserved. No message-level reporting, general chat reader, advanced assignment, appeal center, scoring or observability provider was added.

Founder approved the separate anonymous block scope, existing interlocutor/conversation report/block for chat, manual support appeals and manual 30-day hold review. No remaining product decision blocks this technical review. Legal validation of retention, lawful bases and maximum hold duration, and real staff operational provisioning remain separate pre-pilot gates.

## C–E. Reporting, authorization and actions

- New secondary SPOTTED action resolves the content author only server-side. `spotted_block_author` returns a neutral completion receipt, never the author ID.
- Private anonymous blocks affect anonymous content/interactions and future anonymous deliveries. They do not enter `public.blocks`, change ORA/TRIBE eligibility, hide an existing known Match/chat, revoke nominal photo/profile access or invalidate an already delivered request. Explicit profile blocks remain global.
- MODERATOR/ADMIN role, active status, verified MFA factor and AAL2 remain server-enforced. Role alone, a normal account, stale/revoked role/factor and logged-out requests are rejected. Analytics authorization does not grant moderation mutation rights.
- Existing claim/resolve-author/review/dismiss/hide/warn/suspend/ban/release mechanisms are reused. New case-scoped `hold` requires a live owned claim; retry remains bound to the original operation and case.
- New manual review queue is keyset-paginated, without a global 100-case ceiling. It supports keep/release/escalate. Targeted case context is loaded on demand: at most 280 characters of existing authorized UGC, no message reader or extra content archive. Logout clears the queue/context.

## F–H. Anonymity, romantic safety and removal

Post/comment normal payloads, private table grants and own export were tested for author/reporter leakage. Own anonymous-block export contains only opaque receipt ID/date, without peer ID or the original content graph. Author resolution remains claimed-case staff-only. Concurrent duplicate anonymous blocks produce one relation.

New romantic delivery is suppressed privately for blocked pairs while preserving the existing neutral valid-attempt response/quota. Previously delivered requests can still be accepted into the unified Match/chat. Existing decline/expiry, 30-day unordered guard, opt-out and Match uniqueness behavior remains covered by the regression suite. No sender-visible moderation reason was introduced.

Hidden posts/comments and their dependent content disappear from social readers; opaque Share resolves to the existing neutral unavailable result. QoD answer removal also hides its comments and Shares while preserving the official system question. Global named-profile blocking and legacy social read/react paths cannot bypass the new social visibility checks. This does not promise protection against inference from user-authored text or external information.

## I–J. Audit, holds and retention

Migration 052 adds minimal categorical content action facts: actor, action, internal target/type, reason, old/new report and hidden state, operation and server timestamp. Retries do not overwrite the original facts. No post/comment/chat text is copied to the action audit. Existing profile actions gain review status/deadline/outcome.

Holds carry actor, case/reason, creation/status, deadline and outcome. Existing overdue deadlines are not reset. Keep/escalate records a manual decision and next review; release changes only the hold/review, never republishes content or revokes a sanction. An overdue hold stays active until manual resolution. Review records have parent FKs and follow existing case retention/delete semantics.

No new legal duration is invented. Existing design parameters (closed reports/released safety metadata 180 days; operation metadata 7 days) are unchanged, not activated and subject to professional review. They are not unconditional minimum preservation periods: existing account/actor/parent deletion cascades may remove metadata earlier. Active holds preserve only explicitly held evidence. Analytics retention is not reused. Retention stays paused; cleanup/scheduler stay OFF. Manual appeals use `somadatingapp@gmail.com`; no automatic response SLA is asserted.

## K. Hosted staging and real browser evidence

Only `zjinjtkekmaqtxsuyvho` was accessed. `scripts/moderation-finalization-staging-smoke.mjs` creates three disposable synthetic Auth identities and one isolated synthetic Tribe; there is no global Auth change. The fixture identities are individually seeded/confirmed for the test, followed by real password login, real TOTP enrollment/challenge, real AGE/consent/profile, canonical PHOTO upload and normal delete-account. This is not evidence of a real email delivery/signup confirmation journey.

Hosted tests passed: normal-user denial; role-without-MFA denial; claimed author resolution; reporter privacy; post/comment report/hide/Share suppression; duplicate-operation audit; manual hold keep/escalate/release; opaque anonymous block/export; preservation of delivered request, Match and chat; on-demand context authorization; role revocation with an existing JWT; logout denial; fixture deletion and baseline equality.

Browser smoke used the actual moderation frontend at `http://127.0.0.1:4595/?admin=1` connected to hosted staging, not a newly deployed Vercel Preview. Real fixture login/MFA, queue, manual keep (first batch), on-demand context (final batch), and logout with zero remaining review rows passed. The local server and temporary browser tab were closed. The first transient access-denied state during login was followed by a verified server-authorized session; no protection was bypassed.

Three controlled fixture batches ran. The second completed API checks but exceeded the browser wait deadline while local verification/documentation was running; its `finally` cleanup restored the baseline. This was a harness `BROWSER_TIMEOUT`, not a hidden product PASS. A subsequent final browser/API batch completed successfully. QoD is OFF in hosted staging and was not enabled; hosted QoD-specific smoke was therefore skipped, with actual PostgreSQL-backed QoD removal/child/Share tests passing locally.

Evidence: `evidence/moderation-052/staging.json`, `browser.json`, `moderation-panel.png`, `server-final.json`.

## L–N. Tests, build, migration

- Full suite: **737/737 PASS**, zero failures/skips.
- New PostgreSQL-backed finalization tests: **11 PASS**, plus a new SPOTTED client action/opaque RPC test. The suite includes existing authorization, romantic, Share, QoD, rights, PHOTO and social regressions.
- Build: **PASS**. Typecheck: **PASS**. `git diff --check`: PASS.
- Migration: only **052_moderation_finalization.sql**, staging only. Adds private anonymous-block/review relations, minimal audit/hold review fields, scoped RPCs/triggers and narrow compatibility wrappers. It does not modify PHOTO or its retention/decoder/quotas.
- The on-demand detail RPC was added as a narrow completion of the same candidate migration after its initial staging application. Final read-only source verification confirms all 13 directly defined RPC/helper bodies match the candidate SQL. The fresh-schema local suite validates the complete migration as one transaction. No production application is implied.

## Final integrity and limits

Baseline restored: **4 Auth accounts, 4 profiles, 42 Storage objects**, with identical profile and Storage hashes; existing 1 Match/2 messages unchanged. Zero synthetic Auth/profile/Storage records, private blocks, reviews, holds, staff grants or report/audit fixtures remain. No new Storage orphans or broken current-photo references; no unsafe synthetic photo writer/reservation remains.

As required by PHOTO-02, **6 purged photo-set receipts and 9 completed deletion receipts** remain temporarily as minimal technical records, with zero reserved bytes and settled writers. These are not photos/product fixtures and were not force-purged. Their existing seven-day policy is unchanged. Existing unrelated Storage state was preserved, not reclassified or cleaned up by this task.

Final controls: Discovery OFF, Analytics OFF, Notifications OFF, cleanup OFF, scheduler OFF, retention paused. PHOTO admission remains in its prior operational state. Global Auth configuration, main and Production were not changed. No secrets or fixture credentials were persisted in tracked evidence; ephemeral browser credential/SQL files were removed.

Real moderator assignment, MFA recovery, coverage/backup owner and recurring 30-day case review must be organized before the pilot. Legal retention/hold/appeal validation remains pending independently of this technical GO. No new runtime development follows this task.

## O–Q. Git checkpoint

Implementation/contract/tests: `d38d498`. A separate evidence commit contains this report, the synthetic staging harness and final evidence. Both are to be pushed on `codex/soma-schema-v2-staging`; the final response identifies the resulting evidence SHA and verifies remote equality/clean working tree. Main remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.
