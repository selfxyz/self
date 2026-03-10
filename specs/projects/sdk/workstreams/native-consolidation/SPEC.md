# Native Duplication Consolidation — Phased Spec

> Last updated: 2026-03-06
> Owner: SDK Platform
> Parent: [SDK Overview](../../OVERVIEW.md)
> Status: In Progress (Phase 0 Done, Phase 1 In Progress)

## North Star

- **Goal:** Minimize duplicated native code across `app`, `mobile-sdk-alpha`, `self-sdk-swift`, and RN test harnesses while preserving current bridge contracts and app behavior.
- **Success metric:** Shared native implementations become the single source of truth; app-specific modules are thin wrappers or deleted.
- **Constraint:** No user-visible regressions in MRZ scan, NFC scan, analytics hooks, or bridge error codes.

## Why This Exists

Current native code is duplicated across multiple package/app surfaces, especially on iOS:

- MRZ camera stack duplicated between app and SDK variants.
- Passport reader bridge duplicated with partial behavioral divergence.
- ObjC bridge shims duplicated with mostly naming-only changes.
- State/copy mappings duplicated across scanner UIs.

This creates drift risk, review overhead, and slow bug-fix propagation.

## Out of Scope

- Bridge protocol redesign.
- Rewriting host app business logic in TypeScript as part of this effort.
- Android architecture rewrites unrelated to MRZ/NFC duplication.
- Re-doing Android MRZ consolidation already shipped in RN test app (PR #1817).

## Consolidation Inventory

### High-value duplicates

| Area                                 | Primary Files                                                                                                                                                                                                                                                                                            | Current Risk                            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| iOS MRZ scanner module/view pipeline | `app/ios/MRZScannerModule.swift`, `app/ios/LiveMRZScannerView.swift`, `app/ios/MRZScanner.swift`, `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScannerModule.swift`, `packages/mobile-sdk-alpha/ios/SelfSDK/SelfLiveMRZScannerView.swift`, `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScanner.swift` | High drift risk                         |
| iOS PassportReader bridge            | `app/ios/PassportReader.swift`, `app/ios/PassportReader.m`, `packages/mobile-sdk-alpha/ios/SelfSDK/PassportReader.swift`, `packages/mobile-sdk-alpha/ios/SelfSDK/PassportReader.m`                                                                                                                       | High regression risk if deleted blindly |
| RN test app MRZ UI mapping constants | `packages/rn-sdk-test-app/ios/SelfRNTestApp/SelfMRZScannerModule.swift`, `packages/kmp-sdk-test-app/composeApp/src/iosMain/kotlin/xyz/self/testapp/screens/MrzScanScreen.ios.kt`                                                                                                                         | Medium (UX drift)                       |

### Android status (explicit)

- RN test app Android MRZ consolidation is complete (PR #1817; `SelfMrzParser.kt` removed, scanner delegated to `CameraMrzBridgeHandler`).
- This initiative is primarily iOS-focused unless new Android duplication is identified.

### Medium-value duplicates

| Area                         | Primary Files                                                                                                                                                                      | Current Risk                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| ObjC bridge shim duplication | `app/ios/MRZScannerModule.m`, `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScannerModule.m`, `app/ios/PassportReader.m`, `packages/mobile-sdk-alpha/ios/SelfSDK/PassportReader.m` | Low runtime risk, medium maintenance cost |

## Design Principles

1. **Consolidate behavior first, then delete files.**
2. **Keep public native module names stable during migration** (`PassportReader`, `SelfPassportReader`, `MRZScannerModule`, `SelfMRZScannerModule`) via wrappers/adapters.
3. **No big-bang PR.** Each phase must be mergeable and independently verifiable.
4. **One source of truth per capability** (MRZ scanner core, Passport reader core).
5. **Tests before consolidation.** No phase that moves or deletes native code may merge without passing tests from the previous phase. Phase 0 tests are a hard gate for Phase 1+.

## Execution Model

- Durable context and phased rationale stay in this file.
- Each PR-sized execution unit now lives under [`plans/`](./plans/).
- The backlog below is the source of truth for "what's next?" in this workstream.

## Backlog

| ID | Title | Status | Priority | Depends On | Plan | PR |
| -- | ----- | ------ | -------- | ---------- | ---- | -- |
| NC-01 | Phase 0 safety rails and bridge contract baselines | Ready | High | - | [plans/NC-01-phase-0-safety-rails.md](./plans/NC-01-phase-0-safety-rails.md) | - |
| NC-02 | Phase 1 MRZ core unification and build validation | In Progress | High | NC-01 | [plans/NC-02-phase-1-mrz-unification.md](./plans/NC-02-phase-1-mrz-unification.md) | - |
| NC-03 | Phase 2 PassportReader parity bridge | Ready | High | NC-02 | [plans/NC-03-phase-2-passport-reader-parity.md](./plans/NC-03-phase-2-passport-reader-parity.md) | - |
| NC-04 | Phase 3 ObjC shim cleanup | Ready | Medium | NC-03 | [plans/NC-04-phase-3-shim-cleanup.md](./plans/NC-04-phase-3-shim-cleanup.md) | - |
| NC-05 | Phase 4 deletion and CI guardrails | Ready | Medium | NC-04 | [plans/NC-05-phase-4-deletions-and-guardrails.md](./plans/NC-05-phase-4-deletions-and-guardrails.md) | - |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

## Active Plans

| Plan | IDs | Status |
| ---- | --- | ------ |
| [plans/NC-01-phase-0-safety-rails.md](./plans/NC-01-phase-0-safety-rails.md) | NC-01 | Ready |
| [plans/NC-02-phase-1-mrz-unification.md](./plans/NC-02-phase-1-mrz-unification.md) | NC-02 | In Progress |
| [plans/NC-03-phase-2-passport-reader-parity.md](./plans/NC-03-phase-2-passport-reader-parity.md) | NC-03 | Ready |
| [plans/NC-04-phase-3-shim-cleanup.md](./plans/NC-04-phase-3-shim-cleanup.md) | NC-04 | Ready |
| [plans/NC-05-phase-4-deletions-and-guardrails.md](./plans/NC-05-phase-4-deletions-and-guardrails.md) | NC-05 | Ready |

## Completion Checklist

- [ ] Phase status matches the backlog table
- [ ] Every open phase has a linked plan file
- [ ] Conflicting implementation directions are reconciled in this file
- [ ] CONTRACTS.md stays aligned with the active phase

## Testing Strategy

Every consolidation phase has testable outputs. Tests are layered by what they can prove:

### Layer 1 — Bridge Contract Tests (TypeScript, Jest)

Mock `NativeModules` from react-native. Assert that JS consumers call the correct native method names with the correct argument shapes and handle the correct error codes. These are cheap, fast, and catch rename/shape regressions immediately.

**Scope:**

| Test File                                                          | What It Validates                                                                                                                                                                                                                                            | Created In | Required In |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----------- |
| `app/src/integrations/nfc/__tests__/passportReader.test.ts`        | `passportReader.ts` calls `NativeModules.PassportReader` with correct method names, handles expected error codes (`NFC_NOT_SUPPORTED`, `PASSPORT_READ_FAILED`, etc.), returns expected payload shape (`documentNumber`, `dateOfBirth`, `dateOfExpiry`, etc.) | Phase 0    | 0-4         |
| `app/src/integrations/nfc/__tests__/nfcScanner.test.ts`            | `nfcScanner.ts` NFC scanning flow contract — start/stop/cancel lifecycle, error propagation                                                                                                                                                                  | Phase 0    | 0-4         |
| `app/src/services/__tests__/analytics.test.ts`                     | Analytics call sites that reference PassportReader methods (`configure`, `trackEvent`, `flush`) are called with expected arguments                                                                                                                           | Phase 0    | 0-4         |
| `packages/rn-sdk-test-app/src/__tests__/mrzBridgeContract.test.ts` | RN test app MRZ bridge contract — error codes (`MRZ_SCAN_CANCELLED`, `MRZ_SCAN_FAILED`, `MRZ_SCAN_IN_PROGRESS`, `CAMERA_PERMISSION_DENIED`, `CAMERA_INIT_FAILED`), success payload keys (`documentNumber`, `dateOfBirth`, `dateOfExpiry`)                    | Phase 0    | 0-4         |

### Layer 2 — Native Parity Snapshots (Documentation)

A `CONTRACTS.md` file documents every exposed native method, event, payload key, and error code for both the app and SDK versions. This is the "before" photo. Each consolidation PR must update it and show the diff is intentional.

**Scope:**

| Section        | Files Compared                                                                                         | Created In | Updated In    |
| -------------- | ------------------------------------------------------------------------------------------------------ | ---------- | ------------- |
| MRZ Scanner    | `app/ios/MRZScannerModule.swift` vs `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScannerModule.swift` | Phase 0    | Phase 1, 3, 4 |
| PassportReader | `app/ios/PassportReader.swift` vs `packages/mobile-sdk-alpha/ios/SelfSDK/PassportReader.swift`         | Phase 0    | Phase 2, 3, 4 |
| ObjC Shims     | `app/ios/*.m` vs `packages/mobile-sdk-alpha/ios/SelfSDK/*.m`                                           | Phase 0    | Phase 3, 4    |

### Layer 3 — Build Verification (CI)

All affected targets must build. This is already partially in CI but needs to cover the app iOS build too.

| Target                    | Command                                            | Required In |
| ------------------------- | -------------------------------------------------- | ----------- |
| RN SDK unit tests         | `yarn workspace @selfxyz/rn-sdk test`              | 0-4         |
| App contract tests        | `cd app && yarn jest:run`                          | 0-4         |
| RN test app iOS build     | `xcodebuild` (see CI workflow)                     | 1-4         |
| RN test app Android build | `./gradlew assembleDebug`                          | 1-4         |
| App iOS build             | app iOS Debug build                                | 1-4         |
| KMP SDK tests             | `cd packages/kmp-sdk && ./gradlew :shared:jvmTest` | 1-4         |

### Layer 4 — Behavioral Smoke Tests (Manual, On-Device)

MRZ scanning requires a camera. NFC reading requires hardware. These cannot be automated in unit tests. Each consolidation PR must include manual verification sign-off.

| Test                                                | Surfaces                         | Required In |
| --------------------------------------------------- | -------------------------------- | ----------- |
| MRZ scan cancel -> `MRZ_SCAN_CANCELLED`             | App, RN test app (iOS + Android) | 1-4         |
| MRZ scan success -> correct payload keys            | App, RN test app (iOS + Android) | 1-4         |
| MRZ permission denied -> `CAMERA_PERMISSION_DENIED` | App, RN test app (iOS + Android) | 1-4         |
| MRZ camera init failure -> `CAMERA_INIT_FAILED`     | RN test app (iOS)                | 1-4         |
| NFC scan + expected errors                          | App (iOS)                        | 2-4         |
| Analytics events fire during NFC flow               | App (iOS)                        | 2-4         |

### Lesson from MRZ Consolidation (PRs #1817, #1821)

The RN test app MRZ consolidation shipped without baseline tests. It relied on build verification and manual Android testing. iOS manual testing is still pending. The risk was acceptable because the RN test app is not production, but this approach does not scale to `app/` and `mobile-sdk-alpha/` consolidation. Phase 0 retroactively covers the RN test app contracts so future regressions are caught.

## Phased Plan

### Phase 0 — Baseline + Safety Rails

**Goal:** Freeze behavior and establish parity checks before moving code.

**Deliverables:**

1. **CONTRACTS.md** — snapshot current iOS MRZ + NFC bridge contracts (Layer 2). Diff app vs SDK for every method, payload key, error code, and analytics hook.
2. **Bridge contract tests** (Layer 1) — all four test files listed in the testing strategy. These mock `NativeModules` and validate:
   - Method names match what native modules expose
   - Payload shapes match expected keys
   - Error codes are the documented canonical set
   - Analytics integration calls PassportReader methods with correct arguments
3. **PR template checklist** — append native consolidation checklist to `.github/PULL_REQUEST_TEMPLATE.md`.

**Test deliverables (specific):**

- `app/src/integrations/nfc/__tests__/passportReader.test.ts`:
  - Calls `NativeModules.PassportReader.scanPassport` with expected args
  - Handles success payload with `documentNumber`, `dateOfBirth`, `dateOfExpiry`
  - Handles each known error code
  - Calls `configure`, `trackEvent`, `flush` if used by the TS layer
- `app/src/integrations/nfc/__tests__/nfcScanner.test.ts`:
  - Start/stop/cancel lifecycle calls correct native methods
  - Error propagation maps native errors to JS error types
- `app/src/services/__tests__/analytics.test.ts`:
  - Analytics methods that reference PassportReader are called with expected event names
- `packages/rn-sdk-test-app/src/__tests__/mrzBridgeContract.test.ts`:
  - `startScanning` resolves with `{ documentNumber, dateOfBirth, dateOfExpiry }`
  - `startScanning` rejects with each of: `MRZ_SCAN_CANCELLED`, `MRZ_SCAN_FAILED`, `MRZ_SCAN_IN_PROGRESS`, `CAMERA_PERMISSION_DENIED`, `CAMERA_INIT_FAILED`

**Exit criteria:**

- CONTRACTS.md exists with full parity tables.
- All Layer 1 tests pass: `cd app && yarn jest:run` and `yarn workspace @selfxyz/rn-sdk-test-app test` (or equivalent).
- PR template checklist is in place.

---

### Phase 1 — MRZ Core Unification (iOS)

**Goal:** Make one canonical MRZ scanning implementation and keep module-name wrappers.

**Scope clarification:** RN test app iOS MRZ consolidation is already tracked in `specs/projects/sdk/workstreams/rn-sdk/SPEC-MRZ-CONSOLIDATION.md`. Phase 1 here targets consolidation between `app/ios` and `mobile-sdk-alpha`/`self-sdk-swift`.

**Implementation direction:**

- Active path: keep `packages/self-sdk-swift` unchanged in Phase 1 and use identical helper files in `app/ios` and `packages/mobile-sdk-alpha/ios/SelfSDK/`.
- Historical alternative: canonicalize MRZ camera/OCR/parsing in `self-sdk-swift` helper layer. This remains a future follow-up option, not the current implementation path.
- `app/ios` and `mobile-sdk-alpha` modules become thin wrappers that:
  - invoke the same helper,
  - map to their expected module names/payload shape,
  - keep cancellation/error semantics unchanged.

**Likely touchpoints:**

- `app/ios/*Mrz*`
- `packages/mobile-sdk-alpha/ios/SelfSDK/*Mrz*`
- `app/ios/MRZScannerModule.swift`
- `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScannerModule.swift`
- optional: shared UI constants file for instruction copy/colors.

**Test deliverables:**

- All Phase 0 Layer 1 tests still pass (no contract regressions).
- Update CONTRACTS.md: MRZ Scanner section should show "same implementation" instead of divergent columns.
- Layer 3: App iOS build and RN test app iOS build both pass.
- Layer 4: Manual MRZ scan cancel/success verified on app and RN test app (iOS + Android).

**Exit criteria:**

- No duplicated OCR/parsing code remains in app/sdk module wrappers.
- Both module names still function (`MRZScannerModule`, `SelfMRZScannerModule`) where expected.
- All Layer 1 tests pass. CONTRACTS.md updated. Manual sign-off recorded in PR.
- The active Phase 1 implementation path matches `PLAN.md` and the linked PR plan file.

---

### Phase 2 — PassportReader Parity Bridge

**Goal:** Remove dangerous divergence between app and sdk PassportReader implementations before deletion.

**Current blocker:**

- `app` version includes analytics/session-specific behavior not fully present in sdk variant.

**Implementation direction:**

- Define explicit PassportReader contract table:
  - required methods: `scanPassport`, `reset`, and currently-used analytics/config methods.
  - required error mapping and response shape.
- Introduce a shared internal PassportReader core.
- Keep module name wrappers for compatibility (`PassportReader` and `SelfPassportReader`) until consumers migrate.

**Likely touchpoints:**

- `app/ios/PassportReader.swift`
- `packages/mobile-sdk-alpha/ios/SelfSDK/PassportReader.swift`
- `app/src/services/analytics.ts`
- `app/src/integrations/nfc/passportReader.ts`

**Test deliverables:**

- All Phase 0 Layer 1 tests still pass.
- `passportReader.test.ts` and `analytics.test.ts` may need updates if the TS consumer changes — update tests first, then implementation.
- Update CONTRACTS.md: PassportReader section should show "same implementation" instead of divergent columns.
- Layer 4: Manual NFC scan + analytics events verified on app (iOS).

**Exit criteria:**

- Feature parity table is fully checked.
- One internal implementation, two thin wrappers max.
- All Layer 1 tests pass. CONTRACTS.md updated. Manual sign-off recorded in PR.

---

### Phase 3 — Shim and Naming Cleanup

**Goal:** Collapse ObjC shim duplication and prepare deprecations.

**Implementation direction:**

- Keep only required ObjC bridge files; convert redundant shims to generated/templated or delete where Swift-only exposure is sufficient.
- Add deprecation notes for legacy module names and migration timeline.

**Test deliverables:**

- All Layer 1 tests still pass (bridge contracts unchanged at JS level).
- Update CONTRACTS.md: ObjC Shims section should show reduced set.
- Layer 3: All builds pass.

**Exit criteria:**

- Duplicate ObjC bridge files reduced to minimum required by RN/Xcode linking.
- No JS/runtime dependency on soon-to-be-removed module names without fallback.
- All Layer 1 tests pass. CONTRACTS.md updated.

---

### Phase 4 — Deletion + Hardening

**Goal:** Delete deprecated duplicate files and lock consolidation.

**Implementation direction:**

- Remove old duplicated scanner/passport files that are no longer referenced.
- Update docs/spec references and maintenance ownership.
- Add CI guardrails (simple grep/check) to prevent reintroducing duplicate scanner/parser implementations.

**Test deliverables:**

- All Layer 1 tests still pass.
- CONTRACTS.md final state: one row per capability, no divergence columns.
- CI guardrail added: a lint step that fails if duplicate native scanner/parser files reappear (e.g., grep for `class MRZScanner` or `class SelfMrzParser` in more than one package).

**Exit criteria:**

- Dead files removed.
- CI guardrail in place and tested.
- Updated docs in SDK index/workstream status.
- All Layer 1 tests pass. CONTRACTS.md finalized.

## PR Strategy

1. PR A: Phase 0 safety rails + baseline tests.
2. PR B: Phase 1 MRZ core unification only.
3. PR C: Phase 2 PassportReader parity and shared core.
4. PR D: Phase 3 shim cleanup.
5. PR E: Phase 4 deletions and CI guardrails.

Do not combine PR C with B; PassportReader carries higher regression risk.

**Hard rule:** PR B cannot merge until PR A's tests are green in CI. PR C cannot merge until PR B's tests are green. Each phase's tests are a gate for the next.

## Risks and Mitigations

- **Risk:** SSH-based dependency resolution (`NFCPassportReader`) blocks iOS build validation in some CI environments.
  - **Mitigation:** Fixed in PR #1821 — `rn-sdk-test-app-ci.yml` now uses `generate-github-token` + HTTPS rewrite, matching `kmp-ci.yml` pattern.

- **Risk:** PassportReader analytics methods regress during consolidation.
  - **Mitigation:** Parity table + dedicated tests in Phase 0/2; no deletion before parity proven.

- **Risk:** CocoaPods + SPM churn rewrites `project.pbxproj` and drops links.
  - **Mitigation:** Re-run `pod install` + build verification in every iOS-touching PR; include package linkage check in review checklist.

- **Risk:** Consolidation ships without proving behavioral equivalence.
  - **Mitigation:** Layer 1 tests are a merge gate. Layer 4 manual sign-off is required in every consolidation PR. Lesson learned from PRs #1817/#1821 — don't repeat "consolidate first, test later."

## Definition of Done (Initiative)

- [ ] One canonical MRZ scanner implementation used by app/sdk wrappers.
- [ ] One canonical PassportReader implementation with parity-preserving wrappers.
- [ ] Duplicate ObjC shims minimized.
- [ ] Legacy duplicate files deleted.
- [ ] All Layer 1-3 tests green across affected targets.
- [ ] CONTRACTS.md shows single implementation per capability.
- [ ] CI guardrail prevents reintroduction of duplicate native code.
