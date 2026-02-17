# React Native SDK — `<SelfVerification />` WebView Wrapper

## Overview

A thin React Native component that wraps `react-native-webview` to embed the Self verification flow inside any React Native app. It shares the same WebView engine, bridge protocol, and UI as the Kotlin native shell — the only difference is the native transport layer.

**Package**: `@selfxyz/rn-sdk` (new, `packages/rn-sdk/`)
**Entry point**: `<SelfVerification />` component
**Estimated size**: ~200–300 LOC (thin wrapper)

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Host RN App (Self Wallet, etc.)            │
│                                             │
│  <SelfVerification                          │
│    request={verificationRequest}            │
│    onSuccess={(result) => ...}              │
│    onFailure={(error) => ...}               │
│    onCancelled={() => ...}                  │
│  />                                         │
├─────────────────────────────────────────────┤
│  @selfxyz/rn-sdk                            │
│  ├─ <SelfVerification /> component          │
│  ├─ MessageRouter (JS-side)                 │
│  └─ 5 Native Handler Bridges:              │
│     ├─ NFC (react-native NFC module)        │
│     ├─ Camera/MRZ (react-native camera)     │
│     ├─ Biometrics (react-native biometrics) │
│     ├─ Keychain (react-native keychain)     │
│     └─ Lifecycle (component props)          │
├─────────────────────────────────────────────┤
│  Bridge Protocol (postMessage JSON, v1)     │
│  Transport: ReactNativeWebView.postMessage  │
├─────────────────────────────────────────────┤
│  WebView (bundled Vite app)                 │
│  Same as Kotlin shell:                      │
│  @selfxyz/webview-app + webview-bridge      │
│  + mobile-sdk-alpha (WebView engine)        │
│  + Web fallbacks: IndexedDB, Web Crypto     │
└─────────────────────────────────────────────┘
```

**Key principle**: The RN SDK uses the **exact same WebView bundle** as the Kotlin SDK. The only RN-specific code is the native handler bridges (~200 LOC) and the `<SelfVerification />` wrapper component.

---

## What's Native vs WebView

| Capability | Native (RN bridge) | WebView (web fallback) |
|-----------|-------------------|----------------------|
| NFC passport scan | YES — hardware | — |
| Camera/MRZ | YES — hardware | — |
| Biometrics | YES — OS prompt | — |
| Keychain | YES — host app policy | — |
| Lifecycle | YES — component props | — |
| Documents | — | IndexedDB |
| Crypto hashing | — | Web Crypto API |
| Analytics | — | console/fetch |
| Haptic | — | Skipped (not critical) |

---

## Directory Structure

```
packages/rn-sdk/
  src/
    index.ts                        # Public exports
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
      index.ts                      # Handler registry
  assets/
    self-wallet/                    # Bundled Vite output (copied at build time)
      index.html
      *.js
  package.json
  tsconfig.json
  tsup.config.ts
```

---

## Package Configuration

### package.json

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
    "@selfxyz/webview-bridge": "workspace:^",
    "react-native-webview": "^13.12.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-native": ">=0.72.0",
    "react-native-nfc-manager": "^3.14.0",
    "react-native-biometrics": "^3.0.1",
    "react-native-keychain": "^8.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.4",
    "@types/react-native": "^0.73.0",
    "tsup": "^8.0.1",
    "typescript": "^5.9.3"
  }
}
```

**Peer dependencies**: The host RN app must install the native modules. This keeps the SDK lightweight and avoids version conflicts.

---

## Component API

### `<SelfVerification />`

```tsx
import { SelfVerification } from '@selfxyz/rn-sdk';

function VerifyScreen() {
  return (
    <SelfVerification
      // Required
      request={{
        userId: 'user-123',
        scope: 'age-verification',
        disclosures: ['nationality', 'age_over_18'],
      }}

      // Callbacks
      onSuccess={(result) => {
        console.log('Verified:', result.verificationId);
        navigation.goBack();
      }}
      onFailure={(error) => {
        console.error('Failed:', error.code, error.message);
      }}
      onCancelled={() => {
        navigation.goBack();
      }}

      // Optional
      debug={__DEV__}
      devServerUrl="http://localhost:5173"  // Dev mode: load from Vite dev server
      style={{ flex: 1 }}
    />
  );
}
```

### Props

```typescript
interface SelfVerificationProps {
  /** Verification request from the host app. */
  request: VerificationRequest;

  /** Called when verification succeeds. */
  onSuccess: (result: VerificationResult) => void;

  /** Called when verification fails. */
  onFailure: (error: SelfSdkError) => void;

  /** Called when user dismisses the verification flow. */
  onCancelled: () => void;

  /** Enable debug mode (relaxes TEE attestation checks). Default: false. */
  debug?: boolean;

  /** Dev server URL. When set, loads WebView from this URL instead of bundled assets. */
  devServerUrl?: string;

  /** Style for the WebView container. */
  style?: ViewStyle;
}

interface VerificationRequest {
  userId?: string;
  scope?: string;
  disclosures?: string[];
}

interface VerificationResult {
  success: boolean;
  userId?: string;
  verificationId?: string;
  proof?: unknown;
  claims?: Record<string, unknown>;
}

interface SelfSdkError {
  code: string;
  message: string;
}
```

---

## Implementation

### SelfVerification.tsx

```tsx
import React, { useRef, useCallback, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import { MessageRouter } from './bridge/MessageRouter';
import { createHandlers } from './handlers';

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

  // Create message router that sends responses to WebView
  const router = useMemo(() => new MessageRouter({
    sendToWebView: (js: string) => {
      webViewRef.current?.injectJavaScript(js);
    },
  }), []);

  // Register native handlers
  useMemo(() => {
    const handlers = createHandlers({
      request,
      onSuccess,
      onFailure,
      onCancelled,
      debug,
    });
    handlers.forEach(h => router.register(h));
  }, [request, onSuccess, onFailure, onCancelled, debug]);

  // Handle messages from WebView
  const onMessage = useCallback((event: WebViewMessageEvent) => {
    router.onMessageReceived(event.nativeEvent.data);
  }, [router]);

  // Determine source
  const source = devServerUrl
    ? { uri: devServerUrl }
    : { uri: 'file:///android_asset/self-wallet/index.html' };
    // iOS: use require('./assets/self-wallet/index.html') or Bundle.main path

  return (
    <View style={[{ flex: 1 }, style]}>
      <WebView
        ref={webViewRef}
        source={source}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        mediaPlaybackRequiresUserGesture={false}
        originWhitelist={['*']}
        style={{ flex: 1 }}
      />
    </View>
  );
};
```

### MessageRouter.ts

The RN message router mirrors the Kotlin `MessageRouter` behavior:

```typescript
import type { BridgeRequest, BridgeResponse, BridgeEvent, BridgeDomain } from '@selfxyz/webview-bridge';

interface BridgeHandler {
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
    this.config = config;
  }

  register(handler: BridgeHandler) {
    this.handlers.set(handler.domain, handler);
  }

  async onMessageReceived(rawJson: string) {
    try {
      const request: BridgeRequest = JSON.parse(rawJson);
      if (request.type !== 'request') return;

      const handler = this.handlers.get(request.domain);
      if (!handler) {
        this.sendError(request, 'HANDLER_NOT_FOUND', `No handler for domain: ${request.domain}`);
        return;
      }

      try {
        const result = await handler.handle(request.method, request.params);
        this.sendResponse(request, true, result);
      } catch (err: any) {
        this.sendError(request, err.code ?? 'HANDLER_ERROR', err.message ?? 'Unknown error');
      }
    } catch (parseErr) {
      console.error('[SelfSDK] Failed to parse bridge message:', parseErr);
    }
  }

  pushEvent(domain: BridgeDomain, event: string, data: unknown) {
    const evt: BridgeEvent = {
      type: 'event',
      version: 1,
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      domain,
      event,
      data,
      timestamp: Date.now(),
    };
    const escaped = JSON.stringify(evt).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    this.config.sendToWebView(`window.SelfNativeBridge._handleEvent('${escaped}');true;`);
  }

  private sendResponse(request: BridgeRequest, success: boolean, data?: unknown) {
    const response: BridgeResponse = {
      type: 'response',
      version: 1,
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      domain: request.domain,
      requestId: request.id,
      success,
      data: data ?? null,
      timestamp: Date.now(),
    };
    const escaped = JSON.stringify(response).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    this.config.sendToWebView(`window.SelfNativeBridge._handleResponse('${escaped}');true;`);
  }

  private sendError(request: BridgeRequest, code: string, message: string) {
    const response: BridgeResponse = {
      type: 'response',
      version: 1,
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      domain: request.domain,
      requestId: request.id,
      success: false,
      error: { code, message },
      timestamp: Date.now(),
    };
    const escaped = JSON.stringify(response).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    this.config.sendToWebView(`window.SelfNativeBridge._handleResponse('${escaped}');true;`);
  }
}
```

---

## Native Handlers

Each handler implements the same bridge protocol as the Kotlin SDK handlers. They wrap existing React Native libraries.

### NfcHandler.ts

```typescript
import NfcManager from 'react-native-nfc-manager';
import type { BridgeDomain } from '@selfxyz/webview-bridge';

export class NfcHandler {
  domain: BridgeDomain = 'nfc';
  private router: MessageRouter;

  constructor(router: MessageRouter) {
    this.router = router;
  }

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'scan':
        return this.scan(params);
      case 'cancelScan':
        await NfcManager.cancelTechnologyRequest();
        return null;
      case 'isSupported':
        return NfcManager.isSupported();
      default:
        throw { code: 'METHOD_NOT_FOUND', message: `Unknown NFC method: ${method}` };
    }
  }

  private async scan(params: Record<string, unknown>): Promise<unknown> {
    // Implementation uses the same NFC passport reader approach
    // as the existing Self Wallet app's NFC integration.
    // Bridges to the native NFC module, sends progress events
    // via this.router.pushEvent('nfc', 'scanProgress', { ... })

    // Detailed implementation depends on which RN NFC library
    // is chosen. The key contract: accept NfcScanParams, return
    // PassportScanResult matching the bridge protocol spec.
    throw { code: 'NOT_IMPLEMENTED', message: 'NFC scan not yet implemented' };
  }
}
```

### BiometricHandler.ts

```typescript
import ReactNativeBiometrics from 'react-native-biometrics';

export class BiometricHandler {
  domain: BridgeDomain = 'biometrics';
  private rnBiometrics = new ReactNativeBiometrics();

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'authenticate': {
        const reason = (params.reason as string) ?? 'Authenticate';
        const result = await this.rnBiometrics.simplePrompt({ promptMessage: reason });
        if (!result.success) {
          throw { code: 'BIOMETRIC_FAILED', message: 'Authentication failed' };
        }
        return true;
      }
      case 'isAvailable': {
        const { available } = await this.rnBiometrics.isSensorAvailable();
        return available;
      }
      case 'getBiometryType': {
        const { biometryType } = await this.rnBiometrics.isSensorAvailable();
        return biometryType ?? 'none';
      }
      default:
        throw { code: 'METHOD_NOT_FOUND', message: `Unknown biometrics method: ${method}` };
    }
  }
}
```

### KeychainHandler.ts

```typescript
import * as Keychain from 'react-native-keychain';

export class KeychainHandler {
  domain: BridgeDomain = 'secureStorage';

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    const key = params.key as string;
    if (!key) throw { code: 'MISSING_KEY', message: 'Key parameter required' };

    switch (method) {
      case 'get': {
        const credentials = await Keychain.getGenericPassword({ service: `self_sdk_${key}` });
        return credentials ? credentials.password : null;
      }
      case 'set': {
        const value = params.value as string;
        if (!value) throw { code: 'MISSING_VALUE', message: 'Value parameter required' };
        await Keychain.setGenericPassword(key, value, { service: `self_sdk_${key}` });
        return null;
      }
      case 'remove': {
        await Keychain.resetGenericPassword({ service: `self_sdk_${key}` });
        return null;
      }
      default:
        throw { code: 'METHOD_NOT_FOUND', message: `Unknown secureStorage method: ${method}` };
    }
  }
}
```

### CameraHandler.ts

```typescript
export class CameraHandler {
  domain: BridgeDomain = 'camera';

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'isAvailable':
        return true; // Camera availability checked at runtime
      case 'scanMRZ':
        // Implementation wraps a native camera module for MRZ detection.
        // The exact library depends on the host app's camera setup.
        throw { code: 'NOT_IMPLEMENTED', message: 'MRZ scan not yet implemented' };
      default:
        throw { code: 'METHOD_NOT_FOUND', message: `Unknown camera method: ${method}` };
    }
  }
}
```

### LifecycleHandler.ts

```typescript
import type { VerificationResult, SelfSdkError, VerificationRequest } from '../types';

interface LifecycleConfig {
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

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'ready':
        return null;

      case 'getConfig':
        return {
          verificationRequest: this.config.request,
          debug: this.config.debug,
          platform: 'react-native',
        };

      case 'dismiss':
        this.config.onCancelled();
        return null;

      case 'setResult': {
        const success = params.success as boolean;
        if (success) {
          this.config.onSuccess({
            success: true,
            userId: params.userId as string | undefined,
            verificationId: params.verificationId as string | undefined,
            proof: params.proof,
            claims: params.claims as Record<string, unknown> | undefined,
          });
        } else {
          this.config.onFailure({
            code: (params.errorCode as string) ?? 'UNKNOWN',
            message: (params.errorMessage as string) ?? 'Unknown error',
          });
        }
        return null;
      }

      default:
        throw { code: 'METHOD_NOT_FOUND', message: `Unknown lifecycle method: ${method}` };
    }
  }
}
```

### Handler Registry

```typescript
// handlers/index.ts
export function createHandlers(config: {
  request: VerificationRequest;
  onSuccess: (result: VerificationResult) => void;
  onFailure: (error: SelfSdkError) => void;
  onCancelled: () => void;
  debug: boolean;
  router: MessageRouter;
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

---

## Transport

The RN SDK uses `react-native-webview`'s built-in message passing:

| Direction | Mechanism |
|-----------|-----------|
| WebView -> Native | `window.ReactNativeWebView.postMessage(json)` -> `onMessage` prop |
| Native -> WebView | `webViewRef.injectJavaScript("window.SelfNativeBridge._handleResponse('...')")` |
| Native -> WebView (events) | `webViewRef.injectJavaScript("window.SelfNativeBridge._handleEvent('...')")` |

The `@selfxyz/webview-bridge` already detects `ReactNativeWebView` as a transport:
```typescript
// In webview-bridge's bridge.ts — transport detection
if (globalThis.ReactNativeWebView?.postMessage) {
  // React Native WebView transport
}
```

---

## Asset Bundling

### Production Build

The Vite output (`packages/webview-app/dist/`) is copied into the RN SDK's assets:

```bash
# Build script (in package.json or CI)
cp -r ../webview-app/dist/ ./assets/self-wallet/
```

On **Android**, the assets are loaded from `file:///android_asset/self-wallet/index.html` (React Native bundles files from `assets/` into the APK).

On **iOS**, use the asset catalog or `NSBundle.main`:
```typescript
const source = Platform.select({
  android: { uri: 'file:///android_asset/self-wallet/index.html' },
  ios: { uri: `${RNFS.MainBundlePath}/self-wallet/index.html` },
});
```

### Dev Mode

When `devServerUrl` is provided, the WebView loads from the Vite dev server:
```typescript
const source = devServerUrl
  ? { uri: devServerUrl }
  : Platform.select({ ... });
```

---

## Integration with Self Wallet

The Self Wallet app (`app/`) is the primary consumer of this package. Integration:

```tsx
// In Self Wallet's verification screen
import { SelfVerification } from '@selfxyz/rn-sdk';

function VerificationFlow({ selfApp, onComplete }) {
  return (
    <SelfVerification
      request={{
        userId: selfApp.userId,
        scope: selfApp.scope,
        disclosures: selfApp.disclosures,
      }}
      onSuccess={(result) => onComplete({ success: true, ...result })}
      onFailure={(error) => onComplete({ success: false, error })}
      onCancelled={() => navigation.goBack()}
      debug={__DEV__}
      devServerUrl={__DEV__ ? 'http://localhost:5173' : undefined}
    />
  );
}
```

---

## Chunking Guide

### Chunk 4A: Package Setup + Component Shell

**Goal**: Create `packages/rn-sdk/` with a working `<SelfVerification />` that loads the WebView.

**Steps**:
1. Create directory structure, `package.json`, `tsconfig.json`, `tsup.config.ts`
2. Implement `SelfVerification.tsx` — WebView wrapper with `onMessage` handling
3. Implement `MessageRouter.ts` — message routing (port from Kotlin pattern)
4. Implement `LifecycleHandler.ts` — `ready`, `getConfig`, `dismiss`, `setResult`
5. Validate: Component renders WebView, lifecycle messages flow

### Chunk 4B: Biometric + Keychain Handlers

**Goal**: Implement the two simplest handlers.

**Steps**:
1. Implement `BiometricHandler.ts` — wraps `react-native-biometrics`
2. Implement `KeychainHandler.ts` — wraps `react-native-keychain`
3. Test: Biometric prompt appears, keychain roundtrip works
4. Validate: Full bridge flow for biometrics and storage domains

### Chunk 4C: NFC + Camera Handlers

**Goal**: Implement hardware-dependent handlers.

**Steps**:
1. Implement `NfcHandler.ts` — wraps `react-native-nfc-manager` or custom native module
2. Implement `CameraHandler.ts` — wraps camera module for MRZ detection
3. Port NFC passport reading logic from `app/src/integrations/nfc/`
4. Test: Full passport scan on physical device
5. Validate: NFC progress events stream correctly to WebView

### Chunk 4D: Asset Bundling + Publishing

**Goal**: Bundle WebView assets and prepare for npm publishing.

**Steps**:
1. Set up build script to copy Vite output into `assets/`
2. Configure platform-specific asset loading (Android assets dir, iOS bundle)
3. Test: Production build loads bundled HTML correctly
4. Configure npm publishing pipeline
5. Validate: Install in fresh RN project, verify it works

---

## Testing

### Unit Tests

- MessageRouter: Routes messages to correct handler, returns responses
- LifecycleHandler: `getConfig` returns request, `setResult` calls callback
- BiometricHandler: Maps RN biometrics API to bridge responses
- KeychainHandler: Maps RN keychain API to bridge responses

### Device Tests

- WebView loads and renders verification screens
- Bridge messages flow: WebView request -> RN handler -> WebView response
- NFC scan on physical device (Android + iOS)
- Biometric prompt appears and completes
- `onSuccess` callback fires after full verification
- `onCancelled` callback fires when user dismisses

### Integration Test

1. Install `@selfxyz/rn-sdk` in Self Wallet app
2. Replace existing verification flow with `<SelfVerification />`
3. Full end-to-end: launch -> country -> ID -> camera -> NFC -> prove -> result
4. Verify callback fires with correct verification result

---

## Dependencies

- **SPEC-WEBVIEW-UI.md**: WebView app bundle (Vite output) — loaded inside the WebView
- **SPEC-PERSON3-SDK-CORE.md**: WebView engine (mobile-sdk-alpha) — runs inside WebView
- **SPEC-KMP-SDK.md**: Reference for handler contracts — RN handlers implement the same bridge protocol

---

## Key Reference Files

| File | Role |
|------|------|
| `packages/webview-bridge/src/types.ts` | Bridge protocol types (must match exactly) |
| `packages/kmp-sdk/shared/src/commonMain/.../MessageRouter.kt` | Kotlin MessageRouter (reference for JS port) |
| `packages/kmp-sdk/shared/src/androidMain/.../handlers/` | Android handler implementations (contract reference) |
| `app/src/integrations/nfc/` | Existing RN NFC integration (port to NfcHandler) |
| `packages/webview-app/dist/` | Vite output to bundle as assets |

---

## What's Left

*Updated: 2026-02-17 after PR #1765 review*

**Status: 0% implemented.** This spec was created in PR #1765 but no code was written for `packages/rn-sdk/`. The spec is complete and ready for implementation.

### Implementation Backlog

| Chunk | Description | Status | Dependencies |
|-------|-------------|--------|--------------|
| **4A** | Package setup + `<SelfVerification />` shell + `MessageRouter` + `LifecycleHandler` | **Not started** | SPEC-PERSON3-SDK-CORE Chunk 3F (web fallback adapters must exist for the WebView to work standalone) |
| **4B** | `BiometricHandler` + `KeychainHandler` | **Not started** | Chunk 4A |
| **4C** | `NfcHandler` + `CameraHandler` (hardware-dependent, requires physical device testing) | **Not started** | Chunk 4A |
| **4D** | Asset bundling (copy Vite output into `assets/`) + npm publishing config | **Not started** | Chunks 4A-4C + `webview-app` Vite build working |

### Pre-requisites from Other Specs

Before starting RN SDK implementation:

1. **`@selfxyz/webview-bridge`** must exist and export bridge protocol types (`BridgeRequest`, `BridgeResponse`, `BridgeEvent`, `BridgeDomain`). The RN SDK's `MessageRouter` imports from this package.
2. **`@selfxyz/webview-app`** must produce a working Vite build (`dist/index.html` + bundle). This is bundled as the WebView content.
3. **SPEC-PERSON3-SDK-CORE Chunk 3F** (web fallback adapters) should be complete so the WebView can handle documents/crypto/analytics without bridging to native for those capabilities.

### What Already Exists (from PR #1765)

The following pieces were implemented in `@selfxyz/mobile-sdk-alpha` (not in `rn-sdk`) and can be used by both the RN SDK's WebView engine and direct RN consumers:

- `createReactNativeAdapters()` factory — composes auth, crypto, documents, network, scanner adapters for RN hosts
- `VERIFICATION_COMPLETE` event — the RN SDK's `LifecycleHandler` will forward this to `onSuccess`/`onFailure` callbacks
- `SdkInitialConfig` + `VerificationRequest` types — used by `LifecycleHandler.getConfig()`
- Optional relay listener — the WebView inside `<SelfVerification />` won't use the relay socket; the host provides config directly via `lifecycle.getConfig()`
