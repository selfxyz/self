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
| Android | `file:///android_asset/self-wallet/index.html` — Gradle auto-bundles `assets/` |
| iOS | `${RNFS.MainBundlePath}/self-wallet/index.html` when `react-native-fs` is installed; falls back to `self-wallet/index.html` (relative) otherwise |
| Dev | `devServerUrl` prop bypasses bundled assets entirely |

Host apps must copy `node_modules/@selfxyz/rn-sdk/assets/self-wallet/`
into their platform build:
- **Android:** Gradle `android.sourceSets.main.assets.srcDirs` pointing
  to the assets folder
- **iOS:** Add `assets/self-wallet/` to Xcode "Copy Bundle Resources"

---

## Spec Deviation

### NFC Scan Return Shape

The NFC handler returns tag metadata plus optional APDU exchange results:

```typescript
{
  connected: true,
  tagId: string | null,
  techType: string,
  params: {...},
  apduResponses?: string[]  // hex-encoded responses when apduCommands are provided
}
```

When `params.apduCommands` (array of hex strings) is provided, the handler
iterates through each command, calls `NfcManager.transceive()`, and returns
hex-encoded response bytes in `apduResponses`. Progress events are emitted
at `apdu_exchange` (70%) and `apdu_complete` (90%).

---

## Camera / MRZ Implementation

`CameraHandler` loads the native MRZ scanner module at init time,
checking for `SelfMRZScannerModule` (preferred) or `MRZScannerModule`
(fallback) from React Native's `NativeModules`.

- `isAvailable()` returns whether a native MRZ module was found.
- `scanMRZ()` calls `scanner.startScanning()`, normalizes the result
  (extracts `documentNumber`, `birthDate`, `expiryDate`, plus optional
  `documentType` and `countryCode`), and throws `MRZ_SCAN_FAILED` on
  scanner errors or `MRZ_SCAN_INVALID_RESULT` if required fields are missing.
- If no native module is present, `scanMRZ()` throws `NOT_AVAILABLE`.

The host app must provide a native MRZ scanner module (e.g., via
`react-native-vision-camera` + OCR) that exposes `startScanning()`.

---

## How to Test

### Unit Tests

```bash
cd packages/rn-sdk
npx vitest run          # 64 tests across 8 files
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

Copy `assets/self-wallet/` into platform-specific locations (see Asset
Loading section above).

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
| Android asset path | Done | `file:///android_asset/` |
| Dev server override | Done | `devServerUrl` prop |
| Camera / MRZ scan | Done | scanMRZ via native SelfMRZScannerModule with result normalization |

## Known Limitations

- Camera/MRZ requires host app to provide a native MRZ scanner module (`SelfMRZScannerModule` or `MRZScannerModule`)
- No retry/reconnect logic for WebView crashes
- Asset bundling requires manual platform setup by the host app
- Physical-device validation breadth for NFC/APDU and camera across host apps is still limited
