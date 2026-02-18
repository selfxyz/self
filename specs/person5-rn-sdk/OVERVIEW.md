# Person 5: RN Native Shell — Workstream Overview

> Last updated: 2026-02-17
> Owner: Person 5 (RN SDK)
> Project: [../SDK-OVERVIEW.md](../SDK-OVERVIEW.md)
> Implementation: [SPEC.md](./SPEC.md)
> Status: Draft

## North Star

- **Goal:** Embed Self's identity verification into any host app with zero duplicated logic across platforms.
- **Success metric:** A host app calls `SelfSdk.launch(request)`, gets back a verified proof, and the entire flow runs inside a shared WebView.
- **Constraint:** NFC, camera, biometrics, and keychain are the ONLY things that touch native code. Everything else runs in the WebView.

## What You Own

- **`@selfxyz/rn-sdk`** — the React Native SDK package (does not exist yet)
- **`<SelfVerification />`** component (~200-300 LOC) — the single public API surface
- **5 native handler bridges** — NFC, Camera, Biometrics, Keychain, Lifecycle (thin wrappers around RN native modules)
- **Asset bundling** — Vite bundle loaded into `react-native-webview` on iOS + Android via `Platform.select`

## Architecture Context

You are building a thin React Native wrapper that hosts the exact same WebView as Person 2's Kotlin/Swift shell. Same bridge protocol, same Vite bundle, different native shell.

```
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

| Direction     | Person / Package              | What                                                  | Status      |
| ------------- | ----------------------------- | ----------------------------------------------------- | ----------- |
| **You need**  | Person 1 (`webview-app`)      | Vite bundle (`dist/`) — same one KMP uses             | In progress |
| **You need**  | Person 4 (`webview-bridge`)   | Bridge protocol types (`@selfxyz/webview-bridge`)     | In progress |
| **You need**  | Person 2 (`kmp-sdk`)          | Handler pattern as reference (same bridge contract)   | In progress |
| **Needs you** | Self Wallet app               | `<SelfVerification />` for verification flow (Phase 2)| Not started |

## Status

- [ ] Package scaffolding (`packages/rn-sdk/`, `package.json`, tsconfig, tsup)
- [ ] `<SelfVerification />` component with `react-native-webview`
- [ ] `MessageRouter` dispatching bridge messages to handlers
- [ ] 5 native handler bridges (NFC, Camera, Biometrics, Keychain, Lifecycle)
- [ ] Asset bundling (Vite bundle into iOS + Android via `Platform.select`)
- [ ] Integration test with Self Wallet app
- [ ] npm publish (`@selfxyz/rn-sdk`)

**Overall: 0%** — package does not exist yet. This is Phase 2 work, blocked until Persons 1-4 deliver Phase 1.

## Key Decisions

| Decision                          | Choice                                  | Rationale                                                              |
| --------------------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| Package size                      | Thin wrapper (~200-300 LOC)             | All logic lives in the WebView engine. Native shell is pure glue.      |
| Bridge protocol                   | Same as KMP                             | WebView must not know which shell it runs in. One protocol, two shells.|
| Native module dependency strategy | All as `peerDependencies`               | Host app installs and links. Avoids version conflicts and duplicate native code. |
| Asset loading                     | `Platform.select` for Android vs iOS    | Android uses `file:///android_asset/`, iOS uses `MainBundlePath`.      |
| State management                  | No state beyond routing                 | MessageRouter dispatches and returns. No caching, retrying, or transforming. |

## Deliverables

| Deliverable                    | Type        | Consumers                              |
| ------------------------------ | ----------- | -------------------------------------- |
| `@selfxyz/rn-sdk`             | npm package | Self Wallet app, third-party RN hosts  |
| `<SelfVerification />` component | React component | Any RN app embedding verification  |

## Related Specs

| Spec                                                           | What it covers                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| [SPEC.md](./SPEC.md)                                           | Implementation details, chunks, code changes               |
| [../SDK-OVERVIEW.md](../SDK-OVERVIEW.md)                       | Project-level architecture, bridge protocol, glossary      |
| [../person1-webview/SPEC.md](../person1-webview/SPEC.md)       | WebView UI + bridge (delivers your Vite bundle)            |
| [../person2-native-shells/SPEC.md](../person2-native-shells/SPEC.md) | KMP native shell (reference handler pattern)         |
| [../person4-sdk-core/SPEC.md](../person4-sdk-core/SPEC.md)     | SDK core adaptation (delivers bridge types you import)     |
