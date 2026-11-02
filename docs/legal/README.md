# SOMA — Canonical Legal Pack

**Version:** 1.0  
**Effective date for pilot candidate set:** 2 November 2026  
**Branch:** `codex/soma-schema-v2-staging`  
**Status:** CANONICAL SOURCE OF TRUTH FOR LEGAL/PRIVACY AUDIT — NOT PRODUCTION AUTHORIZATION

## Purpose

This directory is the canonical legal/privacy source of truth for SOMA pre-pilot review.

Codex and reviewers must use these documents instead of reconstructing requirements from legacy reports, historical notes, old LP01–LP08 controls, or stale product documentation.

## Canonical documents

1. `01_PRIVACY_POLICY.md`
2. `02_TERMS_AND_CONDITIONS.md`
3. `03_ONBOARDING_LEGAL_COPY.md`
4. `04_COMMUNITY_SAFETY_GUIDELINES.md`
5. `05_RETENTION_POLICY.md`
6. `06_RIGHTS_REQUEST_PROCEDURE.md`
7. `07_MODERATION_REPORTING_APPEALS.md`
8. `08_DPIA.md`
9. `09_PROVIDER_TRANSFER_MATRIX.md`
10. `10_AGE_ASSURANCE_ASSESSMENT.md`
11. `11_INCIDENT_RESPONSE_BREACH.md`
12. `12_DSA_CLASSIFICATION.md`
13. `13_LEGAL_CONTROL_REGISTER.md`

## Source-of-truth hierarchy

For legal/privacy implementation and audit:

1. `13_LEGAL_CONTROL_REGISTER.md`
2. the substantive canonical documents in this directory
3. `docs/SOMA_PRODUCT_UX_SOURCE_OF_TRUTH.md`
4. current implementation/runtime evidence
5. legacy documentation only as historical evidence

If a legacy document conflicts with this directory, the legacy content is **STALE**.

## Critical pilot decisions already frozen

- Service is 18+.
- No universal document/selfie proof-of-age in ordinary pilot onboarding.
- Age assurance is risk-based and progressive.
- Terms acceptance, Privacy notice delivery, 18+ declaration and dating consent are separate events.
- Privacy Policy is not a consent checkbox.
- Dating consent must be explicit, unpreselected, versioned, revocable and have a real **Non ora** path.
- Withdrawal must stop new consent-based dating processing and delete/render preferences unusable; no fallback to `ALL`.
- Existing Match/Chat may persist after dating-consent withdrawal if independent of revoked preferences and supported by the applicable legal basis.
- Spotted is anonymous to peers, not absolutely anonymous to SOMA.
- ORA is a user declaration of presence, not verified GPS presence.
- User-facing legal/product copy must not use legacy `Tribe` terminology.
- No attractiveness/desirability scoring.
- No behavioral advertising in the pilot.
- No facial recognition/biometric inference.
- No production change without explicit approval.

## Current external/open gates

The canonical legal design is substantially complete, but pilot readiness still depends on real evidence for:

- Supabase Production region/configuration/RLS/Storage/service-role;
- backup/restore and replay of deletion/revocation after restore;
- Vercel contractual remediation (current connected team identified as Hobby);
- business/privacy mailbox operating model;
- transfer register/TIA where required;
- final DSA micro/small-enterprise evidence;
- runtime PASS/GAP/CONFLICT audit;
- final pre-pilot GO/NO-GO.

## Codex audit rule

Before remediation, Codex must produce:

`CONTROL ID → CURRENT STATE → PASS / GAP / CONFLICT / OPEN → EVIDENCE → REQUIRED CHANGE`

No control may be marked PASS without concrete evidence.

**No remediation should be started until the audit is complete.**
