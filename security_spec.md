# Security Specification & Threat Model

## Data Invariants
1. **Visit Integrity**: Every visit document must possess a valid identifier, period number, visit number, and valid overall score properties.
2. **Evaluation Relational Invariant**: An evaluation document must reference an existing valid visit identifier (`visitId`) and correspond to a known catering venue (`food_hall`, `backlot`, or `butterbeer`).
3. **Staff Recognition Invariant**: A staff interaction document must reference both a valid visit identifier and evaluation identifier, with non-empty staff name and verbatim excerpt.
4. **Volumetric & Schema Guards**: String lengths and bounded array sizes are enforced against Denial of Wallet and storage exhaustion attacks.

## Dirty Dozen Threat Vectors & Rejection Matrix
1. **Malicious Giant ID Injection**: Injecting a 2KB junk character string as a visitId or evaluationId. -> **REJECTED** via `isValidId()`.
2. **Shadow Field Injection**: Writing hidden privilege or tampering flags (e.g. `isAdmin: true`, `backdoor: "root"`). -> **REJECTED** via strict key validation.
3. **Negative Score Injection**: Negative `actualScore` or `possibleScore <= 0`. -> **REJECTED** via numeric boundary checks.
4. **Invalid Area ID**: An evaluation for an unrecognized venue `venue: "forbidden_forest_cafe"`. -> **REJECTED** via enum allowlist validation.
5. **Orphaned Staff Interaction**: Adding a staff interaction without `visitId` or `evaluationId`. -> **REJECTED** via required field enforcement.
6. **Unauthenticated Tampering**: Modifying database records without active session or bypass headers. -> **REJECTED** via catch-all and authenticated write rules.
7. **Score Percentage Overflow**: Setting `scorePercentage` to `99999%`. -> **REJECTED** via numeric bounds `0 <= pct <= 100`.
8. **Massive Narrative Blob**: Submitting 5MB text payload to exhaust Firestore storage. -> **REJECTED** via `.size() <= 8192` string limits.
9. **Unbounded Recognition Arrays**: Submitting 5,000 array elements for `keyRecognitions`. -> **REJECTED** via array `.size() <= 20`.
10. **Type Spoofing**: Submitting numbers for string fields or arrays for booleans. -> **REJECTED** via explicit `is string`, `is bool`, `is number` type guards.
11. **Malicious Script Ingestion**: Submitting XSS executable scripts in notes or names. -> **REJECTED** via string length and content sanitization.
12. **Path Traversal via Path Variables**: Injecting `../` or special characters in document paths. -> **REJECTED** via regex `^[a-zA-Z0-9_\\-]+$`.
