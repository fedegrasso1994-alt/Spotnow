# Real PostgreSQL two-session protocol

Use the two SQL Editor tabs in staging only, after `spot-v2-fixture.sql`.
Never simulate MVCC by Promise.all on one PGlite connection.

For each case prepend `begin; set local soma.spot_race='MODE';` to
`spot-v2-race-prepare.sql`. It creates quotas through actual successful RPCs.
No manually fabricated quota credits.

Session A: BEGIN; SET LOCAL statement_timeout='45s'; SET LOCAL ROLE authenticated;
set JWT sub to sender A; call send_spot_v2(target A,gen_random_uuid());
SELECT pg_sleep(8); COMMIT; SELECT 'A committed' evidence;

Start B while A is sleeping: BEGIN; SET LOCAL statement_timeout='45s';
SET LOCAL ROLE authenticated; set JWT sub to sender B;
DO a nested exception block calling send_spot_v2(target B,gen_random_uuid()).
Catch only expected quota failures (raise all others). COMMIT; show notice/result.

| Mode | A sender → target | B sender → target | Required committed outcome |
|---|---|---|---|
| place | 1 → 4 | 1 → 5 | place used3, global3, three intents, B PLACE_QUOTA |
| global | 1 → 6 | 1 → 7 | global5, Place2 used2, five intents, B DAILY_QUOTA |
| retry | 1 → 2 | 1 → 2 | one pending/ID, global1, two receipts |
| reciprocal | 1 → 2 | 2 → 1 | one Match, two matched intents, one charge per sender |
| existing | 1 → 2 | 2 → 1 | same Match, same two intents, no extra charges |

IDs: user n `fea34000-0000-4000-8000-N` (12 digit N).
After each pair, assert invariants with real table queries before next reset.
Use ROLLBACK case as additional check; neither ledger nor quota survives it.
TRIBE cross-surface logic is tested against ready controlled exposures locally;
never globally activate discovery/allocate real profiles for this concurrency test.
Finish with `spot-v2-teardown.sql`, then global invariants/baseline check.
