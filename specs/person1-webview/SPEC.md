# Person 1: WebView UI + Bridge — Implementation Spec

> Last updated: 2026-02-17
> Owner: Person 1 (WebView UI + Bridge)
> Parent: [OVERVIEW.md](./OVERVIEW.md)
> Status: Active

## North Star

- **Goal:** Embed Self's identity verification into any host app with zero duplicated logic across platforms.
- **Success metric:** A host app calls `SelfSdk.launch(request)`, gets back a verified proof, and the entire flow runs inside a shared WebView.
- **Constraint:** NFC, camera, biometrics, and keychain are the ONLY things that touch native code. Everything else runs in the WebView.

## Overview

You are building the **web side** of the Self Mobile SDK: the bridge protocol library (`@selfxyz/webview-bridge`) and the Vite-bundled React app (`@selfxyz/webview-app`) that runs inside a native WebView. This matters because every screen, adapter wire-up, and bridge message you implement becomes the single shared UI that ships to every host app — Kotlin, React Native, or otherwise. The output of `vite build` (a single `index.html` + JS bundle) gets bundled into the native SDK artifact.

## Prerequisites

- Familiarity with **Vite** (build tool, `vite.config.ts`, dev server, production builds)
- Familiarity with **Tamagui** (cross-platform UI kit, `createTamagui`, font config, `YStack`/`XStack`/`Text`/`View`)
- Familiarity with **React Router** (`BrowserRouter`, `Routes`, `Route`, `useNavigate`)
- Familiarity with the **bridge protocol** (JSON over `postMessage`, request/response/event lifecycle) — see [SDK-OVERVIEW.md](../SDK-OVERVIEW.md) "Shared Contracts / Protocols"
- **Adapter interfaces** are defined in `packages/mobile-sdk-alpha/src/types/public.ts` — read that file before implementing any adapter
- Read [SDK-OVERVIEW.md](../SDK-OVERVIEW.md) for architecture context

## The Problem

The Self Wallet is a monolithic React Native app where all logic, NFC, proving, and UI are tangled together. There is no way for third-party host apps (MiniPay, etc.) to embed the verification flow. We need a self-contained WebView bundle that:

1. Renders the full 10-screen verification flow
2. Bridges to native only for hardware/OS capabilities (NFC, camera, biometrics, keychain, lifecycle)
3. Provides web-native fallback adapters for everything the browser can handle (documents via IndexedDB, crypto hashing via Web Crypto, analytics via console/fetch)

| Area                       | Issue                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/webview-bridge/` | Implemented with current protocol/adapters and validated by tests (63 tests passing).                                                          |
| `packages/webview-app/`    | Screens built, routing works. Missing: biometrics + camera adapter wiring, web fallback adapters not all connected in SelfClientProvider.      |
| Web fallback adapters      | IndexedDB documents adapter, Web Crypto hashing adapter, and console analytics adapter exist in bridge package but need wiring in webview-app. |

## Design Principles

1. **No react-native imports in the bridge package.** `@selfxyz/webview-bridge` is pure TypeScript — it works in any browser environment. The `react-native-web` alias lives only in `webview-app`'s Vite config.
2. **Native handlers are dumb pipes.** Bridge adapters serialize/deserialize and call `bridge.request()`. Zero business logic lives in the native handler layer — that belongs in `mobile-sdk-alpha`.
3. **Web-first, bridge only when forced.** If the browser can do it (IndexedDB, Web Crypto, fetch, console), use the web API directly. Only NFC, camera, biometrics, keychain, and lifecycle cross the bridge.
4. **Single bundle, zero external fetches.** The Vite build inlines fonts and assets under 100KB. The output `dist/` folder is entirely self-contained — no CDN, no external scripts.
5. **Screen parity with the RN app.** Every WebView screen must match the corresponding RN app screen in layout, colors, fonts, and interaction patterns. Use the RN screens as pixel-level references.

## Definition of Done

> **Done when:** the `webview-app` Vite build produces a working `index.html` + bundle that renders all 10 screens, bridges to native for NFC/biometrics/keychain/lifecycle, and uses web fallback adapters for documents/crypto/analytics. The bridge package passes all tests (`vitest run`), the app type-checks (`tsc --noEmit`), and `vite build` succeeds with no errors.

## Scope of Work

This spec covers **two packages**:

| Package                    | npm Name                  | Type                              | Purpose                                                                                     |
| -------------------------- | ------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------- |
| `packages/webview-bridge/` | `@selfxyz/webview-bridge` | Public npm package                | Bridge protocol library: `WebViewBridge` class, adapters, mock transport, schema validation |
| `packages/webview-app/`    | `@selfxyz/webview-app`    | Private (bundled into native SDK) | Vite React app: 10 screens, providers, Tamagui UI, router, adapter wiring                   |

---

### 1. Bridge Protocol Types

**`packages/webview-bridge/src/types.ts`**

All protocol types for the bridge messaging layer. These are the canonical TypeScript definitions matching the JSON protocol in [SDK-OVERVIEW.md](../SDK-OVERVIEW.md).

```typescript
// SKELETON
export const BRIDGE_PROTOCOL_VERSION = 1;
export const DEFAULT_TIMEOUT_MS = 30_000;

export type BridgeDomain =
  | 'nfc'
  | 'biometrics'
  | 'secureStorage'
  | 'camera'
  | 'crypto'
  | 'haptic'
  | 'analytics'
  | 'lifecycle'
  | 'documents'
  | 'navigation';

export type BridgeMessageType = 'request' | 'response' | 'event';

export interface BridgeError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface BridgeRequest {
  type: 'request';
  version: number;
  id: string;
  domain: BridgeDomain;
  method: string;
  params: Record<string, unknown>;
  timestamp: number;
}

export interface BridgeResponse {
  type: 'response';
  version: number;
  id: string;
  domain: BridgeDomain;
  requestId: string;
  success: boolean;
  data?: unknown;
  error?: BridgeError;
  timestamp: number;
}

export interface BridgeEvent {
  type: 'event';
  version: number;
  id: string;
  domain: BridgeDomain;
  event: string;
  data: unknown;
  timestamp: number;
}

// Domain-specific method types
export type NfcMethod = 'scan' | 'cancelScan' | 'isSupported';
export type NfcEvent = 'scanProgress' | 'tagDiscovered' | 'scanError';
export type BiometricsMethod =
  | 'authenticate'
  | 'isAvailable'
  | 'getBiometryType';
export type SecureStorageMethod = 'get' | 'set' | 'remove';
export type CameraMethod = 'scanMRZ' | 'isAvailable';
export type CryptoMethod = 'sign' | 'generateKey' | 'getPublicKey';
export type HapticMethod = 'trigger';
export type AnalyticsMethod = 'trackEvent' | 'trackNfcEvent' | 'logNfcEvent';
export type LifecycleMethod = 'ready' | 'dismiss' | 'setResult';
export type DocumentsMethod =
  | 'loadCatalog'
  | 'saveCatalog'
  | 'loadById'
  | 'save'
  | 'delete';
export type NavigationMethod = 'goBack' | 'goTo';

// NFC-specific param/result types
export interface NfcScanParams {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  canNumber?: string;
  skipPACE?: boolean;
  skipCA?: boolean;
  extendedMode?: boolean;
  usePacePolling?: boolean;
  sessionId: string;
  useCan?: boolean;
  userId?: string;
}

export interface NfcScanProgress {
  step: string;
  percent: number;
  message?: string;
}

export interface BiometricAuthParams {
  reason: string;
  fallbackLabel?: string;
}

export interface VerificationResult {
  success: boolean;
  userId?: string;
  verificationId?: string;
  proof?: unknown;
  claims?: Record<string, unknown>;
  error?: BridgeError;
}
```

#### Input / Output

**Input (constructing a BridgeRequest):**

```typescript
const req: BridgeRequest = {
  type: 'request',
  version: 1,
  id: 'a1b2c3d4-...',
  domain: 'nfc',
  method: 'scan',
  params: {
    passportNumber: 'AB1234567',
    dateOfBirth: '900115',
    dateOfExpiry: '300115',
    sessionId: 'sess-uuid',
  },
  timestamp: Date.now(),
};
```

**Expected Output (JSON serialized):**

```json
{
  "type": "request",
  "version": 1,
  "id": "a1b2c3d4-...",
  "domain": "nfc",
  "method": "scan",
  "params": {
    "passportNumber": "AB1234567",
    "dateOfBirth": "900115",
    "dateOfExpiry": "300115",
    "sessionId": "sess-uuid"
  },
  "timestamp": 1708200000000
}
```

**Edge case — unknown domain:**

```
Input:  { domain: 'bluetooth' } as BridgeRequest
Output: Schema validation rejects — domain not in BridgeDomain union
```

---

### 2. WebViewBridge Class

**`packages/webview-bridge/src/bridge.ts`**

Core class managing the request/response lifecycle, event subscriptions, and transport auto-detection.

```typescript
// SKELETON
export class WebViewBridge {
  constructor(options?: { debug?: boolean });

  // Send request, await response (with timeout)
  request(
    domain: BridgeDomain,
    method: string,
    params: Record<string, unknown>,
    timeout?: number,
  ): Promise<unknown>;

  // Fire-and-forget (no pending promise)
  fire(
    domain: BridgeDomain,
    method: string,
    params: Record<string, unknown>,
  ): void;

  // Subscribe to native events, returns unsubscribe function
  on(
    domain: BridgeDomain,
    event: string,
    handler: (data: unknown) => void,
  ): () => void;

  // Called by native via window.SelfNativeBridge._handleResponse / _handleEvent
  handleMessage(json: string): void;

  // Reject all pending, clear listeners, remove global
  destroy(): void;
}
```

**Transport detection order:**

| Platform     | Check                                                            | Send method                                                     |
| ------------ | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Android      | `globalThis.SelfNativeAndroid?.postMessage`                      | `window.SelfNativeAndroid.postMessage(json)`                    |
| iOS          | `globalThis.webkit?.messageHandlers?.SelfNativeIOS?.postMessage` | `window.webkit.messageHandlers.SelfNativeIOS.postMessage(json)` |
| React Native | `globalThis.ReactNativeWebView?.postMessage`                     | `window.ReactNativeWebView.postMessage(json)`                   |

**Native to WebView callback:** All platforms call `window.SelfNativeBridge._handleResponse(json)` or `window.SelfNativeBridge._handleEvent(json)`.

#### Input / Output

**Input (bridge request for secure storage):**

```typescript
const value = await bridge.request('secureStorage', 'get', {
  key: 'self_private_key',
});
```

**Expected Output (bridge serializes, native responds):**

```json
{
  "type": "response",
  "version": 1,
  "id": "resp-uuid",
  "domain": "secureStorage",
  "requestId": "req-uuid",
  "success": true,
  "data": { "value": "base64-encoded-key-data" },
  "timestamp": 1708200001000
}
```

**Edge case — timeout (no native response within 30s):**

```
Input:  bridge.request('secureStorage', 'get', { key: 'missing' }, 5000)
Output: Promise rejects with Error("Bridge request timed out after 5000ms")
```

**Edge case — native returns error:**

```json
{
  "type": "response",
  "requestId": "req-uuid",
  "success": false,
  "error": { "code": "KEY_NOT_FOUND", "message": "No value for key 'missing'" }
}
```

---

### 3. Bridge Adapters (Native-Bound)

Each adapter factory takes a `WebViewBridge` instance and returns an object conforming to the corresponding `mobile-sdk-alpha` adapter interface. These adapters bridge to native because they require hardware/OS APIs.

#### 3a. NFC Scanner Adapter — `packages/webview-bridge/src/adapters/nfc-scanner.ts`

```typescript
// SKELETON
export function bridgeNFCScannerAdapter(bridge: WebViewBridge): NFCScannerAdapter {
  return {
    scan(opts: NfcScanParams & { signal?: AbortSignal }): Promise<PassportData>;
  };
}
export function onNfcProgress(bridge: WebViewBridge, handler: (progress: NfcScanProgress) => void): () => void;
```

- `scan(opts)`: Calls `bridge.request('nfc', 'scan', params, 120_000)` with 120s timeout
- Handles `AbortSignal` — if aborted, fires `nfc.cancelScan` and rejects
- Helper `onNfcProgress(bridge, handler)` subscribes to `nfc:scanProgress` events

#### Input / Output

**Input:**

```typescript
const data = await scanner.scan({
  passportNumber: 'AB1234567',
  dateOfBirth: '900115',
  dateOfExpiry: '300115',
  sessionId: 'sess-uuid',
});
```

**Expected Output:**

```json
{
  "passportData": {
    "mrz": "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<",
    "dsc": "-----BEGIN CERTIFICATE-----\nMIIC...",
    "dg1Hash": [72, 101, 108],
    "documentType": "passport",
    "parsed": true,
    "mock": false
  }
}
```

**Edge case — abort signal fired mid-scan:**

```
Input:  const ctrl = new AbortController(); scanner.scan({ ...opts, signal: ctrl.signal }); ctrl.abort();
Output: bridge.fire('nfc', 'cancelScan', {}) is called, promise rejects with AbortError
```

#### 3b. Auth Adapter — `packages/webview-bridge/src/adapters/auth.ts`

```typescript
export function bridgeAuthAdapter(bridge: WebViewBridge): AuthAdapter {
  return {
    getPrivateKey(): Promise<string | null>;
  };
}
```

- `getPrivateKey()`: Calls `bridge.request('secureStorage', 'get', { key: 'self_private_key', requireBiometric: true })`, returns `null` on error

#### 3c. Storage Adapter — `packages/webview-bridge/src/adapters/storage.ts`

```typescript
export function bridgeStorageAdapter(bridge: WebViewBridge): StorageAdapter {
  return {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
  };
}
```

Storage bridges to native because keychain access is managed by the host app. Some host apps (like MiniPay) have policies about WebView keychain access.

#### 3d. Biometrics Adapter — `packages/webview-bridge/src/adapters/biometrics.ts`

```typescript
export function bridgeBiometricsAdapter(bridge: WebViewBridge): BiometricsAdapter {
  return {
    authenticate(params: BiometricAuthParams): Promise<boolean>;
    isAvailable(): Promise<boolean>;
    getBiometryType(): Promise<string>;
  };
}
```

- `authenticate(params)`: Calls `bridge.request('biometrics', 'authenticate', { reason: params.reason })`, returns `true` on success
- `isAvailable()`: Calls `bridge.request('biometrics', 'isAvailable', {})`, returns boolean
- `getBiometryType()`: Calls `bridge.request('biometrics', 'getBiometryType', {})`, returns `"faceId"`, `"touchId"`, or `"none"`

##### Input / Output

**Input:**

```typescript
const result = await biometrics.authenticate({
  reason: 'Confirm your identity',
});
```

**Expected Output:**

```
true
```

**Edge case — user cancels biometric prompt:**

```
Input:  biometrics.authenticate({ reason: 'Confirm' })
Output: Promise rejects with BridgeHandlerException("BIOMETRIC_ERROR", "User cancelled")
```

**Edge case — biometrics not available (e.g., simulator):**

```
Input:  biometrics.isAvailable()
Output: false
```

#### 3e. Lifecycle Adapter — `packages/webview-bridge/src/adapters/lifecycle.ts`

```typescript
export function bridgeLifecycleAdapter(bridge: WebViewBridge): LifecycleAdapter {
  return {
    ready(): void;     // bridge.fire('lifecycle', 'ready', {})
    dismiss(): void;   // bridge.fire('lifecycle', 'dismiss', {})
    setResult(result: VerificationResult): Promise<void>; // bridge.request('lifecycle', 'setResult', result)
  };
}
```

- `ready()` and `dismiss()` are fire-and-forget
- `setResult(result)` awaits acknowledgement from native

---

### 4. Hybrid Adapters (Web APIs + Bridge Where Needed)

These adapters use standard web APIs where possible. `webCryptoAdapter` implements `hash()` via `crypto.subtle.digest` (no bridge) and `sign()` via `bridge.request('crypto', 'sign', ...)` (native keychain).

#### 4a. IndexedDB Documents Adapter — `packages/webview-bridge/src/adapters/documents.ts`

```typescript
export function indexedDBDocumentsAdapter(): DocumentsAdapter {
  const DB_NAME = 'self-documents';
  const STORE_NAME = 'documents';

  const openDB = () => new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return {
    loadDocumentCatalog(): Promise<DocumentCatalog | null>;
    saveDocumentCatalog(catalog: DocumentCatalog): Promise<void>;
    loadDocumentById(id: string): Promise<Document | null>;
    saveDocument(id: string, data: Document): Promise<void>;
    deleteDocument(id: string): Promise<void>;
  };
}
```

#### Input / Output

**Input:**

```typescript
await docs.saveDocument('passport-123', { mrz: '...', scannedAt: 1708200000 });
const doc = await docs.loadDocumentById('passport-123');
```

**Expected Output:**

```json
{ "mrz": "...", "scannedAt": 1708200000 }
```

**Edge case — load non-existent document:**

```
Input:  await docs.loadDocumentById('does-not-exist')
Output: null
```

#### 4b. Web Crypto Adapter — `packages/webview-bridge/src/adapters/crypto.ts`

```typescript
export function webCryptoAdapter(bridge: WebViewBridge): CryptoAdapter {
  return {
    hash(input: Uint8Array, algo: string): Promise<Uint8Array>;  // crypto.subtle.digest — pure web, no bridge
    sign(data: Uint8Array, keyRef: string): Promise<Uint8Array>; // bridge.request('crypto', 'sign', ...) — native keychain
  };
}
```

- `hash()` uses Web Crypto API (`crypto.subtle.digest`) — no bridge round-trip
- `sign()` encodes data as base64, calls `bridge.request('crypto', 'sign', { data, keyRef })`, decodes base64 result (key lives in native keychain)

#### 4c. Console Analytics Adapter — `packages/webview-bridge/src/adapters/analytics.ts`

```typescript
export function consoleAnalyticsAdapter(options?: { endpoint?: string }): AnalyticsAdapter {
  return {
    trackEvent(event: string, payload?: unknown): void;
    trackNfcEvent(name: string, properties?: Record<string, unknown>): void;
    logNFCEvent(level: string, message: string, context?: string, details?: unknown): void;
  };
}
```

- In dev mode (`import.meta.env.DEV`): logs to `console.log`
- In production with `endpoint`: fires `fetch(endpoint, ...)` — fire-and-forget
- Never blocks, never throws

#### 4d. Navigation Adapter — `packages/webview-bridge/src/adapters/navigation.ts`

```typescript
export function webNavigationAdapter(
  navigate: (path: string) => void,
  goBack: () => void,
): NavigationAdapter {
  return {
    goBack(): void;
    goTo(routeName: RouteName, params?: Record<string, unknown>): void;
  };
}
```

Route map:

```typescript
const routeMap: Record<RouteName, string> = {
  DocumentCamera: '/onboarding/camera',
  DocumentOnboarding: '/onboarding',
  CountryPicker: '/onboarding/country',
  IDPicker: '/onboarding/id-type',
  DocumentNFCScan: '/onboarding/nfc',
  ManageDocuments: '/documents',
  Home: '/',
  AccountVerifiedSuccess: '/account/verified',
  AccountRecoveryChoice: '/account/recovery',
  SaveRecoveryPhrase: '/account/recovery/phrase',
  ComingSoon: '/coming-soon',
  DocumentDataNotFound: '/error/no-data',
  Settings: '/settings',
};
```

#### 4e. Haptic Adapter — `packages/webview-bridge/src/adapters/haptic.ts`

```typescript
export function hapticAdapter(): HapticAdapter {
  return {
    trigger(type: string): void; // No-op in WebView
  };
}
```

---

### 5. MockNativeBridge

**`packages/webview-bridge/src/mock.ts`**

Test utility that implements `NativeTransport`. Intercepts outgoing messages, routes to registered mock handlers, and sends responses back.

```typescript
// SKELETON
export class MockNativeBridge {
  handle(
    domain: BridgeDomain,
    method: string,
    handler: (params: unknown) => unknown,
  ): void;
  handleWith(domain: BridgeDomain, method: string, data: unknown): void;
  handleWithError(
    domain: BridgeDomain,
    method: string,
    error: BridgeError,
  ): void;
  pushEvent(domain: BridgeDomain, event: string, data: unknown): void;
  get messages(): BridgeRequest[];
  messagesFor(domain: BridgeDomain): BridgeRequest[];
}
```

#### Input / Output

**Input:**

```typescript
const mock = new MockNativeBridge();
mock.handleWith('secureStorage', 'get', { value: 'test-key-data' });
const bridge = new WebViewBridge({ transport: mock });
const result = await bridge.request('secureStorage', 'get', { key: 'test' });
```

**Expected Output:**

```
result === { value: 'test-key-data' }
mock.messages.length === 1
mock.messagesFor('secureStorage').length === 1
```

---

### 6. Schema Validation

**`packages/webview-bridge/src/schema.ts`**

Validates incoming/outgoing bridge messages against the protocol.

```typescript
export function validateBridgeMessage(
  msg: unknown,
): msg is BridgeRequest | BridgeResponse | BridgeEvent;
export function validateRequest(msg: unknown): msg is BridgeRequest;
export function validateResponse(msg: unknown): msg is BridgeResponse;
export function validateEvent(msg: unknown): msg is BridgeEvent;
```

---

### 7. WebView App Shell

**`packages/webview-app/`** — Vite-bundled React app.

#### 7a. Vite Config — `packages/webview-app/vite.config.ts`

```typescript
import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tamaguiPlugin } from '@tamagui/vite-plugin';

export default defineConfig({
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'],
    alias: {
      'react-native': 'react-native-web',
      'lottie-react-native': 'lottie-react',
    },
  },
  plugins: [
    react(),
    tamaguiPlugin({
      config: resolve(__dirname, 'tamagui.config.ts'),
      components: ['tamagui'],
      enableDynamicEvaluation: true,
      excludeReactNativeWebExports: [
        'Switch',
        'ProgressBar',
        'Picker',
        'CheckBox',
        'Touchable',
      ],
      platform: 'web',
      optimize: true,
    }),
  ],
  define: { global: 'globalThis' },
  build: {
    target: ['chrome90', 'safari15'],
    rollupOptions: { output: { manualChunks: undefined } },
    assetsInlineLimit: 102400,
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: { host: '0.0.0.0', port: 5173 },
});
```

#### 7b. Tamagui Config — `packages/webview-app/tamagui.config.ts`

```typescript
import { createFont, createTamagui } from 'tamagui';
import { config } from '@tamagui/config/v3';

// Custom fonts: advercase, dinot, plexMono
// Custom sizes, lineHeights, letterSpacing scales
const appConfig = createTamagui({
  ...config,
  fonts: {
    ...config.fonts,
    advercase: advercaseFont,
    dinot: dinotFont,
    plexMono: plexMonoFont,
  },
});

export default appConfig;
```

Same config as `app/tamagui.config.ts`.

#### 7c. Font Setup

Copy `app/web/fonts/*.otf` into `packages/webview-app/public/fonts/`:

- `Advercase-Regular.otf`
- `DINOT-Medium.otf`
- `DINOT-Bold.otf`
- `IBMPlexMono-Regular.otf`

**`packages/webview-app/src/fonts.css`:**

```css
@font-face {
  font-family: 'Advercase-Regular';
  src: url('/fonts/Advercase-Regular.otf') format('opentype');
  font-display: swap;
}
@font-face {
  font-family: 'DINOT-Bold';
  src: url('/fonts/DINOT-Bold.otf') format('opentype');
  font-display: swap;
}
@font-face {
  font-family: 'DINOT-Medium';
  src: url('/fonts/DINOT-Medium.otf') format('opentype');
  font-display: swap;
}
@font-face {
  font-family: 'IBMPlexMono-Regular';
  src: url('/fonts/IBMPlexMono-Regular.otf') format('opentype');
  font-display: swap;
}
```

#### 7d. Entry Point — `packages/webview-app/src/main.tsx`

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { TamaguiProvider, View } from 'tamagui';
import tamaguiConfig from '../tamagui.config';
import { App } from './App';
import { BridgeProvider } from './providers/BridgeProvider';
import { SelfClientProvider } from './providers/SelfClientProvider';
import './fonts.css';
import './reset.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TamaguiProvider config={tamaguiConfig}>
      <View flex={1} height="100vh" width="100%">
        <BridgeProvider>
          <SelfClientProvider>
            <App />
          </SelfClientProvider>
        </BridgeProvider>
      </View>
    </TamaguiProvider>
  </React.StrictMode>,
);
```

#### 7e. Router — `packages/webview-app/src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

export const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/onboarding/country" element={<CountryPickerScreen />} />
      <Route path="/onboarding/id-type" element={<IDSelectionScreen />} />
      <Route path="/onboarding/camera" element={<DocumentCameraScreen />} />
      <Route path="/onboarding/nfc" element={<DocumentNFCScreen />} />
      <Route
        path="/onboarding/confirm"
        element={<ConfirmIdentificationScreen />}
      />
      <Route path="/proving" element={<ProvingScreen />} />
      <Route path="/proving/result" element={<VerificationResultScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="/account/verified" element={<VerificationResultScreen />} />
      <Route path="/coming-soon" element={<ComingSoonScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
```

#### 7f. BridgeProvider — `packages/webview-app/src/providers/BridgeProvider.tsx`

Creates a singleton `WebViewBridge` instance with debug logging in dev mode. Provides it via React context.

```tsx
const bridge = useMemo(
  () => new WebViewBridge({ debug: import.meta.env.DEV }),
  [],
);
```

#### 7g. SelfClientProvider — `packages/webview-app/src/providers/SelfClientProvider.tsx`

Creates all bridge adapters (mix of native-bound and web fallbacks), wires navigation to React Router, and signals `lifecycle.ready()` on mount.

```tsx
const adapters = {
  scanner: bridgeNFCScannerAdapter(bridge), // Bridge -> native NFC hardware
  crypto: webCryptoAdapter(bridge), // Hash: Web Crypto API, Sign: bridge -> native keychain
  auth: bridgeAuthAdapter(bridge), // Bridge -> native biometrics
  documents: indexedDBDocumentsAdapter(), // Web fallback: IndexedDB (no bridge)
  storage: bridgeStorageAdapter(bridge), // Bridge -> native keychain
  analytics: consoleAnalyticsAdapter(), // Web fallback: console.log / fetch (no bridge)
  navigation: webNavigationAdapter(navigate, goBack), // React Router (no bridge)
};
const lifecycle = bridgeLifecycleAdapter(bridge);

useEffect(() => {
  lifecycle.ready();
}, []);
```

---

### 8. Screens

All 10 screens use Tamagui components, import colors/fonts from `@selfxyz/mobile-sdk-alpha/constants`, and access SDK via `useSelfClient()` hook.

**Consistent patterns across all screens:**

```tsx
import {
  Text,
  View,
  YStack,
  XStack,
  ScrollView,
  Button,
  Spinner,
} from 'tamagui';
import { useNavigate } from 'react-router-dom';
import {
  black,
  white,
  slate300,
  slate500,
  amber50,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSelfClient } from '../../providers/SelfClientProvider';
```

- Header with back button (left arrow) and title
- `YStack flex={1} backgroundColor={white}` as page wrapper
- `fontFamily={dinot}` for all text
- `pressStyle={{ opacity: 0.7 }}` for tap feedback
- Bottom fixed action buttons
- `Spinner` from Tamagui for loading states

**Screen reference table:**

| WebView Screen              | RN App Reference                                                 | Key Elements                             |
| --------------------------- | ---------------------------------------------------------------- | ---------------------------------------- |
| CountryPickerScreen         | `app/src/screens/documents/selection/CountryPickerScreen.tsx`    | Search input, country list with flags    |
| IDSelectionScreen           | `app/src/screens/documents/selection/IDPickerScreen.tsx`         | Grid of ID document types                |
| DocumentCameraScreen        | `app/src/screens/documents/scanning/DocumentCameraScreen.tsx`    | MRZ camera view (calls `camera.scanMRZ`) |
| DocumentNFCScreen           | `app/src/screens/documents/scanning/DocumentNFCScanScreen.tsx`   | NFC scan progress, Lottie animation      |
| ConfirmIdentificationScreen | `app/src/screens/documents/selection/ConfirmBelongingScreen.tsx` | Document preview, confirm/retry          |
| ProvingScreen               | `app/src/screens/verification/ProveScreen.tsx`                   | Disclosure items list, verify button     |
| VerificationResultScreen    | `app/src/screens/onboarding/AccountVerifiedSuccessScreen.tsx`    | Success/failure with Lottie              |
| HomeScreen                  | `app/src/screens/home/HomeScreen.tsx`                            | Document cards, points section           |
| SettingsScreen              | `app/src/screens/account/settings/SettingsScreen.tsx`            | Settings list                            |
| ComingSoonScreen            | `app/src/screens/shared/ComingSoonScreen.tsx`                    | Placeholder                              |

---

### 9. Package Configs

#### Bridge package — `packages/webview-bridge/package.json`

```json
{
  "name": "@selfxyz/webview-bridge",
  "version": "0.0.1-alpha.1",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./mock": {
      "types": "./dist/mock.d.ts",
      "import": "./dist/mock.js",
      "require": "./dist/mock.cjs"
    },
    "./schema": {
      "types": "./dist/schema.d.ts",
      "import": "./dist/schema.js",
      "require": "./dist/schema.cjs"
    },
    "./adapters": {
      "types": "./dist/adapters.d.ts",
      "import": "./dist/adapters.js",
      "require": "./dist/adapters.cjs"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": { "uuid": "^11.1.0" },
  "devDependencies": {
    "@types/node": "^22.18.3",
    "tsup": "^8.0.1",
    "typescript": "^5.9.3",
    "vitest": "^2.1.8"
  },
  "packageManager": "yarn@4.12.0"
}
```

#### Bridge package — `packages/webview-bridge/tsup.config.ts`

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    mock: 'src/mock.ts',
    schema: 'src/schema.ts',
    adapters: 'src/adapters/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
});
```

#### WebView app — `packages/webview-app/package.json`

```json
{
  "name": "@selfxyz/webview-app",
  "version": "0.0.1-alpha.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@selfxyz/mobile-sdk-alpha": "workspace:^",
    "@selfxyz/webview-bridge": "workspace:^",
    "@tamagui/config": "1.126.14",
    "lottie-react": "^2.4.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-native-web": "^0.19.13",
    "react-router-dom": "^6.28.0",
    "tamagui": "1.126.14",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@tamagui/vite-plugin": "1.126.14",
    "@testing-library/react": "^14.1.2",
    "@types/react": "^18.3.4",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.9.3",
    "vite": "^6.1.0",
    "vitest": "^2.1.8"
  },
  "packageManager": "yarn@4.12.0"
}
```

---

## Files You Will Modify

| File                                                        | Change                                 | Risk                                                     |
| ----------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------- |
| `packages/webview-bridge/src/types.ts`                      | Add/update protocol types              | **Low** — pure type definitions                          |
| `packages/webview-bridge/src/bridge.ts`                     | Implement/maintain WebViewBridge class | **Med** — core transport logic, timeout handling         |
| `packages/webview-bridge/src/schema.ts`                     | Message validation                     | **Low** — validation helpers                             |
| `packages/webview-bridge/src/mock.ts`                       | MockNativeBridge for testing           | **Low** — test utility                                   |
| `packages/webview-bridge/src/adapters/*.ts`                 | All adapter factory implementations    | **Med** — must match mobile-sdk-alpha interfaces exactly |
| `packages/webview-bridge/src/__tests__/*.ts`                | Unit and integration tests             | **Low** — test files                                     |
| `packages/webview-bridge/package.json`                      | Package config, dependencies           | **Low** — config only                                    |
| `packages/webview-bridge/tsup.config.ts`                    | Build config                           | **Low** — config only                                    |
| `packages/webview-app/src/main.tsx`                         | Entry point wiring                     | **Med** — provider order matters                         |
| `packages/webview-app/src/App.tsx`                          | Route definitions                      | **Low** — route mapping                                  |
| `packages/webview-app/src/providers/BridgeProvider.tsx`     | Bridge singleton creation              | **Med** — lifecycle management                           |
| `packages/webview-app/src/providers/SelfClientProvider.tsx` | Adapter wiring, lifecycle.ready()      | **High** — must wire all adapters correctly              |
| `packages/webview-app/src/screens/**/*.tsx`                 | All 10 screen components               | **Med** — UI fidelity to RN app                          |
| `packages/webview-app/vite.config.ts`                       | Vite build config, aliases             | **Med** — wrong aliases break the build                  |
| `packages/webview-app/tamagui.config.ts`                    | Tamagui font/theme config              | **Low** — config only                                    |
| `packages/webview-app/src/fonts.css`                        | Font-face declarations                 | **Low** — CSS config                                     |
| `packages/webview-app/package.json`                         | Package config, dependencies           | **Low** — config only                                    |

## Files You Will NOT Modify

| File                               | Why                                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `packages/mobile-sdk-alpha/src/**` | Owned by Person 4 (SDK Core Adaptation). You consume its adapter interfaces and constants, never modify them.   |
| `packages/kmp-sdk/**`              | Owned by Person 2 (Kotlin/Swift Native Shells). You define the bridge protocol; they implement native handlers. |
| `packages/self-sdk-swift/**`       | Owned by Person 2. iOS Swift providers are their responsibility.                                                |
| `packages/rn-sdk/**`               | Owned by Person 5 (RN Native Shell). Does not exist yet.                                                        |
| `app/src/**`                       | Self Wallet app. Reference only for screen UI fidelity — never modify.                                          |
| `common/**`                        | Shared utilities. Production-stable, no changes needed.                                                         |

## Chunking Guide

### Chunk 1F: Bridge Package — L (~12k tokens)

**Goal:** Build the complete `@selfxyz/webview-bridge` package from scratch with all types, bridge class, adapters, mock, schema, and tests.

**You Will NOT:**

- Import anything from `react-native`
- Put business logic in adapter factories (they serialize/deserialize and call `bridge.request()`)
- Duplicate type definitions from `mobile-sdk-alpha` — import them

**Steps:**

1. Delete `packages/webview-bridge/` if it exists (prototype cleanup)
2. Create package structure: `package.json`, `tsconfig.json`, `tsup.config.ts`
3. Implement `src/types.ts` — all protocol types (BridgeDomain, BridgeRequest, BridgeResponse, BridgeEvent, domain-specific types)
4. Implement `src/bridge.ts` — WebViewBridge class (transport detection, request/response lifecycle, event subscriptions, timeout, destroy)
5. Implement `src/schema.ts` — message validation functions
6. Implement `src/mock.ts` — MockNativeBridge test utility
7. Implement all adapters in `src/adapters/`:
   - `nfc-scanner.ts` (bridge to native)
   - `auth.ts` (bridge to native)
   - `storage.ts` (bridge to native)
   - `lifecycle.ts` (bridge to native)
   - `documents.ts` (IndexedDB web fallback)
   - `crypto.ts` (hash: Web Crypto, sign: bridge)
   - `analytics.ts` (console/fetch web fallback)
   - `navigation.ts` (React Router, no bridge)
   - `haptic.ts` (no-op)
   - `index.ts` (re-exports)
8. Write tests in `src/__tests__/`: `bridge.test.ts`, `schema.test.ts`, `adapters.test.ts`
9. Validate: `cd packages/webview-bridge && yarn build && yarn vitest run && npx tsc --noEmit`

#### Input / Output — Chunk Validation

**Input:**

```bash
cd packages/webview-bridge && yarn build && yarn vitest run
```

**Expected Output:**

```
tsup: Build successful
 Tests  62 passed
```

```bash
npx tsc --noEmit
# Exit code 0, no errors
```

#### Tests

| Test                                  | Type        | What it validates                                         |
| ------------------------------------- | ----------- | --------------------------------------------------------- |
| `bridge.request() sends and resolves` | Unit        | Request/response lifecycle with mock transport            |
| `bridge.request() times out`          | Unit        | Timeout rejects pending promise after N ms                |
| `bridge.on() receives events`         | Unit        | Event subscription and dispatch                           |
| `bridge.destroy() rejects pending`    | Unit        | Cleanup rejects all in-flight requests                    |
| `schema.validateRequest()`            | Unit        | Rejects malformed messages                                |
| `adapters.nfc.scan()` with mock       | Integration | NFC adapter serializes params correctly, handles response |
| `adapters.nfc.scan()` abort           | Integration | AbortSignal fires cancelScan and rejects                  |
| `adapters.crypto.hash()`              | Unit        | Web Crypto API call produces correct digest               |
| `adapters.crypto.sign()`              | Integration | Sign bridges to native, base64 encode/decode              |
| `adapters.documents IndexedDB`        | Integration | CRUD operations with IndexedDB (requires jsdom/happy-dom) |
| `adapters.storage get/set/remove`     | Integration | Keychain bridge calls with mock                           |
| `adapters.lifecycle.ready()`          | Unit        | Fire-and-forget sends correct message                     |
| `adapters.analytics console`          | Unit        | Console logging in dev mode                               |

---

### Chunk 1B: Onboarding Screens — M (~8k tokens)

**Depends on:** Chunk 1F (bridge package must exist for type imports)

**Goal:** Build the 5 onboarding screens: CountryPicker, IDSelection, DocumentCamera, DocumentNFC, ConfirmIdentification.

**You Will NOT:**

- Import from `react-native` directly — use Tamagui components and the Vite `react-native-web` alias
- Duplicate state management logic from `mobile-sdk-alpha` — use `useSelfClient()` hook
- Hardcode colors/fonts — import from `@selfxyz/mobile-sdk-alpha/constants`

**Steps:**

1. Create `packages/webview-app/src/screens/onboarding/` directory
2. Implement `CountryPickerScreen.tsx` — search input, scrollable country list with flags
3. Implement `IDSelectionScreen.tsx` — grid of document types (passport, ID card, etc.)
4. Implement `DocumentCameraScreen.tsx` — MRZ camera view (calls `camera.scanMRZ` bridge)
5. Implement `DocumentNFCScreen.tsx` — NFC scan progress with Lottie animation, progress events
6. Implement `ConfirmIdentificationScreen.tsx` — document preview, confirm/retry buttons
7. Validate: all screens render without errors in `vite dev`

#### Input / Output — Chunk Validation

**Input:**

```bash
cd packages/webview-app && npx tsc --noEmit
```

**Expected Output:**

```
# Exit code 0, no type errors
```

**Input (manual):** Navigate to `http://localhost:5173/onboarding/country`

**Expected Output:** Country picker screen renders with search bar and scrollable country list.

#### Tests

| Test                                      | Type       | What it validates                      |
| ----------------------------------------- | ---------- | -------------------------------------- |
| CountryPickerScreen renders               | Unit (RTL) | Screen mounts, search input visible    |
| IDSelectionScreen renders                 | Unit (RTL) | Document type grid renders             |
| DocumentNFCScreen shows progress          | Unit (RTL) | Progress bar updates on bridge events  |
| ConfirmIdentificationScreen confirm/retry | Unit (RTL) | Button handlers fire correct callbacks |

---

### Chunk 1C: Proving + Result Screens — M (~6k tokens)

**Depends on:** Chunk 1F (bridge package)

**Goal:** Build the proving flow screens: ProvingScreen, VerificationResultScreen.

**You Will NOT:**

- Hardcode disclosure items — they should come from the SDK request (currently hardcoded, needs dynamic support later)
- Put proving logic in the screen — the proving machine lives in `mobile-sdk-alpha`

**Steps:**

1. Create `packages/webview-app/src/screens/proving/` directory
2. Implement `ProvingScreen.tsx` — disclosure items list, verify button, loading state
3. Implement `VerificationResultScreen.tsx` — success/failure state with Lottie, lifecycle.setResult()
4. Validate: screens render, verify button triggers proving flow

#### Input / Output — Chunk Validation

**Input (manual):** Navigate to `http://localhost:5173/proving`

**Expected Output:** Proving screen renders with disclosure items and verify button.

#### Tests

| Test                                        | Type       | What it validates                  |
| ------------------------------------------- | ---------- | ---------------------------------- |
| ProvingScreen renders disclosures           | Unit (RTL) | Disclosure items list is visible   |
| ProvingScreen verify button triggers action | Unit (RTL) | Click fires proving machine action |
| VerificationResultScreen success state      | Unit (RTL) | Shows success UI + Lottie          |
| VerificationResultScreen error state        | Unit (RTL) | Shows error message                |

---

### Chunk 1D: Remaining Screens — S (~4k tokens)

**Depends on:** Chunk 1F (bridge package)

**Goal:** Build HomeScreen, SettingsScreen, ComingSoonScreen.

**You Will NOT:**

- Build complex business logic for home screen — it shows document cards and a points section
- Build settings persistence — just render the settings list

**Steps:**

1. Create `packages/webview-app/src/screens/home/HomeScreen.tsx` — document cards, points section
2. Create `packages/webview-app/src/screens/account/SettingsScreen.tsx` — settings list
3. Create `packages/webview-app/src/screens/ComingSoonScreen.tsx` — placeholder
4. Validate: all three screens render

#### Input / Output — Chunk Validation

**Input (manual):** Navigate to `http://localhost:5173/`

**Expected Output:** Home screen renders with document cards section.

#### Tests

| Test                     | Type       | What it validates           |
| ------------------------ | ---------- | --------------------------- |
| HomeScreen renders       | Unit (RTL) | Document cards area visible |
| SettingsScreen renders   | Unit (RTL) | Settings list items visible |
| ComingSoonScreen renders | Unit (RTL) | Placeholder text visible    |

---

### Chunk 1E: WebView App Shell — M (~8k tokens)

**Depends on:** Chunk 1F (bridge), Chunks 1B-1D (screens)

**Goal:** Wire everything together: Vite config, Tamagui config, providers, router, fonts, entry point. `vite build` produces `dist/`.

**You Will NOT:**

- Install `react-native` as a direct dependency — use `react-native-web` with Vite alias
- Skip the `lifecycle.ready()` call on mount — native shells depend on it
- Import from `@selfxyz/webview-bridge` internals — use the public exports only

**Steps:**

1. Delete `packages/webview-app/` if it exists (prototype cleanup)
2. Create package structure: `package.json`, `vite.config.ts`, `tamagui.config.ts`, `tsconfig.json`, `index.html`
3. Copy fonts into `public/fonts/`
4. Create `src/fonts.css` and `src/reset.css`
5. Create `src/providers/BridgeProvider.tsx` — singleton bridge with debug mode
6. Create `src/providers/SelfClientProvider.tsx` — wire all adapters (bridge + web fallbacks), signal `lifecycle.ready()`
7. Create `src/main.tsx` — TamaguiProvider > BridgeProvider > SelfClientProvider > App
8. Create `src/App.tsx` — BrowserRouter with all routes
9. Validate: `npx vite dev` serves the app, `npx vite build` produces `dist/`

#### Input / Output — Chunk Validation

**Input:**

```bash
cd packages/webview-app && npx tsc --noEmit && npx vite build
```

**Expected Output:**

```
# tsc: exit code 0
vite v6.x.x building for production...
dist/index.html    X.XX kB
dist/assets/index-XXXXX.js    XXX.XX kB
```

**Input:**

```bash
ls packages/webview-app/dist/
```

**Expected Output:**

```
index.html  assets/
```

#### Tests

| Test                                       | Type       | What it validates                       |
| ------------------------------------------ | ---------- | --------------------------------------- |
| `vite build` succeeds                      | Build gate | Bundle compiles without errors          |
| `tsc --noEmit` passes                      | Build gate | No type errors across all files         |
| `dist/index.html` exists                   | Build gate | Output file is produced                 |
| BridgeProvider creates bridge              | Unit       | Context provides WebViewBridge instance |
| SelfClientProvider wires adapters          | Unit       | All 7 adapters created and provided     |
| SelfClientProvider calls lifecycle.ready() | Unit       | ready() fires on mount                  |

---

## Dependency Graph

```
Chunk 1F: Bridge Package (no deps — start here)
  |---> Chunk 1B: Onboarding Screens (after 1F)
  |---> Chunk 1C: Proving + Result Screens (after 1F)
  |---> Chunk 1D: Remaining Screens (after 1F)
  |
  '-------+------+------+
          |      |      |
          v      v      v
    Chunk 1E: WebView App Shell (after 1F + 1B + 1C + 1D)
```

## Completion Status

| Chunk | Description              | Size | Status                                                                                                               |
| ----- | ------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------- |
| 1F    | Bridge Package           | L    | **Done** — 63 tests pass, bridge package and adapters implemented                                                    |
| 1B    | Onboarding Screens       | M    | **Done** — all 5 screens render                                                                                      |
| 1C    | Proving + Result Screens | M    | **Done** — screens render, proving wired                                                                             |
| 1D    | Remaining Screens        | S    | **Done** — home, settings, coming-soon render                                                                        |
| 1E    | WebView App Shell        | M    | **In Progress** — providers wired, missing: biometrics adapter, camera wiring, some web fallback adapter connections |

## Validation Plan

```bash
# After every chunk (must pass):
cd packages/webview-bridge && yarn build && yarn vitest run && npx tsc --noEmit
cd packages/webview-app && npx tsc --noEmit

# After Chunk 1E (must pass):
cd packages/webview-app && npx vite build
ls packages/webview-app/dist/index.html  # file must exist

# After all chunks:
# 1. vite dev serves all 10 routes without console errors
# 2. vite build produces dist/ with index.html + bundle
# 3. Bridge package: 63+ tests pass
# 4. Manual: load dist/index.html in a WebView host (Android/iOS test app)
#    and confirm lifecycle.ready() fires, screens navigate, NFC scan starts
```

## Coordination Notes

- **Person 2 (Kotlin/Swift Native Shells):** They implement the native handlers that respond to your bridge requests. Coordinate on:
  - The iOS handler name is `SelfNativeIOS` (WKScriptMessageHandler). Confirm this matches their implementation.
  - Bridge domain methods must match exactly (e.g., `secureStorage.get` not `keychain.get`).
  - They will delete 4 handlers (documents, crypto, analytics, haptic) — those now run as web fallback adapters in your code.
- **Person 4 (SDK Core Adaptation):** They own `mobile-sdk-alpha`. You import adapter interfaces and constants from their package. If an adapter interface changes, your adapter factories must update. They are also building web fallback adapter implementations in `mobile-sdk-alpha` — coordinate to avoid duplication.
- **Person 5 (RN Native Shell):** They will wrap your Vite bundle in a `SelfVerification` React Native component. The same bridge protocol applies. Your React Native transport detection (`window.ReactNativeWebView.postMessage`) must work with their setup.
- **All:** The Vite build output (`dist/index.html` + bundle) is the artifact that Person 2 bundles into the KMP SDK and Person 5 loads via `react-native-webview`. Any breaking change to the build output affects everyone.

## Key Reference Files

| File                                                        | What to Look At                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `packages/mobile-sdk-alpha/src/types/public.ts`             | All adapter interfaces (NFCScannerAdapter, CryptoAdapter, StorageAdapter, etc.) — 457 lines |
| `packages/mobile-sdk-alpha/src/constants/colors.ts`         | Color constants used by all screens                                                         |
| `packages/mobile-sdk-alpha/src/constants/fonts.ts`          | Font constants (imports `Platform` from RN — needs web alias)                               |
| `packages/webview-bridge/src/bridge.ts`                     | Bridge core: request/response/event/destroy                                                 |
| `packages/webview-bridge/src/types.ts`                      | All bridge message types + domain enum                                                      |
| `packages/webview-app/src/providers/SelfClientProvider.tsx` | Where all 9 adapters are wired together                                                     |
| `app/src/providers/selfClientProvider.tsx`                  | Self Wallet's adapter wiring — reference for what yours should look like (507 lines)        |
| `app/tamagui.config.ts`                                     | Font config to replicate in webview-app                                                     |
| `app/web/fonts/`                                            | Source font files to copy into webview-app/public/fonts/                                    |

---

## Related Specs

| Spec                                                              | Audience | What it covers                                                  |
| ----------------------------------------------------------------- | -------- | --------------------------------------------------------------- |
| [SDK-OVERVIEW.md](../SDK-OVERVIEW.md)                             | All      | Architecture, bridge protocol, domain catalog, dependency graph |
| [person2-native-shells/SPEC.md](../person2-native-shells/SPEC.md) | Person 2 | Kotlin/Swift native shells, Android/iOS handlers                |
| [person4-sdk-core/SPEC.md](../person4-sdk-core/SPEC.md)           | Person 4 | SDK core adaptation, RN dep removal, web fallbacks              |
| [person5-rn-sdk/SPEC.md](../person5-rn-sdk/SPEC.md)               | Person 5 | RN native shell, `SelfVerification` component                   |

---

<!-- Everything below this line is filled in AFTER implementation. -->

## What Was Built

### Architecture (brief)

<!-- Added post-completion. Brief and factual. -->

### Deviations from Spec

| Spec said | We did | Why |
| --------- | ------ | --- |
|           |        |     |

### Key Files (final)

| File | Role |
| ---- | ---- |
|      |      |

### Lessons / Gotchas

- <!-- One-liner that would help the next person -->

---

## Follow-Up (Out of Scope)

| Item                                                               | Discovered during | Suggested spec                                                                  |
| ------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------- |
| Biometrics bridge adapter implementation                           | Chunk 1F          | This spec (adapter domain defined, no implementation yet)                       |
| Camera bridge adapter wiring in webview-app                        | Chunk 1E          | This spec (SelfClientProvider needs camera adapter)                             |
| Dynamic proof request items (currently hardcoded in ProvingScreen) | Chunk 1C          | New spec or this spec extension                                                 |
| MRZ data confirmation screen (PR #1767)                            | Chunk 1B          | PR #1767                                                                        |
| `createSelfClient(adapters)` integration                           | Chunk 1E          | Person 4 spec — once factory function is available, SelfClientProvider calls it |

## Spec Deviations

| Suggestion skipped                                    | Reason                                                                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| BEFORE/AFTER code blocks for every task               | This spec covers new file creation, not modifications to existing code. Skeleton + I/O format is more appropriate.         |
| Exact line-number references in "The Problem" section | The problem is architectural (monolithic RN app), not a specific line-of-code bug. Area-level references provided instead. |
| Per-screen BEFORE/AFTER diffs                         | Screens are new creations referencing RN app screens for fidelity. Screen reference table with RN paths provided instead.  |
