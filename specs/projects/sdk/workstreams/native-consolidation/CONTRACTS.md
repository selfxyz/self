# Native Consolidation Phase 0 Contract Snapshot (Test-Pinned)

This document tracks only contracts currently enforced by automated tests.
Anything not listed here is not yet a hard compatibility gate.

## Sources of Truth

- `app/tests/src/integrations/nfc/nfcScanner.test.ts`
- `app/tests/src/integrations/nfc/passportReader.test.ts`
- `packages/rn-sdk-test-app/__tests__/mrzBridgeContract.test.ts`

## Contract: App NFC Scanner Bridge

### Availability Error Messages (hard requirement)

| Platform | Condition                                  | Required error message                                                                |
| -------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| iOS      | Native scanner unavailable in iOS path     | `NFC scanning is currently unavailable. Please ensure the app is properly installed.` |
| Android  | Native scanner unavailable in Android path | `NFC scanning is currently unavailable.`                                              |

### Dispatch and Invocation Contract

| Behavior                   | Required contract                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| iOS dispatch               | `scan()` must call `PassportReader.scanPassport` when available and must not call the cross-platform `scan` helper in that path |
| Android dispatch           | `scan()` must call `reset()` then call Android `scan(...)`                                                                      |
| Android scan input mapping | Android `scan(...)` must receive `documentNumber`, `dateOfBirth`, and `dateOfExpiry` derived from scan inputs                   |
| Error propagation          | Native scan failures must reject through to JS caller                                                                           |
| Failure telemetry          | On scan failure, `logNFCEvent('error', 'scan_failed', context, details)` must be emitted                                        |

## Contract: App PassportReader Interface

| Surface              | Required contract                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Required methods     | `scanPassport` must exist and be callable on `PassportReader`; `reset` is a standalone export (not a `PassportReader` method) |
| Forbidden method     | `scan` must be absent on iOS-facing `PassportReader` interface                                                                |
| `scanPassport` arity | `scanPassport.length === 9`                                                                                                   |
| Optional methods     | `configure`, `trackEvent`, `flush` may be `function` or `undefined`                                                           |
| Safe optional access | Existence checks for optional methods must not throw                                                                          |

## Contract: RN Test App MRZ Bridge

| Surface                  | Required contract                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Native module name       | `NativeModules.SelfMRZScannerModule`                                                                                                                               |
| Required method          | `startScanning()` returns a promise                                                                                                                                |
| Success payload keys     | Resolve payload must include exactly `documentNumber`, `dateOfBirth`, `dateOfExpiry`                                                                               |
| Required rejection codes | `NO_VIEW_CONTROLLER`, `MRZ_SCAN_CANCELLED`, `MRZ_SCAN_FAILED`, `MRZ_SCAN_INVALID_RESULT`, `MRZ_SCAN_IN_PROGRESS`, `CAMERA_PERMISSION_DENIED`, `CAMERA_INIT_FAILED` |

## Not Yet Pinned by Tests

The following are intentionally excluded from this file until automated tests enforce them:

- App vs SDK MRZ Swift implementation parity details
- ObjC shim-level selector parity tables
- PassportReader native payload key-by-key parity
- Analytics provider-specific integration behavior
