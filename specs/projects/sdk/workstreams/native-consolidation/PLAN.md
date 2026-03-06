# Native Consolidation Phase 1 Plan (iOS MRZ)

## Objective

Consolidate duplicated iOS MRZ logic between `app/ios` and `packages/mobile-sdk-alpha/ios/SelfSDK` while preserving bridge contracts and app UX.

## Canonicalization Decision

`packages/self-sdk-swift` exists and will be the canonical home for shared MRZ scan core.

Shared behavior to move there:

- Vision OCR execution and completion-thread semantics
- MRZ text post-processing and ROI behavior
- Camera session lifecycle + scan completion callbacks

Wrapper-only behavior to keep local:

- React Native module names (`MRZScannerModule`, `SelfMRZScannerModule`)
- Payload shape differences (app flat payload vs sdk nested `data` payload)
- App-specific presentation (`ScannerWithInstructions`, Lottie overlay)

## File-by-File Strategy

### 1) Add shared MRZ core in self-sdk-swift

Create:

- `packages/self-sdk-swift/Sources/SelfSdkSwift/Helpers/MrzScanEngine.swift`
  - Shared OCR scan function used by both app/sdk wrappers.
  - Normalizes callback to main thread for deterministic bridge behavior.
- `packages/self-sdk-swift/Sources/SelfSdkSwift/Helpers/MrzResultMapper.swift`
  - Shared mapping from parser result to canonical intermediate dictionary.

Update:

- `packages/self-sdk-swift/Sources/SelfSdkSwift/SelfSdkSwift.swift`
  - Export new MRZ helpers (internal/public as required by consumers).

### 2) Convert app MRZ implementation to thin wrappers

Update:

- `app/ios/MRZScanner.swift`
  - Replace duplicate Vision logic with calls into shared `MrzScanEngine`.
- `app/ios/LiveMRZScannerView.swift`
  - Keep UI/flow but consume shared mapping helpers where possible.
- `app/ios/MRZScannerModule.swift`
  - Preserve module name and flat payload contract.

### 3) Convert mobile-sdk-alpha MRZ implementation to thin wrappers

Update:

- `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScanner.swift`
  - Delegate scan logic to shared `MrzScanEngine`.
- `packages/mobile-sdk-alpha/ios/SelfSDK/SelfLiveMRZScannerView.swift`
  - Keep wrapper type names + camera view type; reuse shared mapping.
- `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScannerModule.swift`
  - Preserve module name and nested payload contract.

### 4) Keep ObjC shims unchanged in this phase

Do not modify in Phase 1:

- `app/ios/MRZScannerModule.m`
- `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScannerModule.m`

ObjC cleanup remains Phase 3.

## Guardrails

- No JS bridge surface changes in Phase 1.
- No PassportReader changes in Phase 1.
- No analytics behavior changes in Phase 1.

## Validation Checklist

1. `cd app && yarn jest:run --watchman=false`
2. `yarn workspace @selfxyz/rn-sdk-test-app test --watchman=false`
3. iOS build check for app target (Debug)
4. iOS build check for `mobile-sdk-alpha` target
5. Manual smoke: MRZ success/cancel on app + RN test app

## Exit Criteria

- App and SDK MRZ wrappers are thin; shared core lives in `self-sdk-swift`.
- Existing bridge contract tests stay green without test rewrites.
- `CONTRACTS.md` updated to reflect reduced MRZ divergence.
