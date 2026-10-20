# SOMA Product / UX Source of Truth

**Status:** Authoritative for MVP / closed pilot  
**Change control:** Product semantics in this file change only after explicit Federico approval.  
**Implementation rule:** Codex must read this file before every frontend/product task, but must implement only the explicitly scoped task. Do not opportunistically implement future sections.

---

## 1. Product model

SOMA is not an infinite-swipe dating app.

It has three distinct discovery surfaces:

- **TRIBE** — scarce daily discovery inside the user's community.
- **SPOTTED** — anonymous community/social discovery based on content and personality.
- **ORA** — live discovery among people who declare they are at the same Place now.

All three converge into the same:

**MATCH -> CHAT**

There must never be separate match/chat systems per surface.

---

## 2. Main navigation

Bottom navigation for the pilot:

**TRIBE | SPOTTED | ORA | MATCH | PROFILO**

- TRIBE is the primary/home reward.
- SPOTTED is autonomous and must not live inside TRIBE.
- ORA is the live-presence mode.
- MATCH contains all matches and chats.
- PROFILO contains profile, photo, Tribe/place, preferences, dating pause, privacy, rights/support and settings.

Preserve the current SOMA visual language. No global redesign or style refactor unless explicitly requested.

---

## 3. Standard onboarding

Standard flow:

**signup/login -> 18+ -> dating consent -> profile -> photo -> mandatory pilot Tribe choice -> TRIBE Daily Discovery**

QR is not required for standard entry.

Auth channels:
- Google
- email

Current staging auth and PHOTO have real-world E2E coverage. Custom SMTP / SOMA-branded sender remains an operational task.

---

## 4. 18+ and dating consent

Use a clean "Prima di iniziare" screen.

- Checkbox: **Dichiaro di avere almeno 18 anni**
- Separate dating-consent checkbox with clear copy.
- No numeric age input.

Final legal copy still requires professional validation.

---

## 5. Profile / PHOTO

PHOTO-01/02 semantics are frozen unless explicitly reopened.

Expected UX:
- real upload and canonicalization;
- if a valid canonical photo already exists, a replacement in processing must not unnecessarily block profile completion;
- previous valid photo stays usable during replacement where existing semantics allow.

Staging PHOTO admission is currently operational; cleanup/scheduler activation remains a later ops/retention task.

---

## 6. Pilot Tribe choice

Do not title the screen "Le tue Tribe".

Use:

**Quale posto frequenti più spesso?**

Subcopy:

**Scegli il luogo che senti più tuo.**

Pilot choices, shown immediately as **three large tappable rectangles/cards**:
1. Università IULM Milano
2. Università Bocconi Milano
3. Palestra FitActive Cesena

Pilot UX:
- exactly one selection;
- no search;
- no multi-select;
- **no "Salta per ora" in standard onboarding**;
- clear selected state;
- CTA **Continua**.

Important: this is a **pilot UI policy only**. The backend Membership Engine remains capable of 0-3 Tribes for robustness/future use.

After selection:
**Continua -> TRIBE**
to deliver an immediate reward.

---

## 7. External QR exception to mandatory Tribe

There are two QR use cases:
1. in-app scanner inside ORA;
2. flyer / physical QR scanned with the phone camera.

The core rule is:

> **Scanning a valid SOMA Place QR is already the user's explicit voluntary declaration that they are at that Place.**

Therefore QR must not ask for a second "Sono qui" confirmation.

External flyer flow:

**phone camera -> SOMA QR/deep link -> auth if needed -> required 18+/consent/profile/photo -> ORA live for that Place**

- Preserve pending QR context through auth/onboarding.
- No automatic Tribe join.
- QR never bypasses the Tribe Membership Engine.
- If the user has no Tribe yet because they entered through QR, ORA still works.
- When that user later opens TRIBE or SPOTTED, require normal Tribe choice before granting those surfaces.

This is the intentional exception to mandatory Tribe selection in the standard onboarding flow.

---

## 8. TRIBE = Daily Discovery

TRIBE is not:
- a directory;
- a Tribe menu;
- a Bacheca selector;
- a repeated Place selector;
- infinite swipe.

Opening TRIBE should expose Daily Discovery directly.

Per window:
- up to **4 profiles**;
- max **2 new Spots**.

Per day:
- max **8 Daily Discovery exposures/profiles** total;
- max **4 Daily Discovery Spots** total.

These are global across all user Tribes in the future.

UI must include:
- profiles;
- Tribe attribution where relevant;
- Spot CTA;
- Spot budget/status;
- visible countdown to next window;
- partial-pool state;
- exhausted state.

If the compatible pool is too small, show fewer than 4. Never fill with incompatible profiles.

Approved Daily Discovery policy (Federico, 2026-10-19):
- Europe/Rome calendar day, 00:00–24:00, for daily quotas (ORA keeps its own calendar-day counters).
- Window A: 08:00 inclusive to 16:00 exclusive.
- Window B: 16:00 inclusive to next midnight exclusive.
- No active drop from 00:00 to 08:00; next window starts at 08:00.
- Server-derived boundaries/countdown; Europe/Rome DST civil-time conversion.
- Discovery remains OFF until the TRIBE frontend + Figma gate is ready.

---

## 9. Daily Discovery allocation rules

Server-side allocation by reciprocal pair.

If A sees B in a window, B must see A in the same window.

Priority:

**compatibility -> reciprocity -> exposure fairness -> novelty -> diversity -> randomness**

No popularity boosting.

Fairness concerns opportunity to be seen, not romantic outcomes.

Pair recurrence:
- never twice in the same day;
- hard floor ~72h;
- target ~7 days;
- recurrence between 72h and 7d allowed only when inventory is insufficient.

No replacement/refund of already assigned/consumed slots inside the same window.
A newly eligible user may join the current window through reciprocal additions only
in slots never assigned on either side. Existing profiles are never substituted;
4/window and 8/day allocated-profile counters remain authoritative even after safety
removals/leave. With no new eligible arrivals, repeated fetches remain unchanged;
new arrivals can add profiles in previously empty slots. Zero/partial pools remain valid.

A one-sided pending Spot does not preserve profile visibility.

---

## 10. Spot v2

A Spot targets a **person**, not person + context.

Cross-surface reciprocity must work.

Example:
- A Spots B in ORA.
- B later Spots A in TRIBE.
- => MATCH.

Internal origin metadata may record:
- ORA
- TRIBE
- legacy

Pending rules:
- one active pending per direction/person pair;
- idempotent retry;
- logical validity 30 days;
- existing unique Match persists.

---

## 11. ORA — inactive state

ORA is the third tab.

Headline:

**Scopri chi è qui ora con te**

Subcopy:

**Seleziona la location in cui ti trovi**

For the pilot:
- show Soma-controlled locations directly as large tappable cards;
- no complex search when inventory is small.

Two entry modes must be visible:
1. manual Place selection;
2. **Scansiona il QR del posto**.

---

## 12. ORA — manual and QR behavior

Manual:
**tap Place -> ORA live -> people**

In-app QR:
**scan valid QR -> ORA live**

External QR:
see Section 7.

No unnecessary intermediate confirmation after valid Place selection/QR action.

QR never:
- auto-joins Tribe;
- calls legacy membership writers;
- bypasses Tribe grace/cooldown/max3.

---

## 13. ORA presence semantics

- maximum one live presence per account;
- maximum duration 4h;
- same Place while active returns the existing presence;
- same Place does not silently renew expiry;
- changing Place atomically closes/replaces the previous presence;
- explicit **Esci da ORA**;
- no mandatory GPS;
- no daily Place-count limit;
- no user-facing visit-history product.

ORA is an explicit user declaration of current presence, not infallible location proof.

---

## 14. ORA live UX

After entering ORA, show immediately:
- current Place;
- remaining time;
- people currently present;
- profile cards;
- Spot CTA/status;
- **Esci da ORA**.

It should feel like:
**"queste sono le persone qui ora con te"**
not a technical check-in screen.

---

## 15. ORA Spot quota

Per account/day:
- max **5 new ORA Spots**.

Per same Place/day:
- max **3 new ORA Spots**.

Counters do not reset through:
- exit/re-entry;
- session renewal;
- changing Place;
- retry.

Server timezone:
**Europe/Rome**.

Same operation retry, an already-existing pending, an existing match, or failed transaction must not consume another credit.

Migration 028 prepared this schema; enforcement belongs to Spot v2.

---

## 16. SPOTTED

SPOTTED is its own tab.

Each board still belongs to one Tribe.

With the pilot UI limiting a user to one Tribe, the board selector should not dominate the experience.

SPOTTED is the social/personality layer of SOMA, not the same thing as Daily Discovery.

---

## 17. SPOTTED posts

User posts:
- peer-anonymous;
- internally attributable;
- Tribe-specific;
- text only in MVP;
- max 280 chars unless later explicitly changed;
- visible 24h;
- reportable/moderatable;
- no image/video MVP.

All members of the Tribe can see social content regardless of romantic compatibility.

---

## 18. SPOTTED comments

- anonymous;
- one level only;
- no nested Reddit-style threads;
- likeable;
- reportable;
- eligible for romantic request.

No:
- mentions/tags;
- media;
- clickable links;
- DM outside Match.

Comments follow the parent post lifecycle and do not extend the post's 24h visibility.

---

## 19. SPOTTED likes

Like is social, not romantic.

- one per account/content;
- removable/toggle;
- unlimited across different content subject to anti-spam;
- only aggregate count public;
- liker identity private;
- no ranking/popularity effect.

---

## 20. "Mi piacerebbe conoscerti"

Separate from Spot.

Available on:
- user posts;
- user comments;
- user responses/comments to Question of the Day.

Not on the SOMA system post itself.

Quota:
- **6 attempts/day globally across SPOTTED**.

Independent of:
- TRIBE Spot quota;
- ORA Spot quota.

Every valid attempt consumes quota even if internally non-deliverable when needed to prevent inference side-channels.

---

## 21. SPOTTED romantic-request privacy

Sender must not infer:
- hidden author identity;
- gender/sex;
- orientation;
- dating preferences;
- incompatibility;
- opt-out;
- whether delivered;
- decline;
- existing match.

Sender receives a neutral/uniform result.
The CTA is uniform on eligible anonymous user content, including content from an
already-matched author. The server suppresses new delivery without exposing why;
a valid attempt still consumes quota. (Federico approved 2026-10-19.)

Recipient of a deliverable request sees:
- sender profile;
- minimal context.

Recipient explicitly accepts or does not accept.

Accept -> existing unique Match.

Decline/nonresponse -> silent to sender.

Opposite-direction request does not auto-accept.

---

## 22. SPOTTED request lifecycle

- max one pending per unordered user pair;
- multiple content items by same hidden author cannot create parallel pending;
- idempotent retry;
- pending valid 7 days;
- unordered-pair guard: 30 days after decline or expiry;
- decline guard starts at `declined_at`; expiry guard starts at the original `expires_at`;
- suppressed attempts never extend the guard;
- recipient opt-out immediately invalidates received pending requests and revokes
  recipient-to-sender profile authorization, without sender notification;
- subsequent opt-in never resurrects invalidated requests;
- existing Match/chat relationships are preserved.

These technical product decisions were approved by Federico on 2026-10-19.
Professional/legal validation remains separate. No new guard is defined for opt-out invalidation.

---

## 23. Question of the Day

Official SOMA system post per Tribe.

Responses use anonymous comments.

Responses can:
- receive likes;
- receive romantic requests.

The system post itself has no romantic recipient.

Pilot:
- predefined/manual prompts;
- no AI generation;
- no complex CMS.

---

## 24. Share / acquisition — updated

**Both posts and comments are shareable in the MVP.**

Use native OS share sheet.

### Post share
Deep link resolves the post.

### Comment share
Deep link resolves:
- parent post;
- target comment;
and should land on/highlight the target comment when authorized.

Privacy:
- no anonymous-author identity;
- no sensitive/dating information;
- no enumerable sensitive identifiers.

Authorization:
- installed + authenticated + authorized Tribe member -> direct content;
- authenticated non-member -> normal Tribe join flow;
- unregistered -> signup/onboarding/membership -> content;
- expired/deleted/moderated -> safe fallback.

Share/deep links never bypass Tribe authorization.

---

## 25. MATCH

Single section for all surfaces.

Sources:
- TRIBE
- ORA
- SPOTTED

No separate inboxes.

A match with zero messages appears as:

**❤️ Nuovo match!**

Tap -> empty chat.

After first message -> normal preview.

One unique Match/chat relationship per user pair.

---

## 26. PROFILO

Keep simple:
- profile;
- photo;
- Tribe/place;
- preferences;
- dating pause;
- privacy;
- support;
- data export/delete;
- logout/settings.

Do not turn it into a complex dashboard.

---

## 27. Notifications MVP

Must be explicitly decided before pilot.

Minimum candidates:
- Daily Discovery available;
- new Match;
- SPOTTED romantic request;
- new message.

Do not overbuild before choosing the minimum delivery mechanism.

---

## 28. Analytics instrumentation

Instrument before pilot/admin dashboard.

Acquisition:
- signup start/complete;
- auth channel;
- QR acquisition;
- share acquisition.

Activation:
- profile complete;
- Tribe chosen;
- first DD viewed;
- first ORA;
- first Spot;
- first Match.

TRIBE:
- exposures;
- Spots;
- matches;
- fairness distribution.

ORA:
- presence;
- Place;
- Spots;
- matches.

SPOTTED:
- posts;
- comments;
- likes;
- romantic requests;
- accepts;
- matches;
- shares.

Funnel:
- Match -> first message.

Retention:
- D1;
- D7;
- D30 when meaningful.

Prefer server-side evidence for critical metrics when available.

---

## 29. Admin / Metrics Dashboard

Read-only first.

Filters:
- date;
- Tribe;
- Place.

Metrics:
- registered/active users;
- Tribe membership;
- ORA presence;
- DD exposure;
- Spots;
- Match rate;
- Match -> first-message;
- SPOTTED activity;
- shares/acquisition;
- reports;
- blocks;
- moderation actions.

Minimize PII. Avoid vanity BI.

---

## 30. Moderation

Existing moderation foundations remain.

Extend to:
- comments;
- SPOTTED romantic requests;
- anonymous-content block/report;
- audit/safety holds.

Blocking from anonymous content must resolve author server-side without exposing identity.

---

## 31. Retention / jobs

Before pilot close:
- expired ORA retention;
- Spot logical vs physical retention;
- DD allocation/exposure/pair-memory retention;
- SPOTTED post/comment/request retention;
- pair guards;
- safety-hold exceptions;
- PHOTO cleanup/scheduler operational readiness.

Jobs/schedulers should activate only after staging smoke and with rollback/observability.

---

## 32. Legal

Produce one unified legal dossier after the next major technical core is stable.

Cover:
- Terms;
- Privacy;
- 18+;
- Art. 6 / Art. 9 basis where relevant;
- dating-preference consent;
- ORA declaration/presence framing;
- anonymous UGC;
- SPOTTED requests;
- retention;
- user rights;
- DSA/UGC/moderation;
- DPIA assessment;
- share/deep links.

Still TBD:
- final legal copy;
- remaining physical-retention periods (DD allocation/exposure/pair-memory pilot target: 30 days; cleanup job not activated);
- SPOTTED pair-guard duration;
- delivered-request behavior after opt-out.

---

## 33. Design source of truth

Current SOMA visual language is the baseline.

Figma exists to formalize and improve consistency, not to reinvent good existing screens.

Permanent frontend rule:

> Preserve current SOMA visual language. No global redesign or style refactor. Existing screens that already look good remain unchanged unless explicitly requested.

Design qualities:
- modern;
- clean;
- young;
- premium but not luxury;
- social utility;
- dating present but not visually shouted.

Avoid:
- Tinder-like gradients everywhere;
- excessive hearts;
- heavy gamification;
- cluttered technical dashboards.

---

## 34. Figma roadmap

### Figma Core
- foundation;
- onboarding;
- mandatory pilot Tribe selection;
- bottom nav;
- TRIBE Daily Discovery;
- ORA inactive/live;
- MATCH shell;
- PROFILO shell.

### Figma SPOTTED
- feed;
- post;
- comments;
- romantic request;
- Question of the Day;
- share post;
- share comment.

### Secondary states
- loading;
- empty;
- error;
- expired;
- new Match;
- chat;
- moderation/opt-out states.

Gate: final TRIBE frontend should not be polished/locked until Figma Core is approved.

---

## 35. Pilot Places

Initial controlled pilot:
- Università IULM Milano
- Università Bocconi Milano
- Palestra FitActive Cesena

SOMA is not university-only.

University is the initial wedge; gym validates broader physical-context applicability.

---

## 36. Frozen vs pilot-only vs TBD

### Frozen for pilot architecture
- nav order;
- TRIBE / SPOTTED / ORA distinction;
- unified Match/chat;
- scarce Daily Discovery;
- ORA live semantics;
- QR = voluntary presence declaration;
- external QR direct-to-ORA exception;
- SPOTTED autonomous tab;
- one-level comments;
- explicit SPOTTED-request acceptance;
- post + comment share.

### Pilot-only
- one Tribe selectable in UI;
- exactly three initial Tribe choices;
- controlled Place catalogue;
- no unnecessary Place search.

### TBD
- Daily Discovery activation (approved 08:00/16:00 policy remains staged OFF);
- notification delivery mechanism;
- professional validation of the approved SPOTTED guard/opt-out policy;
- remaining physical-retention periods (DD allocation/exposure/pair-memory pilot target: 30 days; cleanup job not activated);
- final custom SMTP;
- final legal copy.

---

## 37. Delivery roadmap

### A. Foundation — DONE
- v2 additive schema
- ORA quota schema OFF
- controlled backfill
- Tribe Membership Engine
- onboarding without QR
- GitHub staging branch/Preview
- Places + ORA v2
- QR legacy separation
- auth real-world
- PHOTO real-world

### B. Information Architecture / Pilot UI — IN PROGRESS
- bottom nav alignment
- mandatory one-choice pilot Tribe UI
- post-onboarding -> TRIBE
- SPOTTED autonomous tab
- ORA UX alignment
- MATCH shell alignment
- no fake backend features

Gate: **SOMA IA PILOT ALIGNED**

### C. Spot v2 + ORA quota
- person-level Spot
- 30d pending
- idempotency
- cross-surface reciprocity
- unique Match
- ORA 5/day
- ORA 3/place
- Europe/Rome
- atomic enforcement

Gate: **SPOT V2 READY**

### D. Profile/Photo authorization v2
Profile/photo access only through valid relationship:
- current DD exposure;
- shared live ORA;
- existing Match;
- deliverable SPOTTED request recipient -> sender.

Same Tribe alone must not create a directory permission.

Gate: **PROFILE AUTH V2 READY**

### E. Daily Discovery engine
- final window configuration
- reciprocal pair allocation
- fairness
- novelty
- recurrence
- daily/window quotas
- dry-run
- insufficient-pool behavior

Gate: **DD ENGINE DRY RUN PASS**

### F. Figma Core — PARALLEL
Gate before final TRIBE polish: **FIGMA CORE APPROVED**

### G. TRIBE frontend
- four-profile max UI
- timer
- attribution
- Spot state
- partial/empty/exhausted states
- no infinite swipe

Gate: **TRIBE E2E PASS**

### H. SPOTTED social core
- posts
- comments
- likes
- reports/moderation

### I. SPOTTED romantic request
- 6/day
- neutral receipts
- privacy/side-channel controls
- 7d
- explicit accept
- directional profile auth
- unique Match

Use the founder-approved guard/opt-out semantics in Section 22; activation requires staging verification.

### J. Question of the Day

### K. Share / deep links
- posts
- comments
- comment anchor
- acquisition flow
- Tribe gate
- safe expiry
- privacy/adversarial tests

### L. MATCH + Chat finalization

### M. Notifications MVP

### N. Analytics instrumentation

### O. Admin / Metrics Dashboard

### P. Retention / cleanup / schedulers

### Q. Rights + Moderation regression

### R. Figma full-flow + beauty pass
No product-logic changes.

### S. Real-device QA
iOS / Android / QR camera / Google / email / photo / deep links / share.

### T. Adversarial regression
Explicitly attack:
- quota reset tricks;
- QR manipulation;
- concurrency/races;
- duplicate Spot/Match;
- side-channel inference;
- stale ORA exit;
- unauthorized DD/profile reads;
- anonymous-author leak;
- share bypass;
- Tribe leave authorization;
- delete-account races.

### U. Unified legal dossier + professional review

### V. Ops readiness
- Supabase/Vercel configuration
- MFA
- backups/restore
- custom SMTP
- moderator account
- support/privacy/safety inboxes
- DPA/subprocessor/transfer/residency review
- incident owner
- RPO/RTO

### W. Release Candidate staging
Freeze commit/migrations/env/policies/content.

### X. Production preflight
Diff staging vs prod, migrations, flags, secrets, rollback, jobs last.

### Y. Closed pilot
Measure acquisition, activation, D1/D7, DD, ORA, SPOTTED, Match, Match->message, safety and share/referral.

---

## 38. Permanent adversarial Codex protocol

Every substantial task must include:

1. Baseline branch + SHA + environment.
2. Narrow task scope.
3. Frozen invariants.
4. Explicit non-goals.
5. Legacy compatibility impact.
6. Security/privacy checks.
7. Concurrency checks when relevant.
8. Specific automated tests.
9. Real staging smoke where possible.
10. Report with PASS/FAIL, not optimistic assumptions.
11. Final gate: GO / GO WITH CONDITIONS / NO-GO.
12. Mandatory STOP before the next roadmap task.

Permanent instruction:

> Read this Product/UX Source of Truth before implementation. Do not reinterpret frozen product semantics. Preserve the current SOMA visual language. Do not implement future features merely because they are documented here. Implement only the explicitly scoped task. If current code conflicts with this file, report the conflict before introducing compatibility hacks.

---

## 39. Known contradictions to guard against

### Mandatory Tribe vs external QR
- standard onboarding -> Tribe mandatory;
- external QR -> direct ORA exception;
- do not auto-join Tribe to reconcile them.

### Pilot max1 vs backend max3
- pilot UI -> one Tribe;
- backend Membership Engine -> max3 remains;
- do not weaken future backend flexibility.

### Future UI vs inactive backend
- shell may be structurally ready;
- never present fake timer, fake quota, fake Daily Discovery allocation or fake enforcement as real server behavior.

### Social visibility vs romantic compatibility
- SPOTTED social content is Tribe/community access;
- romantic delivery/requests still respect privacy/compatibility server-side without leaking hidden traits.
