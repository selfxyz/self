# Person 1: WebView UI + Bridge — Workstream Overview

> Last updated: 2026-02-19
> Owner: Person 1 (WebView UI + Bridge)
> Project: [../SDK-OVERVIEW.md](../SDK-OVERVIEW.md)
> Implementation: [SPEC.md](./SPEC.md)
> Status: Active

## North Star

- **Goal:** Embed Self's identity verification into any host app with zero duplicated logic across platforms.
- **Success metric:** A host app calls `SelfSdk.launch(request)`, gets back a verified proof, and the entire flow runs inside a shared WebView.
- **Constraint:** NFC, camera, biometrics, and keychain are the ONLY things that touch native code. Everything else runs in the WebView.

## Status

- [x] Bridge protocol types and `WebViewBridge` class (62 tests pass)
- [x] Bridge adapters: NFC, auth, storage, lifecycle, crypto (sign + hash)
- [x] Web fallback adapters: IndexedDB documents, Web Crypto, console analytics, navigation, haptic
- [x] Mock transport (`MockNativeBridge`) for testing
- [x] Schema validation for bridge messages
- [x] All 10 screens built and routing works
- [x] BridgeProvider and SelfClientProvider wired
- [x] Biometrics bridge adapter wired in `SelfClientProvider`
- [x] Camera bridge adapter wired in `SelfClientProvider`
- [ ] Fallback wiring correctness gap remains:
  - `haptic` currently uses native bridge trigger instead of web no-op
  - `crypto` is hybrid (`hash` web, `sign` bridge) and needs explicit contract decision
- [ ] Dynamic proof request items are still hardcoded in `ProvingScreen`

## What You Own

- **`@selfxyz/webview-bridge`** — Bridge protocol library (public npm). Pure TypeScript, no react-native imports. Defines the JSON messaging protocol, `WebViewBridge` class, bridge adapters (NFC, auth, storage, lifecycle, crypto), and web fallback adapters (IndexedDB documents, Web Crypto hashing, console analytics).
- **`@selfxyz/webview-app`** — Vite-bundled React app (bundled into native SDKs). 10 screens, Tamagui UI, React Router, BridgeProvider, SelfClientProvider. The output of `vite build` is a single `dist/index.html` + JS bundle that ships to every host app.
- **Web fallback adapters** — IndexedDB for documents, Web Crypto for hashing, console/fetch for analytics, React Router for navigation, no-op for haptic. These run entirely in the browser with no bridge round-trip.
- **All 10 WebView screens** — Country picker, ID selection, document camera, NFC scan, confirm identification, proving, verification result, home, settings, coming soon.

## Architecture Context

You build the middle two layers: the bridge protocol library and the WebView UI. Native shells sit above you; the SDK engine sits below you.

```
┌──────────────────────────────────────────────────┐
│               NATIVE SHELLS (Person 2 / 5)       │
│  KMP (Android + iOS)  |  RN (react-native-webview)│
│  5 native handlers: NFC, Camera, Bio, Key, Life  │
└──────────────────────┬───────────────────────────┘
                       │  postMessage (JSON)
         ┌─────────────▼──────────────┐
         │  @selfxyz/webview-bridge   │  ◄── YOU BUILD THIS
         │  Bridge protocol + adapters │
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │  @selfxyz/webview-app      │  ◄── YOU BUILD THIS
         │  10 screens, providers,    │
         │  Vite bundle (dist/)       │
         └─────────────┬──────────────┘
                       │  imports adapters + hooks
         ┌─────────────▼──────────────┐
         │  @selfxyz/mobile-sdk-alpha │  (Person 4)
         │  Proving machine, stores,  │
         │  adapter interfaces        │
         └────────────────────────────┘
```

## Dependencies

| Direction     | Person / Package              | What                                                                    | Status                                     |
| ------------- | ----------------------------- | ----------------------------------------------------------------------- | ------------------------------------------ |
| **You need**  | Person 4 (`mobile-sdk-alpha`) | Adapter interfaces, `useSelfClient()` hook, color/font constants        | Active                                     |
| **You need**  | Person 2 (KMP / Swift shells) | Native handler implementations on the other side of the bridge          | Implemented (contract alignment follow-up) |
| **Needs you** | Person 2 (KMP / Swift shells) | Vite bundle (`dist/index.html` + JS) embedded into native SDK artifacts | Ready                                      |
| **Needs you** | Person 5 (RN SDK)             | Same Vite bundle loaded via `react-native-webview`                      | In progress                                |

## Key Decisions

| Decision                             | Choice                    | Rationale                                                         |
| ------------------------------------ | ------------------------- | ----------------------------------------------------------------- |
| No react-native in bridge            | Pure TypeScript           | Bridge works in any browser; RN alias lives only in Vite config   |
| Web-first, bridge only when forced   | Web APIs for 5/10 domains | Fewer round-trips, no native work for things the browser handles  |
| Single bundle, zero external fetches | Vite inlines everything   | `dist/` is self-contained; no CDN, no external scripts            |
| Screen parity with RN app            | Pixel-level match         | RN screens are the design reference; Tamagui + same fonts/colors  |
| Native handlers are dumb pipes       | Zero business logic       | Adapters serialize/deserialize; logic lives in `mobile-sdk-alpha` |

## Deliverables

| Deliverable                 | Type                                 | Consumers                                                         |
| --------------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| `@selfxyz/webview-bridge`   | Public npm package                   | `webview-app`, Person 2 (test mocks), Person 5                    |
| `@selfxyz/webview-app` dist | Vite bundle (`dist/index.html` + JS) | Person 2 (bundled into KMP SDK), Person 5 (loaded via RN WebView) |

## Related Specs

| Spec                                                                         | What it covers                                        |
| ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| [SPEC.md](./SPEC.md)                                                         | Implementation details, chunks, code changes, tests   |
| [../SDK-OVERVIEW.md](../SDK-OVERVIEW.md)                                     | Project-level architecture, bridge protocol, glossary |
| [../person2-native-shells/OVERVIEW.md](../person2-native-shells/OVERVIEW.md) | Native shells workstream — your bridge consumers      |
| [../person4-sdk-core/OVERVIEW.md](../person4-sdk-core/OVERVIEW.md)           | SDK core workstream — your adapter interface source   |
| [../person5-rn-sdk/OVERVIEW.md](../person5-rn-sdk/OVERVIEW.md)               | RN SDK workstream — loads your Vite bundle            |
