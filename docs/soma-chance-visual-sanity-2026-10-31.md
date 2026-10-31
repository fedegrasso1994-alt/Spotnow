# Chance — visual / UX sanity review

Baseline: staging branch `codex/soma-schema-v2-staging`, commit `cba6c6e19c1ad4ac848f5688c9d21ebe99169d40`, clean tree, 927 tests. This is a focused visual review, not the final SOMA refresh.

## A. Screenshots and test surface

Open `evidence/chance-visual-sanity/index.html` for the portable screenshot gallery. Raw JPEGs and their SHA-256 hashes are adjacent. These are actual Chrome screenshots at **390×844** and **320×780**, without compositing or image retouching.

The actual `live.js`, pilot shell, Chance UI/state/API and local PostgREST/RPCs were used through the already-approved disposable QA path. This is not a mocked Chance payload/demo screen and not a live staging-user session. Only local Auth is the existing DEV synthetic scaffold. The deterministic color photo is a same-owner technical QA JPEG, not SOMA artwork, a real user's photo or a new PHOTO certification. Local server time is explicitly adapted for visual states; no client countdown authority or product SQL was changed.

Staging Chance/Discovery stayed OFF. No staging account, fixture, profile, photo, cloud scheduler, provider configuration or deployment was modified. No native scheduler was run, including locally. The local fixture was six disposable synthetic accounts, destroyed after screenshots.

| State | Evidence |
|---|---|
| A. Nothing available before release; next release/countdown | `390-waiting.jpg`, `320-waiting.jpg` |
| B. New voluntary reveal: headline, copy, primary CTA | `390-unrevealed-backlog.jpg`, `320-unrevealed-backlog.jpg` |
| C. One revealed profile, attribution, expiry, Spot/Continua | `390-revealed.jpg`, `390-second-revealed.jpg`, `320-revealed.jpg` |
| D. Multiple pending Chance; numeric backlog only | `390-unrevealed-backlog.jpg` (3 undiscovered; position 2/4), zero candidate images/cards |
| E. Valid revisit, same first profile via Precedente | `390-revisit.jpg` |
| F. Spot sent, disabled CTA; state persisted after reload/revisit | `390-after-spot.jpg`, `320-after-spot.jpg` |
| G. After expiry, old profile/photo removed | `390-after-expiry.jpg`, `320-after-expiry.jpg`, `browser-expiry.json` (0 cards/photos) |
| H. Insufficient pool after scheduled slots; no fabricated filler | `390-pool-shortage.jpg`, `visual-shortage.json` (0 Chance from real builder/read) |
| Serial end/resting state and return invitation | `390-resting-revisit.jpg` |
| Long synthetic name and Tribe context | `320-long-copy.jpg`, `390-long-copy.jpg` |

Empty-after-expiry and pool-shortage intentionally reuse the existing safe waiting UI; no new expired-history product or missing-candidate signal was added. The explicit reveal-error screen was not artificially forced; its existing frontend regression coverage remains in place.

## B–C. Issues and micro-fixes

Only **eight added lines in `src/chance.css`** affect release UI. No JavaScript, DOM structure, API, copy text or backend logic changed.

1. Reveal/wait headline inherited small, muted chat-empty typography. It now uses the existing SOMA display family and text token, 30 px, clear line height, balanced wrapping and zero implicit heading margins.
2. The release countdown looked like secondary metadata. It now uses 20 px/600 with the existing color and tabular numerals; the row aligns vertically. Server timestamps and timer code unchanged.
3. Tall 3:4 cards brought serial actions against the bottom bar at 390 px; backlog made the remaining gap smaller. A scoped **5:6** Chance photo frame leaves measured gaps of **20.91 px at 390** and **18.41 px at 320**, including backlog. Existing radius/overlay/card/button language retained. No global card rule changed.
4. Expiry is centered and uses tabular numerals; explanatory copy has a readable 30ch measure.
5. The globally faded disabled primary button made “Spot inviato” hard to read. Only the Chance Spot disabled state now uses existing surface2/muted tokens at full opacity. Available Spot/reveal remain coral; button behavior is unchanged.

Before images retain the original rendering for comparison, clearly named `*-before.jpg`.

## D. Deliberately deferred

- Global navigation/icons, branding, type scale, full visual system and other screens.
- New reveal animations, illustrations, portrait art direction or a broader waiting-screen redesign.
- Broader copy strategy/personalization and additional interaction mechanics.
- Physical-device safe areas, complete accessibility certification and final device QA: this review uses Chrome viewports, not an iOS/Android device claim.

The composition preserves anticipation and a voluntary reveal, with one central person and restrained secondary content. No swipe deck, catalogue, gallery, popularity, social proof, premium mechanics or borrowed Breakfast branding was introduced. The requested interaction principles were used as direction; no new external visual identity was imported.

## E–F. Responsive and frozen behavior

No horizontal overflow at 320/390. Reveal/Spot/Continua remain reachable and the measured serial actions are above the unchanged bottom navigation. Long name wraps within the existing caption and Tribe context remains inside the card. Countdown is readable in both sizes. Zero photos before reveal and exactly one profile/photo while revealed; moving forward clears it and never auto-reveals the next person. Revisit and pending Spot survive reload. Past expiry the old person/photo is absent.

Chance allocation, schedule, fairness, eligibility, reciprocal pairing, 24-hour expiry, reveal persistence, Spot, Match and server countdown code are byte-unchanged. ORA, SPOTTED, PHOTO and recovery untouched.

## Operational tooling

Reused `scripts/chance-local-qa/{prepare,app,environment,cleanup}.mjs`. `SOMA_CHANCE_VISUAL_QA=1` isolates new evidence from the earlier acceptance evidence. The prepare readiness now probes TCP, because the official image's temporary initialization server is socket-only (same proven operator readiness correction as the ORA proof). New `visual-cases.mjs` selects waiting/single/backlog/expired/shortage in the disposable local target without enabling a scheduler. No release app imports these tools. README documents the review-only path.

## Documentation contradictions observed, not changed here

The Source of Truth still contains `no daily Place-count limit` in section 13 and `6 attempts/day` in section 20. These are stale relative to the explicit founder approvals, migrations 060/061 and updated quota sections/roadmap. They do not govern this Chance-only CSS review. No ORA/SPOTTED behavior or documentation was silently changed to reconcile them; a separate documentation correction remains appropriate.

## G–K. Validation, cleanup and Git

- Targeted frontend (Chance UI/artifact + pilot shell): **22/22 PASS**.
- Full suite: **927/927 PASS**, zero skips/cancellations/failures; one full-suite run.
- Build PASS; typecheck PASS; diff whitespace check PASS.
- Local server, both named containers, anonymous volumes, networks, six synthetic accounts/profiles/photos, private credentials and generated browser fixture JS/HTML removed. Zero jobs throughout; no scheduler canary performed.
- Read-only staging state equals the post-061 baseline: profiles, expired presence rows, 42 Storage objects, all public/private function definitions, flags and cron configuration unchanged. Chance/Discovery/scheduler OFF, PHOTO OPEN/cleanup OFF/schedulers OFF, Retention Phase A schedule unchanged.
- Main/origin-main unchanged. No Production, provider/deployment/env, PHOTO, recovery, ORA or SPOTTED mutation.
- Files: `src/chance.css`; operator `scripts/chance-local-qa/{environment,prepare,visual-cases}.mjs` and README; this report and evidence/gallery/screenshots under `docs/evidence/chance-visual-sanity/`.
- No new staging deployment requested/performed; existing immutable Preview URLs do not claim to serve this new CSS. Review evidence is the actual local app at the committed source, not a screenshot of a newly deployed staging artifact.
- Commit/push SHA and final clean working tree are reported in the completion message.

CHANCE VISUAL SANITY: GO FOR REVIEW
