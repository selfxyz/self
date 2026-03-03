# Person 2: Native Shells (KMP SDK + Swift Providers) — Workstream Overview

> Last updated: 2026-02-23
> Owner: Person 2 (Native Shells)
> Project: [../SDK-OVERVIEW.md](../SDK-OVERVIEW.md)
> Implementation: [SPEC.md](./SPEC.md)
> Status: Active

## North Star

- **Goal:** Embed Self's identity verification into any host app with zero duplicated logic across platforms.
- **Success metric:** A host app calls `SelfSdk.launch(request)`, gets back a verified proof, and the entire flow runs inside a shared WebView.
- **Constraint:** NFC, camera, biometrics, and keychain are the ONLY things that touch native code. Everything else runs in the WebView.

## Status

- [x] KMP module structure with `expect`/`actual` pattern
- [x] Android WebView host + Activity
- [x] Android handlers: NFC, Camera, Biometrics, Keychain, Lifecycle (5 of 5)
- [x] Bridge message routing (`MessageRouter`)
- [x] Delete 4 unnecessary Android handlers (documents, crypto, analytics, haptic — 511 LOC)
- [x] iOS Swift providers are implemented and wired (NFC, Biometrics, Lifecycle, WebView host + additional providers)
- [x] `SelfSdk.launch()` flow is implemented on iOS
- [x] Shared KMP validation baseline captured (`:shared:compileKotlinIosSimulatorArm64` + `:shared:jvmTest` successful)
- [ ] KMP test app validation on both platforms remains a follow-up validation task
- [x] Platform asymmetry contract documented and signed off (iOS 9-handler superset vs Android 5-handler core set)
- [x] MiniPay sample integration is wired (`SelfSdk.launch()` call path present)

## What You Own

- `packages/kmp-sdk/` — Kotlin Multiplatform SDK (Android + iOS targets)
- `packages/self-sdk-swift/` — Swift companion package for iOS providers
- Android native handlers (NFC, Camera, Biometrics, Keychain, Lifecycle)
- iOS native handlers (via Swift provider pattern — no cinterop)
- `SelfSdk.launch()` public API for host apps
- WebView hosting (Android `WebView` + iOS `WKWebView`)

## Architecture Context

You build the native shells that sit between the host app and the bridge protocol. Your code hosts the WebView, intercepts bridge messages, and routes them to platform APIs.

```
┌──────────────────────────────────────────────────┐
│                   HOST APP                        │
│          (MiniPay / Self Wallet / etc.)           │
│                                                   │
│  SelfSdk.launch(request, callback)                │
└────────────────────┬─────────────────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │    YOUR LAYER (Person 2)        │
    │                                 │
    │  ┌───────────┐  ┌────────────┐  │
    │  │  Android   │  │   iOS      │  │
    │  │  kmp-sdk   │  │  kmp-sdk + │  │
    │  │  (Kotlin)  │  │  Swift pkg │  │
    │  └─────┬─────┘  └──────┬─────┘  │
    │        │  Android: 5    │        │
    │        │  iOS: 9 *      │        │
    │  NFC · Camera · Biometrics      │
    │  Keychain · Lifecycle           │
    │        │               │        │
    │  ┌─────▼───────────────▼─────┐  │
    │  │   WebView Host            │  │
    │  │   (loads Person 1 bundle) │  │
    │  └─────────────┬─────────────┘  │
    └────────────────┼────────────────┘
                     │ JSON postMessage
    ┌────────────────▼────────────────┐
    │    BRIDGE PROTOCOL (Person 1)   │
    │    webview-bridge               │
    └────────────────┬────────────────┘
                     │
    ┌────────────────▼────────────────┐
    │    WEBVIEW UI (Person 1)        │
    │    webview-app Vite bundle      │
    └─────────────────────────────────┘

* iOS implementation now registers 9 handlers (NFC, Camera, Biometrics, SecureStorage, Lifecycle, Documents, Crypto, Analytics, Haptic); Android remains focused on 5 core native handlers. This asymmetry is now explicitly accepted as a compatibility superset contract: Android is the normative minimum, iOS extra handlers must remain behavior-compatible and non-authoritative for web-fallback domains.
```

## Dependencies

| Direction     | Person / Package | What                                                | Status       |
| ------------- | ---------------- | --------------------------------------------------- | ------------ |
| **You need**  | Person 1         | Vite bundle (`dist/`) loaded into your WebView      | In progress  |
| **You need**  | Person 1         | Bridge protocol types (`@selfxyz/webview-bridge`)   | Ready        |
| **Needs you** | Person 5         | Bridge protocol as reference for RN handler pattern | Ready        |
| **Needs you** | Integrations     | `SelfSdk.launch()` API consumed by MiniPay sample   | Android done |

## Key Decisions

| Decision                      | Choice                | Rationale                                                                        |
| ----------------------------- | --------------------- | -------------------------------------------------------------------------------- |
| cinterop for Apple frameworks | **Disabled**          | Xcode SDK compatibility issues. All Apple calls go through Swift providers.      |
| 4 extra Android handlers      | **Delete**            | Web fallbacks replace them (IndexedDB, Web Crypto, console/fetch, skip haptic)   |
| iOS provider pattern          | **Swift factory**     | Swift protocols injected into KMP iOS handlers at init time                      |
| Swift async bridging          | **Callback-based**    | Swift closures dispatch to main queue; Kotlin uses `suspendCancellableCoroutine` |
| WebView bundle location       | **Bundled in assets** | Person 1's Vite output (`dist/`) copied into app assets at build time            |

## Deliverables

| Deliverable            | Type        | Consumers                         |
| ---------------------- | ----------- | --------------------------------- |
| KMP SDK artifact       | AAR         | Android host apps (MiniPay)       |
| XCFramework            | XCFramework | iOS host apps                     |
| `SelfSdk.launch()` API | Public API  | Any host app calling verification |
| Swift provider package | SPM package | iOS host apps (companion to KMP)  |

## Related Specs

| Spec                                                                       | What it covers                                                  |
| -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [SPEC.md](./SPEC.md)                                                       | Implementation details, chunks, code changes                    |
| [../SDK-OVERVIEW.md](../SDK-OVERVIEW.md)                                   | Project-level architecture, bridge protocol, glossary           |
| [../person1-webview/OVERVIEW.md](../person1-webview/OVERVIEW.md)           | WebView UI + bridge — delivers the Vite bundle you host         |
| [../person4-sdk-core/OVERVIEW.md](../person4-sdk-core/OVERVIEW.md)         | SDK core adaptation — delivers adapter interfaces you implement |
| [../person5-rn-sdk/OVERVIEW.md](../person5-rn-sdk/OVERVIEW.md)             | RN native shell — mirrors your bridge pattern for React Native  |
| [../person3-integrations/OVERVIEW.md](../person3-integrations/OVERVIEW.md) | MiniPay sample — first consumer of your `SelfSdk.launch()` API  |
