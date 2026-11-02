# SOMA Legal Control Register — Security criteria supplement

This file defines the canonical criterion for SEC controls.

| ID | Canonical requirement | Priority |
|---|---|---:|
| SEC-01 | Privileged staff access requires MFA. | P0 |
| SEC-02 | Authorization decisions for protected actions must be enforced server-side, not only in the client. | P0 |
| SEC-03 | Staff, service and application access must follow least privilege. | P0 |
| SEC-04 | Privileged access must be attributable to named accounts where the provider supports it. | P0 |
| SEC-05 | Expired, revoked or otherwise stale sessions must not retain protected access. | P0 |
| SEC-06 | Logout and explicit revocation must prevent continued protected access with the invalidated session. | P0 |
| SEC-07 | Production credentials and private secrets must not be embedded in client code or committed to the public repository. | P0 |
| SEC-08 | Ordinary application and observability logs must not intentionally contain private content or protected preference values unless a scoped incident process requires it. | P0 |
| SEC-09 | Profile-photo upload and retrieval must enforce the approved validation, private-storage and authorization model. | P0 |
| SEC-10 | Negative authorization tests must demonstrate that unauthorized users and roles cannot access protected data or actions. | P0 |
