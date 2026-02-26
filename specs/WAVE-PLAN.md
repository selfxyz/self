# Execution Wave Plan

> Last updated: 2026-02-19
> Project: [SDK-OVERVIEW.md](./SDK-OVERVIEW.md)

Cross-workstream chunk execution plan for parallel AI agent work via `claude --remote`.

## What is a Wave?

A **wave** is a batch of chunks that can execute in parallel because they have no inter-dependencies. Waves are sequenced: Wave 2 starts after Wave 1 completes, because Wave 2 chunks depend on Wave 1 outputs. Within a wave, each chunk runs on a separate AI agent (or developer) simultaneously. This maximizes throughput — instead of executing 27 chunks sequentially, we run them in 5 waves with up to 5 parallel agents per wave.

**Wave != sprint.** Sprints are time-boxed. Waves are dependency-ordered. A wave is done when all its chunks pass validation, regardless of calendar time.

## Chunk Inventory

| Chunk  | Workstream                   | Description                                    | Size  | Status              | Dependencies |
| ------ | ---------------------------- | ---------------------------------------------- | ----- | ------------------- | ------------ |
| 4A     | Person 4 (SDK Core)          | Config & Platform Abstraction                  | S     | Done                | —            |
| 4B     | Person 4 (SDK Core)          | Browser Entry Point & Package Exports          | S     | Done                | 4A           |
| 4C     | Person 4 (SDK Core)          | WebView Lifecycle Events                       | S     | Done                | 4B           |
| 4D     | Person 4 (SDK Core)          | WsAdapter Integration (optional)               | M     | Skipped             | 4C           |
| 4E     | Person 4 (SDK Core)          | Conditional SelfApp Store                      | S     | Done                | 4A           |
| **4F** | **Person 4 (SDK Core)**      | **Web Fallback Adapter Implementations**       | **M** | **Done**            | 4B           |
| 1F     | Person 1 (WebView)           | Bridge Package                                 | L     | Done                | —            |
| 1B     | Person 1 (WebView)           | Onboarding Screens (5)                         | M     | Done                | 1F           |
| 1C     | Person 1 (WebView)           | Proving + Result Screens                       | M     | Done                | 1F           |
| 1D     | Person 1 (WebView)           | Remaining Screens (Home, Settings, ComingSoon) | S     | Done                | 1F           |
| **1E** | **Person 1 (WebView)**       | **WebView App Shell (Vite + router)**          | **M** | **Partial**         | 1D           |
| 2A     | Person 2 (Native Shells)     | KMP Setup + Bridge Protocol                    | S     | Done                | —            |
| 2B     | Person 2 (Native Shells)     | Android WebView Host                           | S     | Done                | 2A           |
| 2C     | Person 2 (Native Shells)     | Android Native Handlers (5)                    | L     | Done                | 2B           |
| 2D     | Person 2 (Native Shells)     | iOS WebView Host + Provider Infra (stub)       | M     | Superseded by 2G-2K | —            |
| 2E     | Person 2 (Native Shells)     | iOS Native Handlers (stub)                     | M     | Superseded by 2G-2K | 2D           |
| 2F     | Person 2 (Native Shells)     | SDK Public API finalize                        | M     | Partial             | 2C, 2K       |
| **2G** | **Person 2 (Native Shells)** | **iOS Factory Infrastructure**                 | **S** | **Done**            | —            |
| **2H** | **Person 2 (Native Shells)** | **iOS Biometric Handler**                      | **S** | **Done**            | 2G           |
| **2I** | **Person 2 (Native Shells)** | **iOS Lifecycle Handler**                      | **S** | **Done**            | 2G           |
| **2J** | **Person 2 (Native Shells)** | **iOS WebView + launch()**                     | **M** | **Done**            | 2G, 2H, 2I   |
| **2K** | **Person 2 (Native Shells)** | **iOS NFC Handler**                            | **M** | **Done**            | 2J           |
| **5A** | **Person 5 (RN SDK)**        | **Package + Component + Router**               | **M** | **Done**            | —            |
| **5B** | **Person 5 (RN SDK)**        | **Biometric + Keychain Handlers**              | **S** | **Done**            | 5A           |
| **5C** | **Person 5 (RN SDK)**        | **NFC + Camera Handlers**                      | **L** | **Done**            | 5A           |
| **5D** | **Person 5 (RN SDK)**        | **Asset Bundling**                             | **M** | **Done**            | 5A-5C, 1E    |
| **3A** | **Person 3 (Integrations)**  | **MiniPay Project Setup**                      | **M** | **Done**            | —            |
| **3B** | **Person 3 (Integrations)**  | **Wire SelfSdk.launch()**                      | **M** | **Done**            | 3A           |
| **3C** | **Person 3 (Integrations)**  | **Polish + Error Handling**                    | **S** | **Partial**         | 3B           |
| 2L     | Person 2 (Native Shells)     | Camera MRZ Handler (iOS)                       | S     | Deferred (Phase 2)  | 2J           |

**Totals (reconciled 2026-02-19):** 30 chunks — 23 done, 3 partial (1E, 2F, 3C), 1 skipped (4D optional), 2 superseded (2D/2E → 2G-2K), 1 deferred (2L Phase 2).  
**Remaining to close:** 4 items (3 partial + 1 deferred).

## Reconciliation Notes (2026-02-19)

- This file now reflects post-implementation reconciliation, not just pre-execution planning.
- The older aggregate summary (`11 done / 13 pending`) was stale and has been replaced by audited counts.
- Partial items are blocked on correctness/validation decisions rather than missing package scaffolding.
- Key carry-forward risks are tracked in `specs/HANDOFF.md`.

## Execution Waves

### Wave 1 — 4 parallel agents

No cross-dependencies. All can start immediately.

| Agent | Chunk | Workstream                              | Size  | Notes                      |
| ----- | ----- | --------------------------------------- | ----- | -------------------------- |
| A     | 4F    | Person 4 — Web Fallback Adapters        | M ~6k | Last SDK core chunk        |
| B     | 1E    | Person 1 — WebView App Shell            | M ~8k | In progress, Vite + router |
| C     | 2G    | Person 2 — iOS Factory Infrastructure   | S ~3k | Starts iOS chain           |
| D     | 5A    | Person 5 — Package + Component + Router | M ~8k | Starts RN SDK chain        |

### Wave 2 — 5 parallel agents

Starts after Wave 1 completes. Each chunk's predecessor is listed.

| Agent | Chunk | Workstream                       | Size   | Predecessor                   |
| ----- | ----- | -------------------------------- | ------ | ----------------------------- |
| A     | 2H    | Person 2 — iOS Biometric Handler | S ~2k  | 2G                            |
| B     | 2I    | Person 2 — iOS Lifecycle Handler | S ~2k  | 2G                            |
| C     | 5B    | Person 5 — Biometric + Keychain  | S ~4k  | 5A                            |
| D     | 5C    | Person 5 — NFC + Camera Handlers | L ~10k | 5A                            |
| E     | 3A    | Person 3 — MiniPay Project Setup | M ~6k  | None (soft block on Person 2) |

### Wave 3 — 3 parallel agents

| Agent | Chunk | Workstream                        | Size  | Predecessor |
| ----- | ----- | --------------------------------- | ----- | ----------- |
| A     | 2J    | Person 2 — iOS WebView + launch() | M ~5k | 2G, 2H, 2I  |
| B     | 3B    | Person 3 — Wire SelfSdk.launch()  | M ~5k | 3A          |
| C     | 5D    | Person 5 — Asset Bundling         | M ~6k | 5A-5C, 1E   |

### Wave 4 — 2 parallel agents

| Agent | Chunk | Workstream                         | Size  | Predecessor |
| ----- | ----- | ---------------------------------- | ----- | ----------- |
| A     | 2K    | Person 2 — iOS NFC Handler         | M ~5k | 2J          |
| B     | 3C    | Person 3 — Polish + Error Handling | S ~4k | 3B          |

### Wave 5 — 1 agent

| Agent | Chunk | Workstream                         | Size  | Predecessor |
| ----- | ----- | ---------------------------------- | ----- | ----------- |
| A     | 2F    | Person 2 — SDK Public API finalize | M ~5k | 2C, 2K      |

## Dependency Graph

```
Wave 1 (parallel):  4F    1E    2G    5A
                     │      │     │     ├──────┐
Wave 2 (parallel):   │      │    2H 2I  5B   5C   3A
                     │      │     │  │   │     │    │
Wave 3 (parallel):   │      │    2J     5D←──1E   3B
                     │      │     │                 │
Wave 4 (parallel):   │      │    2K                3C
                     │      │     │
Wave 5:              ▼      ▼    2F
                   DONE   DONE   │
                                 ▼
                               DONE
```

## Critical Path

The longest dependency chain determines minimum wall-clock time:

```
2G → 2H/2I → 2J → 2K → 2F
 S     S/S     M    M    M
```

This iOS chain spans Waves 1–5 (5 sequential steps). Everything else can parallelize around it. **Person 2's iOS work is the bottleneck.** If iOS slips, the SDK public API (2F) slips.

## Notes

- **2D/2E overlap**: Chunks 2D and 2E were the original iOS stubs. They are superseded by the 2G→2K Swift wrapper chain. The wave plan uses 2G-2K.
- **2L deferred**: Camera MRZ on iOS (Chunk 2L) is Phase 2. Not scheduled in any wave. Add to a future wave when Phase 2 planning starts.
- **3A soft block**: MiniPay sample technically depends on Person 2's KMP SDK artifact, but project scaffolding (3A) can proceed with mocks. Hard dependency starts at 3B.
- **5D depends on 1E**: Asset bundling needs the Vite bundle output from Person 1's WebView app shell.
- **Use `claude --remote`** for M and L chunks to avoid tying up terminals.
