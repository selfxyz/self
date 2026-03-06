# Native Consolidation Phase 1 Plan (iOS MRZ)

## Objective

Consolidate duplicated iOS MRZ logic between `app/ios` and `packages/mobile-sdk-alpha/ios/SelfSDK` while preserving bridge contracts and app UX.

## Canonicalization Decision (Option B)

Shared MRZ core lives as standalone helper files duplicated in both `app/ios/` and `packages/mobile-sdk-alpha/ios/SelfSDK/`. The helper files are identical — both consumers become thin wrappers that delegate to them.

`packages/self-sdk-swift` is **unchanged** in Phase 1. A Phase 1.5 RFC will evaluate migrating the shared helpers into self-sdk-swift for a single cross-platform native MRZ stack.

Why Option B over Option A (self-sdk-swift):

1. No new self-sdk-swift + QKMRZParser dependency coupling.
2. Faster delivery: remove duplication across app/ios and mobile-sdk-alpha/ios now without touching KMP consumers.
3. Better rollback posture: scope limited to existing iOS RN surfaces.

Shared helpers (identical files in both locations):

- `MrzScanEngine.swift` — Vision OCR scan function, ROI handling, thread dispatch (replaces `MRZScanner.swift` / `SelfMRZScanner.swift`)
- `MrzOcrCorrection.swift` — single-char OCR correction, Belgium document handling, validation
- `MrzResultMapper.swift` — QKMRZResult → dictionary mapping

Wrapper-only behavior kept local:

- React Native module names (`MRZScannerModule`, `SelfMRZScannerModule`)
- Payload shape differences (app flat payload vs sdk nested `data` payload)
- App-specific presentation (`ScannerWithInstructions`, Lottie overlay)
- Camera view type (`CameraView` vs `SelfCameraView`)

## File-by-File Strategy

### 1) Create shared MRZ helpers

Create identical files in both locations:

**`app/ios/MrzScanEngine.swift`** and **`packages/mobile-sdk-alpha/ios/SelfSDK/MrzScanEngine.swift`**:
- Standalone `MrzScanEngine.scan(image:roi:completion:)` function
- Always dispatches completion to main thread
- Includes `String.matches(pattern:)` extension

**`app/ios/MrzOcrCorrection.swift`** and **`packages/mobile-sdk-alpha/ios/SelfSDK/MrzOcrCorrection.swift`**:
- `MrzOcrCorrection.singleCorrectDocumentNumber(mrzString:docNumber:parser:)`
- `MrzOcrCorrection.processBelgiumDocument(mrzString:parser:)`
- `MrzOcrCorrection.isValid(_:)` — check digit validation

**`app/ios/MrzResultMapper.swift`** and **`packages/mobile-sdk-alpha/ios/SelfSDK/MrzResultMapper.swift`**:
- `MrzResultMapper.toDictionary(_:)` — QKMRZResult → [String: Any]

### 2) Convert app MRZ implementation to thin wrappers

Done:

- `app/ios/MRZScanner.swift` — deleted, replaced by `MrzScanEngine.swift`
- `app/ios/LiveMRZScannerView.swift` — delegates to `MrzScanEngine`, `MrzOcrCorrection`, `MrzResultMapper`
- `app/ios/MRZScannerModule.swift` — preserved module name and flat payload contract (unchanged)

### 3) Convert mobile-sdk-alpha MRZ implementation to thin wrappers

Done:

- `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScanner.swift` — deleted, replaced by `MrzScanEngine.swift`
- `packages/mobile-sdk-alpha/ios/SelfSDK/SelfLiveMRZScannerView.swift` — delegates to `MrzScanEngine`, `MrzOcrCorrection`, `MrzResultMapper`
- `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScannerModule.swift` — preserved module name and nested payload contract (unchanged)

### 4) Keep ObjC shims unchanged

Do not modify in Phase 1:

- `app/ios/MRZScannerModule.m`
- `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScannerModule.m`

### 5) Keep self-sdk-swift unchanged

Do not modify in Phase 1:

- `packages/self-sdk-swift/` — no changes to Package.swift, no new helpers
- `MrzCameraHelper.swift` stays as-is (serves KMP, not RN)

### 6) Phase 1.5 RFC (future)

Open a follow-up to evaluate migrating the shared helpers into `self-sdk-swift` if a single cross-platform native MRZ stack is desired. This would:
- Add QKMRZParser as a self-sdk-swift dependency
- Move `MrzScanEngine`, `MrzOcrCorrection`, `MrzResultMapper` into self-sdk-swift
- Make both RN consumers import from self-sdk-swift instead of local copies

## Guardrails

- No JS bridge surface changes in Phase 1.
- No PassportReader changes in Phase 1.
- No analytics behavior changes in Phase 1.
- No self-sdk-swift changes in Phase 1.

## Validation Checklist

1. `cd app && yarn jest:run --watchman=false`
2. `yarn workspace @selfxyz/rn-sdk-test-app test --watchman=false`
3. iOS build check for app target (Debug)
4. iOS build check for `mobile-sdk-alpha` target
5. Manual smoke: MRZ success/cancel on app + RN test app

## Status

| Chunk | Status |
|-------|--------|
| Create shared helpers — MrzOcrCorrection, MrzResultMapper (app + sdk) | Done |
| Create shared helpers — MrzScanEngine (app + sdk) | Done |
| Refactor app LiveMRZScannerView → delegates to shared helpers | Done |
| Refactor sdk SelfLiveMRZScannerView → delegates to shared helpers | Done |
| Delete app MRZScanner.swift (replaced by MrzScanEngine.swift) | Done |
| Delete sdk SelfMRZScanner.swift (replaced by MrzScanEngine.swift) | Done |
| Update Xcode project references (pbxproj) | Done |
| Validate builds (iOS Debug for app + sdk) | Pending |

## Exit Criteria

- App and SDK MRZ wrappers are thin; shared helpers are identical standalone files.
- Old `MRZScanner.swift` and `SelfMRZScanner.swift` deleted.
- Existing bridge contract tests stay green without test rewrites.
- self-sdk-swift is untouched.
