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
| 7. Keyboard focus | Complete | Native Chromium Enter/Space checks passed for knapsack items, help/reset, exact SAT literal and palette. Full Node suite: 47 passed. Existing graph-pinning flake reproduced separately; handled in finding 9. |
| 8. Small-mask limits | Complete | Explicit count/mask/index guards; overflow, malformed-mask and 30-bit boundary tests passed. |
| 9. CI and browser automation | Complete | 51 Node tests, formatting and build passed. Self-starting production browser suite passed all nine modes, native keyboard controls, malformed storage, reveal/reload and advanced coloring. Subrepo CI added; remote workflow execution awaits a push. |

Commit references: 1 `bb63a2b`; 2 `145ab92`. Later entries are identified by their numbered finding and commit subject.

## Final verification

- `npm test`: 51 passed, 0 failed (about 31 seconds).
- `npm run format:check`: passed; workflow YAML included.
- `npm run build`: passed (49 modules; main JS 84.77 kB / 28.90 kB gzip).
- `NP_CHROMIUM_EXECUTABLE=/snap/bin/chromium npm run test:browser`: passed against an isolated production preview, with no JavaScript errors. Screenshots, seed diagnostics and trace are in ignored `test-results/browser/`.
- The browser runner owns its temporary context, uses an ephemeral server port, bounds protocol calls, and cleans up on success/failure. It never attaches to a user's debug browser or clears their storage.
- The intermittent pinning failure was reproduced with event logs: a drag move lacking the CDP `button` field emitted `lostpointercapture`. Supplying `button: 'left'` alongside `buttons: 1` made the same seeded case and the complete suite pass. No retry mechanism was added.
- Existing application-transition regressions now cover storage recovery, reveal/reset/reload, version separation, cached difficulty, superseding requests, navigation and disposal during generation. Browser checks exercise actual Enter/Space activation and exact SAT focus restoration.
- The CI workflow runs inside this repository only and has no deployment or publishing steps. It has been prepared and locally checked; it has not been executed on GitHub during this task.

## Commits

1. `bb63a2b` — validate persisted progress and restored TSP routes.
2. `145ab92` — escape template values and preserve trusted HTML fragments.
3. `e8b9c09` — persist assistance using versioned puzzle identities.
4. `8ccadc2` — derive difficulty from the active puzzle session.
5. `5bb4ab6` — cancel stale generation and bound worker requests.
6. `0eba635` — validate player state before evaluating puzzle constraints.
7. `4e7a5a6` — preserve logical keyboard focus across interface renders.
8. `b07985e` — enforce small-mask solver input limits.
9. This commit — `test: gate application regressions with isolated browser checks`.

No parent files, published assets, or parent submodule-pointer commits are included. No commits have been pushed.
