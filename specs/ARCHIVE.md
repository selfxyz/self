# Spec Archive

Append-only log of retired specs. When a spec is fully done and no longer needed for active reference, add a row here.

For full retirement process, see [SPECS-REORG-PLAN.md](./archive/SPECS-REORG-PLAN.md) placement rule 6.

| Spec                                            | Retired    | Outcome                                    | Key decisions / lessons                                                                                                                                                             | Final PR(s) |
| ----------------------------------------------- | ---------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `specs/SPECS-REORG-PLAN.md`                     | 2026-03-05 | Reorganization completed and stabilized    | Project-first structure adopted; singleton status folder removed; project-level naming standardized                                                                                 | N/A         |
| `specs/projects/sdk/SPEC-AGENT-OPTIMIZATION.md` | 2026-03-05 | Agent-optimization rollout completed       | All 6 execution chunks marked done; canonical guidance consolidated and stale scaffold reduced                                                                                      | N/A         |
| `specs/projects/kmp/*`                          | 2026-03-05 | KMP specs retired from active project tree | KMP planning/execution remains under SDK workstreams; historical KMP context kept in `specs/archive/kmp/`                                                                           | N/A         |
| `specs/topics/CI-COVERAGE-GAPS.md`              | 2026-03-06 | CI coverage expansion delivered            | Added dedicated CI coverage workflows across webview, KMP, RN test app, and Swift package; moved to archive after rollout                                                           | N/A         |
| `specs/ios-crash-fix/SPEC.md`                   | 2026-03-10 | iOS simulator crash mitigation delivered   | Shipped deterministic simulator launch, simulator-only Sentry replay/screenshot reduction, and a binary-pod arm64 simulator audit with Rosetta fallback retained for `libtesseract` | N/A         |
