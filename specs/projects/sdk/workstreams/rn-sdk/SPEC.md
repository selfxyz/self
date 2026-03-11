# RN Native Shell — Implementation Spec

> Last updated: 2026-03-05
> Owner: Person 5 (RN SDK)
> Project: [SDK Overview](../../OVERVIEW.md)
> Status: Active

## North Star

- **Goal:** Embed Self's identity verification into any host app with zero duplicated logic across platforms.
- **Success metric:** A host app calls `SelfSdk.launch(request)`, gets back a verified proof, and the entire flow runs inside a shared WebView.
- **Constraint:** NFC, camera, biometrics, and keychain are the ONLY things that touch native code. Everything else runs in the WebView.

## Context

**What you own:**

- **`@selfxyz/rn-sdk`** — the React Native SDK package
- **`SelfVerification`** component (~200-300 LOC) — the single public API surface
- **5 native handler bridges** — NFC, Camera, Biometrics, Keychain, Lifecycle (thin wrappers around RN native modules)
- **Asset bundling** — Vite bundle loaded into `react-native-webview` on iOS + Android

**Architecture context:**

```
┌─────────────────────────────────────────┐
│           HOST APP (React Native)       │
│  <SelfVerification                      │
│    userId="..." onComplete={...}        │
│  />                                     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  ★ YOUR LAYER: @selfxyz/rn-sdk         │
│  SelfVerification.tsx                   │
│    └─ react-native-webview              │
│  MessageRouter.ts                       │
│    ├─ NfcHandler · CameraHandler        │
│    ├─ BiometricsHandler · KeychainHandler│
│    └─ LifecycleHandler                  │
└──────────────┬──────────────────────────┘
               │ postMessage (JSON) — same protocol as KMP
┌──────────────▼──────────────────────────┐
│  SHARED WEBVIEW (Person 1 + 4)          │
│  Vite bundle: webview-app + engine      │
└─────────────────────────────────────────┘
```

**Dependencies:**

| Direction     | Person / Package            | What                                               | Status      |
| ------------- | --------------------------- | -------------------------------------------------- | ----------- |
| **You need**  | Person 1 (`webview-app`)    | Vite bundle (`dist/`)                              | Ready       |
| **You need**  | Person 1 (`webview-bridge`) | Bridge protocol types                              | Ready       |
| **Needs you** | Self Wallet app             | `SelfVerification` for verification flow (Phase 2) | Not started |

**Status:**

- [x] Package scaffolded with `SelfVerification` component
- [x] All 5 native handler bridges implemented (including APDU-capable NFC)
- [x] Asset loading for iOS + Android implemented
- [ ] Integration validation in Self Wallet app (follow-up)
- [ ] npm publish not completed

## Execution Model

- Stable RN SDK context stays in this file.
- PR-sized execution lives under [`plans/`](./plans/).
- To answer "what's next?", read the backlog and active plans before reading the rest of this spec.

## Backlog

| ID    | Title                                                            | Status | Priority | Depends On | Plan                                                                                                     | PR    |
| ----- | ---------------------------------------------------------------- | ------ | -------- | ---------- | -------------------------------------------------------------------------------------------------------- | ----- |
| RN-01 | Self Wallet integration validation for `SelfVerification`        | Ready  | High     | -          | [plans/RN-01-self-wallet-integration-validation.md](./plans/RN-01-self-wallet-integration-validation.md) | -     |
| RN-02 | npm publishing readiness and release path                        | Ready  | Medium   | RN-01      | [plans/RN-02-npm-publishing-readiness.md](./plans/RN-02-npm-publishing-readiness.md)                     | -     |
| RN-03 | APDU allowlist, timeout, and payload hardening in RN NFC handler | Done   | High     | -          | [plans/RN-03-nfc-hardening.md](./plans/RN-03-nfc-hardening.md)                                           | #1797 |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

## Active Plans

| Plan                                                                                                     | IDs   | Status |
| -------------------------------------------------------------------------------------------------------- | ----- | ------ |
| [plans/RN-01-self-wallet-integration-validation.md](./plans/RN-01-self-wallet-integration-validation.md) | RN-01 | Ready  |
| [plans/RN-02-npm-publishing-readiness.md](./plans/RN-02-npm-publishing-readiness.md)                     | RN-02 | Ready  |
| [plans/RN-03-nfc-hardening.md](./plans/RN-03-nfc-hardening.md)                                           | RN-03 | Done   |

## Completion Checklist

- [ ] Open RN follow-ups exist as backlog rows, not only prose
- [ ] Active plan links are current
- [ ] Self Wallet integration status is explicit
- [ ] Publish readiness is tracked independently from feature work

## Overview

You are building the **React Native native shell** (`@selfxyz/rn-sdk`) — a thin `SelfVerification` component that wraps `react-native-webview` to embed the Self verification flow inside any React Native app. It shares the same WebView engine, bridge protocol, and UI as the Kotlin native shell. The only RN-specific code is ~200-300 LOC of native handler bridges and the component wrapper. This matters because React Native hosts (Self Wallet, third-party apps) need the same verification flow that Kotlin hosts (MiniPay) get, without duplicating any logic.

## Prerequisites

- Familiarity with `react-native-webview` (WebView embedding, `onMessage`, `injectJavaScript`)
- Familiarity with the bridge protocol defined in `@selfxyz/webview-bridge` (JSON `request`/`response`/`event` over `postMessage`)
- `Handler` = a native-side class that implements one bridge domain (e.g., `NfcHandler` handles the `nfc` domain)
- `MessageRouter` = JS-side dispatcher that routes incoming WebView messages to the correct handler by domain
- Read [SDK Overview](../../OVERVIEW.md) for architecture context

## The Problem

The RN SDK (`packages/rn-sdk/`) exists with the core implementation complete: `SelfVerification` component, all 5 native handler bridges, and asset bundling for iOS + Android. Remaining gaps:

| Area                           | Status                                                           |
| ------------------------------ | ---------------------------------------------------------------- |
| `packages/rn-sdk/`             | Exists — core component and handlers implemented                 |
| `SelfVerification` component   | Implemented — wraps `react-native-webview` with bridge wiring    |
| Native handler bridges         | All 5 implemented (NFC, biometrics, keychain, camera, lifecycle) |
| Asset bundling (iOS + Android) | Implemented for both platforms                                   |
| Self Wallet integration        | Not validated — see RN-01                                        |
| npm publishing                 | Not ready — see RN-02                                            |
| NFC hardening                  | Completed — see RN-03                                            |

## Design Principles

1. **Thin wrapper only.** The RN SDK is ~200-300 LOC. All logic lives in the WebView engine (`mobile-sdk-alpha`). If you're writing business logic in this package, you're doing it wrong.
2. **Same bridge protocol as KMP.** The RN handlers implement the exact same domain/method/params contract as the Kotlin handlers. The WebView does not know which native shell it is running in.
3. **Peer dependencies for native modules.** Every React Native native module (`react-native-webview`, `react-native-nfc-manager`, `react-native-biometrics`, `react-native-keychain`) is a `peerDependency`. The host app installs and links them. This avoids version conflicts and duplicate native code.
4. **Platform.select for asset loading.** The WebView source must work on both Android (`file:///android_asset/...`) and iOS (RN `require()` path with Metro `html` asset support). Never hardcode a single platform path.
5. **Fail closed in production.** `devServerUrl` is debug-only. Release builds must reject remote URLs and load bundled local assets only.
6. **No state beyond routing.** The `MessageRouter` dispatches messages and returns responses. It does not cache, retry, or transform data. Handlers are stateless wrappers around native libraries.

## Definition of Done

> **Done when:** `SelfVerification` component renders a working WebView that completes a full verification flow with NFC, biometrics, and keychain bridged to native.

## Scope of Work

### 1. Package Setup

**Create:** `packages/rn-sdk/package.json`

```json
{
  "name": "@selfxyz/rn-sdk",
  "version": "0.0.1-alpha.1",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "assets"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@selfxyz/webview-bridge": "workspace:^"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-native": ">=0.72.0",
    "react-native-webview": ">=13.0.0",
    "react-native-nfc-manager": "^3.14.0",
    "react-native-biometrics": "^3.0.1",
    "react-native-keychain": "^8.2.0"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "devDependencies": {
    "@types/react": "^18.3.4",
    "tsup": "^8.0.1",
    "typescript": "^5.9.3"
  }
}
```

> **Note:** `react-native-webview` is a `peerDependency`, not a direct `dependency`. Native modules must be linked by the host app. Having it as a direct dep causes JS/native version mismatch.

**Create:** `packages/rn-sdk/tsconfig.json`, `packages/rn-sdk/tsup.config.ts`

---

### 2. Directory Structure

**Create:** full directory tree

```text
packages/rn-sdk/
  src/
    index.ts                        # Public exports
    types.ts                        # Shared SDK types (breaks circular import with handlers)
    SelfVerification.tsx             # Main component
    bridge/
      MessageRouter.ts              # Routes WebView messages to handlers
      types.ts                      # Re-exports from @selfxyz/webview-bridge
    handlers/
      NfcHandler.ts                 # NFC bridge handler
      BiometricHandler.ts           # Biometrics bridge handler
      KeychainHandler.ts            # Keychain/SecureStorage bridge handler
      CameraHandler.ts              # Camera/MRZ bridge handler
      LifecycleHandler.ts           # Lifecycle bridge handler (props-based)
      index.ts                      # Handler registry (createHandlers)
  assets/
    self-wallet/                    # Bundled Vite output (copied at build time)
      index.html
      *.js
  package.json
  tsconfig.json
  tsup.config.ts
```

---

### 3. Shared SDK types

**Create:** `packages/rn-sdk/src/types.ts`

Shared types used by `SelfVerification`, `LifecycleHandler`, and `createHandlers`. Defining them here (instead of in `SelfVerification.tsx`) avoids a circular dependency: handlers would otherwise need to import from the component that imports them.

```typescript
// SKELETON
export interface VerificationRequest {
  userId?: string;
  scope?: string;
  disclosures?: string[];
}

export interface VerificationResult {
  success: boolean;
  userId?: string;
  verificationId?: string;
  proof?: unknown;
  claims?: Record<string, unknown>;
}

export interface SelfSdkError {
  code: string;
  message: string;
}
```

---

### 4. `SelfVerification` Component

**Create:** `packages/rn-sdk/src/SelfVerification.tsx`

```typescript
// SKELETON
import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Platform, type ViewStyle } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import { MessageRouter } from './bridge/MessageRouter';
import { createHandlers } from './handlers';
import type { VerificationRequest, VerificationResult, SelfSdkError } from './types';

export interface SelfVerificationProps {
  request: VerificationRequest;
  onSuccess: (result: VerificationResult) => void;
  onFailure: (error: SelfSdkError) => void;
  onCancelled: () => void;
  debug?: boolean;
  devServerUrl?: string;
  style?: ViewStyle;
}

export const SelfVerification: React.FC<SelfVerificationProps> = ({
  request,
  onSuccess,
  onFailure,
  onCancelled,
  debug = false,
  devServerUrl,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);

  const router = useMemo(
    () =>
      new MessageRouter({
        sendToWebView: (js: string) => {
          webViewRef.current?.injectJavaScript(js);
        },
      }),
    [],
  );

  useEffect(() => {
    const handlers = createHandlers({
      request,
      onSuccess,
      onFailure,
      onCancelled,
      debug,
      router,                         // <-- Spec correction: pass router
    });
    handlers.forEach(h => router.register(h));
    return () => handlers.forEach(h => router.unregister(h));
  }, [request, onSuccess, onFailure, onCancelled, debug]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      router.onMessageReceived(event.nativeEvent.data);
    },
    [router],
  );

  // Spec correction: platform-aware source (not Android-only)
  const bundledSource = Platform.select({
    android: { uri: 'file:///android_asset/self-wallet/index.html' },
    ios: require('../assets/self-wallet/index.html'),
    default: undefined,
  });
  const useDevServer = Boolean(__DEV__ && devServerUrl);
  if (!__DEV__ && devServerUrl) {
    throw new Error('[SelfSDK] devServerUrl is debug-only');
  }
  const source = useDevServer ? { uri: devServerUrl! } : bundledSource;

  if (!source) {
    console.error('[SelfSDK] Unsupported platform:', Platform.OS);
    return null;
  }

  const isAndroidAsset = source.uri?.startsWith('file:///android_asset/');
  let origin = 'file://';
  if (devServerUrl) {
    try {
      origin = new URL(devServerUrl).origin;
    } catch {
      const match = devServerUrl.match(/^(https?:\/\/[^/]+)/);
      origin = match ? match[1] : 'file://';
    }
  }
  const originWhitelist = devServerUrl ? [origin] : ['file://'];

  return (
    <View style={[{ flex: 1 }, style]}>
      <WebView
        ref={webViewRef}
        source={source}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess={isAndroidAsset}
        allowUniversalAccessFromFileURLs={false}
        mediaPlaybackRequiresUserGesture={false}
        originWhitelist={originWhitelist}
        style={{ flex: 1 }}
      />
    </View>
  );
};
```

#### Input / Output

**Input (host app renders component):**

```tsx
<SelfVerification
  request={{
    userId: 'user-123',
    scope: 'age-verification',
    disclosures: ['nationality', 'age_over_18'],
  }}
  onSuccess={result => console.log('Verified:', result.verificationId)}
  onFailure={error => console.error(error.code, error.message)}
  onCancelled={() => navigation.goBack()}
  debug={__DEV__}
/>
```

**Expected Output:** WebView renders, sends `lifecycle.ready` bridge request, receives config via `lifecycle.getConfig`.

**Edge case -- devServerUrl provided:**

```
Input:  <SelfVerification devServerUrl="http://localhost:5173" ... />
Output: WebView loads from Vite dev server, not bundled assets
```

**Edge case -- no request fields:**

```
Input:  <SelfVerification request={{}} onSuccess={...} onFailure={...} onCancelled={...} />
Output: WebView loads, lifecycle.getConfig returns { verificationRequest: {}, debug: false, platform: 'react-native' }
```

---

### 5. MessageRouter

**Create:** `packages/rn-sdk/src/bridge/MessageRouter.ts`

The RN message router mirrors the Kotlin `MessageRouter` behavior exactly.

```typescript
// SKELETON
import type {
  BridgeRequest,
  BridgeResponse,
  BridgeEvent,
  BridgeDomain,
} from '@selfxyz/webview-bridge';

export interface BridgeHandler {
  domain: BridgeDomain;
  handle(method: string, params: Record<string, unknown>): Promise<unknown>;
}

interface RouterConfig {
  sendToWebView: (js: string) => void;
}

export class MessageRouter {
  private handlers = new Map<string, BridgeHandler>();
  private config: RouterConfig;

  constructor(config: RouterConfig) {
    /* ... */
  }
  register(handler: BridgeHandler): void {
    /* ... */
  }
  unregister(handler: BridgeHandler): void {
    this.handlers.delete(handler.domain);
  }
  async onMessageReceived(rawJson: string): Promise<void> {
    /* ... */
  }
  pushEvent(domain: BridgeDomain, event: string, data: unknown): void {
    /* ... */
  }
  private sendResponse(
    request: BridgeRequest,
    success: boolean,
    data?: unknown,
  ): void {
    /* ... */
  }
  private sendError(
    request: BridgeRequest,
    code: string,
    message: string,
  ): void {
    /* ... */
  }
}
```

**Spec correction (PR #1765 review):** `crypto.randomUUID()` may not be available in all RN environments. Use a polyfill (`react-native-get-random-values`) or fallback: `crypto.randomUUID?.() ?? \`${Date.now()}-${Math.random()}\``.

**Transport details:**

| Direction                  | Mechanism                                                                       |
| -------------------------- | ------------------------------------------------------------------------------- |
| WebView -> Native          | `window.ReactNativeWebView.postMessage(json)` -> `onMessage` prop               |
| Native -> WebView          | `webViewRef.injectJavaScript("window.SelfNativeBridge._handleResponse('...')")` |
| Native -> WebView (events) | `webViewRef.injectJavaScript("window.SelfNativeBridge._handleEvent('...')")`    |

The `@selfxyz/webview-bridge` already detects `ReactNativeWebView` as a transport:

```typescript
// In webview-bridge's bridge.ts — transport detection
if (globalThis.ReactNativeWebView?.postMessage) {
  // React Native WebView transport
}
```

#### Input / Output

**Input (WebView sends bridge request):**

```json
{
  "type": "request",
  "version": 1,
  "id": "a1b2c3d4-...",
  "domain": "biometrics",
  "method": "authenticate",
  "params": { "reason": "Confirm identity" },
  "timestamp": 1708200000000
}
```

**Expected Output (native -> WebView response):**

```javascript
window.SelfNativeBridge._handleResponse(
  '{"type":"response","version":1,"id":"...","domain":"biometrics","requestId":"a1b2c3d4-...","success":true,"data":true,"timestamp":1708200001000}',
);
true;
```

**Edge case -- unknown domain:**

```
Input:  { "type": "request", "domain": "unknown_domain", "method": "foo", ... }
Output: Response with success: false, error: { code: "HANDLER_NOT_FOUND", message: "No handler for domain: unknown_domain" }
```

**Edge case -- malformed JSON:**

```
Input:  "this is not json"
Output: console.error('[SelfSDK] Failed to parse bridge message: ...'), no crash
```

---

### 6. Native Handlers

Each handler implements the same bridge protocol as the Kotlin SDK handlers. They are thin wrappers around existing React Native libraries.

#### 6a. NfcHandler

**Create:** `packages/rn-sdk/src/handlers/NfcHandler.ts`

```typescript
// SKELETON
import NfcManager from 'react-native-nfc-manager';
import type { BridgeDomain } from '@selfxyz/webview-bridge';

export class NfcHandler {
  domain: BridgeDomain = 'nfc';
  private router: MessageRouter;

  constructor(router: MessageRouter) {
    this.router = router;
  }

  async handle(
    method: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    // Methods: 'scan', 'cancelScan', 'isSupported'
    // scan() sends progress events via this.router.pushEvent('nfc', 'scanProgress', { ... })
  }
}
```

**Input / Output:**

```
Input:  { domain: "nfc", method: "isSupported", params: {} }
Output: true | false (boolean from NfcManager.isSupported())

Input:  { domain: "nfc", method: "scan", params: { passportNumber: "AB1234567", dateOfBirth: "900115", dateOfExpiry: "300115" } }
Output: { passportData: { mrz: "...", dsc: "...", dg1Hash: [...], ... } }
  Events during scan: { event: "scanProgress", data: { step: "reading_dg1", percent: 40 } }

Error:  { domain: "nfc", method: "unknownMethod", params: {} }
Output: { success: false, error: { code: "METHOD_NOT_FOUND", message: "Unknown NFC method: unknownMethod" } }
```

#### 6b. BiometricHandler

**Create:** `packages/rn-sdk/src/handlers/BiometricHandler.ts`

```typescript
// SKELETON
import type { BridgeDomain } from '@selfxyz/webview-bridge';
import ReactNativeBiometrics from 'react-native-biometrics';

export class BiometricHandler {
  domain: BridgeDomain = 'biometrics';
  private rnBiometrics = new ReactNativeBiometrics();

  async handle(
    method: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    // Methods: 'authenticate', 'isAvailable', 'getBiometryType'
  }
}
```

**Input / Output:**

```
Input:  { domain: "biometrics", method: "authenticate", params: { reason: "Confirm identity" } }
Output: true (on success)
Error:  { code: "BIOMETRIC_FAILED", message: "Authentication failed" } (on user cancel/failure)

Input:  { domain: "biometrics", method: "isAvailable", params: {} }
Output: true | false

Input:  { domain: "biometrics", method: "getBiometryType", params: {} }
Output: "FaceID" | "TouchID" | "Biometrics" | "none"
```

#### 6c. KeychainHandler

**Create:** `packages/rn-sdk/src/handlers/KeychainHandler.ts`

```typescript
// SKELETON
import type { BridgeDomain } from '@selfxyz/webview-bridge';
import * as Keychain from 'react-native-keychain';

export class KeychainHandler {
  domain: BridgeDomain = 'secureStorage';

  async handle(
    method: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    // Methods: 'get', 'set', 'remove'
    // Uses service prefix: `self_sdk_${key}`
  }
}
```

**Input / Output:**

```
Input:  { domain: "secureStorage", method: "set", params: { key: "auth_token", value: "abc123" } }
Output: null (stored in Keychain with service 'self_sdk_auth_token')

Input:  { domain: "secureStorage", method: "get", params: { key: "auth_token" } }
Output: "abc123"

Input:  { domain: "secureStorage", method: "get", params: { key: "nonexistent" } }
Output: null

Error:  { domain: "secureStorage", method: "set", params: { key: "x" } }  (missing value)
Output: { code: "MISSING_VALUE", message: "Value parameter required" }

Error:  { domain: "secureStorage", method: "get", params: {} }  (missing key)
Output: { code: "MISSING_KEY", message: "Key parameter required" }
```

#### 6d. CameraHandler

**Create:** `packages/rn-sdk/src/handlers/CameraHandler.ts`

```typescript
// SKELETON
import type { BridgeDomain } from '@selfxyz/webview-bridge';

export class CameraHandler {
  domain: BridgeDomain = 'camera';

  async handle(
    method: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    // Methods: 'isAvailable', 'scanMRZ'
  }
}
```

**Input / Output:**

```
Input:  { domain: "camera", method: "isAvailable", params: {} }
Output: true

Input:  { domain: "camera", method: "scanMRZ", params: { documentType: "p", countryCode: "NLD" } }
Output: { documentNumber: "L898902C3", dateOfBirth: "740812", dateOfExpiry: "120415", documentType: "P", countryCode: "UTO" }

Error (cancelled): { code: "MRZ_SCAN_CANCELLED", message: "MRZ scan cancelled" }
Error (generic):   { code: "MRZ_SCAN_FAILED", message: "MRZ scan failed" }
Error (no module): { code: "NOT_AVAILABLE", message: "MRZ scanner module is not installed" }
```

#### 6e. LifecycleHandler

**Create:** `packages/rn-sdk/src/handlers/LifecycleHandler.ts`

```typescript
// SKELETON
import type { BridgeDomain } from '@selfxyz/webview-bridge';
import type {
  VerificationRequest,
  VerificationResult,
  SelfSdkError,
} from '../types';

export interface LifecycleConfig {
  request: VerificationRequest;
  onSuccess: (result: VerificationResult) => void;
  onFailure: (error: SelfSdkError) => void;
  onCancelled: () => void;
  debug: boolean;
}

export class LifecycleHandler {
  domain: BridgeDomain = 'lifecycle';
  private config: LifecycleConfig;

  constructor(config: LifecycleConfig) {
    this.config = config;
  }

  async handle(
    method: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    // Methods: 'ready', 'getConfig', 'dismiss', 'setResult'
    // 'getConfig' returns { verificationRequest, debug, platform: 'react-native' }
    // 'setResult' calls onSuccess/onFailure based on params.success
    // 'dismiss' calls onCancelled
  }
}
```

**Input / Output:**

```
Input:  { domain: "lifecycle", method: "getConfig", params: {} }
Output: { verificationRequest: { userId: "user-123", scope: "age-verification", disclosures: [...] }, debug: false, platform: "react-native" }

Input:  { domain: "lifecycle", method: "setResult", params: { success: true, userId: "user-123", verificationId: "ver-456" } }
Output: null (calls props.onSuccess({ success: true, userId: "user-123", verificationId: "ver-456" }))

Input:  { domain: "lifecycle", method: "setResult", params: { success: false, errorCode: "PROVING_FAILED", errorMessage: "TEE connection failed" } }
Output: null (calls props.onFailure({ code: "PROVING_FAILED", message: "TEE connection failed" }))

Input:  { domain: "lifecycle", method: "dismiss", params: {} }
Output: null (calls props.onCancelled())
```

---

### 7. Handler Registry

**Create:** `packages/rn-sdk/src/handlers/index.ts`

```typescript
// SKELETON
import type {
  VerificationRequest,
  VerificationResult,
  SelfSdkError,
} from '../types';

export function createHandlers(config: {
  request: VerificationRequest;
  onSuccess: (result: VerificationResult) => void;
  onFailure: (error: SelfSdkError) => void;
  onCancelled: () => void;
  debug: boolean;
  router: MessageRouter; // <-- Spec correction: router arg required
}): BridgeHandler[] {
  return [
    new NfcHandler(config.router),
    new BiometricHandler(),
    new KeychainHandler(),
    new CameraHandler(),
    new LifecycleHandler({
      request: config.request,
      onSuccess: config.onSuccess,
      onFailure: config.onFailure,
      onCancelled: config.onCancelled,
      debug: config.debug,
    }),
  ];
}
```

> **Note:** `SelfVerification.tsx` must pass `router` in the `createHandlers` config object — `NfcHandler` requires it for pushing progress events.

---

### 8. Asset Bundling

The Vite output (`packages/webview-app/dist/`) is copied into the RN SDK's assets at build time:

```bash
# Build script (in package.json or CI)
cp -r ../webview-app/dist/ ./assets/self-wallet/
```

Platform-specific loading:

```typescript
import { Platform } from 'react-native';

const source = devServerUrl
  ? { uri: devServerUrl }
  : Platform.select({
      android: { uri: 'file:///android_asset/self-wallet/index.html' },
      ios: require('../assets/self-wallet/index.html'),
    });
```

Use `require()` with Metro's asset resolver for iOS (register `html` in Metro config). This avoids adding `react-native-fs` as a peer dependency.

Security rule for release builds:

```typescript
const useDevServer = Boolean(__DEV__ && devServerUrl);
if (!__DEV__ && devServerUrl) {
  throw new Error('[SelfSDK] devServerUrl is debug-only');
}
const source = useDevServer
  ? { uri: devServerUrl! }
  : Platform.select({
      android: { uri: 'file:///android_asset/self-wallet/index.html' },
      ios: require('../assets/self-wallet/index.html'),
    });
```

---

### 9. Native vs WebView Boundary

| Capability        | Native (RN bridge)     | WebView (web fallback) |
| ----------------- | ---------------------- | ---------------------- |
| NFC passport scan | YES -- hardware        | --                     |
| Camera/MRZ        | YES -- hardware        | --                     |
| Biometrics        | YES -- OS prompt       | --                     |
| Keychain          | YES -- host app policy | --                     |
| Lifecycle         | YES -- component props | --                     |
| Documents         | --                     | IndexedDB              |
| Crypto hashing    | --                     | Web Crypto API         |
| Analytics         | --                     | console/fetch          |
| Haptic            | --                     | Skipped (not critical) |

---

## Files You Will Modify

| File                                               | Change     | Risk                                                 |
| -------------------------------------------------- | ---------- | ---------------------------------------------------- |
| `packages/rn-sdk/package.json`                     | Create new | **Low** -- new package                               |
| `packages/rn-sdk/tsconfig.json`                    | Create new | **Low** -- build config                              |
| `packages/rn-sdk/tsup.config.ts`                   | Create new | **Low** -- build config                              |
| `packages/rn-sdk/src/index.ts`                     | Create new | **Low** -- public exports                            |
| `packages/rn-sdk/src/types.ts`                     | Create new | **Low** -- shared SDK types (breaks circular import) |
| `packages/rn-sdk/src/SelfVerification.tsx`         | Create new | **Medium** -- core component                         |
| `packages/rn-sdk/src/bridge/MessageRouter.ts`      | Create new | **Medium** -- message routing                        |
| `packages/rn-sdk/src/bridge/types.ts`              | Create new | **Low** -- re-exports                                |
| `packages/rn-sdk/src/handlers/NfcHandler.ts`       | Create new | **High** -- hardware integration                     |
| `packages/rn-sdk/src/handlers/BiometricHandler.ts` | Create new | **Medium** -- native module wrapper                  |
| `packages/rn-sdk/src/handlers/KeychainHandler.ts`  | Create new | **Medium** -- native module wrapper                  |
| `packages/rn-sdk/src/handlers/CameraHandler.ts`    | Create new | **Medium** -- hardware integration                   |
| `packages/rn-sdk/src/handlers/LifecycleHandler.ts` | Create new | **Medium** -- props/callback bridge                  |
| `packages/rn-sdk/src/handlers/index.ts`            | Create new | **Low** -- handler registry                          |

## Files You Will NOT Modify

| File                              | Why                                                                      |
| --------------------------------- | ------------------------------------------------------------------------ |
| `packages/webview-bridge/src/*`   | Owned by Person 1 -- bridge protocol already defined                     |
| `packages/webview-app/src/*`      | Owned by Person 1 -- WebView UI screens                                  |
| `packages/mobile-sdk-alpha/src/*` | Owned by Person 4 -- WebView engine core                                 |
| `packages/kmp-sdk/shared/src/*`   | Owned by Person 2 -- Kotlin native shell (reference only)                |
| `app/src/*`                       | Self Wallet app -- integration consumer, not modified by this workstream |
| `common/src/*`                    | Shared utilities -- out of scope                                         |

## Chunking Guide

### Chunk 5A: Package Setup + Component Shell + MessageRouter + LifecycleHandler -- M ~8k tokens

**Goal:** Create `packages/rn-sdk/` with a working `SelfVerification` that loads the WebView, routes bridge messages, and handles lifecycle domain.

**Steps:**

1. Create directory structure, `package.json` (with `react-native-webview` as peerDep), `tsconfig.json`, `tsup.config.ts`
2. Implement `src/types.ts` -- shared `VerificationRequest`, `VerificationResult`, `SelfSdkError` (so handlers and component import from here, not from each other)
3. Implement `bridge/types.ts` -- re-export types from `@selfxyz/webview-bridge`
4. Implement `MessageRouter.ts` -- message routing with `crypto.randomUUID` fallback polyfill
5. Implement `LifecycleHandler.ts` -- `ready`, `getConfig`, `dismiss`, `setResult` (import types from `../types`)
6. Implement `handlers/index.ts` -- `createHandlers()` with `router` arg (import types from `../types`)
7. Implement `SelfVerification.tsx` -- WebView wrapper with `onMessage`, `Platform.select` for source (import types from `./types`)
8. Implement `index.ts` -- public exports
9. Validate: `cd packages/rn-sdk && yarn build && yarn typecheck`

**You will NOT:**

- Write business logic beyond routing bridge messages
- Import from `mobile-sdk-alpha` (all core logic is in the WebView)
- Implement NFC, biometrics, keychain, or camera handlers (those are Chunks 5B/5C)
- Bundle Vite assets (that is Chunk 5D)
- Add more than ~100 LOC in this chunk

#### Input / Output -- Chunk Validation

**Input:**

```bash
cd packages/rn-sdk && yarn build && yarn typecheck
```

**Expected Output:**

```
tsup: Build succeeded (dist/index.js, dist/index.d.ts)
tsc: No errors
```

**Integration test (manual):**

```tsx
// In any RN app
import { SelfVerification } from '@selfxyz/rn-sdk';
// Component renders a WebView, lifecycle.getConfig returns request data
```

#### Tests

| Test                                 | Type  | What it validates                                  |
| ------------------------------------ | ----- | -------------------------------------------------- |
| `MessageRouter.routes-to-handler`    | Unit  | Routes request to correct handler by domain        |
| `MessageRouter.unknown-domain`       | Unit  | Returns HANDLER_NOT_FOUND error for unknown domain |
| `MessageRouter.malformed-json`       | Unit  | Does not crash on invalid JSON                     |
| `MessageRouter.ignores-non-request`  | Unit  | Ignores messages where `type !== 'request'`        |
| `LifecycleHandler.getConfig`         | Unit  | Returns request, debug, platform fields            |
| `LifecycleHandler.setResult-success` | Unit  | Calls `onSuccess` with correct shape               |
| `LifecycleHandler.setResult-failure` | Unit  | Calls `onFailure` with code and message            |
| `LifecycleHandler.dismiss`           | Unit  | Calls `onCancelled`                                |
| `createHandlers.includes-router`     | Unit  | NfcHandler receives router reference               |
| Build gate: `yarn build`             | Build | Package compiles cleanly                           |
| Build gate: `yarn typecheck`         | Build | No type errors                                     |

---

### Chunk 5B: Biometric + Keychain Handlers -- S ~4k tokens

**Depends on:** Chunk 5A

**Goal:** Implement the two simplest native handler bridges.

**Steps:**

1. Implement `BiometricHandler.ts` -- wraps `react-native-biometrics` (`authenticate`, `isAvailable`, `getBiometryType`)
2. Implement `KeychainHandler.ts` -- wraps `react-native-keychain` (`get`, `set`, `remove` with `self_sdk_` service prefix)
3. Register both in `createHandlers()`
4. Validate: `cd packages/rn-sdk && yarn build && yarn typecheck`

**You will NOT:**

- Add caching or retry logic to keychain operations
- Add biometric enrollment logic (that is the OS's responsibility)
- Store anything in keychain that the WebView did not explicitly request
- Write more than ~80 LOC across both handlers

#### Input / Output -- Chunk Validation

**Input:**

```bash
cd packages/rn-sdk && yarn build && yarn typecheck
```

**Expected Output:**

```
Build: Success
Typecheck: No errors
```

**Manual device test:**

```
1. Bridge message: { domain: "biometrics", method: "authenticate", params: { reason: "Test" } }
   Result: OS biometric prompt appears, returns true on success

2. Bridge message: { domain: "secureStorage", method: "set", params: { key: "test", value: "hello" } }
   Followed by: { domain: "secureStorage", method: "get", params: { key: "test" } }
   Result: Returns "hello"
```

#### Tests

| Test                                    | Type | What it validates                           |
| --------------------------------------- | ---- | ------------------------------------------- |
| `BiometricHandler.authenticate-success` | Unit | Returns `true` when biometric succeeds      |
| `BiometricHandler.authenticate-failure` | Unit | Throws `BIOMETRIC_FAILED` when user cancels |
| `BiometricHandler.isAvailable`          | Unit | Returns boolean from sensor check           |
| `BiometricHandler.getBiometryType`      | Unit | Returns biometry type string                |
| `BiometricHandler.unknown-method`       | Unit | Throws `METHOD_NOT_FOUND`                   |
| `KeychainHandler.set-get-roundtrip`     | Unit | Value stored then retrieved matches         |
| `KeychainHandler.get-nonexistent`       | Unit | Returns `null` for missing key              |
| `KeychainHandler.remove`                | Unit | Removes key, subsequent get returns `null`  |
| `KeychainHandler.missing-key-param`     | Unit | Throws `MISSING_KEY`                        |
| `KeychainHandler.set-missing-value`     | Unit | Throws `MISSING_VALUE`                      |

---

### Chunk 5C: NFC + Camera Handlers -- L ~10k tokens

**Depends on:** Chunk 5A

**Goal:** Implement hardware-dependent handlers. NFC is the most complex handler due to passport reading and progress event streaming.

**Steps:**

1. Implement `NfcHandler.ts` -- wraps `react-native-nfc-manager` or custom native module
2. Port NFC passport reading logic from `app/src/integrations/nfc/` (reference implementation)
3. Wire progress events via `this.router.pushEvent('nfc', 'scanProgress', { step, percent })`
4. Implement `CameraHandler.ts` -- wraps camera module for MRZ detection (`isAvailable`, `scanMRZ` stub)
5. Register both in `createHandlers()`
6. Validate: Full passport scan on physical device (Android + iOS)

**You will NOT:**

- Implement the passport data parsing (that runs in the WebView engine)
- Add any proving or cryptographic logic (that runs in `mobile-sdk-alpha`)
- Cache NFC scan results (the WebView engine manages document storage)
- Write more than ~120 LOC for NfcHandler (it delegates to the native module)
- Implement full MRZ camera scanning in this chunk (stub is acceptable; actual camera library choice depends on host app)

#### Input / Output -- Chunk Validation

**Input (physical device required):**

```
1. Bridge message: { domain: "nfc", method: "isSupported", params: {} }
   Output: true (on NFC-capable device)

2. Bridge message: { domain: "nfc", method: "scan", params: { passportNumber: "AB1234567", dateOfBirth: "900115", dateOfExpiry: "300115" } }
   Events: { event: "scanProgress", data: { step: "reading_dg1", percent: 40 } }
   Output: { passportData: { mrz: "...", dsc: "...", ... } }
```

**Expected Output:** Passport data returned matching bridge protocol spec.

#### Tests

| Test                              | Type        | What it validates                                   |
| --------------------------------- | ----------- | --------------------------------------------------- |
| `NfcHandler.isSupported`          | Unit        | Delegates to NfcManager.isSupported()               |
| `NfcHandler.cancelScan`           | Unit        | Calls NfcManager.cancelTechnologyRequest()          |
| `NfcHandler.scan-progress-events` | Integration | Progress events stream to WebView during scan       |
| `NfcHandler.scan-success`         | Device      | Full passport scan returns valid data               |
| `NfcHandler.scan-nfc-unsupported` | Unit        | Returns NFC_NOT_SUPPORTED error on incapable device |
| `NfcHandler.unknown-method`       | Unit        | Throws METHOD_NOT_FOUND                             |
| `CameraHandler.isAvailable`       | Unit        | Returns true when native module is present          |
| `CameraHandler.scanMRZ-success`   | Unit        | Returns normalized MRZ data from native module      |
| `CameraHandler.scanMRZ-cancelled` | Unit        | Maps `MRZ_SCAN_CANCELLED` as distinct error code    |
| `CameraHandler.scanMRZ-failed`    | Unit        | Maps generic native errors to `MRZ_SCAN_FAILED`     |

---

### Chunk 5D: Asset Bundling + Publishing -- M ~6k tokens

**Depends on:** Chunks 5A-5C + `webview-app` Vite build working (Person 1)

**Goal:** Bundle WebView assets for production and prepare npm publishing.

**Steps:**

1. Set up build script to copy Vite output (`packages/webview-app/dist/`) into `assets/self-wallet/`
2. Configure platform-specific asset loading:
   - Android: `file:///android_asset/self-wallet/index.html` (RN bundles files from `assets/` into APK)
   - iOS: resolve via RN `require()` with Metro `html` asset support
3. Enforce security policy: `devServerUrl` accepted only when `__DEV__ === true`
4. Test: Production build loads bundled HTML correctly on both platforms
5. Configure npm publishing pipeline (`prepublishOnly` script, `.npmignore`)
6. Validate: Install in fresh RN project, verify component renders WebView with bundled content

**You will NOT:**

- Modify the Vite build configuration (owned by Person 1)
- Change the bridge protocol or message format
- Add any logic to the asset loading beyond platform path resolution
- Inline or transform the WebView bundle (it is loaded as-is)

#### Input / Output -- Chunk Validation

**Input:**

```bash
cd packages/rn-sdk && yarn build
# Copy Vite output
cp -r ../webview-app/dist/ ./assets/self-wallet/
# Verify assets exist
ls assets/self-wallet/index.html
```

**Expected Output:**

```
assets/self-wallet/index.html exists
Production build loads HTML in WebView on both Android and iOS
```

**Integration test (manual):**

```bash
# Fresh RN project
npx react-native init TestApp
cd TestApp
yarn add @selfxyz/rn-sdk
yarn add react-native-webview react-native-nfc-manager react-native-biometrics react-native-keychain
# Add <SelfVerification /> to App.tsx
npx react-native run-android  # WebView renders verification flow
npx react-native run-ios      # WebView renders verification flow
```

#### Tests

| Test                         | Type       | What it validates                                      |
| ---------------------------- | ---------- | ------------------------------------------------------ |
| `asset-bundling.html-exists` | Build gate | `assets/self-wallet/index.html` present after build    |
| `Platform.select.android`    | Unit       | Android source resolves to `file:///android_asset/...` |
| `Platform.select.ios`        | Unit       | iOS source resolves via RN `require()`                 |
| `devServerUrl-override`      | Unit       | Dev server URL takes precedence only in debug          |
| `devServerUrl-release-block` | Unit       | Release build rejects remote URL (fail closed)         |
| `npm-pack-contents`          | Build gate | `npm pack` includes `dist/` and `assets/`              |

---

## Dependency Graph

```
Chunk 5A (package + component + router + lifecycle) — no deps, start here
  ├──→ Chunk 5B (biometric + keychain handlers)
  ├──→ Chunk 5C (NFC + camera handlers)
  └──→ Chunk 5D (asset bundling + publishing) — after 5A-5C + webview-app Vite build
```

## Completion Status

_Audit date: 2026-03-02_

| Chunk | Description                                                                                     | Size   | Status   |
| ----- | ----------------------------------------------------------------------------------------------- | ------ | -------- |
| 5A    | Package setup + `SelfVerification` shell + `MessageRouter` + `LifecycleHandler`                 | M ~8k  | **Done** |
| 5B    | `BiometricHandler` + `KeychainHandler`                                                          | S ~4k  | **Done** |
| 5C    | `NfcHandler` + `CameraHandler` (hardware-dependent, validated via typecheck + build smoke test) | L ~10k | **Done** |
| 5D    | Asset bundling (copy Vite output into `assets/`) + npm publishing config                        | M ~6k  | **Done** |

**Implementation chunks complete. Remaining work is integration validation + npm publish.**

## Validation Plan

```bash
# After every chunk (must pass):
cd packages/rn-sdk && yarn build
cd packages/rn-sdk && yarn typecheck

# After Chunk 5A:
# Manual: <SelfVerification /> renders WebView, lifecycle messages flow

# After Chunk 5B:
# Manual on device: biometric prompt appears, keychain roundtrip works

# After Chunk 5C:
# Typecheck + build pass; NFC/camera handlers compile cleanly

# After all chunks — integration validation:
cd packages/rn-sdk && yarn build
ls packages/rn-sdk/assets/self-wallet/index.html  # Assets bundled
```

## Coordination Notes

- **Person 1 (WebView UI):** The RN SDK loads the same Vite bundle that Person 1 builds. Chunk 5D depends on Person 1's `packages/webview-app/` producing a working `dist/index.html`. No code sharing beyond the bundle -- coordination is the build artifact.
- **Person 2 (Kotlin Native Shell):** The RN handlers implement the same bridge protocol as the Kotlin handlers. Use `packages/kmp-sdk/shared/src/androidMain/.../handlers/` as reference for handler contracts. No runtime dependency -- protocol is the only coupling.
- **Person 4 (SDK Core):** Chunk 5A depends on Person 4's Chunk 4F (web fallback adapters) being complete so the WebView can handle documents/crypto/analytics without native bridges.
- **Person 1 (Bridge + WebView):** The RN SDK depends on `@selfxyz/webview-bridge` (Person 1's package) exporting `BridgeRequest`, `BridgeResponse`, `BridgeEvent`, `BridgeDomain` types. The bridge must detect `ReactNativeWebView` as a transport — this is already implemented in `bridge.ts`.

## Key Reference Files

| File                                                          | What to Look At                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `packages/webview-bridge/src/types.ts`                        | Bridge protocol types (must match exactly)                       |
| `packages/webview-bridge/src/bridge.ts`                       | Transport detection -- `ReactNativeWebView.postMessage` path     |
| `packages/kmp-sdk/shared/src/commonMain/.../MessageRouter.kt` | Kotlin MessageRouter (reference for JS port, 131 lines)          |
| `packages/kmp-sdk/shared/src/androidMain/.../handlers/`       | Android handler implementations (contract reference)             |
| `app/src/integrations/nfc/`                                   | Existing RN NFC integration (port to NfcHandler)                 |
| `packages/webview-app/dist/`                                  | Vite output to bundle as assets                                  |
| `packages/mobile-sdk-alpha/src/types/public.ts`               | Adapter interfaces (context for what the WebView engine expects) |

---

<!-- Everything below this line is filled in AFTER implementation. -->

## What Was Built

### Architecture (brief)

`@selfxyz/rn-sdk` is a thin React Native wrapper (~300 LOC component + ~500 LOC handlers) around `react-native-webview`. `SelfVerification` renders a WebView loading the Vite bundle. `MessageRouter` dispatches bridge JSON messages to domain-specific handlers. Each handler wraps a single RN native module with no business logic. NFC uses APDU-level passport reading via `react-native-nfc-manager`. Camera delegates to a `SelfMRZScannerModule` native module provided by the host app. The bridge protocol is identical to the KMP native shell — the WebView cannot distinguish which shell it runs in.

### Deviations from Spec

| Spec said                                        | We did                                                                                               | Why                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| CameraHandler `scanMRZ` throws `NOT_IMPLEMENTED` | Delegates to `NativeModules.SelfMRZScannerModule` with result normalization and cancellation mapping | Real native MRZ scanning was implemented for the RN test app; handler updated to support it     |
| CameraHandler has no error differentiation       | Added `MRZ_SCAN_CANCELLED` as a distinct error code separate from `MRZ_SCAN_FAILED`                  | Cancellation is a clean UX exit, not a failure; WebView camera screen needs to distinguish them |
| `createHandlers` signature                       | Added `router` parameter for NfcHandler event streaming                                              | Discovered during Chunk 5A that NFC progress events require router access                       |

### Key Files (final)

| File                                               | Role                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| `packages/rn-sdk/src/SelfVerification.tsx`         | Public component — WebView wrapper with platform-aware asset loading     |
| `packages/rn-sdk/src/bridge/MessageRouter.ts`      | Bridge message dispatcher — routes JSON to handlers by domain            |
| `packages/rn-sdk/src/handlers/NfcHandler.ts`       | NFC passport reading with APDU + progress events                         |
| `packages/rn-sdk/src/handlers/CameraHandler.ts`    | MRZ scanning via native module with cancellation support                 |
| `packages/rn-sdk/src/handlers/BiometricHandler.ts` | Biometric authentication wrapper                                         |
| `packages/rn-sdk/src/handlers/KeychainHandler.ts`  | Secure storage with `self_sdk_` prefix                                   |
| `packages/rn-sdk/src/handlers/LifecycleHandler.ts` | Config delivery + result/dismiss callbacks                               |
| `packages/rn-sdk/src/types.ts`                     | Shared types (breaks circular dependency between component and handlers) |

### Lessons / Gotchas

- `react-native-webview` must be a `peerDependency`, not a direct dependency — having it as direct causes JS/native version mismatch in host apps.
- `crypto.randomUUID()` is not available in all RN environments. Fallback: `crypto.randomUUID?.() ?? \`${Date.now()}-${Math.random()}\``.
- iOS asset loading uses RN `require()` + Metro `html` asset support. This avoids adding `react-native-fs` as a peer dependency.
- CameraHandler normalizes both `data`-wrapped and flat result payloads, plus legacy field names (`passportNumber`/`birthDate`/`expiryDate`), because different native module versions may return different shapes.

---

## Follow-Up (Out of Scope)

| Item                                         | Discovered during | Suggested spec                                                                         |
| -------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------- |
| Self Wallet migration to `SelfVerification`  | Spec writing      | Separate migration spec after SDK is stable                                            |
| MiniPay RN sample integration                | Spec writing      | `integrations/SPEC.md` (already exists)                                                |
| Camera library selection for MRZ scanning    | Chunk 5C planning | Depends on host app camera setup -- may need configurable adapter                      |
| RN test app MRZ DRY consolidation            | Complete          | [MRZ Consolidation Spec (archived)](../../../../archive/sdk/SPEC-MRZ-CONSOLIDATION.md) |
| iOS asset loading strategy (RNFS vs require) | PR #1765 review   | **Decided:** Use RN `require()` + Metro `html` asset support                           |

## Spec Deviations

| Suggestion skipped                     | Reason                                                                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| BEFORE/AFTER code blocks               | All tasks are new file creation (package does not exist yet) -- used CREATE + SKELETON pattern                                                 |
| `--remote` recommendation for L chunks | Chunk 5C (NFC) is hardware-dependent -- validated via typecheck + build smoke test only                                                        |
| Full handler implementation code       | Handlers are thin wrappers (~20-40 LOC each); showing full implementation would over-specify what should be a direct native library delegation |

### PR #1765 Review Corrections (incorporated inline)

| Issue                                 | Severity | Chunk | Fix Applied                                                             |
| ------------------------------------- | -------- | ----- | ----------------------------------------------------------------------- |
| `react-native-webview` dep type       | Major    | 5A    | Moved to `peerDependencies` as `"react-native-webview": ">=13.0.0"`     |
| `createHandlers` missing `router` arg | Critical | 5A    | `router` passed in `createHandlers` config; component passes `router`   |
| Android-only WebView `source`         | Major    | 5D    | Use `Platform.select({ android: ..., ios: ... })`                       |
| `crypto.randomUUID` polyfill          | Minor    | 5A    | Fallback: `crypto.randomUUID?.() ?? \`${Date.now()}-${Math.random()}\`` |
| iOS asset loading ambiguity           | Major    | 5D    | Standardize on RN `require()` + Metro `html` asset support              |

## Related Specs

| Spec                                              | Relationship                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| [SDK Overview](../../OVERVIEW.md)                 | Parent architecture spec                                                  |
| [webview/SPEC.md](../webview/SPEC.md)             | Builds the WebView UI + bridge that this SDK loads                        |
| [native-shells/SPEC.md](../native-shells/SPEC.md) | Kotlin native shell -- same bridge protocol, reference handlers           |
| [sdk-core/SPEC.md](../sdk-core/SPEC.md)           | SDK core adaptation -- Chunk 4F (web fallback adapters) is a prerequisite |
