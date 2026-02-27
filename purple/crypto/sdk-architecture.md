# SDK Architecture

## Overview

Three-layer architecture: platform-agnostic core SDK → WebView bridge protocol → native shells (React Native / KMP).

## Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│  Native Shell (rn-sdk or kmp-sdk)                    │
│  ├── Hosts WebView                                   │
│  ├── MessageRouter routes bridge requests            │
│  └── Handlers: NFC, Camera, Biometrics, Keychain     │
└──────────────────────┬───────────────────────────────┘
                       │ postMessage / evaluateJS
┌──────────────────────▼───────────────────────────────┐
│  WebView Bridge (webview-bridge)                     │
│  ├── JSON request/response/event protocol (v1)       │
│  ├── 10 bridge domains                               │
│  └── Transport detection: KMP iOS/Android, RN WebView│
└──────────────────────┬───────────────────────────────┘
                       │ adapter interfaces
┌──────────────────────▼───────────────────────────────┐
│  Core SDK (mobile-sdk-alpha)                         │
│  ├── SelfClient (created via createSelfClient())     │
│  ├── Adapter pattern (all platform code abstracted)  │
│  ├── XState proving machine                          │
│  └── Zustand state stores                            │
└──────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│  WebView App (webview-app)                           │
│  ├── React + React Router SPA                        │
│  ├── Vite build                                      │
│  └── Renders inside WebView                          │
└──────────────────────────────────────────────────────┘
```

## Adapter Pattern

The SDK requires adapters for all platform-specific operations. Core logic never imports platform-specific modules directly.

### Required Adapters

| Adapter | Interface | Purpose |
|---------|-----------|---------|
| `auth` | `AuthAdapter` | Private key access from secure storage |
| `scanner` | `NFCScannerAdapter` | NFC/MRZ document scanning |
| `network` | `NetworkAdapter` | HTTP + WebSocket (proving) |
| `crypto` | `CryptoAdapter` | Hashing and signing |
| `documents` | `DocumentsAdapter` | Document catalog persistence |
| `navigation` | `NavigationAdapter` | Screen routing (17 predefined routes) |

### Optional Adapters

| Adapter | Interface | Purpose |
|---------|-----------|---------|
| `analytics` | `AnalyticsAdapter` | Event tracking |
| `storage` | `StorageAdapter` | Key-value storage |
| `clock` | `ClockAdapter` | Time utilities |
| `logger` | `LoggerAdapter` | Structured logging |

## WebView Bridge Protocol

Message format (JSON over postMessage):

```
Request:  { type: 'request',  domain, method, params, id, timestamp }
Response: { type: 'response', domain, requestId, success, data/error, id, timestamp }
Event:    { type: 'event',    domain, event, data, id, timestamp }
```

### Bridge Domains (10)

| Domain | Methods |
|--------|---------|
| `nfc` | scan, cancelScan, isSupported |
| `biometrics` | authenticate, isAvailable, getBiometryType |
| `secureStorage` | get, set, remove |
| `camera` | scanMRZ, isAvailable |
| `crypto` | sign, generateKey, getPublicKey |
| `haptic` | trigger |
| `analytics` | trackEvent, trackNfcEvent, logNfcEvent |
| `lifecycle` | ready, dismiss, setResult |
| `documents` | loadCatalog, saveCatalog, loadById, save, delete |
| `navigation` | goBack, goTo |

### Transport Detection (Priority Order)

1. Android KMP: `globalThis.SelfNativeAndroid.postMessage()`
2. iOS KMP: `window.webkit.messageHandlers.SelfNativeIOS.postMessage()`
3. React Native WebView: `window.ReactNativeWebView.postMessage()`

## Package Build Strategy

- **mobile-sdk-alpha**: Dual ESM/CJS via tsup. Separate entry points for `react-native` and `browser` (package.json `exports` conditions)
- **webview-bridge**: Dual ESM/CJS via tsup
- **webview-app**: Vite bundle (loaded into WebView)
- **rn-sdk**: React Native package (hosts WebView + message router)

## DOs

- DO implement all 6 required adapters when creating a new native shell
- DO use `createSelfClient()` to initialize the SDK (validates adapters)
- DO use `createReactNativeAdapters()` as the factory for RN platforms
- DO keep all platform-specific code in `src/adapters/{platform}/`
- DO use the bridge protocol version constant (`BRIDGE_PROTOCOL_VERSION`)
- DO build new native features as bridge domain handlers, not direct native modules
- DO support AbortSignal in scanner adapters for user cancellation

## DON'Ts

- DON'T import `react-native` anywhere in `mobile-sdk-alpha/src/` except in `src/adapters/react-native/`
- DON'T add new platform-specific adapters without defining the interface in `types/public.ts` first
- DON'T bypass the bridge protocol for native communication
- DON'T persist private keys in the SDK — the app manages key lifecycle via `AuthAdapter`
- DON'T use web fallbacks for secure storage in production
- DON'T add new bridge domains without updating both the bridge schema and native handlers
