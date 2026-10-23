# Soma — Moderation finalization contract

Staging only, additive migration052, branch `codex/soma-schema-v2-staging`; baseline7342cba. No main/Production, new provider, observability system, product quota, PHOTO lifecycle/decoder, discovery activation or job activation. Founder freeze and subsequent anonymous-block scope approval supersede the earlier audit stop gates.

## Two independent block scopes

`spotted_block_author(content_id,content_kind,operation_id)` is authenticated and server-authoritative. Only a currently eligible Tribe member can resolve an eligible user post/comment through private nominal visibility. The response is uniformly `{completed:true}` for valid/self/missing content; malformed input and missing account eligibility use generic existing errors. Operation receipts bind owner/content/kind and retry; no author UUID or confirmation of a particular hidden author is returned.

`spot_private.anonymous_blocks` is RLS-private, no raw client/service table grant: opaque row ID, blocker/author Auth UUIDs internally, created_at, unique directional pair. No original content graph is stored in this relation. Both account FKs cascade. It persists while needed for the active block/account, like an active safety preference, not an analytics visit history. Own export exposes only opaque row ID/date, never author UUID or target content. New frontend action is a quiet secondary action on other-user content, including QoD answers/comments.

Social visibility filters check explicit public profile blocks AND private anonymous blocks symmetrically. Posts, comments, child visibility, likes, social creation and opaque Share resolution reuse those filters; the legacy board reader/react path is also filtered. The official QoD system question has no peer author to block. Existing user-facing post quotas remain removed; technical rates and legacy board quota are untouched.

Anonymous blocks **do not enter** `public.blocks`, `can_view_profile`, `can_use_match`, profile/photo signing or ORA/DD eligibility. Known Match/chat and delivered requests remain available under their original age/consent/explicit block/suspension/delete rules. This avoids the named-Match disappearance correlation demonstrated by the prior audit. Existing request contexts use a nominal content helper that still denies removed/expired/moderated content and explicit profile blocks, but does not change merely because of an anonymous-content block.

New romantic attempts retain normal neutral receipts/quota behavior. Content resolution for the neutral submission uses nominal visibility; a BEFORE INSERT admission trigger silently suppresses new delivery for an anonymously blocked pair, after normal valid-attempt accounting. It does not invalidate old requests, renew pair guards, expose reasons, reset quotas or create/delete Match. Explicit profile block still has its existing global effects. This is a scoped privacy guarantee, not proof against inference from user-authored text or every external auxiliary source.

## Reporting and moderation

Existing five-reason server taxonomy and existing report/privacy behavior preserved. No reporter identity enters normal app responses or reported-user exports. SPOTTED post/comment/QoD reporting uses the current report and operation receipts. Chat uses the existing interlocutor report/block prompt (block selected by default); no message selector, message evidence archive or general chat reader. Romantic abuse uses existing sender-profile report/block and account sanctions, with silent request invalidation; no new per-request inbox for sender.

Existing MODERATOR/ADMIN active role + verified MFA factor + provider aal2 are checked server-side. Revoked roles/factors reject cached sessions. Old RPC aliases stay revoked. Analytics dashboard remains read-only and separate; no moderator access is inferred from UI flag/URL. Role assignment or access to provider consoles is not granted to real accounts here.

Content moderation delegates to the existing role/claim/revision/idempotency engine through a revoked prior-function alias. The new wrapper records immutable action facts once: target type/internal ID, report reason, previous/new report+hidden state, actor, operation, server time. No post/comment/chat text is copied into audit. Existing profile audit already has reason/target/states and gains review metadata. Historical missing facts/actors are not fabricated. New actions carry pending-review status, due_at30days and eventual outcome. No client can update audit tables.

## Manual holds and action review

A staff hold can be created only for an existing claimed report owned by that staff member, with valid claim. The RPC is operation-idempotent even after claim expiry for its original owner/target. It delegates to the established explicit safety-hold engine. Reason/case/actor/server creation time/status/due/outcome are tracked. Newly created holds are due no later than30days after creation; old holds retain an earlier deadline and no overdue clock is silently reset. Legacy actor references remain in their existing hold audit; missing historical actor UUIDs are not invented.

`moderation_review_queue` is MFA/role-protected, bounded/keyset paginated, with no100-case global ceiling. It returns only internal review metadata. `moderation_review_detail` supplies targeted on-demand case context: reason/action/case reference and at most280chars of existing authorized UGC/live or held evidence. It never fetches messages, profile preferences, location history, reporter identity or an unclaimed author identity. Content is displayed via textContent, not HTML, and is cleared with the staff session. The read does not create a content copy in audit/review storage.

`moderation_review` records keep/release/escalate, actor, reason and time with owner/payload-bound operation replay. Keep/escalate reschedule review in30days; overdue holds stay held until an explicit decision. Release of a hold sets released_at; release of an action review closes that review only. Neither un-hides content nor revokes sanctions. FK-bound review history follows the existing case/hold/action lifecycle and cannot become an unbounded orphan table.

No appeal center: manual `somadatingapp@gmail.com`, existing channel approved. Staff should check due reviews during operational coverage and resolve/escalate before the deadline; no SLA engine or newly promised response time. Dedicated real staff/recovery/backup coverage remain operational provisioning work.

## Retention and delete

No Analytics90day retention is applied here. Existing moderation design parameters180days for closed reports/released safety metadata and7days for operation metadata stay unchanged and disabled; jobs stay paused. Existing parent/account/actor cascade rules may remove action/report metadata sooner, so these periods are not unconditional minimum preservation promises. Explicit active holds protect approved minimal evidence; released hold purge follows the existing policy. New review rows cascade with their parent, and anonymous block relations cascade with either account. Rights uses a revoked alias wrapper and remains available with revoked dating consent/restricted account. PHOTO receipts follow the existing7day lifecycle, never an ad-hoc new retention.

Legal/privacy review of retention, lawful bases and maximum active-hold duration remains required before pilot. A30day review interval is not a30day legal retention or automatic release. No production rollout, scheduler, cleanup or retention activation is implied by technical review readiness.

## Rollback

Pause the staging UI flag or revoke the new RPC EXECUTE privileges if needed; keep private schema and existing protective data. Do not restore less protected aliases, delete active holds or convert anonymous blocks to publicly enumerable profile blocks. No PHOTO rollback or destructive schema rollback. Recheck guards/permissions before any separate future rollout.
