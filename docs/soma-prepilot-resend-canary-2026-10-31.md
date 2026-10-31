# Pre-pilot OPS — Resend staging canary

Baseline `0abc1408fb7e4857145aedc179afe86321e450a0`, branch `codex/soma-schema-v2-staging`. Supersedes the transport/canary blockers in `soma-prepilot-ops-closure-2026-10-31.md` for this **staging-only review**. No legal validation or pilot/Production rollout is implied.

## Provider / sender / receiving path

- Provider: Resend, Free setup supplied by the custodian; only scoped Sending access credential read privately from ignored `.local/ops-email/staging-secrets.env`, mode0600. Key value never printed, logged or committed. Only `RESEND_API_KEY` added in staging Edge secrets; all pre-existing secret digests unchanged. No paid plan, billing action, domain, DNS, marketing, provider webhook or Auth SMTP change.
- Actual sender: **SOMA Alerts <onboarding@resend.dev>**. Recipient: **somadatingapp@gmail.com**. This legitimate test sender is used **only for the authorized staging canary**; not a custom-domain sender or authorization for continuous pilot sending. Custodian confirmed the corrected account/key alignment. The browser was subsequently logged out; no additional human login was demanded, and no account identity was fabricated from that page. Actual provider acceptance plus confirmed inbox receipt establish this canary's usable credential/recipient path.
- Official contract: [test-domain restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [Sending access](https://resend.com/docs/api-reference/api-keys/create-api-key). Sending-only cannot retrieve delivery records; no broader read key was requested. Provider acceptance is **not** delivery. Resend's own technical retention is separate from application diagnostics14d; no product retention change or legal adequacy claim.
- The single mailbox is explicitly authorized for Support, Privacy, Safety/moderation and OPS. Source contact links use `[SOMA SUPPORT]`, `[SOMA PRIVACY]`, `[SOMA SAFETY]`; operational mail uses `[SOMA OPS]`. Manual triage/category→owner→resolution remains the existing lean workflow; no ticketing platform, auto-label rule or new inbox/account.

## Minimal implementation / compatibility

Migration **062_ops_email_canary.sql**, applied/registered only in `zjinjtkekmaqtxsuyvho`:

- Adds only minimized delivery columns to existing `ops_incidents` and an incident-specific email admission field to `ops_control`. No new table/FK, so existing14-day incident retention/purge still owns the receipt and Phase A FK/cascade contracts remain intact. No retention policy change.
- Removes the former hard-OFF email CHECK **only** in favor of default-OFF + explicit incident admission. No ordinary incident or user can turn on delivery. No collection/purge-ready rollout.
- Existing authoritative collector→incident transition triggers one `pg_net` request using the existing modern staging server key in `apikey` from the056 Vault binding. No new secret in SQL, no Bearer API-key misuse, no PHOTO/decoder code deploy, no cron or persistent dispatcher job.
- Private trigger queues only the admitted open incident, once. Atomic row-locked `ops_email_claim` gives one worker the claim and permits at most **one attempt per incident**. Closed/other/client/forged requests cannot claim. Role grants remain service-only, with explicit staging binding; browser/anon/ordinary user denied.
- Existing `operations` Edge gains a fixed `ops_alert` action, protected by its existing server authentication. Only this function received an explicit code deploy; JWT gateway setting preserved. Provider metadata also shows a uniform +1 version counter on the other functions after the project-wide secret configuration, while every other field (including bundle SHA, entrypoint and updated_at) is unchanged. These counters are not misreported as identical metadata or as PHOTO code changes. `ops-email.js` accepts no recipient/sender/free-text override. Mail contains synthetic declaration, incident ID, coarse operation/source/rule, no user content/account ID/location/preferences/secret.
- State: disabled→queued→sending→accepted→delivered, or failed/unknown. Five-second provider timeout, no automatic email retry. Provider idempotency key is stable per incident; database claim also prevents resending after its24h provider dedup horizon. Stale sending can be marked unknown by a later service claim, never reacquired. Operator-visible timestamps/error class distinguish an unsettled delivery; no false success or automatic recovery from ambiguity.
- `ops_health` retains ADMIN+MFA/private authorization and shows delivery metadata. Its client copy now reflects actual server email gate rather than always claiming provider absent. Contact links add category prefixes only; no consent/legal text change.

No additional frontend Preview was published. New contact prefixes/health copy are committed/built source for review; no claim that an older immutable Preview suddenly serves them. The already-existing public mailto destination remains the authorized mailbox. No Auth redirect, Vercel alias/env, main or Production operation.

## Exactly one real canary — PASS

Evidence: `docs/evidence/ops-email/canary.json`, `final-state.json`, `transport.json`. The retained pg_net response is HTTP200/accepted with the same incident/provider IDs; its count is exactly one.

1. Began from collection/emailOFF, test_only=true, no events/admissions/incidents. Created only four disposable random diagnostic request admissions, no account/profile/content/photo fixture.
2. Actual `ops_record_server` calls reached the existing incident threshold and formed **one** private synthetic `runtime.bootstrap` incident. Armed only that incident; the next admitted repeated failure updated it and fired the SQL→pg_net→hosted `operations`→Resend path.
3. Incident: `c7398195-c153-4ab6-a187-1ec13db930c8`. Resend acceptance ID: `01a1935a-4a36-70b5-8833-7c0aa85949d8`. Exactly **one** durable attempt, no error.
4. Repeated identical collector request returned false (dedup); incident count1, attempts1. No new external send was made to test dedup.
5. Custodian explicitly confirmed the email in **somadatingapp@gmail.com** with the exact incident reference. Service-only delivery attestation recorded separately from acceptance. No fake test recipient or simulated inbox substituted for receipt. No Resend lookup key broadened and no delivery webhook configured.
6. Restored collection/emailOFF and email admission null. Four events/admissions deleted; pg_net pending queue0. Incident **resolved/delivered**, attempts1, error=null. Minimal non-personal receipt retained under existing14-day diagnostic policy; no indefinite new audit store or deletion of prior evidence. Canary cannot be rerun by the one-shot script while its private started marker exists.

No additional email or retry. A Node HTTP attempt to record the *delivery attestation* failed DNS with `ENOTFOUND` **before HTTP**; classified runner/environment, not provider delivery failure. The authorized CLI owner path invoked the same service-role RPC successfully. It sent no email and made no user/Auth changes. That failed attempt is not concealed as PASS.

## Adversarial tests / regressions

Six new SQL/handler tests cover defaultOFF, required incident admission, anon/user denial, wrong staging binding, atomic claim/replay, fixed recipient/sender and no arbitrary payload, provider403, thrown network failure, malformed provider receipt, missing config, forged request, no automatic retry, stale sending, accepted-vs-delivered attestation and incident purge compatibility. All provider-failure tests are injected locally; **no second real email** or intentional invalid-key provider send.

- Focused latest transport+retention tests: **23/23 PASS** (six new +17 retention).
- Final combined targeted ops/email/retention/migration inventory: **44/44 PASS**.
- Full suite: first post-change execution **938/940 PASS**; two failures were exact migration-inventory expectations still pinned to061 (60 files/59 applied). Fresh replay of062 itself succeeded. Classified **TEST/HARNESS BUG** before fixing: inventory now expects062,61 files/60 replayed, and explicitly asserts the new service-only function privileges; no assertion removed or product/schema workaround. The added privilege assertion initially used a regprocedure-style key; this catalog uses named `pg_get_function_identity_arguments`, so its exact key was corrected to `ops_email_claim(operation text, request_id uuid)` before the passing targeted run. This additional test-only naming failure is classified TEST/HARNESS BUG, not concealed as a runtime failure.
- Corrected full suite: intermediate **940/940 PASS** after inventory corrections; final release-tree run after the null-payload guard: **940/940 PASS**, zero failures/skips/cancellations,168.428 seconds.
- Build PASS. Initial typecheck found a missing JS parameter-options annotation for `key`; JSDoc-only fix, no runtime behavior change. Corrected typecheck PASS. Final malformed-payload inspection reproduced `null` causing TypeError before RPC/provider access; classified a technical input-validation defect in the new path. Added explicit object/array guards in handler/module and assertions for null/array/scalars. No extra canary or email; only operations received the explicit hardening deploy, with email/collection stillOFF. Final targeted **44/44 PASS**, build/typecheck PASS after that hardening.

## Final state / risk boundary

Only existing `ops_health` changed among pre-existing SQL functions; frozen product function hashes/data/presence/Storage/PHOTO/cron fingerprints match the accepted pre-task snapshot exactly. Four profiles,42 Storage objects, no new fixture/photo/asset. Chance/Discovery/schedulerOFF; Notifications deliveryOFF; PHOTOOPEN, cleanup/schedulersOFF; Phase A remains ON `0 3 * * *`. Recovery/Auth/MFA/Match/Chat/ORA/SPOTTED/Chance logic and visuals untouched. Main/Production unchanged.

**Current canary requires no further manual action.** For sustained real pilot alerts, a separately authorized verified sender (or explicit provider-supported ongoing policy) is still required; this task does not authorize `resend.dev` beyond the canary, DNS/payment, ordinary collection or scheduler activation. Email remainsOFF, so no unattended monitoring guarantee is claimed. Inbox coverage/backup escalation remains an operational owner responsibility; no24/7/legal sufficiency asserted.

## Files / source control

Files:

- `supabase/migrations/062_ops_email_canary.sql`
- `supabase/functions/_shared/ops-email.js`
- `supabase/functions/operations/index.ts`
- `src/operational-health.js`, `src/privacy-phase1.js`
- `tests/ops-email.test.js`, `tests/ops-phase-a-inventory.test.js`
- `scripts/ops-email/staging-canary.mjs`
- `docs/SOMA_PRODUCT_UX_SOURCE_OF_TRUTH.md`
- `docs/soma-prepilot-ops-runbook-2026-10-31.md`
- this report and `docs/evidence/ops-email/{canary,transport,final-state,checks}.json`.

062 migration; dedicated delivery module; minimal operations action; private health copy and three categorized contact links; six tests and migration-inventory update; one-shot operator script and documentation. No package/dependency change. Private credentials/config/started marker stay ignored.

Commit/remote SHA, push and clean-tree status returned at completion. STOP: no legal review, visual refresh or Production work.

PRE-PILOT OPS: GO FOR REVIEW
