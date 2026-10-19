# DD outgoing Spot state — contract and verification

Scope: payload enrichment only on `codex/soma-schema-v2-staging`. No TRIBE frontend, SPOTTED, Production/main, PHOTO, policy/clock, quota, fairness, scheduler or cleanup changes.

## Contract

Each **already authorized and returned** `my_daily_discovery().profiles[]` item adds exactly:

```json
{"outgoing_spot_pending": false}
```

The boolean is true iff an existing `spot_private.spot_v2_intents` row has `sender_id = auth.uid()` (the projection's `me`), `recipient_id = profile.id`, `state = 'pending'`, and `valid_until > clock_timestamp()`. No origin filter: ORA/TRIBE/legacy intents in the v2 ledger share person-level semantics. No original timestamp or validity is updated. Expired, invalidated and matched records do not qualify. Match presentation continues through existing authorized Match APIs, not another state model.

No incoming lookup, readiness indicator, match probability, origin, intent ID or timestamp is added. The boolean is only about the caller's own outgoing action. It is not profile authorization and does not preserve an expired/closed exposure. The existing authorized-profile join, exposure filter and policy gates execute unchanged. The indexed pair lookup uses the existing Spot v2 ledger/indexes.

Migration `039_dd_outgoing_spot_state.sql` changes only the private `dd_current_projection()` JSON projection invoked by the existing public RPC. It preserves the public function, ACLs, security-definer/search-path configuration, tables, RLS and write engines. Guarded exact replacement aborts on unexpected dependency drift or an already-enriched projection; transaction rollback prevents partial application. Like historical migrations, do not reapply it manually. Apply only with staging environment/project identity, Discovery OFF and policy2 disabled/paused. Rollback, if required while OFF: restore the prior projection definition from the preflight snapshot; no data/schema rollback is needed.

## PostgreSQL evidence

Eight new PGlite/PostgreSQL tests use only isolated synthetic databases and real SQL/RPC execution, not transport mocks:

1. No outgoing => false; only one new payload key; no private-table/helper access.
2. TRIBE pending => true; allocation/profile projection otherwise unchanged; one initial debit only; retry and repeated reads preserve complete ledger/operation/expiry/quota snapshots.
3. ORA pending => true; DD reads charge neither TRIBE nor ORA; original profile/exposure fields unchanged.
4. Expired/invalidated/matched => false; an expired still-pending row is not active; no renewal on read. Synthetic timestamps respect the existing exact720h constraint.
5. Incoming-only => identical viewer profile payload and own quota; no incoming state leak.
6. Closed exposure => profile disappears and `authorized_profile` returns no row despite pending outgoing. Existing full-suite expiry/authorization tests also run.
7. Migration leaves public RPC byte-for-byte unchanged; OFF returns empty paused payload; wrong environment aborts.
8. Real public `my_daily_discovery()` returns ORA outgoing true and incoming-only false; repeated underlying projection reads preserve quotas/state. This isolated test supplies a synthetic clock only inside its disposable local database so CI can execute the active path at night. No hosted clock/config changes.

### Separate pre-existing public-wrapper issue — NOT fixed here

Before applying039, an isolated DB with migrations through038 reproduces: first public call returns2 authorized profiles, second public call raises `DD_WINDOW_OVERLAP`. The unconditional public wrapper INSERT/ON CONFLICT in038 triggers the existing BEFORE INSERT overlap guard before uniqueness resolution. This is unrelated to outgoing-state enrichment. Underlying projection rereads pass and are pure; **successful repeated calls to the public wrapper are not claimed**. A separate narrowly authorized fix is needed before TRIBE frontend refresh/navigation E2E. No overlap guard, allocator or wrapper shortcut is introduced in039.

## Hosted staging / final checks

Preflight: project `zjinjtkekmaqtxsuyvho`, environment staging, Discovery false, policy2 disabled/paused, jobs_paused true; PHOTO OPEN epoch12 with cleanup/scheduler false.4 accounts,4 profiles,42 photo objects;0 windows,0 exposures. Confirm email ON observed, unchanged. No hosted fixture, Auth config, Storage or product-data changes are needed for this contract-only migration. Active outgoing/incoming proof is the isolated PostgreSQL test, not a claim that hosted Discovery was enabled.

Final verification: **523/523 PASS** (515 baseline +8 new groups), build PASS, typecheck PASS. Implementation commit `3565dde0604920756251cff6ae6786c75a9e4c3d` was pushed before hosted application. After applying039 to staging: field present, own-sender predicate present, authenticated execution denied for private helper and retained for public RPC; baseline counts and all OFF controls unchanged. Evidence: `docs/evidence/dd-outgoing-spot/verification.json`.

Main remains `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`. No Production operation, frontend change, frontend Preview/deploy, historical migration change or test Auth setting change. Only the staging branch is committed/pushed. The final documentation commit SHA is returned separately to avoid self-referential hashes.

**DD OUTGOING SPOT STATE: GO** for this minimal additive contract. This is explicitly **not** a GO for TRIBE frontend or repeated public-wrapper refresh: the separate pre-existing `DD_WINDOW_OVERLAP` issue remains open and requires its own task. STOP; no frontend or SPOTTED work begun.


Follow-up: the separately identified public-wrapper refresh defect was subsequently resolved by migration040. See [DD idempotent read report](soma-dd-idempotent-read-2026-10-19.md). The039 implementation and evidence above remain unchanged.
