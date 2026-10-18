# SOMA IA pilot alignment — follow-up closure, 2026-10-18

Baseline: `codex/soma-schema-v2-staging`, `2b7e0fdef2068bb28f95d69a62ba32e5345ef057`.
Read `SOMA_PRODUCT_UX_SOURCE_OF_TRUTH.md` before implementation. Staging only.

## Exact change

- Removed “Salta per ora” from pilot Tribe onboarding and removed its completion handler.
- Continue disabled without a selection; the handler also refuses direct invocation without a
  selection or existing membership. Existing members are preserved, not forced into another join.
- Exactly one local selection. Continue calls existing `join_tribe` then `complete_onboarding`;
  routes directly to TRIBE. Failed join cannot complete. Successful join + completion retry does
  not create a duplicate join. No schema/RPC/RLS/max3 changes, no style changes.
- Existing completed-but-zero-membership standard accounts must select a Tribe too.

## QR exception

Pending external Place QR is preserved through Auth and required profile/photo onboarding. With
AGE and active dating consent, it is consumed via existing ORA QR RPC before requiring Tribe
completion. No `complete_onboarding` or `join_tribe` for that QR flow. No second presence screen.
Refreshing an active ORA session with zero Tribes restores ORA. Entering TRIBE/SPOTTED then opens
Tribe selection. Missing AGE/profile/consent and invalid QR remain controlled; no legacy writer.
QR validity/ownership/presence stay server-authoritative. No auto-join or new QR issuance.

## Verification

- Full suite: **438/438 PASS**, zero fail/skipped.
- Build staging PASS, typecheck PASS, diff whitespace check PASS.
- Tests: no Skip; disabled/direct-invocation guard; single choice; each of IULM/Bocconi/FitActive
  joins then TRIBE; unavailable catalog/failed join; retry/concurrent Continue; legacy membership;
  external QR through signed-out Auth/draft/profile then ORA; no join/completion/second confirmation;
  refresh active zero-Tribe ORA; later SPOTTED requires Tribe; AGE/consent and invalid QR guards.
- Existing real local Postgres Membership Engine max3/fourth-denied/concurrency tests PASS.
- Auth/PHOTO/ORA/core regressions included in full suite.
- Browser local DEV fixture PASS: no Skip, Continue initially disabled, selecting IULM enables it,
  Continue opens TRIBE. Explicitly synthetic; not a new real signup or live QR E2E claim.

![Local synthetic UI — no Skip](evidence/pilot-ui/onboarding-mandatory.png)

## Frozen scope

PHOTO-01/02, max3 backend, ORA four-hour/switch/QR semantics unchanged. No new backend deployment,
DB change, Spot v2, quotas, DD engine, Spotted v2, authorization v2, jobs or other roadmap work.
Main and Production must remain unchanged. Preview deployment evidence appended after publication.

## Published Preview and final gate

- Runtime commit, pushed before deploy: `77bda16e451219ceb93896ba3f00d68b6bf0af1f`.
- Preview: https://spot-68smf74kw-fedegrasso1994-1482.vercel.app/
- Deployment ID: `dpl_GB1kaewBmj7uPFvkcWTY6SdFpS1d`, READY, Preview only.
- Browser build-info confirms the runtime SHA, branch, staging `zjinjtkekmaqtxsuyvho`,
  Spot v2/DD/quota enforcement false. Release audit PASS: 40 files, 9 local fonts,
  no production Supabase ref, fixture hook, secret key or test artifact in bundle.
- Added only exact Preview redirect `https://spot-68smf74kw-fedegrasso1994-1482.vercel.app/**`
  to staging Auth allowlist. Site URL and provider/Confirm email configuration unchanged.
  One initial login before configuration save was confirmed returned to the previous staging Site URL;
  after the saved URL was visible, normal Google login returned to the correct new Preview.
  No Production redirect or Google Cloud configuration touched.
- Live browser smoke: Google callback → authenticated new Preview PASS; existing TEST Università 1
  membership preserved; TRIBE navigation PASS; refresh retains session and pre-existing IULM ORA
  presence with decreasing timer. That presence was neither created nor ended by this task.
- Console errors captured on Preview: zero. No new live account, membership, upload or QR created.
  Full new-account/QR variants are controller + existing Postgres regression evidence, not newly
  performed live email/photo/QR smoke. This avoids altering staging fixtures or Auth confirmation.
- Main local/remote unchanged `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.
- Production deployment before/after identical `dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh`.
- No backend deployment, migration, scheduler/cleanup/admission change or style change.
- Final documentation commit follows runtime commit; it does not change deployed code.

**SOMA IA PILOT ALIGNED: GO**

The previously documented Skip/mandatory-selection condition is closed. This is the narrow IA gate,
not activation or approval of future engines, full device QA or pilot/legal readiness. STOP before Spot v2.
