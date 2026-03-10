# iOS Intermittent Crash Fix — Implementation Spec

> Last updated: 2026-03-10
> Owner: justin
> Status: Active

## Required References

- [PROJECT-RULES.md](../archive/PROJECT-RULES.md)

## North Star

- Eliminate intermittent iOS simulator crashes during local development
- Bring local `yarn ios` determinism in line with CI
- Sequence changes by risk — safe hygiene first, gated arch changes last

## Overview

Multi-PR effort to diagnose and fix intermittent iOS simulator crashes.
Work is split into three PRs with decision gates between them.

## The Problem

| File | Issue |
|---|---|
| `app/scripts/run-ios-simulator.cjs` | Picks latest runtime + first available iPhone by name. No stale-device cleanup, no explicit boot, no boot-readiness wait. |
| `app/ios/Podfile:201` | Forces `EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64` on all pods — Rosetta-only simulator builds. May cause instability but cannot change without binary pod audit. |
| `app/src/config/sentry.ts` | `mobileReplayIntegration` + `feedbackIntegration` with screenshots active on simulator. Memory-intensive; known crash contributor on sim. |

## Current Notes

- Local PR 1 behavior intentionally prefers newer iPhone Pro simulators by default.
- CI currently prefers `iPhone SE (3rd generation)` first, then falls back to any iPhone in `.github/workflows/mobile-e2e.yml`.
- The launcher rewrite should align on boot discipline and explicit UDID targeting, not necessarily identical default device preference.

## PR Plan

| PR | Scope | Risk | Gate |
|---|---|---|---|
| **PR 1** | Simulator determinism + docs | Low | None — safe to ship now |
| **PR 2** | Simulator-only Sentry replay/feedback toggles + measurement | Low-Med | Requires crash evidence from step 0 |
| **PR 3** | Pod arch audit + Rosetta default change | High | Requires every binary pod to have arm64 sim slices |

### Step 0: Use existing crash evidence (before any PRs)

- Pull crash signatures from CI artifacts (`mobile-e2e.yml:860-871` collects from `~/Library/Logs/DiagnosticReports`)
- Correlate with Sentry events/replays at same timestamps/build SHAs
- Exit criterion: top 1-2 crash signatures identified

---

## PR 1: Deterministic iOS Simulator Launcher

### Definition of Done

> **Done when:** `yarn ios` deterministically boots a specific simulator by UDID, cleans up stale devices, waits for boot completion, and supports env-var pinning. Behavior documented in AGENTS.md.

### Files You Will Modify

| File | Change | Risk |
|---|---|---|
| `app/scripts/run-ios-simulator.cjs` | Full rewrite (~90 LOC) | **Low** — self-contained script, no app code changes |
| `app/AGENTS.md` | Add iOS Simulator Selection subsection | **Low** — docs only |

### Files You Will NOT Modify

| File | Why |
|---|---|
| `app/package.json` | `"ios"` script stays `yarn build:deps && node scripts/run-ios-simulator.cjs` |
| `app/ios/Podfile` | Arch changes are PR 3 |
| `app/src/config/sentry.ts` | Runtime toggles are PR 2 |
| `.github/workflows/*` | CI already has its own simulator setup |

### Chunk 1: Rewrite `run-ios-simulator.cjs` — S ~2k tokens

**Goal:** Replace name-based, no-boot-management launcher with UDID-based deterministic launcher.

**Steps:**

1. Preserve 4-line SPDX header
2. Add env-var config: `IOS_SIMULATOR_DEVICE` (name substring), `IOS_SIMULATOR_RUNTIME` (version, dots or hyphens)
3. Implement `selectDevice(devicesJson)`:
   - Filter to iOS runtimes
   - Apply `IOS_SIMULATOR_RUNTIME` filter if set (normalize dots → hyphens for matching against `com.apple.CoreSimulator.SimRuntime.iOS-18-4` keys)
   - Sort runtimes latest-first
   - Collect available iPhones across matching runtimes
   - If `IOS_SIMULATOR_DEVICE` set, match by name substring; error with available list if no match
   - Default priority waterfall: iPhone 16 Pro > iPhone 16 > iPhone 15 Pro > iPhone 15 > first available
   - Return `{ name, udid, runtime }`
4. Main flow:
   - Call `selectDevice()`
   - Log device name, runtime, UDID
   - `xcrun simctl shutdown all` (swallow errors — benign on fresh machines)
   - `xcrun simctl boot "{udid}"`
   - `xcrun simctl bootstatus "{udid}" -b` (blocks until booted)
   - 5-second settle sleep
   - `react-native run-ios --scheme OpenPassport --udid "{udid}"`
5. Single top-level try/catch → `process.exit(1)`

##### Input / Output — Chunk Validation

**Input:**
```bash
node app/scripts/run-ios-simulator.cjs
```

**Expected Output:**
```
Simulator: iPhone 16 Pro (com.apple.CoreSimulator.SimRuntime.iOS-18-4)
UDID:      A1B2C3D4-E5F6-...
[simctl boot output]
[simctl bootstatus output]
[react-native run-ios output]
```

**Edge case — no matching device:**
```bash
IOS_SIMULATOR_DEVICE="iPad" node app/scripts/run-ios-simulator.cjs
```
```
iOS simulator launch failed: No available iPhone matching "iPad". Available: iPhone 16 Pro, iPhone 16, ...
```

**Edge case — bad runtime:**
```bash
IOS_SIMULATOR_RUNTIME="99.0" node app/scripts/run-ios-simulator.cjs
```
```
iOS simulator launch failed: No iOS runtime matching "99.0" found
```

### Chunk 2: Update AGENTS.md — S ~1k tokens

**Goal:** Document new env vars and local simulator behavior.

**Steps:**

1. Add `#### iOS Simulator Selection` subsection after "Development Tips" (before `## E2E Testing` at line 120)
2. Content:
   - Explain `yarn ios` now explicitly boots a clean simulator
   - Table: `IOS_SIMULATOR_DEVICE` and `IOS_SIMULATOR_RUNTIME` env vars
   - Default device priority list
   - Usage examples
   - Note about stale-simulator cleanup

### Dependency Graph

```
Chunk 1 (no deps) → Chunk 2 (after 1, parallel-safe but logically after)
```

### Completion Status

| Chunk | Description | Size | Status |
|---|---|---|---|
| 1 | Rewrite run-ios-simulator.cjs | S | **Completed** |
| 2 | Update AGENTS.md | S | **Completed** |

### Validation Plan

```bash
# After chunk 1:
node app/scripts/run-ios-simulator.cjs
# Should select device, boot, launch build

# With pinning:
IOS_SIMULATOR_DEVICE="iPhone 16 Pro" node app/scripts/run-ios-simulator.cjs

# Error case:
IOS_SIMULATOR_DEVICE="iPad" node app/scripts/run-ios-simulator.cjs
# Should error gracefully

# Full end-to-end:
yarn ios
```

### Key Reference Files

| File | What to Look At |
|---|---|
| `app/scripts/run-ios-simulator.cjs` | Current script to replace |
| `.github/workflows/mobile-e2e.yml:527-599` | CI simulator setup to align with |
| `app/AGENTS.md:107-119` | Docs section to extend |

---

## PR 2: Runtime Crash Isolation

### Outcome

- Implemented as a low-risk simulator-only isolation hedge while local reproduction remained inconclusive.
- iOS simulator now disables Sentry mobile replay entirely and disables feedback screenshots.
- Real devices keep the existing replay and feedback screenshot behavior.

### Files Modified

| File | Change |
|---|---|
| `app/src/config/sentry.ts` | Disable replay on iOS simulator and disable feedback screenshots on iOS simulator |
| `app/tests/src/config/sentry.test.ts` | Assert simulator-only Sentry runtime flags |

### Validation

```bash
yarn --cwd app jest:run tests/src/config/sentry.test.ts --runInBand --watchman=false
```

## PR 3: Pod Architecture / Rosetta

### Outcome

- Added an explicit binary-pod arm64 simulator audit in `app/ios/Podfile`.
- Rosetta simulator fallback is now conditional instead of an unexplained blanket setting.
- Current install still keeps `EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64` because `SwiftyTesseract/libtesseract.xcframework` only ships `ios-x86_64-simulator`, not an arm64 simulator slice.

### Files Modified

| File | Change |
|---|---|
| `app/ios/Podfile` | Audit installed xcframework simulator slices and only keep Rosetta fallback when an audited binary pod lacks arm64 simulator support |

### Validation

```bash
ruby -c app/ios/Podfile
```

---

## Follow-Up (Out of Scope)

| Item | Discovered during | Suggested action |
|---|---|---|
| CI simulator setup could share logic with local script | PR 1 planning | Consider extracting shared config if both diverge again |
| `react-native run-ios` uses scheme "OpenPassport" but project is "Self.xcodeproj" | PR 1 planning | Verify this is intentional; not blocking |
