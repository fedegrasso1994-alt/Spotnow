# SPOTTED Question of the Day — staging contract

Scope: manually authored official Soma question, one Tribe and one Europe/Rome calendar day. No Share, AI, CMS, ranking or new romantic model. Migration **047** supersedes the **unapplied** local/stashed 045 draft, following applied 046. Never replay 046 after 047; its pre-QoD guard is intentional. Production rollout is not authorized.

## Draft audit and schema

045 had manual publication, daily boundaries, read projections and ordinary-feed isolation, but **no answer write RPC, no one-answer constraint/consumption record and no frontend/tests**. It must not be applied. Its read projection also lacked owner-only `answered` state. It was reviewed, not restored/applied. Original remains preserved unchanged in local stash `fffa99c2e607d89e5db18213686958ad18389337`.

047 reuses private `board_posts` for official questions and user answers; `board_comments` remains the sole one-level comment architecture. Likes, reports, staff MFA/claim/attribution, sanctions, rights post/comment inventory, safety capture, account deletion, signed creation nonces, shared technical anti-spam and romantic requests remain existing infrastructure.

Additions:

- Nullable `board_posts.author_id` only for `post_kind='system'`, constrained shape; questions have `question_day`, no user author and no parent.
- `parent_qod_id` for answers; FK/trigger enforce system parent, same Tribe and bounded expiry. Official publication fixes timestamps to Rome local midnight boundaries; DST days may be 23/25 hours.
- Unique `(venue_id,question_day)` for system questions, even after close: no second question identity can reset the same day's answer allowance.
- Private `qod_answer_claims(question_id,user_id,answer_id)`, PK on question/user, RLS enabled, no client/service-role table grants. `answer_id` becomes NULL on answer deletion; the consumed claim remains. User deletion cascades the claim. No body, profile, dating preference or location stored in it.
- QOD helpers/triggers and three authenticated RPCs. No new client editorial permissions.

## API and UI

`spotted_qod(place)` returns `{question:null}` when absent/inactive or a question containing exactly `id,text,official,romantic_content:false,answered,answers`. `answered` refers only to the caller. Eligibility and active Tribe membership are checked server-side.

`spotted_qod_answers(question_id,after_id,page_size)` returns the normal anonymous social post allowlist plus `qod_answer:true`; ordering is descending creation time/UUID, never likes. No author ID, pseudonym, timestamps, profile/dating information or moderation fields. Cursor and membership validated. No cross-Tribe aggregation.

`spotted_qod_answer(question_id,message_text,operation_id)` returns the answer UUID. Board lock + owner lock + PK make first claim atomic. Exact operation retry replays; changed payload conflicts. New second operation is rejected `QOD_ALREADY_ANSWERED`, including after content deletion or ordinary receipt expiry. The existing nonce validity, text validator (1–280 Unicode characters, no links/markup/mentions/tags/media) and 120/min technical rate protection apply. **No call to `board_create`, no write to `board_quota`, no ordinary product quota or `remaining` field.** Claims are independent across Tribes and next-day question identities.

Frontend: small official highlighted module inside existing SPOTTED, using current fonts/tokens/cards/social icons. Reuses the existing social composer, card, thread, likes, report/delete actions and romantic CTA. Already answered, empty, closed, loading, retry and absent-question states are handled. An absent/failing QoD does not block ordinary publication. Stale-answer/close errors refresh current server state immediately; account/context changes discard late responses.

## Editorial operation and lifecycle

`spot_private.qod_publish(place,local_day,question_text)` and `spot_private.qod_close(question_id)` are owner-only SQL functions: no anon/authenticated/service-role EXECUTE. They are staging-only and serialize with the existing board lock. No API/dashboard/editorial scheduler added. Publication of past/future manual prompts is allowed, but only the current Rome day can be active. The existing `system_posts_enabled` and social readiness flags gate runtime QoD.

Official system content cannot be edited/deleted through normal user RPCs, including the legacy nullable-author delete path. Its romantic target is rejected by the existing romantic backend. User answers and comments use the existing neutral romantic request system, six-attempt limit, eligibility checks, guards and unified Match exactly as before.

At day end or close, no new answers; questions/answers disappear from active experience, including direct guessed IDs/comments. Close permanently hides child answers. Leave, block/sanction/eligibility and consent semantics follow social authorization: dating-consent revocation alone does not remove social access. Existing sanctions never republish old hidden content on reversal.

## Retention and deletion

No new physical retention duration or cleanup job is invented. Official questions and answers are excluded from the ordinary `board_posts` purge until a dedicated physical-retention policy is approved; open reports/safety evidence remain governed by existing safety mechanisms. This is an explicit pre-pilot retention follow-up, **not permission for indefinite production retention**. Schedulers/cleanup remain OFF.

User account deletion still removes their answers, comments, likes, reports, receipts and claims through existing lifecycle/cascades; explicit safety capture remains separate. Official editorial questions have no account owner. User answers remain in owner `board_posts` rights export; comments/likes remain in their existing categories. Consumption claims are minimal anti-replay metadata, not a second content store; no peer export/access. Their identity/retention treatment must be included in the final legal/rights inventory review.

## Backward compatibility and rollback

Ordinary `spotted_create_post` from 046 and technical `spotted_rate` are unchanged. Ordinary SPOTTED and legacy Bacheca feeds exclude official questions/answers; legacy quota semantics remain unchanged. No migrations 039/040/046, PHOTO/ORA/TRIBE allocation, Match or romantic request code changed.

Operational pause: set only `system_posts_enabled=false` in staging; ordinary SPOTTED continues. Do not reverse schema destructively or restore the old quota writer. Keep 047 additive. Migration function-source patches assert their expected prior definitions and roll back the entire transaction if dependencies differ.

Validation remains technical; final privacy/UGC/safety/physical-retention policy requires professional review before pilot.

## Resume review evidence

The 2026-10-21 resume review is recorded in `soma-spotted-qod-resume-report-2026-10-21.md` and `evidence/spotted-qod-resume/`. No contract or runtime semantics changed. Full suite 648/648, build/typecheck and hosted synthetic functional checks PASS. Final browser reload remains BLOCKED by offline/bootstrap behavior on the reviewed Preview; 320/390 automation is independently DEFERRED by founder instruction, not a QoD blocker. Temporary deployment access was revoked and no access link is persisted here.
