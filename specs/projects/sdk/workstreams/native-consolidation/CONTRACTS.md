# Native Consolidation Phase 0 Contract Snapshot

This document captures the current iOS native bridge contracts before consolidation work.

## MRZ Scanner

### Swift Module Contract Parity

| Aspect                                   | app/                                                            | mobile-sdk-alpha                                                                                | rn-sdk-test-app                                              | Divergence?                             |
| ---------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| ObjC module registration                 | `@objc(MRZScannerModule)`                                       | `@objc(SelfMRZScannerModule)`                                                                   | `@objc(SelfMRZScannerModule)`                                | Yes (app module name differs)           |
| `moduleName()`                           | `MRZScannerModule`                                              | `SelfMRZScannerModule`                                                                          | `SelfMRZScannerModule`                                       | Yes (app module name differs)           |
| Exposed methods                          | `startScanning(resolve,reject)`, `stopScanning(resolve,reject)` | `startScanning(resolve,reject)`, `stopScanning(resolve,reject)`                                 | `startScanning(resolve,reject)`                              | Yes (RN test app has no `stopScanning`) |
| Root view controller lookup failure code | `error`                                                         | `error`                                                                                         | `NO_VIEW_CONTROLLER`                                         | Yes                                     |
| In-progress protection                   | None                                                            | None                                                                                            | Rejects with `MRZ_SCAN_IN_PROGRESS`                          | Yes                                     |
| Cancellation code                        | None explicit in module                                         | None explicit in module                                                                         | `MRZ_SCAN_CANCELLED`                                         | Yes                                     |
| Camera permission denied code            | None explicit in module                                         | None explicit in module                                                                         | `CAMERA_PERMISSION_DENIED`                                   | Yes                                     |
| Camera init failure code                 | None explicit in module                                         | None explicit in module                                                                         | `CAMERA_INIT_FAILED`                                         | Yes                                     |
| Generic scan failure code                | None explicit in module                                         | None explicit in module                                                                         | `MRZ_SCAN_FAILED`                                            | Yes                                     |
| Invalid parse/payload code               | None explicit in module                                         | None explicit in module                                                                         | `MRZ_SCAN_INVALID_RESULT`                                    | Yes                                     |
| Success payload shape                    | Flat object: `{ documentNumber, expiryDate, birthDate }`        | Nested object: `{ data: { documentNumber, expiryDate, birthDate, documentType, countryCode } }` | Flat object: `{ documentNumber, dateOfBirth, dateOfExpiry }` | Yes                                     |
| Success payload keys (top-level)         | `documentNumber`, `expiryDate`, `birthDate`                     | `data`                                                                                          | `documentNumber`, `dateOfBirth`, `dateOfExpiry`              | Yes                                     |

### ObjC Bridge Shim Parity

| Aspect                    | app/                                                                                   | mobile-sdk-alpha                                                    | rn-sdk-test-app                                                     | Divergence?                             |
| ------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------- |
| Shim file                 | `app/ios/MRZScannerModule.m`                                                           | `packages/mobile-sdk-alpha/ios/SelfSDK/SelfMRZScannerModule.m`      | `packages/rn-sdk-test-app/ios/SelfRNTestApp/SelfMRZScannerModule.m` | Yes (path + symbol names)               |
| `RCT_EXTERN_MODULE`       | `MRZScannerModule`                                                                     | `SelfMRZScannerModule`                                              | `SelfMRZScannerModule`                                              | Yes (app module name differs)           |
| Exposed methods in shim   | `startScanning(resolve,rejecter)`, `stopScanning(resolve,rejecter)`                    | `startScanning(resolve,rejecter)`, `stopScanning(resolve,rejecter)` | `startScanning(resolve,rejecter)`                                   | Yes (RN test app has no `stopScanning`) |
| `startScanning` signature | `startScanning:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject` | Same signature                                                      | Same signature                                                      | No                                      |
| `stopScanning` signature  | `stopScanning:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject`  | Same signature                                                      | Not present                                                         | Yes                                     |

## PassportReader

### Swift Module Contract Parity

| Aspect                                     | app/                                                                                                                                                                        | mobile-sdk-alpha                                                                                                                    | rn-sdk-test-app (if applicable) | Divergence?                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------- |
| ObjC module registration                   | `@objc(PassportReader)`                                                                                                                                                     | `@objc(SelfPassportReader)`                                                                                                         | N/A                             | Yes                                    |
| Native JS module name                      | `PassportReader`                                                                                                                                                            | `SelfPassportReader`                                                                                                                | N/A                             | Yes                                    |
| Exposed methods                            | `configure`, `trackEvent`, `flush`, `scanPassport`                                                                                                                          | `configure`, `scanPassport`                                                                                                         | N/A                             | Yes (analytics helpers missing in SDK) |
| `scanPassport` signature (Swift)           | `scanPassport(passportNumber,dateOfBirth,dateOfExpiry,canNumber,useCan,skipPACE,skipCA,extendedMode,usePacePolling,sessionId,resolve,reject)`                               | `scanPassport(passportNumber,dateOfBirth,dateOfExpiry,canNumber,useCan,skipPACE,skipCA,extendedMode,usePacePolling,resolve,reject)` | N/A                             | Yes (`sessionId` only in app)          |
| ObjC selector for `scanPassport`           | `scanPassport:dateOfBirth:dateOfExpiry:canNumber:useCan:skipPACE:skipCA:extendedMode:usePacePolling:sessionId:resolve:reject:`                                              | `scanPassport:dateOfBirth:dateOfExpiry:canNumber:useCan:skipPACE:skipCA:extendedMode:usePacePolling:resolve:reject:`                | N/A                             | Yes                                    |
| Success resolve payload                    | JSON string encoded from `ret` map                                                                                                                                          | JSON string encoded from `ret` map                                                                                                  | N/A                             | No (shape largely equivalent)          |
| Key payload keys returned (non-exhaustive) | `passportMRZ`, `dataGroupHashes`, `eContentBase64`, `signedAttributes`, `signatureBase64`, `dataGroupsPresent`, `documentSigningCertificate`, plus identity/document fields | Same key set produced by same read/serialization flow                                                                               | N/A                             | No (for documented keys)               |
| Primary reject code                        | `E_PASSPORT_READ`                                                                                                                                                           | `E_PASSPORT_READ`                                                                                                                   | N/A                             | No                                     |
| E2E stub reject code                       | `E2E_TESTING`                                                                                                                                                               | `E2E_TESTING`                                                                                                                       | N/A                             | No                                     |
| Analytics integration behavior             | `configure` creates `SelfAnalytics` + reinitializes reader, `trackEvent` delegates to analytics, `flush` delegates to analytics                                             | `configure` reinitializes reader only, no `trackEvent`, no `flush`                                                                  | N/A                             | Yes                                    |

### PassportReader Success Payload Notes

`scanPassport` resolves a JSON string that includes (among others):

- `passportMRZ`
- `dataGroupHashes`
- `eContentBase64`
- `signedAttributes`
- `signatureBase64`
- `dataGroupsPresent`
- `documentSigningCertificate`
- `countrySigningCertificate`
- identity/document fields such as `documentNumber`, `dateOfBirth`, `documentType`

These keys are consumed by TypeScript parsers in `app/src/integrations/nfc/nfcScanner.ts`.

## ObjC Bridge Shims

### PassportReader Shim Parity

| Aspect                                       | app/                                                                           | mobile-sdk-alpha                                         | rn-sdk-test-app (if applicable) | Divergence?              |
| -------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------- | ------------------------ |
| Shim file                                    | `app/ios/PassportReader.m`                                                     | `packages/mobile-sdk-alpha/ios/SelfSDK/PassportReader.m` | N/A                             | Yes (path + module name) |
| `RCT_EXTERN_MODULE`                          | `PassportReader`                                                               | `SelfPassportReader`                                     | N/A                             | Yes                      |
| `configure` in shim                          | Present: `configure:(NSString *)token enableDebugLogs:(BOOL)enableDebugLogs`   | Not exported                                             | N/A                             | Yes                      |
| `trackEvent` in shim                         | Present: `trackEvent:(NSString *)name properties:(NSDictionary *)properties`   | Not exported                                             | N/A                             | Yes                      |
| `flush` in shim                              | Present                                                                        | Not exported                                             | N/A                             | Yes                      |
| `scanPassport` selector includes `sessionId` | Yes                                                                            | No                                                       | N/A                             | Yes                      |
| Promise args                                 | `resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject` | Same                                                     | N/A                             | No                       |

## Summary of Current Divergences

- MRZ contracts diverge across all three surfaces in module name, payload shape, and error code taxonomy.
- RN test app already exposes explicit MRZ error codes; app and mobile-sdk-alpha do not.
- PassportReader bridge differs between app and SDK due to `sessionId` and analytics bridge methods (`configure`/`trackEvent`/`flush`).
- ObjC shims are duplicated and not in parity for PassportReader.
