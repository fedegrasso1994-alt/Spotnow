# TRIBE Chance — local acceptance closure

## Outcome and scope

TRIBE CHANCE: GO FOR REVIEW. This closes Chance acceptance using the founder-approved
local strategy. It does not activate staging or ordinary users and does not certify
PHOTO. Baseline branch `codex/soma-schema-v2-staging`, commit
`cc4de343bce0d205b7d9e11a4d002526b403cda0`.

No staging fixture, cloud job, PHOTO upload, QA-account mutation or recovery action
was performed in this task. The only release-source change is two scoped rules in
`src/chance.css`: allow the serial navigation buttons to share available width,
while retaining space for the position counter. Chrome demonstrated clipping at
320 px before this change. No redesign, global CSS refactor, schema migration or
product-logic change.

## A–F. Fixtures, scheduler and invariants

A fresh dedicated PostgreSQL **17.11** container used **pg_cron** and a separate
PostgREST **16.4** service. No recovered/source database was used. The repository's
existing local SQL QA seed was exported and reduced to six active synthetic
profiles before acceptance. Stable synthetic UUIDs, adult/consent eligibility,
compatible preferences, no block/suspension/Match conflict and shared Tribe came
from that seed. The seed includes QA publication registry rows; these do not claim
codec or staging PHOTO certification. For visual QA, real deterministic JPEG bytes
were generated locally through the existing validator/normalizer, registered per
local owner and checked through `resolve_authorized_photos`.

**Native scheduler PASS:** exactly one actual pg_cron background-worker execution
completed with `succeeded / DO`. It called the unchanged `chance_tick()` twice.
One eligible release window produced **3 reciprocal exposures / 6 owner-state rows**.
Both endpoints reference the same exposure and window, hence the same release and
expiry. Stored invariant: `ends_at - starts_at = 24 hours` for every canary window.
The release was `2026-10-30T18:23:08.820562Z`; the receipt was written at
`18:23:14.019886Z`, approximately **5.20 seconds after the configured slot**. Expiry
is therefore `2026-10-31T18:23:08.820562Z`, not dispatch time plus 24 hours.

The two tick calls produced identical exposure fingerprints. No duplicate Chance.
The job disarmed itself and was removed; zero remaining jobs. No second automatic
execution was scheduled or performed. See `scheduler.json`.

**Separate deterministic cases PASS:** with three Tribe memberships per account,
the real builder produced **3 Chance/account globally**, not three per Tribe.
No assignment was fabricated to reach four. The approved contract is *up to four*;
the existing engine tests additionally exercise the four-cap boundary. With only
two allowlisted accounts, exactly **one reciprocal pair** was produced; remaining
slots stayed empty. See `global-cap-backlog.json` and `small-pool.json`.

After the native scheduler proof, only the disposable QA database used a qualified
test-clock dependency for Chance/DD and the shared Spot write, to exercise future
windows and expiry without waiting 24 hours. This is explicitly separate from the
native-clock scheduler proof. No PHOTO function or repository SQL migration was
changed. Initial local-harness expectations incorrectly assumed four eligible
past/future slots and guaranteed full inventory; the engine correctly skipped
pre-activation slots and returned partial inventory. These expectations were
corrected against the approved contract and preserved results were inspected,
without rerunning the automatic scheduler. Native PostgreSQL clock fast-pathing
and the local `/rest/v1` proxy were also resolved in the harness before final QA.
These were not classified as product defects.

## G–I. Real application / Chrome QA

The actual `live.js`, pilot shell, Chance UI/state/API modules and official client
called real local PostgREST/RPCs. The existing DEV backend-injection seam provided
synthetic Auth context only. No mock Chance payloads or locally invented profiles
were used in the final browser verification. This is not a fresh Auth/MFA test.

- Unrevealed: **Hai una nuova Chance 👀**, voluntary reveal CTA, zero profile cards.
- Backlog: **Hai 3 Chance da scoprire**, count only, no thumbnails or gallery.
- Reveal: exactly one card/image, Tribe attribution, Spot/Continua, real expiry.
- Continua moves serially without automatically revealing the next profile.
- Precedente reopens the still-valid revealed Chance; one card only.
- Real local Spot write: **Spot inviato**, disabled CTA. Pending state survives
  reload and revisit. The reload may select the next unrevealed Chance; serial
  navigation returns to the pending one.
- Server-derived next-release and expiry countdowns were visible.
- After advancing QA time past expiry, the prior revealed card/photo is absent.
  A new eligible unrevealed Chance may appear; expiry does not imply an empty pool.
- **320×780** and **390×844**: no horizontal overflow; serial actions stay within
  viewport bounds after the scoped CSS fix. Vertical scrolling makes the entire
  action row reachable above bottom navigation. Existing SOMA typography, coral,
  dark palette, cards and frozen bottom navigation remain unchanged.

Screenshots and measured geometry are under `screenshots/` and `browser.json`.
The `320-before-nav-fix.jpg` image intentionally records the demonstrated defect;
the other screenshots show the final behavior. `320-after-expiry.jpg` shows safe
post-expiry state with a new valid unrevealed Chance, not the expired profile.

## J. Staging evidence retained

Existing real staging backend smoke remains the evidence for reciprocity, reveal,
concurrent Spot and unified Match: `docs/evidence/tribe-chance/runtime-smoke.json`,
with the prior report `docs/soma-tribe-chance-2026-10-30.md`.

Existing immutable Preview:
https://spot-qmggd6u98-fedegrasso1994-1482.vercel.app/

No new deployment was requested or performed. This URL retains its prior artifact;
the new narrow CSS correction was reviewed locally and committed to the staging
branch. The Preview is not presented as proof of the new local CSS correction.

## K–O. Regression, cleanup and limitations

- Chance targeted: **29/29 PASS**.
- Full suite: **914/914 PASS**, zero skipped, one final full-suite execution.
- Build **PASS**; typecheck **PASS**.
- The full suite includes PHOTO, recovery, Auth, ORA, SPOTTED, Match/chat and the
  existing security/location regressions. No rerun-until-green of that suite.
- Local QA server, both dedicated containers, anonymous volumes, both networks,
  private credentials and generated browser fixture files removed. Six active
  local accounts/profiles disappeared with their isolated target. Zero QA jobs.
- Read-only staging postflight: Chance OFF, Discovery OFF, scheduler Chance OFF,
  **zero Chance jobs**. No source fixture created. The earlier seven-fixture
  cleanup remains verified: zero accounts/profiles/objects/jobs/validated rows.
- Original **42 Storage objects** match the pre-canary fingerprint. PHOTO remains
  OPEN, cleanup OFF and scheduler OFF. Existing other cron configuration unchanged.
- Main/origin-main remain `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.
  No Production, provider, recovery, ORA or SPOTTED mutation.

**PHOTO limitation:** the historical staging fixture attempt remains inconclusive
(`BUSY` / worker 503, exact guard unknown). This task neither retried it nor claims
**PHOTO staging canary PASS**. It is not evidence of a Chance regression and is not
used as a blocker for these separately completed Chance gates.

## P–R. Files, Git and evidence

Release source: `src/chance.css` only. Operator modules:
`scripts/chance-local-qa/{environment,prepare,canary,app,cases,cleanup}.mjs` and README.
This report, the source-of-truth acceptance note and minimized evidence are the
other changes. No local credentials, fixture HTML/JS or seed SQL is committed.

Evidence root: `docs/evidence/chance-local-qa/`:
`preflight`, `scheduler`, `global-cap-backlog`, `small-pool`, `local-clock-adapter`,
`app-environment`, `browser`, `browser-expiry`, `expiry-case`, `cleanup`,
`staging-off`, `tests`, `screenshot-sha256` JSON and final JPEG screenshots.

The closure commit is the commit containing this report; its SHA and verified
remote/working-tree status are returned in the completion message.

TRIBE CHANCE: GO FOR REVIEW
