# Chrome Extension Disclosure Spike - Implementation Spec

> Last updated: 2026-07-29
> Owner: Remi Colin
> Project: [SDK Overview](../../OVERVIEW.md)
> Status: Spike validated 2026-07-27 (real-device QA: transfer, custody, multi-document). Production scoping continues in [PRODUCTION.md](./PRODUCTION.md) and [UX.md](./UX.md)

## North Star

- **Goal:** A user who registered a document in the Self app (NFC scan or KYC flow) transfers their account (secret + documents) to a Chrome extension, then generates real disclosure proofs from the browser, triggered by a relying-party web page.
- **Success demo:** A demo website asks "prove you are 18+", the extension pops up, the user approves, a real proof is generated in the TEE, and the demo backend verifies it with `SelfBackendVerifier`. Nothing in the proving chain is mocked.
- **Constraint:** Spike quality is acceptable for packaging/tooling, but not for the security-critical path: transfer encryption, at-rest encryption, and origin checks use real crypto with fail-closed defaults.

## Why this is feasible (research summary)

- Proof generation does not run on-device. The client builds circuit inputs in pure TS (`@selfxyz/common/utils/circuits`), encrypts them (ECDH P-256 + AES-256-GCM, `common/src/utils/proving.ts`) and submits to a TEE over WebSocket. The orchestrator (`packages/mobile-sdk-alpha/src/proving/provingMachine.ts`) is platform-agnostic and the SDK ships a `/browser` entry point with browser adapters.
- `packages/webview-app` is a Vite SPA built with `base: './'`, so it loads from `chrome-extension://` URLs. It already has an embed mode: verification request via URL query params (`src/utils/verificationRequest.ts`), consent at `/disclose/request`, proving at `/disclose/generating`, result via `lifecycle.setResult`. Self-app mode provides the home/documents screens.
- The bridge (`packages/webview-bridge`) auto-detects a `NativeTransport`. The extension injects one before the app bundle loads and implements a small handler set; document storage in webview-app maps entirely onto `secureStorage.get/set/remove` (keys `self_document_catalog`, `self_doc_<id>`, `self_private_key`, `self_mnemonic`).
- Relying-party protocol reuse: the extension joins the socket.io relayer as `clientType: 'mobile'` with the page's `sessionId` (`packages/mobile-sdk-alpha/src/stores/selfAppStore.tsx`), so the website side (`@selfxyz/qrcode`) and backend verification work unchanged.
- The one genuinely new protocol piece: documents are never exported today. Every existing backup path (iCloud/Drive, Turnkey, recovery phrase) carries only the mnemonic; `documentCatalog` + `document-{contentHash}` live only in the device keychain.

## Decisions (locked 2026-07-21)

| Decision | Choice |
| --- | --- |
| Account transfer | QR handshake: extension displays `{transferSessionId, ephemeral ECDH public key}`; mobile scans, E2E-encrypts `{mnemonic, documentCatalog, documents[]}`, sends through the existing websocket relayer |
| Extension UI surface | Popup window (`chrome.windows.create`, ~430x800) hosting the webview-app build; also openable from the toolbar icon |
| Site -> extension trigger | Tiny postMessage shim SDK; page builds config with standard `SelfAppBuilder`; content script relays to background; extension joins relayer as the mobile client |
| Document scope | Category-agnostic: passport, EU ID, Aadhaar, KYC all transfer and disclose (shared proving machine, no special-casing) |
| Custody at rest | Password-encrypted: key derived via WebCrypto (PBKDF2/scrypt), AES-GCM over secret + documents in `chrome.storage.local`; session key in `chrome.storage.session`; unlock screen per session. Optional passkey (Touch ID) unlock added 2026-07-27: vault key wrapped under a WebAuthn PRF-derived KEK (`rpId: self.xyz`, allowed on extension pages via host_permissions since Chrome 122; PRF needs Chrome 132+/macOS 15). Password stays as fallback; PRF secret never stored. Lost-password reset on the unlock screen wipes the vault (meta, entries, passkey wrap, session key) behind an explicit confirm and returns to the link page for re-import |
| Extension UI scope | Mini home (documents list, link state, reusing self-app mode screens) + embed disclose flow |
| Demo depth | Demo frontend + real backend verify endpoint using `SelfBackendVerifier` from `@selfxyz/core`, staging environment |
| Placement | `packages/chrome-extension/` + `packages/extension-demo/`, feature branch off `dev`; mobile entry point is a dev-gated "Link browser extension" screen |

## Architecture

### 1. Account transfer (mobile -> extension)

New protocol, same primitives as the TEE handshake (`elliptic` P-256 ECDH + AES-256-GCM from `@selfxyz/common`):

1. Extension generates an ephemeral P-256 keypair and a `transferSessionId` (uuid), joins the relayer room, and renders a QR: `self-ext-link://{transferSessionId, extensionPublicKey}` (also shown as copyable text for emulator dev).
2. Mobile dev-gated screen scans the QR with the existing scanner, shows a confirm sheet listing what will be sent, then loads `{mnemonic}` from keychain service `secret` and all documents via `loadDocumentCatalogDirectlyFromKeychain` / `loadDocumentByIdDirectlyFromKeychain`.
3. Mobile derives a shared key (ephemeral mobile keypair x extension public key), encrypts the payload AES-256-GCM, and emits it through the relayer room. Relayer never sees plaintext; the extension key never leaves the extension.
4. Extension decrypts, validates shape (`DocumentCatalog`, `IDDocument` guards from `@selfxyz/common`), prompts for a custody password, encrypts at rest, and writes through the same `secureStorage` keys webview-app expects.
5. Both ends render a short authentication string - 4 emojis from `sha256('self-ext-link-sas-v1' || sharedSecret)` mapped over a 64-emoji table (`@selfxyz/mobile-sdk-alpha/utils/sas`, shared by the app screen and the extension) - so the user can visually confirm the keys agree. The check happens BEFORE any secret moves: on scan the phone emits a hello (ephemeral public key only) into a second relayer room (`helloSessionId` from the QR, because the relayer forwards one `self_app` per session), both sides display the emojis, and the phone's Send button ships the envelope only after the user compares. Cross-implementation match (node/elliptic vs WebCrypto) is asserted by the import harness and a known-vector unit test.

**Open item (validate first, CE-01):** whether the current relayer forwards a custom event/payload between two clients in a room, or whether we reuse the `self_app` relay path (mobile joins as `web` and pushes the encrypted payload via the `self_app` event, extension joins as `mobile`). If neither carries ~100KB payloads, chunk the payload or make a minimal relayer change.

### 2. Chrome extension shell (`packages/chrome-extension/`)

MV3, plain Vite/TS build, no framework needed outside the webview-app bundle:

- **App hosting:** build step copies `packages/webview-app/dist/` into the extension and injects a `bridge-host.js` script tag before the app bundle (we own the HTML, so no content-script/MAIN-world tricks needed for our own page).
- **Bridge host** implements `NativeTransport` (registered before the bundle loads so `detectTransport` picks it up) and answers:
  - `lifecycle.getConfig` -> `{mode: 'self-app'}` for the home window, `{mode: 'embed', verificationRequest}` for disclosure popups (plus URL query params per `parseVerificationRequestContext`).
  - `lifecycle.ready` / `setResult` / `dismiss` -> forwarded to the background service worker to resolve the pending site request and close the popup.
  - `secureStorage.get/set/remove` -> AES-GCM over `chrome.storage.local` using the session key.
  - `crypto.sign/generateKey/getPublicKey` -> WebCrypto-backed keystore (disclosure does not use these, but implement rather than stub since it is cheap).
  - `biometrics.isAvailable` -> false; `nfc.*`, `camera.*` -> structured unsupported errors (never reached in disclosure); `haptic`, `analytics` -> no-ops.
- **Background service worker:** owns pending verification sessions, opens/closes popup windows, holds nothing secret (session key lives in `chrome.storage.session`).
- **Unlock + import screens:** minimal extension-owned pages (not webview-app): set password on import, unlock per session, show the link QR.
- **Manifest:** `host_permissions` for the relayer, TEE endpoints, registry/artifact hosts, and staging API; CSP `connect-src` to match.

### 3. Site SDK shim + demo RP (`packages/extension-demo/`)

- **Shim (premise of an SDK, single module for now):** `requestVerification(selfApp)` posts `{type: 'self:ext:request', selfApp}` via `window.postMessage`; listens for `self:ext:result`. Content script validates `event.origin === window.origin`, relays to background via `chrome.runtime.sendMessage`.
- **Demo page:** builds the config with standard `SelfAppBuilder` (staging endpoint, `minimumAge: 18`), registers the session on the relayer exactly like `SelfQRcodeWrapper` does (reusing `sdk/qrcode/utils/websocket.ts` logic), and calls the shim. Falls back to showing the QR when the extension is absent.
- **Flow:** page registers session -> shim -> extension popup (embed disclose) -> user approves -> extension joins relayer as `mobile` with the `sessionId` -> relayer pushes `self_app` -> proving machine runs (inputs in-page, proof in TEE) -> TEE/relayer hits the demo backend endpoint -> `SelfBackendVerifier` verifies -> page `onSuccess` fires via relayer statuses.
- **Demo backend:** one endpoint wrapping `SelfBackendVerifier` (`@selfxyz/core`), run locally or on a staging deploy; the `SelfApp.endpoint` points at it.

### 4. Mobile app changes (dev-gated)

- "Link browser extension" screen reachable from dev settings, behind a dev flag: QR scan -> confirm sheet -> encrypt -> send -> success/failure state. No production surface changes; no changes to proving or storage code paths.

## Out of scope

- Document registration/capture in the extension (no NFC, no MRZ, no KYC session start in-browser). Disclosure only.
- Chrome Web Store packaging, auto-update, Firefox/Safari.
- Production custody hardening (hardware-bound keys, phishing protection, per-origin allowlists), revocation/unlink flows, multi-device sync.
- Relayer/TEE/backend changes beyond what CE-01 proves strictly necessary for payload relay.

## Risks / open questions

| Risk | Outcome (2026-07-21) |
| --- | --- |
| Relayer may not relay arbitrary transfer payloads | RESOLVED: custom events are dropped, but the reverse `self_app` path relays; validated up to 1MB on staging, 512KB cap adopted (CE-01) |
| Fallback disclose TEE URL is `ws://` (non-TLS) | RESOLVED: staging `circuit-dns-mapping-gcp` returns `wss://tee.self.xyz` for every DISCLOSE key; no mixed content (CE-04) |
| Embed disclose may not emit relayer statuses | CONFIRMED and worked around: the SDK store has no socket in embed mode, so the extension bridge-host joins the RP session as the mobile client and translates `lifecycle.setResult`/`dismiss` into `proof_verified`/`proof_generation_failed` (CE-04) |
| Payload size (catalog + N documents, base64) | RESOLVED: realistic payloads are well under the 512KB cap; mobile screen guards and fails clearly above it (CE-03) |
| MV3 service worker lifetime during 10-30s proving | Holds: proving runs in the popup page; session state in `chrome.storage.session` |
| webview-app assumes euclid assets at fixed public paths | RESOLVED differently: the app dist is served at the extension ROOT so euclid's absolute URLs resolve (the asset-path shim only activates on `file:`) (CE-02) |
| Secret exposure in a browser context | Accepted for the spike with password-encrypted custody (PBKDF2 600k + AES-GCM); production custody is a separate workstream |
| NEW: `SelfAppBuilder` rejects localhost endpoints | Demo verify endpoint must be a tunnel URL (ngrok); frontend and backend endpoint strings must match exactly since the scope is hashed with the endpoint (CE-06) |
| NEW: relayer `mobile_connected` presence expires within ~30s | Found in real-device QA (2026-07-27): the transfer stalled because the phone waited for `mobile_connected`, which is only reported while a short-TTL session record lives; harnesses passed because both clients joined within ms. Fixed: phone emits `self_app` immediately on connect; room forwarding and the `proof_verified` ack are not TTL'd (validated after 60s+ idle on staging) |

## Validation

- `pnpm build` for `webview-app`, `webview-bridge`, `mobile-sdk-alpha` (unchanged packages stay green: their test suites pass untouched).
- Extension: load unpacked, link a real staging-registered document from the app, disclose 18+ on the demo page, confirm `SelfBackendVerifier` accepts the proof and `onSuccess` fires.
- Repeat with a KYC document and (if available) Aadhaar to confirm category-agnosticism.
- Negative paths: wrong password, cancelled consent (`lifecycle.dismiss` -> page gets failure), extension absent (QR fallback renders).

## Backlog

| ID | Title | Status | Priority | Depends On | Linear | Plan | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CE-01 | Transfer protocol: relayer payload relay validation + encrypted envelope format | Done | High | - | SELF-3597 | plans/CE-01-transfer-protocol.md | De-risks the whole spike; defines the QR + envelope schema |
| CE-02 | Extension shell: MV3 scaffold, bridge host, webview-app self-app mode boots | Done | High | - | SELF-3598 | plans/CE-02-extension-shell.md | Home screen renders with empty storage |
| CE-03 | Mobile dev-gated "Link browser extension" screen + extension import/custody | Done | High | CE-01, CE-02 | SELF-3599 | plans/CE-03-account-transfer.md | Password set + unlock screens; documents visible on extension home |
| CE-04 | Disclosure end-to-end: embed mode popup, relayer as mobile, TEE proving | Done | High | CE-03 | SELF-3600 | plans/CE-04-disclose-e2e.md | Includes wss/mixed-content and status-emission checks |
| CE-05 | Site shim SDK + content script + background session routing | Done | Medium | CE-02 | SELF-3601 | plans/CE-05-site-shim.md | Origin-checked postMessage contract |
| CE-06 | Demo RP app + `SelfBackendVerifier` endpoint | Done | Medium | CE-04, CE-05 | SELF-3602 | plans/CE-06-demo-rp.md | 18+ check, staging, QR fallback |

Linear: initiative "Chrome Extension Disclosure Spike", project of the same name (team Product).
