# MODERATOR MFA staging — 2026-10-25

Scope: dedicated staging MODERATOR only; no role provisioning, no ADMIN mutation,
no main/Production changes. Founder confirms ADMIN first and fresh-login MFA/AAL2
completed; this is owner confirmation, not a new ADMIN operation.

## Read-only MODERATOR preflight

Project `zjinjtkekmaqtxsuyvho`; nominated UID
`f6fa2d11-cc8b-42cd-abb8-f986e07d14de` exists, email confirmed,
zero factors, no moderation role. Only factor type/status was queried;
no credential, TOTP seed, session token or email was read.

## Local setup

Explicit single-account configuration permits only the nominated MODERATOR.
Existing two-account mode and ADMIN repair guards remain compatible.
The local loopback server uses normal staging Auth and cannot call role RPCs.
The previous ADMIN repair attempt receipt is preserved. No factor removal is
available in MODERATOR mode. QR and credentials remain owner-controlled and
are never included in evidence.

## Live verification

PENDING owner interaction: login, enroll TOTP if no factors, verify AAL2,
logout, new login, second challenge/AAL2. Do not declare completion or provision
roles until owner confirmation and safe metadata verification.

## Verification

Single-account configuration test covers wrong UID, broadened account list and
incompatible repair configuration. Full suite 797/797 PASS; build and typecheck PASS. Local setup HTTP 200.
Live MODERATOR verification remains PENDING; no role assigned.
