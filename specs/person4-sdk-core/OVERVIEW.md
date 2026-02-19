# Person 4: SDK Core Adaptation — Workstream Overview

> Last updated: 2026-02-19
> Owner: Person 4 (SDK Core)
> Project: [../SDK-OVERVIEW.md](../SDK-OVERVIEW.md)
> Implementation: [SPEC.md](./SPEC.md)
> Status: Active

## North Star

- **Goal:** Embed Self's identity verification into any host app with zero duplicated logic across platforms.
- **Success metric:** A host app calls `SelfSdk.launch(request)`, gets back a verified proof, and the entire flow runs inside a shared WebView.
- **Constraint:** NFC, camera, biometrics, and keychain are the ONLY things that touch native code. Everything else runs in the WebView.

## Status

- [x] 275+ tests passing
- [x] React Native adapters built and working
- [x] Config & Platform Abstraction (Chunk 4A — Done)
- [x] Browser Entry Point & Package Exports (Chunk 4B — Done)
- [x] WebView Lifecycle Events (Chunk 4C — Done)
- [x] Conditional SelfApp Store (Chunk 4E — Done)
- [x] Web Fallback Adapter Implementations (Chunk 4F — Done)
- [ ] Duplicate fallback ownership remains unresolved (`mobile-sdk-alpha` vs `webview-bridge`)
- [ ] Final contract for web-only fallback vs bridge routing (crypto/haptic behavior) still needs explicit decision

## What You Own

- **`@selfxyz/mobile-sdk-alpha`** — the WebView engine (proving machine, stores, adapters, document management).
- **Browser entry point** (`src/browser.ts`) — the import path for WebView consumers, with zero `react-native` transitive imports.
- **Web fallback adapter implementations** — IndexedDB for documents, Web Crypto for hashing, console/fetch for analytics.
- **Platform abstraction** for the adapter interfaces — making the engine portable across React Native and browser/WebView contexts.

## Architecture Context

You own the SDK engine layer. It sits below Person 1's WebView UI and above the shared utilities. Your job is to make this engine work identically in both React Native and browser/WebView contexts.

```
┌──────────────────────────────────────┐
│         Person 1: WebView UI         │
│     (webview-app, screens, router)   │
│                                      │
│  Consumes: useSelfClient(), stores,  │
│  proving machine, adapter interfaces │
└──────────────────┬───────────────────┘
                   │
    ╔══════════════╧═══════════════╗
    ║  Person 4: SDK Engine (YOU)  ║
    ║   (mobile-sdk-alpha)         ║
    ║                              ║
    ║  Proving machine (XState)    ║
    ║  Document store (Zustand)    ║
    ║  Adapter interfaces          ║
    ║                              ║
    ║  Two entry points:           ║
    ║  ├─ src/index.ts (RN)        ║
    ║  └─ src/browser.ts (WebView) ║
    ║                              ║
    ║  Web fallback adapters:      ║
    ║  ├─ IndexedDB (documents)    ║
    ║  ├─ Web Crypto (hash)        ║
    ║  └─ console/fetch (analytics)║
    ╚══════════════╤═══════════════╝
                   │
    ┌──────────────┴───────────────┐
    │     Shared Utilities         │
    │  (common/)                   │
    │  Poseidon, Merkle, MRZ, certs│
    └──────────────────────────────┘
```

## Dependencies

| Direction     | Person / Package | What                                                                        | Status      |
| ------------- | ---------------- | --------------------------------------------------------------------------- | ----------- |
| **You need**  | Nobody           | Your work is independent in Phase 1                                         | Ready       |
| **Needs you** | Person 1         | Adapter interfaces, core logic (`useSelfClient()`, stores, proving machine) | In progress |
| **Needs you** | Person 2         | Web fallback adapters to confirm which bridge domains are unnecessary       | Pending     |
| **Needs you** | Person 5         | Browser entry point working in RN WebView context                           | Pending     |

## Key Decisions

| Decision                          | Choice                   | Rationale                                                          |
| --------------------------------- | ------------------------ | ------------------------------------------------------------------ |
| Adapter interface design          | Keep as-is               | Already right — don't redesign, just remove platform contamination |
| Keychain / SecureStorage          | Always bridges to native | Security boundary — host app controls access                       |
| Documents, crypto hash, analytics | Web fallback adapters    | Eliminates unnecessary bridge round-trips                          |
| Proving machine + adapter arch    | Don't refactor           | They work — you are removing contamination, not redesigning        |
| `@selfxyz/common` issues          | Out of scope             | If Buffer or Node-specific issues exist, file separately           |

## Deliverables

| Deliverable                                               | Type                | Consumers                                 |
| --------------------------------------------------------- | ------------------- | ----------------------------------------- |
| `@selfxyz/mobile-sdk-alpha` (clean browser entry)         | npm package         | Person 1 (webview-app), Person 5 (rn-sdk) |
| Web fallback adapters (documents, crypto hash, analytics) | Source (in package) | Person 1 (SelfClientProvider wiring)      |

## Related Specs

| Spec                                                                         | What it covers                                        |
| ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| [SPEC.md](./SPEC.md)                                                         | Implementation details, chunks, code changes          |
| [../SDK-OVERVIEW.md](../SDK-OVERVIEW.md)                                     | Project-level architecture, bridge protocol, glossary |
| [../person1-webview/OVERVIEW.md](../person1-webview/OVERVIEW.md)             | WebView UI — your primary consumer                    |
| [../person2-native-shells/OVERVIEW.md](../person2-native-shells/OVERVIEW.md) | Native shells — consumes your web fallback signals    |
| [../person5-rn-sdk/OVERVIEW.md](../person5-rn-sdk/OVERVIEW.md)               | RN SDK — consumes your browser entry point            |
