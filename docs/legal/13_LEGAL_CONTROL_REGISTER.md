# SOMA — Legal Control Register v1.0

Status: MASTER SOURCE OF TRUTH FOR AUDIT

The complete register is split across the following files:

- 13_REGISTER_PART_A.md — LEG and CONS
- 13_REGISTER_PART_B.md — AGE and CH
- 13_REGISTER_PART_C.md — SP, ORA and MC
- 13_REGISTER_PART_D.md — MOD and DSR
- 13_REGISTER_PART_E.md — RET and PROV
- 13_REGISTER_PART_F.md — SEC, INC, DSA and COPY

Codex must treat the six parts above as one single register.

Audit output format:

CONTROL ID → CURRENT STATE → PASS / GAP / CONFLICT / OPEN → EVIDENCE → REQUIRED CHANGE

Do not substitute legacy LP01–LP08 controls.
Do not start remediation before the complete audit.
Do not modify Production or main without explicit approval.

Pilot GO requires every P0 control to be resolved appropriately; a technical P0 failure cannot be waived by wording alone.


## Criteria supplements

The following files are authoritative extensions of the same Register and define the controls that were previously listed by ID only:

- 13_REGISTER_SECURITY_CRITERIA.md
- 13_REGISTER_INCIDENT_CRITERIA.md
- 13_REGISTER_DSA_COPY_CRITERIA.md

If an earlier audit marked a control OPEN or unclassified because an individual canonical criterion was missing, reassess that control using these supplements before remediation.
