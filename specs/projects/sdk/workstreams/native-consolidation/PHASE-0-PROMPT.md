# Phase 0 — Baseline + Safety Rails

> Chunk prompt for native consolidation Phase 0.
> Parent spec: `specs/projects/sdk/workstreams/native-consolidation/SPEC.md`
> Run with: `claude --remote`

## Context

You are establishing safety rails before any native code consolidation begins. The goal is to freeze the current bridge contracts, document parity/divergence between app and SDK native modules, and ensure test coverage catches regressions during future phases.

## Current State

Existing tests partially cover Phase 0 requirements:

- `app/tests/src/integrations/nfc/passportReader.test.ts` — Tests PassportReader interface (scanPassport, reset, configure, trackEvent, flush). Covers method existence and safe calling patterns.
- `app/tests/src/integrations/nfc/nfcScanner.test.ts` — Tests `parseScanResponse` (iOS + Android) and `scan` function (iOS parameter passing, optional params). Does NOT test error code propagation or NFC lifecycle (start/stop/cancel).
- `app/tests/src/services/analytics.test.ts` — Tests `trackEvent`, `trackScreenView`, edge cases. Does NOT test `configureNfcAnalytics`, `trackNfcEvent`, `flushAllAnalytics`, or `setNfcScanningActive` — the Mixpanel/PassportReader integration paths.
- `packages/rn-sdk-test-app/` has NO test infrastructure or bridge contract tests.

## Deliverables

You will produce three things:

### 1. CONTRACTS.md

Create `specs/projects/sdk/workstreams/native-consolidation/CONTRACTS.md`.

This documents every exposed native method, event, payload key, and error code for both app and SDK iOS surfaces. It is the "before" photo.

**Sections to include:**

#### MRZ Scanner

Compare these files side by side:
- `app/ios/MRZScannerModule.swift` (module name: `MRZScannerModule`)
- `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScannerModule.swift` (module name: `SelfMRZScannerModule`)
- `packages/rn-sdk-test-app/ios/SelfRNTestApp/SelfMRZScannerModule.swift` (module name: `SelfMRZScannerModule`)

Document for each:
- Native module name (ObjC `@objc(...)` registration)
- Exposed methods (`startScanning`, `stopScanning`)
- Success payload shape and keys
- Error codes (rejection codes passed to RCTPromiseRejectBlock)
- ObjC bridge shim file and method signatures

#### PassportReader

Compare these files:
- `app/ios/PassportReader.swift` (module name: `PassportReader`, ObjC: `@objc(PassportReader)`)
- `packages/mobile-sdk-alpha/ios/SelfSDK/PassportReader.swift` (module name: `SelfPassportReader`, ObjC: `@objc(SelfPassportReader)`)

Document for each:
- Native module name
- Exposed methods: `scanPassport`, `configure`, `trackEvent`, `flush`
- `scanPassport` parameter list (all 10 params + resolve/reject)
- Success payload shape (JSON string with keys: `passportMRZ`, `dataGroupHashes`, `eContentBase64`, `signedAttributes`, `signatureBase64`, `dataGroupsPresent`, `documentSigningCertificate`, etc.)
- Error codes
- Analytics integration: does it have `configure`, `trackEvent`, `flush`? What do they delegate to?

#### ObjC Bridge Shims

Compare:
- `app/ios/MRZScannerModule.m` vs `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScannerModule.m`
- `app/ios/PassportReader.m` vs `packages/mobile-sdk-alpha/ios/SelfSDK/PassportReader.m`
- `packages/rn-sdk-test-app/ios/SelfRNTestApp/SelfMRZScannerModule.m`

Document method signatures and note any differences.

**Format:** Use a table per section with columns: `Aspect | app/ | mobile-sdk-alpha | rn-sdk-test-app (if applicable) | Divergence?`

### 2. Bridge Contract Tests — Fill Gaps

#### 2a. `app/tests/src/integrations/nfc/nfcScanner.test.ts` — Add missing tests

The existing file tests `parseScanResponse` and basic `scan` calls. You must ADD tests for:

- **Error propagation:** When `PassportReader.scanPassport` rejects, `scan()` should propagate the error and log via `logNFCEvent`.
- **Module unavailable:** When `PassportReader` is null or `scanPassport` is undefined, `scan()` should reject with "NFC scanning is currently unavailable."
- **iOS vs Android dispatch:** Verify `scan()` calls the correct native method per platform.

Do NOT rewrite existing tests. Add new `describe` blocks.

The test file already mocks `react-native` with a getter-based `Platform.OS`. Follow that pattern.

Source under test: `app/src/integrations/nfc/nfcScanner.ts`

#### 2b. `app/tests/src/services/analytics.test.ts` — Add missing tests

The existing file tests Segment analytics (`trackEvent`, `trackScreenView`). You must ADD tests for Mixpanel/NFC analytics integration:

- `configureNfcAnalytics` calls `PassportReader.configure` with the Mixpanel token
- `trackNfcEvent` calls `PassportReader.trackEvent` with event name and properties
- `trackNfcEvent` queues events when `isNfcScanningActive` is true
- `flushAllAnalytics` calls both Segment flush and Mixpanel flush
- `setNfcScanningActive(false)` triggers flush of queued events

Source under test: `app/src/services/analytics.ts`

The existing file mocks `@/config/segment`. You will also need to mock:
- `@/integrations/nfc/passportReader` (to mock `PassportReader.configure`, `.trackEvent`, `.flush`)
- `@env` (to provide `MIXPANEL_NFC_PROJECT_TOKEN`)
- `@react-native-community/netinfo`

#### 2c. `packages/rn-sdk-test-app/__tests__/mrzBridgeContract.test.ts` — Create new

The RN test app has no test infrastructure. You will need to:

1. Add Jest config to `packages/rn-sdk-test-app/package.json`:
   ```json
   "scripts": {
     "test": "jest"
   },
   "jest": {
     "preset": "react-native"
   }
   ```
   Or create a minimal `jest.config.cjs` — check what the app uses and follow a similar pattern.

2. Create `packages/rn-sdk-test-app/__tests__/mrzBridgeContract.test.ts`:

   This tests the JS-side contract of `SelfMRZScannerModule`. The RN test app calls `NativeModules.SelfMRZScannerModule.startScanning()` from its React components.

   Mock `NativeModules` from `react-native` and test:
   - `startScanning` resolves with `{ documentNumber: string, dateOfBirth: string, dateOfExpiry: string }`
   - `startScanning` rejects with each error code:
     - `MRZ_SCAN_CANCELLED` — user cancelled
     - `MRZ_SCAN_FAILED` — scan failed (JSON parse error)
     - `MRZ_SCAN_INVALID_RESULT` — scan succeeded but missing required fields
     - `MRZ_SCAN_IN_PROGRESS` — scan already running
     - `CAMERA_PERMISSION_DENIED` — camera access denied
     - `CAMERA_INIT_FAILED` — camera setup failed (if applicable)
   - Success payload keys match what the Swift module sends

   Note: The Swift module (`SelfMRZScannerModule.swift` line 44) resolves with a dict containing `documentNumber`, `dateOfBirth`, `dateOfExpiry`. Verify these exact keys.

### 3. PR Template Checklist

There is no `.github/PULL_REQUEST_TEMPLATE.md` yet. Create one at `.github/PULL_REQUEST_TEMPLATE.md` with:

```markdown
## Summary

<!-- Brief description of changes -->

## Test plan

<!-- How was this tested? -->

---

### Native Consolidation Checklist

<!-- Check items that apply to this PR. Delete section if not touching native code. -->

- [ ] CONTRACTS.md reviewed — no unintended contract changes
- [ ] Layer 1 bridge contract tests pass (`cd app && yarn jest:run` / `yarn workspace @selfxyz/rn-sdk-test-app test`)
- [ ] Layer 3 builds pass (app iOS, RN test app iOS, RN test app Android)
- [ ] Layer 4 manual smoke test signed off (if consolidation PR)
- [ ] No new native business logic added (logic belongs in TypeScript)
```

## Files You Will Create or Modify

| Action | File |
| --- | --- |
| CREATE | `specs/projects/sdk/workstreams/native-consolidation/CONTRACTS.md` |
| MODIFY | `app/tests/src/integrations/nfc/nfcScanner.test.ts` (add describe blocks) |
| MODIFY | `app/tests/src/services/analytics.test.ts` (add describe blocks) |
| CREATE | `packages/rn-sdk-test-app/__tests__/mrzBridgeContract.test.ts` |
| MODIFY | `packages/rn-sdk-test-app/package.json` (add test script + jest config) |
| CREATE | `.github/PULL_REQUEST_TEMPLATE.md` |

## Files You Will NOT Modify

- Any Swift, Kotlin, or ObjC files
- Any existing test assertions (only add new ones)
- `app/src/` source files
- `packages/mobile-sdk-alpha/` source files
- CI workflow files

## Validation

```bash
# App contract tests (existing + new)
cd app && yarn jest:run --verbose

# RN test app contract tests (new)
cd packages/rn-sdk-test-app && yarn test

# Verify CONTRACTS.md exists and is non-empty
test -s specs/projects/sdk/workstreams/native-consolidation/CONTRACTS.md && echo "OK"

# Verify PR template exists
test -s .github/PULL_REQUEST_TEMPLATE.md && echo "OK"
```

All four commands must succeed.

## Definition of Done

- [ ] CONTRACTS.md documents all iOS MRZ + NFC bridge contracts with parity tables
- [ ] `app/tests/src/integrations/nfc/nfcScanner.test.ts` has error propagation + module unavailable tests
- [ ] `app/tests/src/services/analytics.test.ts` has Mixpanel/NFC analytics integration tests
- [ ] `packages/rn-sdk-test-app/__tests__/mrzBridgeContract.test.ts` tests all error codes + success payload
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` includes native consolidation checklist
- [ ] `cd app && yarn jest:run` passes
- [ ] `cd packages/rn-sdk-test-app && yarn test` passes
