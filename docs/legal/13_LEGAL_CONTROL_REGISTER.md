# SOMA — Legal Control Register v1.2 — Canonical Master

**Editorial reference date:** 2026-11-03  
**State:** DOCUMENTATION RECONCILED / 12 OF 12 SOURCE TEXTS MATERIALIZED / NO NEW AUDIT OR REMEDIATION
**Scope:** staging documentation. No application changes or production authorization.

## 1. Canonical 145-control inventory
The following six original parts remain authoritative as **individually auditable control inventories with their original IDs and priorities**; no identifier may be silently renumbered or deleted:

| Part | Original control families | Count |
|---|---|---:|
| [13_REGISTER_PART_A.md](13_REGISTER_PART_A.md) | LEG-01–10, CONS-01–10 | 20 |
| [13_REGISTER_PART_B.md](13_REGISTER_PART_B.md) | AGE-01–10, CH-01–08 | 18 |
| [13_REGISTER_PART_C.md](13_REGISTER_PART_C.md) | SP-01–10, ORA-01–08, MC-01–05 | 23 |
| [13_REGISTER_PART_D.md](13_REGISTER_PART_D.md) | MOD-01–14, DSR-01–12 | 26 |
| [13_REGISTER_PART_E.md](13_REGISTER_PART_E.md) | RET-01–15, PROV-01–13 | 28 |
| [13_REGISTER_PART_F.md](13_REGISTER_PART_F.md) | SEC-01–10, INC-01–09, DSA-01–05, COPY-01–06 | 30 |
| **TOTAL** | **145 distinct IDs** | **145** |

Supporting criterion files:
- [13_REGISTER_SECURITY_CRITERIA.md](13_REGISTER_SECURITY_CRITERIA.md)
- [13_REGISTER_INCIDENT_CRITERIA.md](13_REGISTER_INCIDENT_CRITERIA.md)
- [13_REGISTER_DSA_COPY_CRITERIA.md](13_REGISTER_DSA_COPY_CRITERIA.md)

## 2. Version-1.2 editorial precedence and supplements
Read [13_REGISTER_V12_RECONCILIATION.md](13_REGISTER_V12_RECONCILIATION.md) as the **approved-editorial-change mapping and X-01–X-10 supplements** alongside all six original parts. This takes precedence for *identified* legacy contradictions while retaining untouched original criteria and priorities. Do not treat the old parts as fully updated files, or the supplement as a substitute for their 145 individual rows.

Evidence precedence: applicable law > final founder-approved legal/product decisions > complete v1.1 legal source PDFs > explicit v1.2 reconciliation > legacy register criteria for non-conflicting matters > actual implementation/test results (as observations, not definitions).

Any conflict between ostensibly approved sources must be marked CONFLICT and escalated; it cannot be silently 'fixed' by inventing product semantics.

## 3. Local checklist ID collisions
PDF annexes may use IDs such as INC-01–09, MOD-01–10, DSR-01–08, PROV-01–09 for **different** checklist tasks. Do not join to canonical rows by ID text. Keep the source label and map appendix ID explicitly to one or more canonical controls (proposed prefixes INC-PDF, MOD-PDF, DSR-PDF, PROV-MX).

## 4. Audit output standard
Every canonical ID and X-01–X-10 supplement receives:
`ID | ORIGINAL PRIORITY | CURRENT CRITERION | ENVIRONMENT | CURRENT STATE | EVIDENCE/COMMIT/TEST | GAP | MINIMUM ACTION | OWNER | FINAL RECHECK`.

States: PASS / FAIL / GAP / CONFLICT / OPEN / N/A (N/A requires a concrete basis). Do not inherit prior PASS without valid environment-specific evidence. Priority P0/P1 is managerial; a P1 required by law or material unmitigated risk is still a pre-pilot gate.

## 5. Scope limits and release gate
No standalone 'Non ora' screen. No unapproved redesign, identity-doc/selfie mandate, new dashboard, paid provider migration, product quota changes beyond explicitly approved decisions, or policy-based waiver of concrete risk.

The legal pack now has twelve materialized v1.1 PDF source texts. Six remaining transcriptions were completed on 2026-11-03; six prior files remain byte-identical to baseline `52a914f`. [README.md](README.md), the [source manifest](sources/v1.1/source-manifest.json) and the [materialization report](15_V11_MATERIALIZATION_REPORT_2026-11-03.md) identify checksums, internal checklists and the preserved Privacy-table extraction difference. This is source availability, not publication approval, a new audit outcome or a pilot GO.

**STOP GATE:** No audit, remediation, activation, main or Production action is started by materialization. Any subsequent review must use the full source inventory and explicitly account for documented source differences and internal-only annexes. Final pilot state remains NO-GO pending documented provider, age, retention, incident, DSA, security and DPIA closures; no prior control status is upgraded by this import.
