# SOMA — Canonical Legal Audit Pack

Version: 1.0  
Date: 2 November 2026  
Branch: codex/soma-schema-v2-staging

## MATERIALIZATION COMPLETE — AUDIT MAY RESUME

This directory is now the canonical legal/privacy input for the Codex pre-pilot audit.

## Canonical files present

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
- 13_LEGAL_CONTROL_REGISTER.md
- 13_REGISTER_PART_A.md
- 13_REGISTER_PART_B.md
- 13_REGISTER_PART_C.md
- 13_REGISTER_PART_D.md
- 13_REGISTER_PART_E.md
- 13_REGISTER_PART_F.md

The Legal Control Register is intentionally split into six parts because of repository-tool payload limits. Treat all six parts as one register.

## Provider and incident material

Provider requirements are authoritative in PROV-01 through PROV-13 in the Register and must be checked against the current provider/operations evidence already present under docs/.

Incident-readiness requirements are authoritative in INC-01 through INC-09 in the Register and must be checked against the current incident/recovery evidence already present under docs/.

Do not reconstruct requirements from legacy LP01–LP08 controls.

## Source-of-truth hierarchy

1. 13_LEGAL_CONTROL_REGISTER.md plus Parts A–F
2. substantive legal files in this directory
3. docs/SOMA_PRODUCT_UX_SOURCE_OF_TRUTH.md
4. current implementation/runtime evidence
5. legacy documentation only as historical evidence

If legacy material conflicts with this directory, treat it as STALE.

## Frozen pilot decisions

- Service is 18+.
- Age assurance is risk-based and progressive; no universal document/selfie check in ordinary pilot onboarding.
- Terms acceptance, Privacy notice delivery, age declaration and dating consent are separate.
- Privacy is not a consent checkbox.
- Dating consent requires a real Non ora path.
- Withdrawal stops new preference-based dating processing and must not fall back to ALL.
- Existing Match/Chat may persist only if independent of revoked preferences and otherwise lawful.
- Spotted is anonymous to peers, not absolutely anonymous to SOMA.
- ORA is declared presence, not verified GPS presence.
- No user-facing legacy Tribe terminology.
- No attractiveness/desirability ranking.
- No behavioral advertising in the pilot.
- No Production change without explicit approval.

## Codex audit rule

Codex must now produce:

CONTROL ID → CURRENT STATE → PASS / GAP / CONFLICT / OPEN → EVIDENCE → REQUIRED CHANGE

No control may be marked PASS without concrete evidence.

Do not implement remediation until the complete audit is delivered.

Do not modify Production or main.
