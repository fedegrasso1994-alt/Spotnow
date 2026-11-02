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
