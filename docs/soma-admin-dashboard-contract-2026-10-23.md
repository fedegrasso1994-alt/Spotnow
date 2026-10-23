# Soma — Admin Analytics Dashboard MVP

Staging only; additive migration 051 over Analytics 050. This is a private read-only view, not the moderation console. No product or canonical Analytics writer is changed.

## Authorization and UI entry

`?analytics=1`, with `VITE_ADMIN_ANALYTICS=true`, is an entry point, never an authorization boundary. The flag defaults OFF and rejects every Supabase host except `zjinjtkekmaqtxsuyvho.supabase.co`. `public.admin_analytics_dashboard(weeks_ago integer default 0)` verifies `spot_private.moderation_role() = 'ADMIN'` on every call: active explicit assignment, non-anonymous/non-banned Auth user, verified MFA factor and JWT `aal2`. MODERATOR alone is insufficient. No service key is delivered to the browser. Existing raw-table and service-only summary/purge permissions remain unchanged.

There were zero operational ADMIN assignments in the staging baseline. The test grants access only to a temporary synthetic identity and removes it through normal account deletion. An actual founder account must be explicitly provisioned through the existing secure role/MFA process before operational use; this task does not grant access to real accounts. The dashboard route has no editing, banning, role management, purge, flag or scheduler controls.

UI uses a separate Auth storage key, existing bounded fetch and current Soma fonts/colors/cards. Dedicated CSS is scoped to the dashboard. Login, real TOTP challenge, read, error, protected/empty, reload and logout are supported. Session changes, page hide, hidden document and logout invalidate pending render generations and remove displayed metrics. Reads are explicit, not background polling. Returning from a hidden tab requires refreshing metrics. No Analytics observation is emitted by this route.

## Periods and suppression

Founder approved threshold: **10 distinct contributing accounts**, not ten events. All computations/suppression happen server-side. The client only formats supplied values.

- Controlled date selector: one completed Monday–Monday Europe/Rome week, from the last 11 completed weeks. No arbitrary timestamp/range or combination of entity filters. Default: latest completed week.
- DAU/WAU/MAU use 1/7/30 civil days ending at the selected week's exclusive end, following canonical `analytics_days`.
- Events and counters ignore data beyond the 90-day Analytics cap, even if an operational purge is delayed. This read filter does not replace the physical purge requirement.
- Counts released only for >=10 distinct contributors, rounded **down** to multiples of ten and displayed as lower bounds, never exact counts.
- Empty and suppressed event cells have identical fixed response keys/status/value. The existence of a rare event is not disclosed through omitted/present keys.
- Retention uses the canonical observed-account registration-day definition. Selected registration-week cohorts are released only when the entire cohort has matured. Returned AND non-returned groups each need >=10; otherwise no numerator, denominator or percentage is returned. Published numerator/denominator are separate lower bounds; the frontend does not derive a ratio.
- Fairness: one contribution per account for the distribution of its mean assignments/window, floored into classes 0–4. All five classes must have >=10 distinct accounts or the whole distribution, complementary totals and mean are withheld. If safe, total assignments is a lower bound and mean assignments/window is a server-derived half-profile band. These are assignments, not actual profile views or evidence of demographic fairness.
- Trends use whole non-overlapping weeks with independent contributor threshold/coarse counts. No per-account drilldown, pair history, raw dimension, diagnostic table or arbitrary SQL.

These measures reduce small-cohort/complement/differencing risk; they are **not** differential privacy or a legal proof of anonymity. Data is still calculated from pseudonymous 90-day records. No new 24-month aggregate writer/copy/cache is created. Professional disclosure/linkability validation remains required, including overlapping DAU/WAU/MAU and changes caused by deletion/retention. Broader date/entity slicing needs a separate privacy design.

## KPI coverage and honest limitations

| Section | Available from existing 050 records, subject to suppression | Not measured / no validated cohort linkage |
| --- | --- | --- |
| Overview | Observed signup returns; canonical onboarding-completed accounts; DAU/WAU/MAU; first observed Match accounts; mature D1/D7/D30 counts | All historical Auth signups; cohort Match-to-first-message conversion |
| TRIBE | Drop consultations; Spot creations/matched-intent transitions; assignments/mean bands; minimized assignment distribution | All eligible users/zero-exposure among them; eligible-population Spot percentage; pair recurrence; true Spot-cohort conversion |
| ORA | Starts; distinct users with starts; Spot creation and matched-intent transitions | Manual/QR distinction; Place history; profiles shown/viewed; validated rate denominators |
| SPOTTED | Post/comment/like additions; QoD answers; valid romantic attempts/deliveries/acceptances; native handoff/copy/cancel and authorized Share resolutions | QoD views; raw Share starts/opens/blocks; linked request/Match conversion cohort |
| MATCH/chat | Unique Match INSERT events; first-conversation events; committed messages | Exclusive Match origin; validated same-cohort first-message ratio and latency |

Missing metrics display **Non misurato**, never zero or a guessed ratio. Measured small cohorts display **Dati insufficienti / protetti**. Immature cohorts are explicitly labelled. Share handoff is not receipt; like additions are not current net likes; allocation is not a view; cross-surface Spot participation is not an exclusive Match origin. Activation here is the retained canonical onboarding-completion milestone, not a new product rule.

Tribe/Place selectors are disabled with an explanation: 050 deliberately stores neither ID. No reconstruction from product/location history is attempted. Simple trend rows and distribution rows are used instead of misleading charts for absent/protected data. No account-level debugging is included.

## Deployment, rollback and operations

Only 051 is applied to staging. It adds one private presentation helper and one authenticated read RPC, no tables, RLS policy, product trigger or existing-function replacement. Existing role/MFA checks are reused. No modification to 050 collection/summary or product retention. Runtime UI is tested locally against real staging; no new Vercel Preview or Production deployment is claimed.

Pause UI by leaving `VITE_ADMIN_ANALYTICS` unset/false; revoke the new RPC's authenticated EXECUTE if an operational pause is needed. Existing authenticated product/Rights/Analytics paths continue unchanged. No destructive schema rollback or data purge required. Existing Analytics/Discovery/Notifications/cleanup/scheduler remain OFF. Monitored physical Analytics purge and professional validation are separate pre-pilot gates, not solved by this read-only dashboard.
