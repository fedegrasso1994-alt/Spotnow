# Chance experience + navigation label rename

Baseline: `codex/soma-schema-v2-staging`, `089926b714614219569a488e9787ff2a574783a4`, clean tree, 927 baseline tests. Scope: frontend composition and discovery destination label only. No global visual refresh.

## A. Review screenshots

Portable gallery: `evidence/chance-experience/index.html`. Raw unretouched Chrome JPEGs and SHA-256 hashes are alongside it. Gallery captions explain hierarchy/change/deferred work per state.

| State | Evidence | Hierarchy / change | Deferred |
|---|---|---|---|
| A. No Chance | `390-waiting.jpg`, `320-waiting.jpg` | Actual next release and countdown are the hero; no profile or serial controls | Global motion/art direction |
| B. One unrevealed Chance | `390-single-unrevealed.jpg`, `320-single-unrevealed.jpg` | Static abstract SOMA forms, one message and one primary reveal CTA; no navigation controls | More elaborate illustration/motion |
| C. Multiple pending | `390-backlog.jpg`, `320-backlog.jpg` | Same single introduction; count secondary and next time tertiary; no avatars/previews | No gallery is planned |
| D. Revealed | `390-revealed.jpg`, `390-revealed-backlog.jpg`, `320-revealed.jpg` | Person/photo, nearby expiry, primary Spot; subtle arrow/index/Continue | Portrait art direction, global type scale |
| E. Spot sent | `390-spot-sent.jpg`, `320-spot-sent.jpg` | Persisted disabled Spot label with existing neutral SOMA tokens | Global success animation/copy audit |
| F. Revisit | `390-revisit.jpg`, `320-revisit-after-reload.jpg` | Same still-valid person, one at a time; pending survives reload | Global iconography |
| G/H. Responsive | 320 and 390 versions above, `320-long-copy.jpg` | No horizontal overflow, text wraps, action row above bottom bar | Physical-device safe-area/accessibility QA |

These are the actual live application, Chance modules and real local PostgREST/RPCs using the previously approved disposable synthetic QA scaffold. Only Auth is the existing DEV fixture seam; no real Auth/MFA recertification is claimed. The multicolored photo is a deterministic technical QA JPEG, not SOMA artwork or a real person's photo. The abstract pre-reveal element is the actual new CSS UI, with no candidate data or faces. No mock Chance payloads or gallery of real users was used.

The local pool produced three valid Chance (two still unrevealed at the backlog screenshot); no fixture was invented to force four. This does not change the four-global/day maximum. A deterministic local server-clock adapter selects states, as in the prior accepted harness; source server clocks, schedules and product SQL are not changed.

## B–C. Frontend rename only

Final current pilot navigation: **CHANCE | SPOTTED | ORA | MATCH | PROFILO**.

Only `PILOT_TABS` visible label and the discovery page heading change from TRIBE/Tribe to CHANCE/Chance. Icons, five-tab structure, IDs (`daily`), route aliases and history stay unchanged. Legacy membership/demo screens are not globally renamed. Tribe memberships, selection, max3 engine, IDs, board context, internal `tribe` origins, RPC names and all backend objects are untouched. The Source of Truth updates destination terminology while retaining the community concept and frozen product rules.

## D. Visual/interaction composition

- Discreet CHANCE heading; existing introductory tagline hidden only inside the Chance screen to reduce redundant hierarchy.
- New tiny `chance-hero.js` module creates only decorative document elements, `aria-hidden`, with no user/target arguments, requests or images. Scoped CSS reuses SOMA surface/line/muted/coral tokens for two restrained static forms and one signal. No assets, dependencies, face sphere, animation infrastructure or imported branding.
- Before reveal: “Hai una nuova Chance 👀”, “Soma pensa che ci sia qualcuno che dovresti conoscere.”, “Scopri la tua Chance”. No Previous/Continue, index, thumbnail or preview is visible before a person is actually revealed.
- Backlog count follows the primary content/action. Next release is a small “Prossima alle …” note while valid Chance exist; its countdown is hidden. With zero available Chance the real next-release label/countdown moves above the waiting message and becomes the focal information.
- After reveal the photo starts directly below the quiet page heading. Frame becomes 4:5 rather than 5:6, using the same existing card primitives/radius. Expiry remains immediately by the photo, “Scade tra Xh Ym”. It is the only prominent timer; no competing next-release countdown.
- Spot remains the coral primary button. Continue uses the existing lightweight backlink primitive, without X/dislike semantics. Previous becomes a small arrow with accessible name “Chance precedente” and 44px target; index is subdued. No carousel, swipe or gallery added.
- Removing a person also hides the controls immediately, including while an expired-card refresh is pending. Loading/error presentation attributes are explicit; stale-response/expiry guards remain unchanged.

Unrevealed metadata, selection/order, voluntary reveal RPC, persisted reveal, same-op retry, pending Spot, Continue navigation, Match, expiry and monotonic clock algorithms are unchanged. There are no new write calls, client quotas or backend authorization paths. Serial revisit remains available after reveal/through the existing valid-Chance sequence; pre-reveal controls are deliberately hidden as explicitly requested.

## E. Deferred to the whole-app refresh

Global typography/color/spacing tokens, bottom-nav icons/architecture, ORA/SPOTTED/Match/Profile visuals, elaborate artwork or motion, physical-device QA and complete accessibility certification are unchanged/deferred. The existing status announcement after Spot remains; it was not removed to polish away accessible feedback. Previously identified stale ORA/SPOTTED documentation lines remain outside this Chance-only task.

## F–G. Validation

- Focused Chance frontend / pilot navigation / shared Spotted-shell label regressions: **35/35 PASS**.
- Final full suite: **930/930 PASS** (927 baseline + 3 presentation regressions), zero failed/skipped/cancelled tests.
- Build PASS; typecheck PASS; diff whitespace check PASS.
- Existing backlog assertion now targets `.chance-backlog` instead of the first generic privacy-note, because DOM composition intentionally changed. Its count assertion is retained. New tests prove decorative-only hero/no pre-reveal requests or controls, revealed action/timer hierarchy, and empty-vs-paused countdown presentation. Existing expiry regression also asserts immediate control removal while refresh is pending.
- Final full run covers the last visibility adjustment; it was not a retry-until-green of unchanged code.
- Chrome 320×780 and 390×844: no clipping/horizontal overflow observed, long name/context wraps, Spot/serial controls above bottom navigation. At 320 the measured Spot bottom is about 512px, serial row bottom 564px, bottom-nav top 712px. Exactly one candidate photo when revealed; zero before reveal/after expiry. Pending Spot survives a fresh page load and revisit.
- Read-only staging comparison matches previous accepted baseline: profile/Storage/presence fingerprints, public/private function hashes and explicit ORA definitions/policy unchanged. Original 42 Storage objects unchanged. Chance/Discovery and Chance scheduler remain OFF; cron unchanged. PHOTO OPEN, cleanup/schedulers OFF.
- Six local synthetic principals/profiles/photos, generated app files, private credentials, server, two named containers/volumes and networks removed. Zero jobs throughout; no scheduler canary run. Recovery target never used.

## H–J. Files, deployment and Git

Release frontend: `src/pilot-ui.js`, `src/chance-ui.js`, `src/chance.css`, new `src/chance-hero.js`. Tests: `tests/chance-ui.test.js`, `tests/pilot-ui.test.js`, only shared-nav expectation in `tests/spotted-social-client.test.js`. Documentation: Source of Truth, this report, evidence/gallery/screenshots. Existing local QA environment/case/README now accept `SOMA_CHANCE_VISUAL_QA=experience` to separate evidence from prior reviews.

No backend/RLS/migration, ORA, SPOTTED, PHOTO or recovery release file changed. No Vercel/provider/env operation was performed; existing immutable Preview URLs are not claimed to serve this new presentation. The reviewed app ran locally at the committed source. No ordinary-user feature activation implied.

Main/origin-main remain `d0f515e8d2c80eeae60f2d5c33dd8901558d5287`; Production unchanged. Completion message supplies closure commit/remote SHA and clean working-tree proof. No new product/security blocker remains for this frontend review.

CHANCE EXPERIENCE + NAV RENAME: GO FOR REVIEW
