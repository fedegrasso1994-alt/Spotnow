# Profile / PHOTO admission staging blocker

18 October 2026. Branch `codex/soma-schema-v2-staging`.
Baseline `ada4317cf4db4f74ccb98418a7255b44a01d60f3`.
Staging only `zjinjtkekmaqtxsuyvho`. No migrations, RLS, Edge deployment,
PHOTO contract/lifecycle/retention changes or Production changes.

## Actual reproduction and causes

Real Preview `spot-29opargxw-fedegrasso1994-1482.vercel.app`: authenticated
account reached “Crea il tuo profilo”; Entra retried and returned PHOTO PAUSED.
The visible image was a loaded `data:` URL, not evidence of a persisted
canonical. The screen was creation, not editing; failed first upload never
returned a canonical path. Do not treat a locally valid preview as publication.

1. Operational: staging PHOTO admission deliberately PAUSED. First canonical
   upload must be blocked; client cannot safely bypass this.
2. Existing-photo replacement: client aborted all profile changes on PAUSED,
   even when a server-published current photo could be retained.
3. Backend always UPSERTed. PostgreSQL BEFORE INSERT guard runs even when the
   conflict would update an existing row, rejecting metadata edits during pause.
4. Error was a bottom overlay toast that could visually overlap the primary CTA.

## Minimal fix

- `profile-photo-save.js`: on explicit PAUSED only, reread own profile and reuse
  exactly its current path if it matches the known path. No local data URL,
  unpublished draft, mismatched account or other error becomes a fallback.
- Backend retains owner validation + server PHOTO guards; existing rows use
  UPDATE, new rows INSERT. No UPSERT insert guard for ordinary existing edits.
  Concurrent profile creation can return a conflict; retry rereads the row.
  Concurrent photo publication/deletion is still serialized/validated server-side.
- Successful fallback clears unsaved replacement preview, reloads own canonical
  and explains that the old photo was retained. No fake successful replacement.
- New profile without canonical remains blocked during admission pause, with
  truthful text: preview not saved. No phantom profile inserted.
- Onboarding notices are inline before CTA, not an overlay. Existing design
  tokens/type remain; scoped CSS only, no global redesign.

## Live gate audit and stop condition

Founder authorized restoring staging admission only if all existing gates pass,
cleanup/scheduler OFF, no bypass. Read-only SQL evidence:

- epoch 10, phase PAUSED; `smoke_approved=null`, open gate false;
- runtime ready=true; legacy unknown=0, legacy inflight=0;
- existing unknown=3, corresponding to historical review records;
- lifecycle current=3, ready=8, review=3, purged=48;
- jobs status processing=2, both lifecycle review / writer unknown, leases
  expired. These are NOT new active uploads; age/timeout does not resolve them;
- profiles=3, validated=11, current missing Storage=0; deletions pending=0;
- cleanup_all=false, execute_enabled=false, scheduler_enabled=false.

No activation attempted: current epoch lacks approved smoke. No forcing phase,
smoke receipt, fixture label, ownership, quota or canonical-processing gate.
Historical review records preserved without automatic reconciliation or purge;
they are not asserted to be a new regression or an automatic quota/upload block.
No test fixture, object or account was created by this audit.

## Verification and limitations

Automated tests prove PAUSED current-photo fallback, non-current/local rejection,
non-PAUSED failure propagation, no re-upload for metadata saves, UPDATE vs INSERT,
real PostgreSQL paused UPSERT rejection vs same-photo UPDATE success, inline error
and CTA retry, account-switch race and existing onboarding/social regressions.

Real first upload → canonical → save → optional Tribe → app E2E remains BLOCKED
by admission gate. Do not label it PASS. Local/database regressions do not replace
that live E2E. No age/consent accepted on behalf of the user for this task.

Final admission PAUSED, cleanup OFF, scheduler OFF. NO-GO to close onboarding or
start Spot v2 until controlled staging PHOTO canary/epoch smoke is approved and
the real new-profile E2E passes. Fix is independently reviewable in Preview.

Checks: 418/418 tests PASS, build PASS, typecheck PASS, release/secret/font scan
PASS, diff whitespace check PASS. Eight added regressions, no skipped tests.
