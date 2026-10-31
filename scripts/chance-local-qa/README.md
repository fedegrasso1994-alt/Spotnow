# Disposable local Chance acceptance

Operator-only QA, never imported by the release app. No source/staging credentials,
recovery containers, cloud scheduler or PHOTO upload endpoint are used.

Prerequisites: bundled Node dependencies and the already-installed Docker images
`supabase/postgres:17.11.0.004`, PostgREST `v16.4`. Commands run from the repository.

1. `node scripts/chance-local-qa/prepare.mjs --create-disposable-local`
2. `node scripts/chance-local-qa/canary.mjs --one-native-scheduler-run`
3. Start `node scripts/chance-local-qa/app.mjs` in a separate process.
4. `node scripts/chance-local-qa/cases.mjs backlog`
5. Review `http://127.0.0.1:4273/tests/fixtures/chance-local-review.html` in Chrome.
6. `node scripts/chance-local-qa/cases.mjs expired`, then review old-card removal.
7. `node scripts/chance-local-qa/cases.mjs small-pool`
8. `node scripts/chance-local-qa/cleanup.mjs --destroy-disposable-local`

The standard test seed is reduced to six synthetic profiles before the canary.
The native scheduler runs once, using the native wall clock and unchanged tick;
the second tick in the same scheduled invocation tests idempotence. Three fixture
slots precede activation and must be skipped; only the future slot releases.
The job is disarmed by an impossible calendar schedule, then removed. Never
reschedule a failed canary. The private `canary-started` marker rejects repeats.

Subsequent case preparation uses a qualified clock dependency in this disposable
database only, because native PostgreSQL fast-paths its built-in clock function.
Chance/DD and the shared Spot write see the same QA time; PHOTO functions are not
adapted. This is not another automatic scheduler run. Normal pair selection may
yield fewer than four profiles: assert the upper bound, never force inventory.

The application uses the existing DEV backend-injection seam and real `live.js`,
Chance components, Supabase client, PostgREST and application SQL/RLS. Local Auth
identities are the repository's test scaffold, not an Auth/MFA acceptance proof.
Photo bytes are generated locally with the existing validator/normalizer, assigned
to each local owner and resolved through the real authorization RPC. They are not
staging uploads or a PHOTO canary. Vite serves only loopback and ignores root env.
All JWTs/passwords are ephemeral, ignored by Git and removed by cleanup.

The recovery environment is never reused. Cleanup removes only the explicitly
named `soma-chance-qa-*` containers/networks, their anonymous volumes and generated
browser files. Evidence remains under `docs/evidence/chance-local-qa/`.

## Focused visual review (no scheduler)

Set `SOMA_CHANCE_VISUAL_QA=1` for every command to write separate evidence under
`docs/evidence/chance-visual-sanity/`. Create the disposable local target, then run
`visual-cases.mjs waiting`; start `app.mjs` as above. Advance with
`visual-cases.mjs single`, `backlog`, `expired`, `shortage` and reload the real app.
Do **not** call `canary.mjs` for this path. Chance scheduler stays false and cron
has zero jobs. Only these local fixture controls are enabled, never staging.
Run `cleanup.mjs --destroy-disposable-local` with the same environment flag.
`prepare.mjs` waits for TCP readiness, distinguishing the official image's
socket-only initialization server from its final database service.
