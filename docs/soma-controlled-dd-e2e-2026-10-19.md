# Controlled Daily Discovery / Spot / Match hosted E2E

Baseline `bff37f55a04206ff8173939624722a576c002330`, branch
`codex/soma-schema-v2-staging`. Only Soma Staging `zjinjtkekmaqtxsuyvho` called.
No migration, runtime/frontend patch, merge/main, Production or Preview deployment.
TRIBE frontend remains in its original stash, unopened.

## Fixtures and isolation gate

Exactly two newly created disposable accounts:
- A `fea41000-0000-4000-8000-000000000001`
- B `fea41000-0000-4000-8000-000000000002`

Auth synthetic marker `controlled-dd-e2e-041`; normal password login. Confirm email
remained ON; owner SQL seeded only these explicitly confirmed synthetic identities.
No real mailbox/email sent, no Google/GCP call, no credential/provider change.
AGE checkbox, current dating consent, compatible profiles, strict-prevalidated
synthetic PHOTO canonical upload, normal onboarding and IULM Membership API.
No new Place and no existing-user profile, preference or membership changes.

Pre-test: 4 existing accounts,1 eligible account; IDs recorded in ignored/private
local context, omitted from Git. Snapshot at12:33:25 Europe/Rome; exact fixture-only
allowlist verified before Discovery ON. Pre-ON snapshot at12:35:34 confirms every
nonfixture row digest/count unchanged across19 categories.

Controlled Discovery enabled at12:35:50.840 Europe/Rome. Hosted HTTP E2E ran
12:36:03.758–12:36:08.992. Live isolation snapshot12:36:17 still identical.
Discovery/admission OFF, allowlist empty verified12:36:46.821. Cleanup/scheduler
never enabled. All times 2026-10-19, Europe/Rome (UTC+02).

## Hosted results

| Check | Result |
| --- | --- |
| A receives only B, B receives only A; same current window | PASS |
| Up to4 semantics respected; partial pool contains exactly1 each | PASS |
| Real `authorized_profile` and opaque profile-photo path | PASS |
| Fresh signed photo URL via existing Edge authorization; actual bytes HTTP200 | PASS |
| Initial outgoing pending false both sides | PASS |
| A Spot→pending; only A outgoing true on re-read | PASS |
| A quota2→1/window and4→3/day; allocation stays1 | PASS |
| Original Spot retry and fresh login/re-read stable | PASS |
| B reciprocal Spot→existing unified unique Match | PASS |
| Both users resolve same Match and read same zero-message chat | PASS |
| Existing `matchPreview(realMatch)` yields `❤️ Nuovo match!` | PASS |
| Matched profiles disappear; no refund/refill, quotas stay1 each | PASS |
| Spot-operation retries do not create extra Match/debits | PASS |

Window `9538c5b4-fe27-4fed-ae15-b5cb72ac3627`, morning end16:00 Rome.
Match `6c3edc63-6b4e-4673-ba6a-f1849dedb837` (deleted with fixtures after test).
DB confirms the unchanged unique index `(user_a,user_b)`; both real API results
resolve the same Match. Original A pending-operation receipt remains immutable on
retry even after Match: Match state resolves through the unified Match endpoint.

No browser TRIBE/frontend E2E claimed: frontend is intentionally not resumed.
"Leave/re-read" is a fresh client/login and re-fetch, not leaving Membership,
which intentionally invalidates the DD relationship. No product-rule substitution.

## Nonfixture safety proof

Full-row counts/digests equal at baseline, pre-ON, live ON, final OFF/post-delete:
Auth, profiles, AGE, consent, Membership, check-ins, DD allocations/exposures,
fairness/pair-memory, Spot intents/operation receipts, ORA quotas, Match/messages,
validated photos/assets and persistent photo Storage.
No existing account was allowlisted, allocated, charged, paired or matched.
Nonfixture DD allocations/fairness/exposures and Spot quotas remain zero.
No DD relationship could grant an existing account new profile/photo authority:
there are no nonfixture allocations/exposures, and authorization functions were
not changed. ORA relationships and existing Match/photo data remain identical.

## Shutdown and cleanup

Existing normal PHOTO/delete-account dry-run + engine succeeded for both owners.
Auth/identities unusable/deleted. Zero fixture profiles, AGE/consent, Membership,
DD allocation/exposure/fairness/pair-memory, Spot intents/receipts, Match/messages,
photo asset/validation rows or Storage objects remain. No ad-hoc deletion or gate
bypass. Real baseline restored: 4 accounts,4 profiles,42 photo objects,1 Match,
2 messages; exact nonfixture digests unchanged.

Expected technical evidence deliberately retained:
- one empty global current-window row, zero allocations/exposures, no user data;
  physical DD retention executor is not activated;
-10 normal PHOTO technical receipts:2 purged lifecycle,2 completed account cleanup,
  2 cutover attempts,2 cutover deletions,2 cutover audit; account_deletions0.
  Existing seven-day lifecycle/metadata rules unchanged; no purge forced while
  schedulers remain OFF. Actual execution is subject to the existing operational
  scheduler/retention gate, not claimed to have run in this task.

Final: Discovery OFF; policy2 disabled/paused; controlled admission OFF; allowlist
empty; jobs paused; PHOTO OPEN unchanged; cleanup OFF; scheduler OFF; Confirm
email ON. Temporary seed/password files and loopback SQL bridge removed after use.

## Regression checks and caveat

Hosted E2E had no failure and no retry of the entire run. No discrepancy with
PostgreSQL semantics found. Full test/build/typecheck details in `validation.json`.
Initial full local suite:542/543 PASS. The pre-existing DD040 test
`repeated public reads return same full allocation` assumes exactly4 from a
randomized6-person pool. This run returned3 (within product cap); no application
or test patch authorized/applied. Separate disposable-local repetitions and the
full-suite recheck are recorded transparently; this is not a hosted E2E failure.
No product change made to force the test green.
Full-suite recheck:543/543 PASS; build/typecheck PASS. Eight isolated baseline
repetitions yielded4,4,4,4,4,4,3,4: the exact4 assertion is intermittent.
This known test weakness remains open for a separately scoped correction.

Evidence: `docs/evidence/dd-controlled-e2e/`; manual test-only harness:
`scripts/dd-controlled-e2e/`. No fixture credentials/sessions/signed URLs in Git.

Technical scope ends here. TRIBE/frontend remains a separate next task.

Final gate: `CONTROLLED DD E2E: GO` (hosted backend E2E scope only).
