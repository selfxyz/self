# Native Duplication Consolidation — Phased Spec

> Last updated: 2026-03-06
> Owner: SDK Platform
> Parent: [SDK Overview](../../OVERVIEW.md)
> Status: Proposed

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

## Phased Plan

### Phase 0 — Baseline + Safety Rails

**Goal:** Freeze behavior and establish parity checks before moving code.

**Deliverables:**

- Snapshot current iOS MRZ + NFC bridge contracts (method names, payload keys, error codes).
- Add/refresh tests around JS consumers that depend on `PassportReader.configure/trackEvent/flush` semantics:
  - `app/tests/src/integrations/nfc/passportReader.test.ts`
  - `app/tests/src/integrations/nfc/nfcScanner.test.ts`
  - analytics integration call sites in `app/src/services/analytics.ts`
- Add a temporary contract checklist to PR template for this initiative.

**Exit criteria:**

- Contract checklist exists and is used in all follow-up PRs.
- Baseline tests for `app/src/integrations/nfc/passportReader.ts` and related analytics call sites are green.

---

### Phase 1 — MRZ Core Unification (iOS)

**Goal:** Make one canonical MRZ scanning implementation and keep module-name wrappers.

**Scope clarification:** RN test app iOS MRZ consolidation is already tracked in `specs/projects/sdk/workstreams/rn-sdk/SPEC-MRZ-CONSOLIDATION.md`. Phase 1 here targets consolidation between `app/ios` and `mobile-sdk-alpha`/`self-sdk-swift`.

**Implementation direction:**

- Canonicalize MRZ camera/OCR/parsing in `self-sdk-swift` helper layer.
- `app/ios` and `mobile-sdk-alpha` modules become thin wrappers that:
  - invoke the same helper,
  - map to their expected module names/payload shape,
  - keep cancellation/error semantics unchanged.

**Likely touchpoints:**

- `packages/self-sdk-swift/Sources/SelfSdkSwift/Helpers/*Mrz*`
- `app/ios/MRZScannerModule.swift`
- `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScannerModule.swift`
- optional: shared UI constants file for instruction copy/colors.

**Exit criteria:**

- No duplicated OCR/parsing code remains in app/sdk module wrappers.
- Both module names still function (`MRZScannerModule`, `SelfMRZScannerModule`) where expected.

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

**Exit criteria:**

- Feature parity table is fully checked.
- One internal implementation, two thin wrappers max.

---

### Phase 3 — Shim and Naming Cleanup

**Goal:** Collapse ObjC shim duplication and prepare deprecations.

**Implementation direction:**

- Keep only required ObjC bridge files; convert redundant shims to generated/templated or delete where Swift-only exposure is sufficient.
- Add deprecation notes for legacy module names and migration timeline.

**Exit criteria:**

- Duplicate ObjC bridge files reduced to minimum required by RN/Xcode linking.
- No JS/runtime dependency on soon-to-be-removed module names without fallback.

---

### Phase 4 — Deletion + Hardening

**Goal:** Delete deprecated duplicate files and lock consolidation.

**Implementation direction:**

- Remove old duplicated scanner/passport files that are no longer referenced.
- Update docs/spec references and maintenance ownership.
- Add CI guardrails (simple grep/check) to prevent reintroducing duplicate scanner/parser implementations.

**Exit criteria:**

- Dead files removed.
- CI guardrail in place.
- Updated docs in SDK index/workstream status.

## PR Strategy

1. PR A: Phase 0 safety rails + baseline tests.
2. PR B: Phase 1 MRZ core unification only.
3. PR C: Phase 2 PassportReader parity and shared core.
4. PR D: Phase 3 shim cleanup.
5. PR E: Phase 4 deletions and CI guardrails.

Do not combine PR C with B; PassportReader carries higher regression risk.

## Validation Matrix

| Validation                | Type   | Command / Check                                                                                                                                                        | Required In Phase |
| ------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| RN SDK unit tests         | Unit   | `yarn workspace @selfxyz/rn-sdk test`                                                                                                                                  | 0-4               |
| App NFC contract tests    | Unit   | app test suite for `passportReader` integration                                                                                                                        | 0-4               |
| RN test app iOS build     | Build  | `xcodebuild -workspace SelfRNTestApp.xcworkspace -scheme SelfRNTestApp -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16'` | 1-4               |
| App iOS build             | Build  | app iOS Debug build in CI/local                                                                                                                                        | 1-4               |
| Manual MRZ cancel/success | Manual | Verify `MRZ_SCAN_CANCELLED` and success payload keys                                                                                                                   | 1-4               |
| Manual NFC flow sanity    | Manual | Verify scan + expected errors + analytics events                                                                                                                       | 2-4               |

## Risks and Mitigations

- **Risk:** SSH-based dependency resolution (`NFCPassportReader`) blocks iOS build validation in some CI environments.
  - **Mitigation:** Ensure CI runner SSH credentials or mirrored HTTPS strategy before Phase 1 merge gates.

- **Risk:** PassportReader analytics methods regress during consolidation.
  - **Mitigation:** Parity table + dedicated tests in Phase 0/2; no deletion before parity proven.

- **Risk:** CocoaPods + SPM churn rewrites `project.pbxproj` and drops links.
  - **Mitigation:** Re-run `pod install` + build verification in every iOS-touching PR; include package linkage check in review checklist.

## Definition of Done (Initiative)

- [ ] One canonical MRZ scanner implementation used by app/sdk wrappers.
- [ ] One canonical PassportReader implementation with parity-preserving wrappers.
- [ ] Duplicate ObjC shims minimized.
- [ ] Legacy duplicate files deleted.
- [ ] Build/test/manual validation matrix green across affected targets.
