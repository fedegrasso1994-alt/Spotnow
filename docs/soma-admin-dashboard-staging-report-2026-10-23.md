# Soma — Admin Dashboard MVP staging report

Branch `codex/soma-schema-v2-staging`. Starting HEAD `61c2096b51063e958db153a08c665e663a81607c`; main baseline `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. Only Supabase staging `zjinjtkekmaqtxsuyvho`. Contract: [Admin dashboard](soma-admin-dashboard-contract-2026-10-23.md).

## Scope and approved decisions

Private ADMIN + MFA read-only dashboard. Founder-approved threshold 10 plus anti-inference protections; unsupported metrics explicitly Non misurato, unavailable Tribe/Place filters disabled. No canonical collection or product behavior changed. The received task attachment ends at section 12 after “zero”; no unseen instructions are claimed. Zero/partial/protected/loading/error states are explicitly handled.

Migration 051 adds `spot_private.dashboard_count(bigint,bigint)` and `public.admin_analytics_dashboard(integer)`. Staging apply was followed by narrowly aligning only this new read function to the final source for whole-cohort maturity and existing fairness aggregates. No change to migration 050 or its canonical/summary functions. Final live body hashes are checked against source.

## Verification

- 9 targeted Postgres/PGlite + client API tests: anonymous/normal/MODERATOR/AAL1 denied; ADMIN+verified MFA admitted; role revocation and missing factor deny existing claims; no raw-table/purge grants; 9/10 boundary; high event count with <10 distinct actors suppressed; stable response shape for nonexistent/rare events; repeated read unchanged; all-fairness-class suppression; safe positive 50-account distribution; complementary retention suppression; Rome spring/autumn DST 167/169-hour completed weeks; staging-only flag/scalar fixed RPC/no raw errors.
- The first full run passed 723/723 before the final two dashboard tests were added. A subsequent run passed 724/725, failing the existing Notifications/DD reciprocal-allocation test in `tests/notifications.test.js:24`. That test installs 049, not 050/051; its isolated recheck passed. No Notifications/DD runtime or test was changed. Final rerun: **725/725 PASS**, build PASS, typecheck PASS; results recorded in evidence and delivery; the intermittent failure is disclosed rather than discarded.
- Hosted harness `scripts/admin-dashboard-staging-smoke.mjs --browser`: one isolated synthetic Auth identity, actual password login, actual TOTP enrollment/challenge/verification, actual PostgREST read RPC. No real account role edited or granted. Confirm email and provider configuration unchanged; only the disposable identity was individually email-confirmed for testing.
- Ordinary login denied; ADMIN without AAL2 denied; ADMIN with real TOTP succeeds. Same valid AAL2 session denied after fixture role becomes MODERATOR or inactive. Service summary/purge denied. Identical repeated read with Analytics still OFF. Real hosted baseline is empty Analytics, so no populated-pilot chart is claimed; positive/distribution/retention boundaries are proven in disposable PostgreSQL tests.
- Actual browser at localhost:4593 against staging: login/MFA → aggregate rendering; normal reload preserves authorized dashboard; period change works; Tribe/Place selectors disabled; 320/390 actual CSS viewport widths and document scroll widths equal (no horizontal overflow). Scrollable card layout; login form hidden after authorization. Protected/Non misurato states rendered. After logout there are zero metric cards; reload remains login-only. Evidence: `evidence/admin-dashboard/browser.json`, `dashboard-320.png`, `dashboard-390.png`.
- No Vercel deployment, real-device claim, mocked metric injection, new provider or main/Production modification. The local test server/tab are closed after verification.

## Cleanup/integrity

The fixture is deleted through the existing delete-account engine after refreshing its normal Auth session. Auth/profile/role/storage/analytics residues are zero; baseline is restored: 4 accounts, 4 profiles, 42 objects, zero operational roles, zero Analytics events/days/fairness/admission. Profile/Storage hashes unchanged. Existing canonical Analytics/summary hashes unchanged. Final server evidence records **one completed technical deletion receipt** under the existing PHOTO cutover policy (7 days). It has no fixture photo set or Storage object. No ad-hoc receipt purge or lifecycle change; with jobs paused, automatic expiry execution remains an existing operational gate, not a promise that it has already run. No fixture photo was uploaded.

Analytics OFF/test-only ON, Discovery OFF, Notifications OFF, cleanup OFF, scheduler OFF, product jobs paused. No privileged key, token, password, MFA secret or real-user PII in report/evidence. Temporary credential/query files removed; `.local/` stays ignored.

## Remaining conditions

- No real founder account is provisioned yet; real operational ADMIN enrollment/MFA must use the existing secure process. No access granted implicitly by email or dashboard URL.
- UI flag defaults OFF; no new hosted Preview is published in this task. Local browser against hosted staging is the verified frontend path.
- Many requested metrics/filter breakdowns are not in 050; exact coverage is documented in the contract. No canonical data collection was enlarged to fill them.
- Suppression/coarsening is a technical risk reduction, not legal anonymization. Professional/privacy validation and monitored physical Analytics purge remain open before pilot collection.

Technical scope complete for the approved measured-data/read-only staging dashboard, with these explicit operational/privacy conditions.
