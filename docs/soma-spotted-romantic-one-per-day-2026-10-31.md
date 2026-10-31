# SPOTTED romantic initiative: one per Rome calendar day

Scope: staging `zjinjtkekmaqtxsuyvho`, branch `codex/soma-schema-v2-staging`. Product source of truth updated. No changes to Match/chat, anon interactions, moderation, RLS, PHOTO, recovery, ORA or Chance.

## Enforcement

Previously migration 043/044 enforced six accepted romantic initiatives per actor/day using private `board_request_quota(user_id, day)`, an advisory write gate, atomic UPSERT and idempotency receipts. Migration 060 changes only the limit, retaining those mechanisms. Historical migrations remain immutable.

One private immutable server function, `spot_private.spotted_romantic_daily_limit()`, returns 1 and supplies the quota CHECK, the submit UPSERT and settings residual. Client cannot call/change this helper or write quota rows. Public RPC signatures, owners and privileges are preserved. The deployed submit/settings definitions were compared exactly before/after, normalizing only the quota substitutions and obsolete comment; all other SQL is identical, including current moderation guards.

`spotted_romantic_submit(uuid,text,uuid)` derives actor from authenticated session and local day from server timestamptz AT TIME ZONE Europe/Rome, after acquiring the existing lock. No board key is part of the counter. No client-supplied day/limit/actor. Same nonce is a free retry. An over-quota call creates no attempt, delivery or charge, preserving the existing uniform neutral response for anonymity. Accept/decline and unified Match/chat remain unchanged. Like, comment, read and report are excluded.

The settings residual already controls CTA availability; only the exhausted tooltip changes to “Hai già usato la richiesta romantica disponibile oggi.” No redesign or wallet.

Migration refuses incompatible historical counters above one instead of rewriting history. Staging had zero counters, so no data rewrite was needed. It installs transactionally with staging binding guards and a short lock timeout.

## Verification

- Targeted romantic/client/social and migration-inventory tests: 33/33 PASS.
- Full suite: 919/919 PASS (914 baseline + 5 quota tests), no skipped/cancelled tests.
- Build PASS; typecheck PASS; diff whitespace check PASS.
- Native PostgreSQL 17.11 independent-session proof PASS: two actual sessions observed waiting on the existing advisory lock, two different boards, only one initiative/counter increment. Retry unchanged. Second race crosses Rome midnight while lock held: exactly one new initiative on the new day; max used = 1 for each day.
- Rome midnight, both DST transitions, 23/25-hour calendar days and unrelated caller timezone tested. UTC timestamp storage unchanged.
- Existing accepted request creates one Match, double accept stays idempotent, normal message write/read tested; full suite covers Chance, ORA, moderation/RLS, PHOTO, recovery, SEC-01 and LOC-01.
- Staging migration 060 applied and registered; limit 1, CHECK validated, anonymous RPC denied, authenticated private quota writes/helper access denied. No staging synthetic accounts/content/PHOTO uploads created.
- Before/after staging fingerprints identical: 4 profiles, 42 Storage objects. PHOTO OPEN, cleanup/schedulers OFF; Chance/Discovery OFF; no Chance cron. Retention Phase A remains active at `0 3 * * *`; all other cron states unchanged.
- Disposable native test container, volume and random credentials removed.

Evidence: `docs/evidence/spotted-one-day/native-races.json`, `staging-migration.json`, `staging-authorization.json`.

## Deployment and limits

Runtime migration is staging only. Fresh static Preview is READY:

- URL: https://spot-9i1syz4fz-fedegrasso1994-1482.vercel.app/
- Deployment: `dpl_J3yL51RksbzMWA2ttmQbzAnXmg8K`, true Preview (`target=null`), no aliases assigned.
- Runtime/artifact commit: `1ba7d1dce6ed2036c61caccbe8a849f459ef19aa`.
- Chrome real page loads welcome; served `/build-info.json` confirms exact commit, staging branch/ref and publishable key source. Public-only artifact scan PASS (zero secret/Production ref). No authenticated end-to-end browser quota test claimed: behavior is proved by PostgreSQL-backed targeted tests, actual independent-session native races, frontend CTA tests and deployed staging function/ACL verification.
- No Auth redirect/env changes. Production aliases `spot-now-alpha.vercel.app` and `spot-now-fedegrasso1994-1482.vercel.app` still target original `dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh` (read-only verified).

 No new human login or Auth configuration is required for this quota change. Production/main remain untouched. Existing requests, pair guards and Match/chat records are not altered. Calendar-day quota is intentionally not a rolling 24-hour quota. No additional residual product risk identified; neutral API responses intentionally do not expose delivery outcome.
