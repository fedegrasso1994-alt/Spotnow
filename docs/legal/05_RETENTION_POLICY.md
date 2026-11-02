# SOMA — Retention Policy v1.0

Date: 2 November 2026
Status: CANONICAL PILOT CANDIDATE

Retention must be finite, purpose-specific, documented and testable.

Key baselines:
- inactivity review after 24 months;
- warning at least 30 days where reasonably possible before inactivity deletion;
- active-system deletion target within 30 days, subject to documented exceptions;
- dating preferences after withdrawal: delete or render unusable, target within 24h;
- Chance visible 24h; technical metadata max 30d where needed;
- Spotted visible 24h; expired unreported purge target within 7d;
- private Spotted request pending max 7d; pair guard max 30d;
- ORA live max 4h; related technical metadata max 30d where justified;
- analytics max 90d unless truly anonymized;
- ordinary logs max 14d absent a scoped exception;
- ordinary moderation 12 months;
- serious safety up to 24 months;
- moderation audit 24 months;
- incident evidence baseline 24 months where necessary;
- rights-request evidence minimum up to 5 years where necessary;
- support correspondence baseline 12 months;
- direct-control backup baseline 7d, subject to provider reality.

Backups must remain isolated from ordinary use. After restore, replay deletion, revocation and restriction state before normal reopening.

Any legal or safety hold must have purpose, owner, scope, review date and release/delete criterion.

TTL, cron and cleanup should be monitorable, idempotent, testable and fail-safe.

Status: FROZEN / PILOT CANDIDATE
