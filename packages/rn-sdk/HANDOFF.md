# @selfxyz/rn-sdk — Handoff Document

## What Was Built

A thin React Native SDK that embeds Self Protocol's identity verification
flow inside a WebView. The host app renders `<SelfVerification />`, which
loads a bundled HTML/JS app (`@selfxyz/webview-app`) and bridges native
capabilities (NFC, camera, biometrics, keychain, lifecycle) to the web
layer via `@selfxyz/webview-bridge`.

### Architecture

```
Host App
  └─ <SelfVerification />          (React component)
       ├─ react-native-webview     (renders webview-app)
       └─ MessageRouter            (dispatches bridge messages)
            ├─ LifecycleHandler    (init, ready, close, error, success)
            ├─ BiometricHandler    (authenticate, isAvailable)
            ├─ KeychainHandler     (get, set, remove)
            ├─ NfcHandler          (scan + APDU exchange, cancelScan, isSupported)
            └─ CameraHandler       (isAvailable, scanMRZ via native module)
```

### File List

| File | LOC | Purpose |
|------|-----|---------|
| `src/SelfVerification.tsx` | ~120 | Main component, WebView setup, asset source |
| `src/bridge/MessageRouter.ts` | ~160 | Route messages by domain, reply/push events |
| `src/bridge/types.ts` | ~30 | Shared types (BridgeHandler, BridgeDomain) |
| `src/handlers/LifecycleHandler.ts` | ~70 | App lifecycle + verification callbacks |
| `src/handlers/BiometricHandler.ts` | ~60 | Biometric auth via react-native-biometrics |
| `src/handlers/KeychainHandler.ts` | ~65 | Secure storage via react-native-keychain |
| `src/handlers/NfcHandler.ts` | ~180 | NFC tag reading + APDU exchange via react-native-nfc-manager |
| `src/handlers/CameraHandler.ts` | ~90 | MRZ scanning via native SelfMRZScannerModule / MRZScannerModule |
| `src/handlers/index.ts` | ~30 | Handler factory (createHandlers) |
| `src/index.ts` | ~5 | Public exports |
| **Total source** | **~715** | |
| **Tests (8 files)** | **~950** | 64 tests |

### Dependencies

**Required peer deps:** `react`, `react-native`, `react-native-webview`
**Optional peer deps:** `react-native-biometrics`, `react-native-keychain`,
`react-native-nfc-manager`, `react-native-fs`

Each optional native module is loaded via `try/catch require()` at module
level. Handlers that depend on missing modules throw a clear error
(`NOT_AVAILABLE`) when invoked.

---

## How It Works

### Bridge Flow

1. WebView loads `index.html` from bundled assets (or `devServerUrl`).
2. Web app sends JSON messages via `window.ReactNativeWebView.postMessage()`.
3. `SelfVerification.onMessage` passes the raw string to `MessageRouter`.
4. Router parses `{ id, domain, method, params }`, finds the handler for
   `domain`, calls `handler.handle(method, params)`.
5. Handler returns a result (or throws `BridgeHandlerError`).
6. Router sends the reply back via `webViewRef.injectJavaScript()`.
7. For async events (e.g. NFC progress), handlers call
   `router.pushEvent(domain, event, data)`.

### Asset Loading

| Platform | Strategy |
|----------|----------|
| Android | `file:///android_asset/self-wallet/index.html` — delivered automatically by the library (see below) |
| iOS | `${RNFS.MainBundlePath}/self-wallet/index.html` when `react-native-fs` is installed; falls back to `self-wallet/index.html` (relative) otherwise |
| Dev | `devServerUrl` prop bypasses bundled assets entirely |

**Android (SELF-3586 / B4): zero host wiring.** `android/build.gradle` adds the
package's own `assets/` folder to the library's `sourceSets.main.assets.srcDirs`.
AGP's asset merge then packages `assets/self-wallet/` into the library AAR and
merges it into the consuming APK's `android_asset/`, so
`file:///android_asset/self-wallet/index.html` resolves in a normal build with
no manual host edits. The parent `assets/` dir is added (not `assets/self-wallet/`)
so the `self-wallet/` subdir is preserved in the merged output. The srcDir is
added only when `assets/self-wallet/` exists, so KYC-only builds (which skip the
`copy-assets` step) still compile. Verified: `selfxyz_rn-sdk-debug.aar` contains
`assets/self-wallet/index.html`.

**iOS: host still wires the bundle.** Add `assets/self-wallet/` to Xcode
"Copy Bundle Resources", or (Expo) inject `bundleRootUri`. An Expo config plugin
to automate this is deferred to RSP-05.

---

## Spec Deviation

### NFC Scan Return Shape

The NFC handler returns tag metadata plus optional APDU exchange results:

```typescript
{
  connected: true,
  techType: string,
  apduResponses?: string[]  // hex-encoded responses when apduCommands are provided
}
```

When `params.apduCommands` (array of hex strings) is provided, the handler
iterates through each command, calls `NfcManager.transceive()`, and returns
hex-encoded response bytes in `apduResponses`. Progress events are emitted
at `apdu_exchange` (70%) and `apdu_complete` (90%).

APDU commands are validated against an eMRTD-focused allowlist before
transceive, and each APDU transceive has a timeout guard (default: 10s).
`tagId` was removed from the scan result to avoid exposing the passport chip
UID through the WebView bridge.

### NFC Data-Handling Guidance

**Protected field:** `apduResponses` (may contain raw MRZ data, face images, or key-derivation material).

- `tagId` is no longer returned by the bridge because the chip UID is persistent PII under GDPR.
- **Never** send `apduResponses` to analytics, crash-reporting, or external observability services.
- **Never** persist `apduResponses` to disk, databases, or shared preferences outside of an active verification session.
- If on-device debugging requires raw APDU payloads, all of the following must be true:
  1. A named debug flag (e.g., `NFC_APDU_DEBUG`) is enabled explicitly by a developer — not by a generic `debug: true` prop.
  2. The flag has automatic expiry (e.g., single session, time-limited, or requires re-approval on each launch).
  3. Output is limited to the local device console — no network transmission.
  4. Logs are scrubbed or discarded before any build leaves the developer's machine.

### APDU Allowlist Scope

The allowlist covers ISO 7816-4 instructions used in standard eMRTD reading (BAC, PACE,
data group reads). Intentional constraints:

- **READ BINARY odd-INS (0xB1)** is restricted to the same case-2 shape as 0xB0 (header + Le,
  no command data). Tagged/data-carrying odd-INS READ BINARY (DO'53'/DO'54' per ISO 7816-4
  §7.2.3) is not allowed. Broaden only when a concrete interoperability requirement appears
  from a real passport or WebView flow.
- **EXTERNAL AUTHENTICATE (0x82)** and **GENERAL AUTHENTICATE (0x86)** accept payloads
  (Lc + data, with optional Le) for BAC cryptograms and PACE dynamic authentication data.
- **SELECT (0xA4)** is locked to the eMRTD applet AID (`A0000002471001`) or short file
  identifiers. No other applet or DF selection is permitted.

### NFC APDU Error Contract

The NFC bridge can return these APDU-related errors:

- `INVALID_PARAMS`: malformed APDU hex input
- `APDU_REJECTED`: APDU failed allowlist/format checks
- `NFC_APDU_TIMEOUT`: APDU transceive timed out
- `NFC_APDU_NOT_SUPPORTED`: native `transceive` unavailable

For APDU parse/validation/timeout failures, `error.details` includes safe
audit metadata:

```typescript
{
  commandIndex: number,
  totalCommands: number,
  acceptedCount: number,
  rejectedCount: number,
  timedOutCount: number
}
```

This metadata is designed for telemetry/debugging and intentionally excludes
raw APDU command bytes.

---

## Camera / MRZ Implementation

`CameraHandler` loads the native MRZ scanner module at init time,
checking for `SelfMRZScannerModule` (preferred) or `MRZScannerModule`
(fallback) from React Native's `NativeModules`.

- `isAvailable()` returns whether a native MRZ module was found.
- `scanMRZ()` calls `scanner.startScanning()`, normalizes the result
  (extracts `documentNumber`, `dateOfBirth`, `dateOfExpiry`, plus optional
  `documentType` and `countryCode`), and throws `MRZ_SCAN_FAILED` on
  scanner errors or `MRZ_SCAN_INVALID_RESULT` if required fields are missing.
- If no native module is present, `scanMRZ()` throws `NOT_AVAILABLE`.

The host app must provide a native MRZ scanner module (e.g., via
`react-native-vision-camera` + OCR) that exposes `startScanning()`.

---

## How to Test

### Unit Tests

```bash
yarn workspace @selfxyz/rn-sdk test
```

### Device Testing Checklist

- [ ] Android: Bundled assets load (`file:///android_asset/...`)
- [ ] iOS: Bundled assets load via RNFS path
- [ ] `devServerUrl` override works on both platforms
- [ ] Biometric prompt appears and resolves
- [ ] Keychain set/get/remove round-trips
- [ ] NFC scan detects a tag (requires physical NFC tag)
- [ ] Lifecycle: init → ready → success/error/cancel flow
- [ ] Cancel mid-verification triggers `onCancelled`

---

## Integration Instructions

### 1. Install

```bash
yarn add @selfxyz/rn-sdk
# Required:
yarn add react-native-webview
# Optional (but recommended):
yarn add react-native-fs react-native-biometrics \
         react-native-keychain react-native-nfc-manager
cd ios && pod install
```

### 2. Bundle Assets

Android requires no host wiring — the library delivers `self-wallet/` into
`android_asset/` automatically (see Asset Loading section above). iOS still
needs the bundle copied into "Copy Bundle Resources" (or `bundleRootUri`
injected for Expo hosts).

### 3. Use

```tsx
import { SelfVerification } from '@selfxyz/rn-sdk';

<SelfVerification
  request={{ userId: 'user-123', scope: 'identity' }}
  onSuccess={(result) => console.log('Verified:', result)}
  onFailure={(error) => console.error('Failed:', error)}
  onCancelled={() => console.log('User cancelled')}
  debug={__DEV__}
  devServerUrl={__DEV__ ? 'http://localhost:5173' : undefined}
/>
```

---

## What Is Implemented

| Capability | Status | Notes |
|------------|--------|-------|
| WebView wrapper | Done | `<SelfVerification />` component |
| Message routing | Done | Domain-based dispatch with reply/push |
| Lifecycle handler | Done | init, ready, close, error, success |
| Biometric handler | Done | authenticate, isAvailable via react-native-biometrics |
| Keychain handler | Done | get, set, remove via react-native-keychain |
| NFC handler | Done | scan + APDU exchange, cancelScan, isSupported via react-native-nfc-manager |
| iOS asset path | Done | Absolute path via react-native-fs, relative fallback |
| Android asset path | Done | `file:///android_asset/`; auto-delivered via library `sourceSets` (SELF-3586/B4), no host wiring |
| Dev server override | Done | `devServerUrl` prop |
| Camera / MRZ scan | Done | scanMRZ via native SelfMRZScannerModule with result normalization |

## RN Test Harness Status (`packages/rn-sdk-test-app`)

- A minimal React Native host app now exists at `packages/rn-sdk-test-app/` for real-device integration validation of `@selfxyz/rn-sdk`.
- It is wired to the local workspace SDK (`"@selfxyz/rn-sdk": "workspace:*"`) and includes key peers: `react-native-webview`, `react-native-nfc-manager`, `react-native-biometrics`, `react-native-keychain`, and `react-native-fs`.
- Android wiring includes `sourceSets` asset bundling for `self-wallet/`; iOS wiring includes a build phase that copies `self-wallet/` into bundle resources.
- Debug ATS is relaxed in `Info-Debug.plist` (`NSAllowsArbitraryLoads=true`) to support non-HTTPS test endpoints; non-debug `Info.plist` remains strict.
- Camera/MRZ caveat in test harness: if no native `SelfMRZScannerModule`/`MRZScannerModule` is linked, the harness injects a stub module (returns hardcoded MRZ data) so the camera bridge path remains testable. Real camera/MRZ validation still requires linking a true native scanner module.
- CI coverage added via `.github/workflows/rn-sdk-test-app-ci.yml` to typecheck both `@selfxyz/rn-sdk` and `@selfxyz/rn-sdk-test-app` on relevant path changes.

## Known Limitations

- Camera/MRZ requires host app to provide a native MRZ scanner module (`SelfMRZScannerModule` or `MRZScannerModule`)
- No retry/reconnect logic for WebView crashes
- Asset bundling on iOS requires manual host setup (Xcode "Copy Bundle
  Resources" or `bundleRootUri`); the RSP-05 Expo config plugin to automate it
  is deferred. Android is automatic (SELF-3586/B4).
- Physical-device validation breadth for NFC/APDU and camera across host apps is still limited
