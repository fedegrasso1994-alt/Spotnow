# Chance final micro-polish — GO FOR FREEZE

Baseline: `codex/soma-schema-v2-staging`, `eba753d5442e6dedcefb88b737605aa3f5c5a647`, clean working tree, 930 baseline tests. This is the last Chance-specific visual pass until the global SOMA visual refresh.

## Only three refinements

**Hero:** kept the existing 160px decorative element and DOM. Its two CSS pseudo-elements now use mildly asymmetric organic contours, layered SOMA surface/coral-dim gradients, a shallow inset/shadow and a smaller offset coral signal with restrained soft glow. It stays static and lightweight: no new assets, graphics library, animation, face, target data or preview.

**Editorial reveal title:** only the unrevealed heading now uses the existing SOMA Inter/body family at 22px/600 with 1.35 line-height instead of the condensed 30px display treatment. The string itself is unchanged. The existing title case becomes readable through the font, with a little more space between hero/title/body. Other page headings, global fonts and waiting-state typography remain unchanged.

**Revealed person dominance:** the same card gains a slightly taller standard SOMA 3:4 portrait frame (from 4:5). The current expiry stays unchanged immediately below the photo: “Scade tra Xh Ym”. Spot retains its current primary treatment. Previous arrow becomes 18px/muted, index 11px, Continue 13px/400, and next-release text 11px. All required controls remain present and retain at least 44px touch height; no handler, order, state transition or meaning changes.

Release source difference is **`src/chance.css` only**. `chance-ui.js`, `chance-hero.js`, API/state modules, global styles, backend, RPCs, RLS, schema, product rules, copy strings and navigation labels are byte-unchanged.

## Visual verification

Gallery: `evidence/chance-final-polish/index.html`. Raw Chrome JPEGs and SHA-256 hashes are alongside it. Before images are copied unretouched from the accepted `eba753d` review, explicitly labeled as baseline.

- 390×844 and 320×780: no horizontal overflow/clipping observed; pre-reveal title/body/CTA fit. At 320 the reveal CTA ends near y431, well above bottom-nav y712.
- Revealed portrait height is about 472px at 390 and 379px at 320. Expiry remains by the photo and clearly above secondary navigation/next release.
- Required serial controls remain usable with a 44×44px previous target and 44px-high Continue. Backlog + sent Spot state also verified at 320; one candidate photo only.
- Existing no-inventory waiting hierarchy remains unchanged. No faces/previews are requested before reveal.
- Actual app + real local PostgREST/RPCs on the already-approved disposable synthetic scaffold. Only Auth is the existing DEV fixture seam. The multicolored picture is a deterministic technical QA JPEG, not new SOMA artwork or a real person's photo. No Auth/PHOTO recertification or physical-device QA is claimed.

## Tests and invariants

- Targeted Chance UI / pilot shell / artifact frontend tests: **25/25 PASS**.
- Full suite: **930/930 PASS**, zero failures/skips/cancellations, one full-suite execution.
- Build PASS; typecheck PASS; whitespace diff check PASS.
- No new product logic, backend code, API calls or scheduler jobs. All existing Chance/Spot/Continue/Match/expiry semantics remain unchanged.
- Read-only staging state matches the prior accepted snapshot: function hashes, data/Storage/presence fingerprints, flags and cron unchanged; original 42 Storage objects unchanged. Chance/Discovery/scheduler remain OFF. PHOTO remains OPEN, cleanup/schedulers OFF.
- Dedicated local server, six synthetic principals/profiles/photos, two containers/volumes, networks, generated browser fixture files and private credentials removed. Zero jobs throughout. No staging fixtures, source account changes or recovery target reuse.
- No Production/main change and no Vercel/provider/env operation. This is local visual evidence at the committed source, not a claim that an existing immutable Preview now serves the polish.

## Explicit visual freeze and global-refresh brief

Chance-specific visual work is **FROZEN until the global SOMA visual refresh**. The authoritative freeze is also recorded in section 8 of `SOMA_PRODUCT_UX_SOURCE_OF_TRUTH.md`.

For that future app-wide refresh:

- Chance should receive substantial premium polish and remain one of SOMA's flagship screens.
- The hero may be redesigned more deeply.
- Motion and transition quality may be upgraded.
- Typography, spacing, cards and the overall SOMA visual language will be harmonized across the whole app.

These are deferred design goals. None of that broader refinement is implemented or started here.

## Files / source control

Product CSS; Source of Truth freeze note; this report and screenshot/evidence gallery. Existing local QA environment/case/README accept the separate `freeze` evidence selector (operator-only, not a product rollout flag). No application JavaScript changes.

Commit/remote SHA and final working-tree status are returned in the completion message. Push targets only `codex/soma-schema-v2-staging`. Main/origin-main remain `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`.

CHANCE FINAL POLISH: GO FOR FREEZE
