# Staging staff provisioning canary

Local operator support, not an app feature or authorization source. Requires
explicit owner authorization and nominated dedicated accounts, verified TOTP,
migration055, and prior environment/preflight checks.

Build with `node scripts/build-staff-provisioning.mjs`, run
`node tools/staff-provisioning/server.mjs`. Files under `.local/staff-final/` are
ignored: config.json (public staging config, nominated accounts, fixed operation
IDs), public assets and minimized evidence.jsonl. No private key is required.
Never copy browser Auth material into config or logs. No enrollment/remove/reset
MFA action exists. Do not inspect browser passwords, codes or session objects.

Use one tab, keep clients in memory through revoke/regrant checks, choose phase
only as instructed. Both accounts must log in anew after grants. A missing session
or expired token cannot substitute for proof that055 rejects a stale session.
Privileged RPC data is discarded; only enums/booleans are retained. After final
canary logout, stop server. Do not delete the dedicated operational accounts.

See `docs/soma-final-staging-staff-provisioning-2026-10-25.md` for the audited
sequence and checkpoint status. The helper cannot authenticate/bootstrap the first
ADMIN; only the explicitly authorized owner procedure may do that. Never fabricate
AAL2 claims in staging or read tokens to make the probes pass.
