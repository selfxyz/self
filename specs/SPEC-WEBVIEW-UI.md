# Person 1: UI / WebView / Bridge — Implementation Spec

## Overview

You are building the **web side** of the Self Mobile SDK. This means:

1. **`packages/webview-bridge/`** — JS bridge protocol library (npm package `@selfxyz/webview-bridge`)
2. **`packages/webview-app/`** — Vite-bundled React app that runs inside a native WebView

The WebView is not just screens + bridge. It also provides **web-native fallback implementations** for capabilities that do not require native hardware or OS APIs. Specifically:

- **Documents**: CRUD via IndexedDB (no native bridge needed)
- **Crypto hashing**: `crypto.subtle.digest` via the Web Crypto API (signing still bridges to native for key access)
- **Analytics**: `console.log` / `fetch` directly (no native bridge needed)

Only capabilities that the browser literally cannot provide (NFC, camera, biometrics, lifecycle signals) plus keychain (host app policy) bridge to native. Everything else runs entirely in the WebView using standard web APIs.

The output of `vite build` (a single `index.html` + JS bundle) gets bundled into the native SDK artifact (KMP or RN). You don't need to worry about native code — just make sure the bridge protocol is correct, the screens work, and the web fallback adapters are wired correctly.

---

## What to Delete First

Delete these directories entirely before starting (they're from the previous prototype):

- `packages/webview-bridge/`
- `packages/webview-app/`

The prototype was useful for learning. The architecture and bridge protocol are sound. You're recreating them from scratch with proper structure.

---

## Package 1: `@selfxyz/webview-bridge`

### Purpose

TypeScript library that handles all communication between the WebView and native shell. Provides:

- `WebViewBridge` class — manages request/response lifecycle, event subscriptions, timeouts
- Bridge adapter factories — one per `mobile-sdk-alpha` adapter interface
- `MockNativeBridge` — test utility for unit/integration tests without native
- Protocol types and JSON schema validation

### Package Structure

```
packages/webview-bridge/
  src/
    types.ts                # Protocol types (BridgeDomain, BridgeRequest, etc.)
    bridge.ts               # WebViewBridge class
    schema.ts               # Message validation
    mock.ts                 # MockNativeBridge for testing
    adapters/
      # --- Bridge adapters (require native handler) ---
      nfc-scanner.ts        # NFCScannerAdapter → nfc.scan bridge (NFC hardware)
      auth.ts               # AuthAdapter → secureStorage.get with biometric (OS biometrics)
      storage.ts            # StorageAdapter → secureStorage.* bridge (native keychain)
      lifecycle.ts          # LifecycleAdapter → lifecycle.* bridge (host app communication)
      # --- Web fallback adapters (no native bridge calls) ---
      documents-web.ts      # IndexedDBDocumentsAdapter → IndexedDB for encrypted document CRUD
      crypto.ts             # WebCryptoAdapter: hash = Web Crypto API, sign = bridge (key access)
      analytics-web.ts      # ConsoleAnalyticsAdapter → console.log (dev) / fetch (prod)
      # --- Other adapters ---
      navigation.ts         # NavigationAdapter → React Router (no bridge, stays same)
      haptic.ts             # HapticAdapter → no-op (not critical, removed from bridge)
      index.ts              # Re-exports all adapters
    __tests__/
      bridge.test.ts        # WebViewBridge unit tests
      schema.test.ts        # Validation tests
      adapters.test.ts      # Adapter integration tests with MockNativeBridge
    index.ts                # Public exports
  package.json
  tsconfig.json
  tsup.config.ts
```

### package.json

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
  "dependencies": {
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.18.3",
    "tsup": "^8.0.1",
    "typescript": "^5.9.3",
    "vitest": "^2.1.8"
  },
  "packageManager": "yarn@4.12.0"
}
```

### tsup.config.ts

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

### Key Implementation Details

#### types.ts — Protocol Types

The existing prototype types are correct. Key types to implement:

```typescript
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

#### bridge.ts — WebViewBridge Class

The existing prototype is solid. Key behaviors:

1. **Constructor**: Auto-detects native transport (Android `SelfNativeAndroid`, iOS `webkit.messageHandlers.SelfNativeIOS`), registers `window.SelfNativeBridge` global
2. **`request(domain, method, params, timeout?)`**: Creates request with UUID, sets up pending promise with timeout, sends via transport
3. **`fire(domain, method, params)`**: Same as request but no pending promise (fire-and-forget)
4. **`on(domain, event, handler)`**: Subscribe to native events, returns unsubscribe function
5. **`handleMessage(json)`**: Called by native via `_handleResponse`/`_handleEvent`, dispatches to pending or listeners
6. **`destroy()`**: Rejects all pending, clears listeners, removes global

**Transport detection:**

```typescript
// Android
if (globalThis.SelfNativeAndroid?.postMessage) { ... }
// iOS
if (globalThis.webkit?.messageHandlers?.SelfNativeIOS?.postMessage) { ... }
// React Native
if (globalThis.ReactNativeWebView?.postMessage) { ... }
```

**Transport reference (from bridge protocol):**

| Platform     | WebView -> Native                                               | Native -> WebView                                                              |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Android      | `window.SelfNativeAndroid.postMessage(json)`                    | `evaluateJavascript("window.SelfNativeBridge._handleResponse(json)")`          |
| iOS          | `window.webkit.messageHandlers.SelfNativeIOS.postMessage(json)` | `evaluateJavaScript("window.SelfNativeBridge._handleResponse(json)")`          |
| React Native | `window.ReactNativeWebView.postMessage(json)`                   | `webViewRef.injectJavaScript("window.SelfNativeBridge._handleResponse(json)")` |

**Important:** The iOS handler name changed from the prototype. Person 2's spec says `SelfNativeIOS` as the WKScriptMessageHandler name. Make sure this matches.

#### Adapter Factories

Each adapter factory takes a `WebViewBridge` instance and returns an object conforming to the corresponding `mobile-sdk-alpha` adapter interface.

**NFC Scanner** (`nfc-scanner.ts`):

- `scan(opts)`: Calls `bridge.request('nfc', 'scan', params, 120_000)` with 120s timeout
- Handles `AbortSignal` — if aborted, fires `nfc.cancelScan` and rejects
- Helper `onNfcProgress(bridge, handler)` subscribes to `nfc:scanProgress` events

**Crypto** (`crypto.ts`):

- `hash(input, algo)`: Uses Web Crypto API (`crypto.subtle.digest`), no bridge round-trip
- `sign(data, keyRef)`: Encodes data as base64, calls `bridge.request('crypto', 'sign', { data, keyRef })`, decodes base64 result

**Auth** (`auth.ts`):

- `getPrivateKey()`: Calls `bridge.request('secureStorage', 'get', { key: 'self_private_key', requireBiometric: true })`, returns `null` on error

**Storage** (`storage.ts`) — bridge to native (keychain access is native-managed):

- `get(key)`: `bridge.request('secureStorage', 'get', { key })`
- `set(key, value)`: `bridge.request('secureStorage', 'set', { key, value })`
- `remove(key)`: `bridge.request('secureStorage', 'remove', { key })`

The `storage` adapter bridges to native because keychain access is managed by the host app. Some host apps (like MiniPay) have policies about WebView keychain access.

**Haptic** (`haptic.ts`) — no-op:

- `trigger(type)`: No-op (not critical for WebView). May optionally bridge to native if haptic feedback is desired.

#### Web Fallback Adapters

These adapters run **entirely in the WebView** with no native bridge calls. They use standard web APIs to provide the same interfaces that `mobile-sdk-alpha` expects.

**IndexedDBDocumentsAdapter** (`documents-web.ts`):
Uses IndexedDB for encrypted document CRUD. No bridge round-trip to native.

- `loadDocumentCatalog()`: Reads catalog from IndexedDB
- `saveDocumentCatalog(catalog)`: Writes catalog to IndexedDB
- `loadDocumentById(id)`: Reads document by key from IndexedDB
- `saveDocument(id, data)`: Writes document to IndexedDB
- `deleteDocument(id)`: Deletes document from IndexedDB

```typescript
// Implementation sketch
const DB_NAME = 'self-documents';
const STORE_NAME = 'documents';

export function indexedDBDocumentsAdapter(): DocumentsAdapter {
  const openDB = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  return {
    async loadDocumentCatalog() {
      const db = await openDB();
      // ... read from 'catalog' key
    },
    async saveDocumentCatalog(catalog) {
      /* ... */
    },
    async loadDocumentById(id) {
      /* ... */
    },
    async saveDocument(id, data) {
      /* ... */
    },
    async deleteDocument(id) {
      /* ... */
    },
  };
}
```

**WebCryptoAdapter** (`crypto.ts`):
Uses `crypto.subtle.digest` for hashing (no bridge round-trip). Signing still bridges to native because the private key lives in the native keychain.

- `hash(input, algo)`: `crypto.subtle.digest(algo, input)` — pure Web Crypto, no bridge
- `sign(data, keyRef)`: `bridge.request('crypto', 'sign', { data, keyRef })` — bridge to native (key access)

**ConsoleAnalyticsAdapter** (`analytics-web.ts`):
Logs to console in dev, fetches to analytics endpoint in prod. No bridge round-trip.

- `trackEvent(event, payload)`: `console.log(...)` in dev, `fetch(endpoint, ...)` in prod
- `trackNfcEvent(name, properties)`: Same pattern
- `logNFCEvent(level, message, context, details)`: Same pattern

```typescript
export function consoleAnalyticsAdapter(options?: {
  endpoint?: string;
}): AnalyticsAdapter {
  const isDev = import.meta.env?.DEV ?? true;
  const endpoint = options?.endpoint;

  const send = (event: string, data: unknown) => {
    if (isDev) {
      console.log(`[analytics] ${event}`, data);
    } else if (endpoint) {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data, timestamp: Date.now() }),
      }).catch(() => {}); // fire-and-forget
    }
  };

  return {
    trackEvent: (event, payload) => send(event, payload),
    trackNfcEvent: (name, properties) => send(`nfc.${name}`, properties),
    logNFCEvent: (level, message, context, details) =>
      send(`nfc.log.${level}`, { message, context, details }),
  };
}
```

**Navigation** (`navigation.ts`) — NO bridge round-trip, uses React Router:

- `goBack()`: Calls provided `goBack` callback
- `goTo(routeName, params)`: Maps `RouteName` to URL path, calls provided `navigate` callback

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

**Lifecycle** (`lifecycle.ts`):

- `ready()`: `bridge.fire('lifecycle', 'ready', {})`
- `dismiss()`: `bridge.fire('lifecycle', 'dismiss', {})`
- `setResult(result)`: `bridge.request('lifecycle', 'setResult', result)` — this one awaits

#### MockNativeBridge

Test utility that implements `NativeTransport`. Intercepts outgoing messages, routes to registered mock handlers, and sends responses back:

- `handle(domain, method, handler)`: Register a mock handler
- `handleWith(domain, method, data)`: Register a handler that returns a fixed value
- `handleWithError(domain, method, error)`: Register a handler that throws
- `pushEvent(domain, event, data)`: Simulate a native event
- `messages`: Get all sent messages for assertions
- `messagesFor(domain)`: Filter by domain

### Validation & Testing

```bash
cd packages/webview-bridge
npm run build         # tsup → dist/
npx vitest run        # unit tests
npx tsc --noEmit      # type-check
```

---

## Package 2: `@selfxyz/webview-app`

### Purpose

A private Vite-bundled React app that runs inside the native WebView. It:

1. Renders all screens using Tamagui
2. Wires screens to `mobile-sdk-alpha` via Zustand stores
3. Uses `@selfxyz/webview-bridge` adapters to connect SDK operations to native

### Package Structure

```
packages/webview-app/
  public/
    fonts/
      Advercase-Regular.otf     # Copy from app/web/fonts/
      DINOT-Medium.otf
      DINOT-Bold.otf
      IBMPlexMono-Regular.otf
  src/
    main.tsx                    # Entry point: TamaguiProvider, BridgeProvider, SelfClientProvider, Router
    App.tsx                     # React Router routes
    fonts.css                   # @font-face declarations
    reset.css                   # CSS reset
    providers/
      BridgeProvider.tsx        # Creates and provides WebViewBridge instance
      SelfClientProvider.tsx    # Creates adapters, wires to mobile-sdk-alpha, signals lifecycle.ready()
    screens/
      onboarding/
        CountryPickerScreen.tsx
        IDSelectionScreen.tsx
        DocumentCameraScreen.tsx
        DocumentNFCScreen.tsx
        ConfirmIdentificationScreen.tsx
      proving/
        ProvingScreen.tsx
        VerificationResultScreen.tsx
      home/
        HomeScreen.tsx
      account/
        SettingsScreen.tsx
      ComingSoonScreen.tsx
  tamagui.config.ts             # Shared Tamagui config (custom fonts)
  vite.config.ts
  tsconfig.json
  package.json
  index.html
```

### package.json

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

### vite.config.ts

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
    assetsInlineLimit: 102400, // Inline assets <100KB (fonts, small images)
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: { host: '0.0.0.0', port: 5173 },
});
```

### Key Files

#### main.tsx

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

#### App.tsx — Routes

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// Import all screen components...

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

#### BridgeProvider.tsx

Creates a singleton `WebViewBridge` instance with debug logging in dev mode. Provides it via React context.

```tsx
const bridge = useMemo(
  () => new WebViewBridge({ debug: import.meta.env.DEV }),
  [],
);
```

#### SelfClientProvider.tsx

Creates all bridge adapters, wires navigation to React Router, and signals `lifecycle.ready()` on mount.

```tsx
// Creates adapters — mix of bridge (native) and web fallbacks:
const adapters = {
  scanner: bridgeNFCScannerAdapter(bridge), // Bridge → native NFC hardware
  crypto: webCryptoAdapter(bridge), // Hash: Web Crypto API, Sign: bridge → native keychain
  auth: bridgeAuthAdapter(bridge), // Bridge → native biometrics
  documents: indexedDBDocumentsAdapter(), // Web fallback: IndexedDB (no bridge)
  storage: bridgeStorageAdapter(bridge), // Bridge → native keychain
  analytics: consoleAnalyticsAdapter(), // Web fallback: console.log / fetch (no bridge)
  navigation: webNavigationAdapter(navigate, goBack), // React Router (no bridge)
};
const lifecycle = bridgeLifecycleAdapter(bridge);

// Signals ready on mount:
useEffect(() => {
  lifecycle.ready();
}, []);
```

### Screen Design Pattern

Every screen uses Tamagui components, imports colors/fonts from `@selfxyz/mobile-sdk-alpha/constants`, and accesses SDK via `useSelfClient()` hook.

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

**Consistent patterns across screens:**

- Header with back button (left arrow `\u2190`) and title
- `YStack flex={1} backgroundColor={white}` as page wrapper
- `fontFamily={dinot}` for all text
- `pressStyle={{ opacity: 0.7 }}` for tap feedback
- Bottom fixed action buttons
- `Spinner` from tamagui for loading states

### Tamagui Config

Same as `app/tamagui.config.ts`:

```typescript
import { createFont, createTamagui } from 'tamagui';
import { config } from '@tamagui/config/v3';

// Custom sizes, lineHeights, letterSpacing scales
// Custom fonts: advercase, dinot, plexMono
const appConfig = createTamagui({
  ...config,
  fonts: {
    ...config.fonts,
    advercase: advercaseFont,
    dinot: dinotFont,
    plexMono: plexMonoFont,
  },
});
```

### Font Setup

Copy `app/web/fonts/*.otf` into `packages/webview-app/public/fonts/`.

CSS (`fonts.css`):

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

---

## Screen Reference (from existing RN app)

Use these existing app screens as UI reference for what the screens should look like and do:

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

## Chunking Guide (Claude Code Sessions)

### Chunk 1F: Bridge Package (start here — no dependencies)

**Goal:** Build `packages/webview-bridge/` from scratch.

**Steps:**

1. Delete `packages/webview-bridge/` if it exists
2. Create package structure (package.json, tsconfig, tsup.config)
3. Implement `types.ts` — all protocol types
4. Implement `bridge.ts` — WebViewBridge class
5. Implement `schema.ts` — validation
6. Implement `mock.ts` — MockNativeBridge
7. Implement all adapters in `adapters/`
8. Write tests
9. Validate: `npm run build && npx vitest run`

**Estimated effort:** This is the most self-contained chunk. All interfaces are defined in the spec above and in `packages/mobile-sdk-alpha/src/types/public.ts`.

### Chunk 1B-1D: Screens (after bridge, can be parallel)

**Goal:** Build all screen components in `packages/webview-app/src/screens/`.

Each screen should:

- Use Tamagui components (`Text`, `View`, `YStack`, `XStack`, `ScrollView`, `Button`, `Spinner`)
- Import colors/fonts from `@selfxyz/mobile-sdk-alpha/constants`
- Access SDK via `useSelfClient()` and `useBridge()` hooks
- Use `useNavigate()` from `react-router-dom` for navigation
- Reference the corresponding RN app screen for UI fidelity

### Chunk 1E: WebView App Shell (after bridge + screens)

**Goal:** Wire everything together in `packages/webview-app/`.

**Steps:**

1. Delete `packages/webview-app/` if it exists
2. Create package structure (package.json, vite.config, tamagui.config, index.html)
3. Copy fonts into `public/fonts/`
4. Create `main.tsx`, `App.tsx`, `fonts.css`, `reset.css`
5. Create `BridgeProvider.tsx`, `SelfClientProvider.tsx`
6. Wire all screens with React Router
7. Validate: `npx vite dev` serves the app, `npx vite build` produces `dist/`

---

## Important Notes

1. **No `react-native` dependency in bridge package.** The bridge is pure TypeScript, works in any browser.
2. **`react-native-web` is only in webview-app.** The Vite alias maps `react-native` → `react-native-web`.
3. **Fonts are inlined by Vite** when < 100KB (`assetsInlineLimit: 102400`). This means the built HTML+JS is self-contained.
4. **`mobile-sdk-alpha` is a workspace dependency.** Its `constants/colors.ts` and `constants/fonts.ts` are used directly (but `fonts.ts` imports `Platform` from react-native, so webview-app needs the `react-native-web` alias).
5. **The `SelfClientProvider` should eventually call `createSelfClient(adapters)`** from `mobile-sdk-alpha` once that function is available. For now, expose individual adapters directly (matching the prototype pattern).
6. **Web fallback adapters do NOT bridge to native.** Documents, crypto hashing, and analytics run entirely in the WebView using standard web APIs (IndexedDB, Web Crypto, fetch). They never send messages over the bridge protocol. Only NFC, camera, biometrics, keychain, and lifecycle require native handlers.
7. **Keychain stays native.** The `storage` adapter bridges to native because keychain access is managed by the host app. Some host apps (like MiniPay) have policies about WebView keychain access — the native shell decides how and whether to expose keychain.
8. **React Native transport.** In addition to Android (`SelfNativeAndroid`) and iOS (`SelfNativeIOS`) transports, the bridge supports React Native via `window.ReactNativeWebView.postMessage(json)` (WebView to native) and `webViewRef.injectJavaScript(...)` (native to WebView). The bridge auto-detects which transport is available.
