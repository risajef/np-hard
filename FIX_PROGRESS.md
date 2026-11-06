# NP Studio review fixes

Scope: findings 1–9 in the parent NP_HARD_REVIEW.md, reviewed commit `4eee369`.
Changes and commits stay in this subrepo; no parent submodule pointer update or deployment.
Each numbered finding receives one commit, including its tests and this log.

| Finding | Status | Validation |
| --- | --- | --- |
| 1. Persisted data validation | Complete | Record tests: malformed JSON shapes, mixed valid/invalid stats, route membership and recomputed scores. |
| 2. Safe HTML composition | Complete | HTML injection, quoted attributes, nested fragments and all nine board renderers tested; build passed. |
| 3. Persistent assistance and identity | Complete | Versioned shared identities, one-time award migration, reveal/reset/reload and version-isolation regressions; seven app/record tests passed. |
| 4. Session difficulty | Complete | Mixed-mode cached navigation, rendered level and new-puzzle level regression passed. |
| 5. Generation lifecycle | Complete | Per-request worker termination, configurable 60-second deadline, abort/error/messageerror cleanup and disposal; eight app/worker tests passed, including stale completions and superseding requests. |
| 6. Evaluator contracts | Complete | All nine evaluators reject malformed states; partial TSP scoring retained and Job Shop machine permutations enforced. Three targeted tests passed. |
| 7. Keyboard focus | Pending | |
| 8. Small-mask limits | Pending | |
| 9. CI and browser automation | Pending | |

Commit references: 1 `bb63a2b`; 2 `145ab92`. Later entries are identified by their numbered finding and commit subject.
