# SOMA — Legal Pack v1.1/v1.2 materialization preflight

Date: 2026-11-03
Scope: documentation only, staging branch `codex/soma-schema-v2-staging`
Status: BLOCKED FOR FULL MATERIALIZATION — source-text integrity
Owner: Federico Grasso
Production/main/application code: NOT MODIFIED

## Source integrity gate
The 12 v1.1 documents were editorially approved in ChatGPT, but their full exact approved contents have not all been supplied as canonical UTF-8 files available for repository writing. The current `docs/legal/` files remain v1.0; an LLM reconstruction or paraphrase MUST NOT be labeled v1.1-approved.

Full exact v1.1 source required:
- 01_PRIVACY_POLICY.md
- 02_TERMS_AND_CONDITIONS.md
- 03_ONBOARDING_LEGAL_COPY.md
- 04_COMMUNITY_SAFETY_GUIDELINES.md
- 05_RETENTION_POLICY.md
- 06_RIGHTS_REQUEST_PROCEDURE.md
- 07_MODERATION_REPORTING_APPEALS.md
- 08_DPIA.md
- 10_AGE_ASSURANCE_ASSESSMENT.md
- 12_DSA_CLASSIFICATION.md
- Incident Response & Personal Data Breach Procedure v1.1 (new canonical file)
- Provider / Processor / International Transfer Matrix v1.1 (new canonical file)

The Legal Control Register v1.2 draft is editorially prepared in the conversation; it must be inserted as the complete, reviewable text with updated component parts and supplements rather than a summary masquerading as complete criteria. Canonical ID inventory: 145 legacy IDs plus 10 X-* supplement checks.

## Confirmed source conflicts requiring controlled editorial change
1. LEG-06, legal README, Privacy v1.0, Terms v1.0, and Onboarding v1.0 still require an artificial separate "Non ora" flow. Current approved UX: specific explicit consent within profile/preferences; no extra "Non ora" screen; free informed revocable choice must remain valid.
2. Product / UX Source of Truth Spotted romantic request quota section 20: 6/day; newer roadmap section I: 1/day approved 2026-10-31. Resolve to 1/day only if confirmed by approved v1.1 product/legal canon. Do not silently alter runtime quotas.
3. Product / UX Source of Truth ORA section 13 says no daily Place count limit, section 15 says max 3 distinct visited Places/day. Resolve to max 3, without runtime edit.
4. Product / UX Source of Truth onboarding prescribes dating consent before profile; revised legal UX integrates consent within profile/preferences. Preserve QR deep-link context and conditional Tribe onboarding.
5. CONS-09/MC-03: independence of existing Match/Chat from revoked preference is not, alone, a lawful basis or Article 9 exception for retained sensitive-derived data.
6. COPY-01: Tribe remains the name of membership/community; only the old discovery tab naming is superseded by Chance. Do not remove all references to Tribe.
7. Provider scope must include Google Cloud Storage backup; Vercel contract/plan/sensitive-data compatibility remains unresolved. Historical PROV-04 PASS and PROV-05 FAIL must be reassessed against actual environment.
8. Incident Response templates INC-04/05 are P1 IDs but pre-pilot preparedness gates under the approved procedure.
9. Product source still contains other stale forward roadmap notes (e.g. older TRIBE DD frontend). Read latest dated decisions and resolve with founder-approved source before coding.
10. Privacy policy copies and product legal copies must be compared against final approved documents, not against existing v1.0 repository files.

## Next stages; not authorized by this preflight
A. Obtain complete authenticated v1.1 texts; materialize docs only and maintain provenance.
B. Materialize Control Register v1.2 preserving all 145 original IDs, priority, and individually auditable criteria, plus 10 X controls. Ensure no original control is dropped.
C. Update README and product source conflicts with written diff and explicit founder-approved semantics.
D. Run read-only adversarial audit: ID -> state -> evidence -> gap -> minimal recommendation. No remediation.
E. Request explicit approval for implementation.

NO-GO for treating the current v1.0 files as a completed v1.1 materialization.
