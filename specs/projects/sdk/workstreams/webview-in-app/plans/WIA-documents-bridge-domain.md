# WIA — Documents via the `documents` bridge domain

> Last updated: 2026-08-12
> Status: Ready

- Workstream: webview-in-app
- Owner: SDK / Platform
- Depends on: —
- Relates to: `WIA-APP-CUTOVER.md` blocker B2 (identity/document migration)

## Why

- webview-app stores documents by tunneling JSON through the `secureStorage` bridge domain
  (`createKeychainDocumentsAdapter`, keys `self_document_catalog` / `self_doc_*`), while the
  dedicated `documents` domain (rn-sdk `DocumentsHandler`) is dead code with an **in-memory
  default** — a partner app embedding `@selfxyz/rn-sdk` loses every captured document on
  restart unless it hand-implements the `documents` prop (neither example nor test app does).
- The Self app's WIA host (`app/src/screens/dev/WebViewHostScreen.tsx:82`) already implements
  the `documents` prop against the app's production keychain store (`documentCatalog` /
  `document-<contentHash>` via `passportDataProvider`). Routing webview-app's document I/O
  through the `documents` domain therefore makes the WebView operate on the app's **real**
  document store — existing users' documents appear with **no migration step**, eliminating
  the documents half of cutover blocker B2 (the mnemonic/secret half remains).

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| rn-sdk default store | Keychain-backed when `react-native-keychain` resolves; one-time-warn in-memory fallback otherwise | Partner apps must not silently lose documents; pure-JS tests and KMP shells must not break. No new capability field — `capabilities.secureStorage` already signals keychain availability (same module). |
| Keychain services | `self_docs_catalog` / `self_docs_doc_<id>` | NOT under `self_sdk_`: `KeychainHandler` maps arbitrary webview keys to `self_sdk_${key}`, so that namespace is collidable. The `doc_` infix keeps a document id (even the literal `catalog`) from ever colliding with the catalog service. Also disjoint from the app's own `documentCatalog` / `document-<hash>` services. |
| Catalog empty state | Native store returns `null`; web-side typed adapter normalizes `null`/malformed to `{ documents: [] }` | Preserves the existing `DocumentsHandler` contract (and the WIA host passthrough); mobile-sdk-alpha callers dereference `catalog.documents` unguarded, so normalization is fail-closed at the boundary. Pinned by tests on both sides. |
| `createKeychainDocumentsAdapter` | Deleted (not deprecated) | Both packages are 0.0.1-alpha workspace-consumed; no external consumers. |
| Orphaned `self_doc_*` secureStorage data | No migration | Dev-only data; nothing production shipped on that path. |
| `useKmpBridge` routing | Untouched | Its predicate matches `secureStorage` only; `DocumentsBridgeHandler.kt` exists only in kmp-sdk iosMain, so widening the predicate breaks Android KMP shells. Documents in flag-on prototypes persist via react-native-keychain instead of KMP keychain. Follow-up: KMP documents-handler parity. |

## Changes

PR 1 — rn-sdk (API-compatible):
- New `packages/rn-sdk/src/handlers/KeychainDocumentsStore.ts` —
  `createKeychainDocumentsStore(keychain?)`: `DocumentsStore | null`; values stored as JSON
  strings in generic-password keychain entries; corrupted or missing entries load as `null`;
  delete is idempotent.
- `DocumentsHandler` default: `store ?? createKeychainDocumentsStore() ?? warnOnce(inMemory)`.
- JSDoc update on `SelfVerification`'s `documents` prop.

PR 2 — webview-bridge + webview-app (atomic):
- `createBridgeDocumentsSdkAdapter(bridge): DocumentsAdapter` — typed wrapper over the raw
  `bridgeDocumentsAdapter` with catalog normalization.
- `sdk-adapter-map.ts` swaps to it; `keychain-documents.ts` deleted.
- `SelfClientProvider` stops constructing a second adapter; screens unchanged.
- `KeychainDebugScreen` drops the stale `self_document_catalog` raw key.
- Test harness `renderWithBridge` gains default `documents`-domain handlers; fixture test pins
  the app's `DocumentCatalog` shape through normalization (B2 schema-compatibility pin).

## Risks

- **Release coupling**: the rn-sdk npm release whose embedded webview bundle contains PR 2 must
  also contain PR 1's store, or partner defaults regress to non-persistent.
- **Android keychain item size** for real passport payloads (~50 KB) via react-native-keychain —
  verify on-device with a real chip read + relaunch before release.

## Acceptance

1. Example app without a `documents` prop: capture → force-kill → relaunch → document persists
   (fails today).
2. WIA dev build: WebView-onboarded document appears in the native app's document list; native
   documents appear on the WebView home (B2 acceptance).
3. All three package validations green; no residual references to
   `createKeychainDocumentsAdapter` / `self_document_catalog` / `self_doc_`.
