# Person 5: RN Native Shell — Workstream Overview

> Last updated: 2026-02-17
> Owner: Person 5 (RN SDK)
> Project: [../SDK-OVERVIEW.md](../SDK-OVERVIEW.md)
> Implementation: [SPEC.md](./SPEC.md)
> Status: Active

## North Star

- **Goal:** Embed Self's identity verification into any host app with zero duplicated logic across platforms.
- **Success metric:** A host app calls `SelfSdk.launch(request)`, gets back a verified proof, and the entire flow runs inside a shared WebView.
- **Constraint:** NFC, camera, biometrics, and keychain are the ONLY things that touch native code. Everything else runs in the WebView.

## Status

- [ ] Package scaffolding (`packages/rn-sdk/`, `package.json`, tsconfig, tsup)
- [ ] `SelfVerification` component with `react-native-webview`
- [ ] `MessageRouter` dispatching bridge messages to handlers
- [ ] 5 native handler bridges (NFC, Camera, Biometrics, Keychain, Lifecycle)
- [ ] Asset bundling (Vite bundle into iOS + Android via `Platform.select`)
- [ ] Integration test with Self Wallet app
- [ ] npm publish (`@selfxyz/rn-sdk`)

**Overall: 0%** — package does not exist yet. This is Phase 2 work, blocked until Persons 1-4 deliver Phase 1.

## What You Own

- **`@selfxyz/rn-sdk`** — the React Native SDK package (does not exist yet)
- **`SelfVerification`** component (~200-300 LOC) — the single public API surface
- **5 native handler bridges** — NFC, Camera, Biometrics, Keychain, Lifecycle (thin wrappers around RN native modules)
- **Asset bundling** — Vite bundle loaded into `react-native-webview` on iOS + Android via `Platform.select`

## Architecture Context

You are building a thin React Native wrapper that hosts the exact same WebView as Person 2's Kotlin/Swift shell. Same bridge protocol, same Vite bundle, different native shell.

```text
┌─────────────────────────────────────────┐
│           HOST APP (React Native)       │
│        (Self Wallet / third-party)      │
│                                         │
│  <SelfVerification                      │
│    userId="..."                         │
│    disclosures={[...]}                  │
│    onComplete={handleResult}            │
│  />                                     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  ★ YOUR LAYER: @selfxyz/rn-sdk         │
│  (~200-300 LOC total)                   │
│                                         │
│  SelfVerification.tsx                   │
│    └─ react-native-webview              │
│         ├─ onMessage → MessageRouter    │
│         └─ injectJavaScript ← responses │
│                                         │
│  MessageRouter.ts                       │
│    ├─ NfcHandler      (rn-nfc-manager)  │
│    ├─ CameraHandler   (rn-camera)       │
│    ├─ BiometricsHandler(rn-biometrics)  │
│    ├─ KeychainHandler (rn-keychain)     │
│    └─ LifecycleHandler(props callbacks) │
└──────────────┬──────────────────────────┘
               │ postMessage (JSON)
               │ Same bridge protocol as KMP
┌──────────────▼──────────────────────────┐
│  SHARED WEBVIEW (Person 1 + 4)          │
│  Vite bundle: webview-app + engine      │
│  Same dist/ loaded by KMP and RN shells │
└─────────────────────────────────────────┘
```

The WebView does not know which native shell it is running inside. Your handlers implement the same domain/method/params contract as the Kotlin handlers.

## Dependencies

| Direction     | Person / Package            | What                                                | Status      |
| ------------- | --------------------------- | --------------------------------------------------- | ----------- |
| **You need**  | Person 1 (`webview-app`)    | Vite bundle (`dist/`) — same one KMP uses           | In progress |
| **You need**  | Person 1 (`webview-bridge`) | Bridge protocol types (`@selfxyz/webview-bridge`)   | In progress |
| **You need**  | Person 2 (`kmp-sdk`)        | Handler pattern as reference (same bridge contract) | In progress |
| **Needs you** | Self Wallet app             | `SelfVerification` for verification flow (Phase 2)  | Not started |

## Design Principles

1. **Thin wrapper only.** The RN SDK is ~200-300 LOC. All logic lives in the WebView engine (`mobile-sdk-alpha`). If you're writing business logic in this package, you're doing it wrong.
2. **Same bridge protocol as KMP.** The RN handlers implement the exact same domain/method/params contract as the Kotlin handlers. The WebView does not know which native shell it's running in.
3. **Peer dependencies for native modules.** Every React Native native module is a `peerDependency`. The host app installs and links them. This avoids version conflicts and duplicate native code.
4. **No state beyond routing.** The `MessageRouter` dispatches messages and returns responses. It does not cache, retry, or transform data. Handlers are stateless wrappers around native libraries.

## Key Decisions

| Decision                          | Choice                               | Rationale                                                                                             |
| --------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Package size                      | Thin wrapper (~200-300 LOC)          | All logic lives in the WebView engine. Native shell is pure glue.                                     |
| Bridge protocol                   | Same as KMP                          | WebView must not know which shell it runs in. One protocol, two shells.                               |
| Native module dependency strategy | All as `peerDependencies`            | Host app installs and links. Avoids version conflicts and duplicate native code.                      |
| Asset loading                     | `Platform.select` for Android vs iOS | Android uses `file:///android_asset/`, iOS path TBD (see Chunk 5D).                                   |
| State management                  | No state beyond routing              | MessageRouter dispatches and returns. No caching, retrying, or transforming.                          |
| iOS asset loading                 | Decision deferred to Chunk 5D        | Options: `react-native-fs` (adds peer dep) vs RN `require()` with Metro config. Needs device testing. |

## Deliverables

| Deliverable                  | Type            | Consumers                             |
| ---------------------------- | --------------- | ------------------------------------- |
| `@selfxyz/rn-sdk`            | npm package     | Self Wallet app, third-party RN hosts |
| `SelfVerification` component | React component | Any RN app embedding verification     |

## Related Specs

| Spec                                                                         | What it covers                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [SPEC.md](./SPEC.md)                                                         | Implementation details, chunks, code changes                              |
| [../SDK-OVERVIEW.md](../SDK-OVERVIEW.md)                                     | Project-level architecture, bridge protocol, glossary                     |
| [../person1-webview/OVERVIEW.md](../person1-webview/OVERVIEW.md)             | WebView UI + bridge workstream (delivers your Vite bundle + bridge types) |
| [../person2-native-shells/OVERVIEW.md](../person2-native-shells/OVERVIEW.md) | KMP native shell workstream (reference handler pattern)                   |
| [../person3-integrations/OVERVIEW.md](../person3-integrations/OVERVIEW.md)   | Integration samples (MiniPay — validates the SDK)                         |
| [../person4-sdk-core/OVERVIEW.md](../person4-sdk-core/OVERVIEW.md)           | SDK core workstream (delivers adapter interfaces)                         |
