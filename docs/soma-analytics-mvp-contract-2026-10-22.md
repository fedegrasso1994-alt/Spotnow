# Soma — Analytics MVP contract

Staging only, first-party Supabase. No SDK, new provider, dashboard, marketing attribution, fingerprint, device ID or third-party script. Product semantics, PHOTO, product retention and existing flags are unchanged.

## Founder decisions frozen

- `active_day`: authenticated interaction, including product consultation, in the Europe/Rome civil calendar day. Polling, background, token refresh and receipt of a push do not qualify.
- Pseudonymous analytics events and account/day rows: physical deletion after 90 days. The same cap applies to the approved account/window fairness counters.
- Genuinely anonymous aggregates: 24 calendar months. Removing an account ID is not proof of anonymity.
- Fairness: opportunities/assignments only, account/window counters; no exposed pair copy, gender, age, orientation or preference segmentation.
- These periods apply only to Analytics. No product retention policy is replaced or extended.

## Storage, permissions and operational admission

Migration `050_analytics_mvp.sql` is additive with a hosted staging-project guard. Private RLS tables have no browser or service-role table grants. Authenticated users receive only fixed observation and own-rights RPCs. Server/service-role summary and purge RPCs are not browser-accessible.

`analytics_control` defaults `enabled=false,test_only=true`. With test-only active, only explicit `analytics_admission` accounts can generate events, active days or fairness counters. This does not alter product eligibility. Final staging state is OFF with empty admission. No scheduler is installed or enabled.

Tables:

| Table | Fields/purpose | Retention |
| --- | --- | --- |
| `analytics_events` | Internal ID; owner Auth UUID; event/surface/source/channel/entry enums; owner-scoped dedup digest; server timestamp | 90 days |
| `analytics_days` | Owner, Rome day, creation time; unique owner/day | 90 days |
| `analytics_fairness` | Owner, Rome day, morning/afternoon, one opportunity, 0–4 assignments, creation time | 90 days |
| `analytics_admission` | Explicit test account IDs, Auth-cascade | Remove at test cleanup |
| `analytics_control` | Collection/isolation flags, dropped-event counter, installation time | Current operational config, no user content |
| `analytics_anonymous_rollups` | Reserved monthly metric/count/review metadata; no automatic writer or client write API | 24 calendar months |

Auth UUIDs and dedup digests are pseudonymous, not anonymous. No counterpart IDs, Place IDs, membership IDs, content IDs, share tokens or notification references are persisted in analytics rows. Fairness does not copy the pair graph. Canonical IDs enter only fixed server-side digest calculation for retry dedup. There is no arbitrary JSON payload or user-supplied timestamp/actor.

The anonymous-rollup table is **not** evidence of anonymization: it remains empty. No automatic aggregation has been declared anonymous or made eligible for 24-month storage. A disclosure/linkability assessment, including small pilot cohorts and differencing, is required before a real rollup writer. Operational summaries remain private calculations over 90-day pseudonymous data.

## Event dictionary and reliability

| Events | Authority and meaning |
| --- | --- |
| `signup_completed` | First instrumented authenticated return for an Auth identity created since instrumentation installation; owner-dedup; not an abandoned signup attempt or a profile-complete claim |
| `auth_success` | Client-observed authenticated return, deduplicated account/day; channel is an observed Google/email flow hint or unknown, not a validated Auth audit record |
| `profile_complete`, `onboarding_complete`, `tribe_join` | Canonical initial profile, first onboarding completion and real membership INSERT; edits/idempotent join do not generate another creation |
| `ora_start` | Canonical new presence identity; same active Place read/re-entry does not create a new presence; no Place or precise presence timestamp copied |
| `spot_created`, `spot_matched` | Real v2 intent INSERT and first matched-state transition; retries, existing pending/Match reads are not new Spots |
| `first_match` | First observed Match per account within retained instrumentation history, both participants; passive availability does not create an active day; owner-only digest, no counterpart |
| `match_created` | One canonical unique Match INSERT, recorded on a stable participant to count the Match once. Not a per-recipient push; no invented exclusive surface attribution |
| `message_sent`, `conversation_started` | Committed message INSERT, nonce-idempotent; first conversation once globally per Match across both senders, only when no earlier message exists. No body copied |
| `post_created`, `qod_answer`, `comment_created`, `like_added` | Real INSERTs; system question excluded; QoD answer distinguished; retry leaves counts unchanged. Like metric is additions, not net current likes |
| `romantic_attempt`, `romantic_delivered`, `romantic_accepted` | Accepted quota-bearing attempt vs actual deliverable row vs first acceptance. Suppressed attempts never disclosed to sender. No reason, anonymous author or peer copied. Over-quota neutral calls are not valid attempts |
| `screen_view` | Client consultation, deduplicated account/day/surface by server; visible navigation/foreground return/user interaction only |
| `dd_view` | Client confirms a nonempty paint after navigation; server independently requires a currently authorized nonempty allocation; account/window dedup. Allocation alone never means viewed |
| `share_shared`, `share_copied`, `share_cancelled` | Client reports actual native-sheet promise outcome/copy/cancel, with operation retry ID. Handoff is not proof a recipient received/read content |
| `share_resolved` | Client reached the authorized shared-content path, not mere token creation or failed/unauthorized resolver |

Client signals are labelled `source=client` and can be falsified by an admitted modified client. They are not security evidence, canonical conversions or ranking inputs. An authenticated collector cannot forge server event names. Fixed scalar enums reject free-form fields. A serialized technical cap of 500 observation rows/account/rolling day limits telemetry abuse only; product actions are never rate-limited by Analytics. There is no offline queue or automatic retry backlog. Auth hints stored during the login flow contain only an enum and are cleared after return; no Auth material or URLs stored by Analytics.

Anonymous unauthenticated signup starts/abandonment are **not collected**. The implementation does not introduce a public anonymous ingestion endpoint or pre-auth identifier without an explicit design for it. Consequently it cannot claim a complete pre-auth signup-abandonment funnel. Authenticated activation/acquisition contexts are supported; `entry` is only direct/QR/share/notification context, not marketing attribution. Unknown channel is retained as unknown, never guessed from the account's first provider.

## KPI interpretation

- Activation: instrumented authenticated returns → canonical profile → membership/onboarding completion; external QR can legitimately enter ORA with zero Tribe, so do not treat every zero-Tribe account as broken onboarding.
- TRIBE: allocated profiles/opportunities from fairness vs actually viewed drops, v2 Spots and matched-intent transitions. Do not equate assigned profiles with views or interpret partial pools as refill failure.
- ORA: new declared presence and Spot outcomes globally. No account/Place/time visit history is built. Per-Place analytics is deliberately not persisted as supposedly anonymous counters without a privacy design.
- SPOTTED: genuine creations/additions, valid attempts, deliveries, acceptances and native-share outcomes; no popularity ranking or author inference.
- Match → conversation: denominator unique Match INSERTs, numerator first committed message per Match. Two-way conversation can be assessed in separate product QA; it is not silently substituted for first-message conversion.
- Surface effectiveness uses Spot-intent participation/outcomes. Cross-surface reciprocity prevents claiming an exclusive Match origin from the last visible screen.
- D1/D7/D30: exact Rome calendar offsets from Auth registration day among observed authenticated accounts with retained activity. Each offset includes only mature cohorts; not a rolling 24-hour window, not all anonymous signup attempts. Summary returns eligible/returned separately. Account deletion removes contributions, so historical cohorts may change; this is not an immutable business ledger.
- Fairness summary describes assignment distribution, not a proof of equal compatibility, romantic outcomes or demographic fairness.
- This is instrumentation plus a private service summary, not the Admin dashboard. No public/operator UI is introduced.

## Lifecycle, failures and purge

All account-level tables FK-cascade from Auth deletion, including admission. Own `analytics` rights section contains retained event facts/days/counters, not dedup keys, counterpart data or service settings. It does not require active dating consent. No analytics safety hold or indefinite exception is invented.

`analytics_purge(true)` is dry-run. `false` physically removes at most 500 due rows per table, repeatable to exhaustion, with an Analytics-only transaction lock. It never invokes or changes product retention. Cutoffs use original creation time (repeated views/updates do not extend it); anonymous future rows use 24 calendar months, not 720 days. This function has no public/client execution grant.

No retention scheduler is activated here. Before real collection, operations must arrange monitored purge cadence and backlog checks so the approved physical deadlines are met; a callable purge alone is not automatic deadline enforcement. No new job has been silently enabled while the baseline has jobs paused.

Analytics canonical errors are isolated from product mutations and increment the content-free `dropped` counter where possible. Observation failures are ignored by the UI. No error payload or request body is logged. This means analytics can be incomplete after failure and must never be presented as an infallible accounting system. Transaction rollback removes its associated event rows. No old product evidence is backfilled into invented historical events.

## Rollback and pilot gates

Pause collection by setting only `analytics_control.enabled=false`. Keep staging `test_only=true`; clear disposable admission only after tests. Frontend flag `VITE_ANALYTICS_MVP` defaults OFF and rejects Production. If collection is paused, rights/export/delete and explicit purge still work. No destructive schema rollback is required.

Pre-pilot gates: legal/privacy validation of first-party analytics, monitored purge readiness, genuine anonymization before long-lived rollups, and explicit scope approval if abandoned pre-auth signup starts or per-Place analysis are required. No professional legal conclusion is supplied by this technical contract.
