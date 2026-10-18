# PHOTO staging admission canary — STOP / NO-GO

18 ottobre 2026. Branch `codex/soma-schema-v2-staging`; baseline
`9a4e1554d0ac7586cb65463129561d2a7c2b7524`.
Staging exclusively `zjinjtkekmaqtxsuyvho`. No production, main, schema,
PHOTO-01/02 function/decoder/limits/lifecycle/retention or design modification.

## Protocol and actual actions

- Read AGENTS.md and the existing controller / smoke protocol. Existing
  script was NOT run: it requires service-role credentials, old fixture RPCs,
  and would enable scheduler. Used an isolated public-key/user-Auth runner.
- Provisioned two synthetic Auth identities through staging Auth console
  “Create new user”; per-fixture Auto confirm, no global Auth setting changed.
  No emails sent. Credentials generated temporarily, isolated 0600 ignored
  manifest; never in Git, chat or this report. No admin/API secret read.
- Real password login for both fixtures; normal own Auth metadata marks them
  synthetic, normal adult checkbox + versioned dating-consent RPCs. No real
  person's attestation or consent accepted on their behalf.
- Both uploads while PAUSED returned real 503 / PAUSED / no-store.
- Guarded transaction verified staging environment, epoch 10 PAUSED,
  execute/scheduler/cleanup_all OFF, no non-review unknown lifecycle writer,
  no unknown legacy writer, no pending deletion, no missing current object,
  no active PHOTO cron. Existing three review writers explicitly preserved.
- Called existing photo_cutover_set('canary') for only the two synthetic
  owners and deployed runtime reference SHA 305cb4f8e625e9d331fd382089853ab350fe8cf5.
  No direct control-table update or fabricated smoke receipt. Current epoch
  stayed 10; cleanup/scheduler stayed OFF.

## Live results

| Gate | Result |
|---|---|
| Fixture Auth + own AGE / separate consent | PASS |
| PAUSED upload blocked; no-store | PASS |
| JPEG upload → real Edge PHOTO02 processing → ready | PASS (fixture A) |
| Canonical + detail + thumbnail private downloads, JPEG/dimensions validated | PASS |
| New profile saved through normal authenticated API | PASS |
| Optional Tribe skipped through complete_onboarding | PASS (API journey) |
| Existing current readable and metadata UPDATE during a concurrent new upload request | PASS |
| Replace publication; both old and new readable after replace/grace | PASS |
| Deliberately corrupt bytes rejected | PASS |
| Subsequent fixture JPEG assumed valid by harness | **FAIL: HTTP 422 INVALID** |
| Canary account deletion proof | NOT RUN after failure |
| approve_smoke / OPEN | NOT RUN |
| Full browser E2E / browser refresh regression after OPEN | NOT RUN: admission not reopened |

The partial API journey does not establish the requested complete browser E2E.
Do not mark the canary, valid-retry test or roadmap gate PASS.

## Exact failure classification

Harness generated a 64x64 RGB JPEG using jpeg-js, seed 40, 1763 bytes. Header
inspection passes and jpeg-js's permissive decoder opens it. The unchanged
PHOTO processor also rejects the SAME bytes locally, including on a fresh
processor instance. Stack identifies photo-jpeg-validation.js scan validation,
line 27, before raster decode / Storage write. At expected scan end, offset
1759, the remaining bytes are FF 00 FF D9: the strict validator rejects surplus
stuffed entropy before EOI. Seed 20/30/41 process locally; seed 40 does not.

Therefore this is a canary fixture-contract failure, not established evidence
of an OOM, broken worker or PHOTO regression. A permissive decode is insufficient
to label an input acceptable under the current strict PHOTO contract. No PHOTO
acceptance rule was relaxed. Added an automated reproduction proving header /
permissive acceptance versus strict rejection. Runner now requires strict
fixture payload preflight before a future prepare step, and refuses manifests
marked stopped. It will fail closed for this fixture set; it is not approved
for automatic rerun. Future correction belongs to the fixture, unless separate
analysis demonstrates a processor defect and a separately authorized change.
No second canary attempted after the failed gate.

## Immediate stop and final state

Called existing photo_cutover_set('pause') immediately after failure. This
legitimately increments epoch to 11 and clears smoke approval. Read-only proof:

- phase PAUSED; admission not globally opened;
- execute_enabled=false, cleanup_all=false, scheduler_enabled=false;
- zero active PHOTO cron; zero missing current objects;
- baseline: 3 profiles / 39 Storage objects / 3 historical review sets preserved;
- no unknown legacy writers or legacy inflight; no pending deletions;
- newly introduced unknown writers: 0;
- synthetic residue: 2 Auth identities, 1 profile, 6 Storage objects;
- fixture ledger: 1 current, 1 retired, 2 failed, all settled;
- combined fixture reserved bytes: 20,978,728, below a single 128 MiB quota;
  reservations were not manually released or edited.

These are tracked canary fixtures, not unidentified orphans. They were NOT
force-deleted: normal deletion admission is closed while PAUSED. Reentering
CANARY or manually editing Auth/Storage to clean them up after the failed gate
would exceed the required stop. Preserve isolated manifest for a subsequent
controlled teardown. Fixture profile has no Tribe membership, so it is not
included in venue/Tribe discovery. No baseline account was marked as a fixture.
Concluded technical receipts retain existing seven-day PHOTO semantics.

Confirm email ON and Google ON confirmed via public Auth settings after the
run. No SMTP, GCP, account-role grants or provider changes made.

## Code / checks / Preview

Changed only: staging canary test runner, diagnostic regression test, this report.
No app runtime file, Edge deployment, migration or frontend deployment needed.

- Full suite **419/419 PASS**, zero failures/skips; prior 418 also passed.
- Staging build PASS; typecheck PASS; runner syntax check PASS.
- Release/secret/local-font scan PASS; no private fixture artifact in release.
- Existing Preview (unchanged runtime SHA 305cb4f...):
  https://spot-4iyv0pnke-fedegrasso1994-1482.vercel.app
- Existing deployment dpl_HbkVAv5TPEJa63RnuqXZNibMpaMi. No unnecessary redeploy.
- Production read-only inspect unchanged: dpl_6jX7jKUxcEFvieWoBdN6KS9i3Juh.
- Remote main unchanged: d0f515e8d2c80eeae60f2d5c33dd8901558d5287.

## Decision

**NO-GO** to reopen staging admission or advance the roadmap. PHOTO remains
PAUSED, cleanup OFF, scheduler OFF. Required next controlled action: strict
fixture preflight/correction, tracked fixture recovery/teardown, then a fresh
canary and full browser E2E under existing gates. No Spot v2 started.
