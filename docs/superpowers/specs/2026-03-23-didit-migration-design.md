# Sumsub to Didit Migration — Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Scope:** Replace Sumsub native SDK with Didit React Native SDK in the Self Wallet app

## Context

The Self Wallet app currently uses the Sumsub React Native SDK (`@sumsub/react-native-mobilesdk-module`) for KYC identity verification as a fallback when NFC/MRZ scanning fails. The backend TEE server (`didit-tee`) has already been migrated to Didit's API — it creates Didit sessions, receives Didit webhooks, and serializes KYC data to the same 295-byte layout. The app-side integration still calls the old Sumsub SDK and needs to be swapped.

## Architecture

The flow is a 1:1 replacement. Both SDKs follow the same pattern: get a token from backend → launch native SDK → handle result → subscribe to Socket.IO for signed KYC data.

### Current Flow (Sumsub)

```
App                          TEE Server              Sumsub
 |-- POST /access-token ------>|                        |
 |<-- { token, userId } -------|                        |
 |                              |                        |
 |-- SNSMobileSDK.init(token) ----------------------->  |
 |<-- { success, status } --------------------------    |
 |                              |                        |
 |-- Socket.IO subscribe(userId) ->|                    |
 |                              |<-- webhook ------------|
 |<-- "success" { signature, applicantInfo, pubkey }    |
```

### New Flow (Didit)

```
App                          TEE Server              Didit
 |-- POST /session ------------>|-- POST /session/ --->  |
 |<-- { sessionId, sessionToken }|<-- response ------    |
 |                              |                        |
 |-- startVerification(sessionToken) ----------------->  |
 |<-- { type, session } ----------------------------    |
 |                              |                        |
 |-- Socket.IO subscribe(sessionId) ->|                 |
 |                              |<-- webhook ------------|
 |<-- "success" { signature, applicantInfo, pubkey }    |
```

### What changes

| Layer | Current (Sumsub) | New (Didit) |
|-------|-----------------|-------------|
| Native SDK | `@sumsub/react-native-mobilesdk-module` | `@didit-protocol/sdk-react-native` |
| Token fetch | `POST /access-token` → `{ token, userId }` | `POST /session` → `{ sessionId, sessionToken }` |
| SDK launch | `SNSMobileSDK.init(token).build().launch()` | `startVerification(sessionToken, config?)` |
| SDK result | `{ success: bool, status: string, errorType?, errorMsg? }` | `{ type: 'completed'\|'cancelled'\|'failed', session?, error? }` |
| Subscription key | `userId` (from access-token response) | `sessionId` (from session response) |
| Env var | `SUMSUB_TEE_URL` | `DIDIT_TEE_URL` |

### What does NOT change

- Socket.IO connection pattern and event names (`success`, `verification_failed`, `error`)
- Signed payload format (`{ signature, applicantInfo, pubkey }`)
- 295-byte applicant info layout and `deserializeApplicantInfo()`
- `KYCVerifiedScreen` and proving machine trigger
- The didit-tee backend (already migrated)
- Push notification flow (UUIDv5 derivation uses session_id on backend)
- **`'sumsub'` string in nullifier generation** (`common/src/utils/kyc/utils.ts:36`, `new-common/src/documents/kyc/utils.ts:33`, `common/src/utils/passports/passport.ts:221`, `circuits/tests/register/register_kyc.test.ts:54`) — this is a **cryptographic input** used to derive on-chain nullifiers. Changing it would invalidate existing nullifiers. Do NOT rename.

### Document pre-selection

Sumsub supports `withPreferredDocumentDefinitions()` to pre-select document type and country, skipping the selection step. The Didit SDK does not expose an equivalent. `LogoConfirmationScreen` currently passes `documentType` and `countryCode` to `launchSumsub()` — with Didit, users will see Didit's own document selection step. This is acceptable since the Didit UI handles it.

## File Changes

### New files

| File | Purpose |
|------|---------|
| `app/src/integrations/didit/diditService.ts` | `createSession()` and `launchDidit()` |
| `app/src/integrations/didit/types.ts` | `SessionResponse`, `DiditResult` types |
| `app/src/integrations/didit/index.ts` | Barrel export |
| `app/src/hooks/useDiditLauncher.ts` | Drop-in replacement for `useSumsubLauncher` |
| `app/src/hooks/useDiditWebSocket.ts` | Drop-in replacement for `useSumsubWebSocket` |

### Modified files

| File | Change |
|------|--------|
| `app/src/providers/selfClientProvider.tsx` | Replace `fetchAccessToken` + `launchSumsub` with `createSession` + `launchDidit`; `userId` → `sessionId`; rename error injection triggers `sumsub_initialization` → `didit_initialization`, `sumsub_verification` → `didit_verification` |
| `app/src/screens/kyc/KycSuccessScreen.tsx` | Replace `useSumsubWebSocket` with `useDiditWebSocket`; route param `userId` → `sessionId` |
| `app/src/hooks/usePendingKycRecovery.ts` | Replace `useSumsubWebSocket` with `useDiditWebSocket` |
| `app/src/stores/pendingKycStore.ts` | Rename `userId` to `sessionId` throughout; clear persisted storage on upgrade (see Data Migration section) |
| `app/src/screens/documents/scanning/DocumentNFCTroubleScreen.tsx` | Replace `useSumsubLauncher` with `useDiditLauncher` |
| `app/src/screens/documents/scanning/DocumentCameraTroubleScreen.tsx` | Replace `useSumsubLauncher` with `useDiditLauncher` |
| `app/src/screens/documents/scanning/RegistrationFallbackMRZScreen.tsx` | Replace `useSumsubLauncher` with `useDiditLauncher` |
| `app/src/screens/documents/scanning/RegistrationFallbackNFCScreen.tsx` | Replace `useSumsubLauncher` with `useDiditLauncher` |
| `app/src/screens/documents/aadhaar/AadhaarUploadErrorScreen.tsx` | Replace `useSumsubLauncher` with `useDiditLauncher` |
| `app/src/screens/documents/selection/LogoConfirmationScreen.tsx` | Full rewrite of `handleNotFound`: replace `fetchAccessToken` + `launchSumsub` with `createSession` + `launchDidit`; remove `documentType`/`countryCode` pre-selection (Didit handles its own); update cancellation detection (`result.type === 'cancelled'`); `userId` → `sessionId` in navigation params |
| `app/src/components/homescreen/KycIdCard.tsx` | Update comment referencing Sumsub idType values |
| `app/src/stores/errorInjectionStore.ts` | Rename `sumsub_initialization` → `didit_initialization`, `sumsub_verification` → `didit_verification` |
| `app/src/navigation/types.ts` | Update `KycSuccess` route params: `userId` → `sessionId` |
| `app/package.json` | Remove `@sumsub/react-native-mobilesdk-module`, add `@didit-protocol/sdk-react-native` |
| `app/env.sample` | `SUMSUB_TEE_URL` → `DIDIT_TEE_URL` |
| `app/env.ts` | `SUMSUB_TEE_URL` → `DIDIT_TEE_URL` |
| `app/ios/Podfile` | Remove `SumSubstance/Specs.git` CocoaPods source, remove `IDENSIC_WITH_FISHERMAN` env var block, remove Sumsub pod entries, add `DiditSDK` pod |
| `app/android/build.gradle` | Remove `maven.sumsub.com` repository, add Didit maven repo |
| `.github/workflows/mobile-deploy.yml` | Rename `SUMSUB_TEE_URL` secret references to `DIDIT_TEE_URL` |
| `common/src/utils/types.ts` | Rename `PendingKycVerification.userId` → `PendingKycVerification.sessionId`; update comments from "sumsub" to "didit" |
| `app/jest.setup.js` | Replace `@sumsub/react-native-mobilesdk-module` mock with `@didit-protocol/sdk-react-native` mock |
| `app/jest.config.cjs` | Replace `@sumsub` in `transformIgnorePatterns` with `@didit-protocol` |
| `app/react-native.config.cjs` | Replace Sumsub SDK autolinking disable with Didit SDK name |
| `app/tests/src/screens/kyc/KycSuccessScreen.test.tsx` | Update mock from `useSumsubWebSocket` to `useDiditWebSocket` |
| `app/tests/src/hooks/usePendingKycRecovery.test.ts` | Update mock from `useSumsubWebSocket` to `useDiditWebSocket` |
| `app/tests/src/navigation.test.tsx` | Replace `@sumsub/react-native-mobilesdk-module` mock with `@didit-protocol/sdk-react-native` mock |

### Deleted files

| File | Reason |
|------|--------|
| `app/src/integrations/sumsub/sumsubService.ts` | Replaced by didit integration |
| `app/src/integrations/sumsub/types.ts` | Replaced by didit types |
| `app/src/integrations/sumsub/index.ts` | Replaced by didit barrel |
| `app/src/hooks/useSumsubLauncher.ts` | Replaced by `useDiditLauncher` |
| `app/src/hooks/useSumsubWebSocket.ts` | Replaced by `useDiditWebSocket` |
| `app/src/types/sumsub.d.ts` | No longer needed |
| `patches/@sumsub+react-native-mobilesdk-module+1.40.2.patch` | Sumsub-specific patch no longer needed |

## Key Type Mappings

### Session creation response

```typescript
// Old (Sumsub)
interface AccessTokenResponse {
  token: string;
  userId: string;
}

// New (Didit)
interface SessionResponse {
  sessionId: string;
  sessionToken: string;
}
```

### SDK result

```typescript
// Old (Sumsub)
interface SumsubResult {
  success: boolean;
  status: string;
  errorType?: string;
  errorMsg?: string;
}

// New (Didit) — from @didit-protocol/sdk-react-native
interface VerificationResult {
  type: 'completed' | 'cancelled' | 'failed';
  session?: { status: string; sessionId: string };
  error?: { type: string; message: string };
}
```

### Status mapping for cancellation detection

```typescript
// Old: cancelledStatuses = ['Initial', 'Incomplete', 'Interrupted']
// New: result.type === 'cancelled'
```

## Didit SDK Setup

**Package:** [`@didit-protocol/sdk-react-native`](https://github.com/didit-protocol/sdk-react-native)

### Installation
```bash
yarn add @didit-protocol/sdk-react-native
```

### iOS (Podfile)

Remove the entire Sumsub block:
- `SumSubstance/Specs.git` CocoaPods source
- `IDENSIC_WITH_FISHERMAN` env var conditional
- Any Sumsub pod entries inside the `unless ENV["E2E_TESTING"]` block

Add:
```ruby
pod 'DiditSDK', :podspec => 'https://raw.githubusercontent.com/didit-protocol/sdk-ios/main/DiditSDK.podspec'
```

Then: `cd ios && bundle exec pod install`

### Android (build.gradle)

Remove `maven.sumsub.com` from repositories. Add:
```groovy
maven { url "https://raw.githubusercontent.com/didit-protocol/sdk-android/main/repository" }
```

### Permissions (already present for NFC flow)
- Camera (already declared)
- NFC (already declared)
- Location (iOS — verify `NSLocationWhenInUseUsageDescription` exists in Info.plist)

### Requirements
- React Native 0.76+ (New Architecture / TurboModules)
- iOS 13.0+ (NFC requires 15.0+)
- Android API 23+

## Data Migration

The `pendingKycStore` persists to AsyncStorage under key `'pending-kyc-storage'`. Renaming `userId` → `sessionId` in the persisted shape breaks deserialization of existing stored verifications. Since pending KYC verifications have a 48-hour TTL and this is a breaking app update, **bump the store version** in the `persist` config to clear stale data on upgrade. Any in-flight Sumsub verifications will simply expire.

## Backend Dependency

The TEE's `POST /session` response currently returns `{ sessionId, url }` but **not** `sessionToken`. The `DiditSessionResponse` from Didit's API includes `session_token` — it needs to be passed through. This change will be done separately by the user. The app-side migration can be coded and tested with a manually-provided token until the backend is updated.

## Validation

```bash
# Type check
cd app && yarn types

# Unit tests
cd app && yarn test

# Lint
yarn lint

# Build iOS
cd app/ios && bundle exec pod install && cd .. && yarn ios

# Build Android
cd app && yarn android
```

## Out of Scope

- Backend (didit-tee) changes — already migrated; `sessionToken` passthrough done separately
- `@selfxyz/mobile-sdk-alpha` changes — no Sumsub references
- Redirect-based flow — using native SDK instead
- `'sumsub'` string in nullifier generation functions — cryptographic input, must NOT change
- `contracts/constants/AttestationId.sol` comments — cosmetic, no functional impact
- `purple/` and `specs/` documentation references — follow-up cleanup
