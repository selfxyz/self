# Self Browser Extension - Production Spec

> Last updated: 2026-07-29
> Owner: Remi Colin
> Status: Scoping (spike validated 2026-07-27; see [SPEC.md](./SPEC.md) for the spike record)
> Linear: initiative "Chrome Extension Disclosure Spike" > project "Browser Extension v1 (Production)"

## Relationship to the spike

The spike branch (`feat/chrome-extension-spike`) is a prototype and **will not be merged** - it exists as reference material and a working demo. Production is implemented fresh on `dev` through the backlog below, in normal-sized reviewed PRs. Pieces of the spike that prove out (envelope crypto, vault, SAS module, puppeteer harnesses, bridge-host handler set) are ported deliberately, each through its owning CEP ticket with production review standards - never merged wholesale.

## North star

Ship the Self browser extension as a maintained product: a user links their Self account from the phone once, then approves disclosure requests from any relying-party website in two clicks, with proofs generated in the TEE exactly as on mobile. The engineering cost of keeping it alive must stay near zero: no forked UI, no bespoke protocol, no manual release steps.

## Guiding constraint: maintenance burden

Every decision below is subordinated to one rule: **the extension is a thin shell around artifacts that other teams already maintain.**

| Layer | Owner today | Extension strategy |
| --- | --- | --- |
| UI screens | webview-app (WIA workstream) | Load the same webview-app build unmodified; extension-specific screens (link, unlock) move into webview-app behind a host capability flag, built from Euclid like everything else |
| Proving, documents, stores | mobile-sdk-alpha | Consumed via the existing `/browser` entry; zero extension-specific forks |
| Bridge contract | webview-bridge | The extension bridge-host implements the same `NativeTransport` handler set the native shells do; protocol changes automatically covered by bridge tests |
| Relayer | self-infra `db-relayer` | Transfer rides the standard session relay; server-side robustness landed in self-infra PR #166, retiring the spike's client-side workarounds |
| Design system | Euclid | Missing primitives (loading button, QR display, SAS display, secure input, spinner/toast) are added to Euclid, not hand-rolled in the extension |

Consequence: when webview-app, the SDK, or Euclid ship improvements, the extension picks them up by rebuilding. The extension-owned surface is limited to: MV3 manifest + service worker, bridge-host, vault (custody), and the site shim SDK - about 1.5k LOC total, all covered by the puppeteer harnesses.

## Architecture deltas vs the spike

1. **Relayer**: self-infra PR #166 makes presence join-order independent, buffers `self_app` for a late-joining peer, and guards disconnect cleanup against reconnect races. Once deployed, the client keeps emit-on-connect (harmless) and the two-room hello handshake collapses into the single transfer room (`helloSessionId` stays in the QR for one release for backward compat, then is dropped).
2. **Custody**: passkey-first (WebAuthn PRF wrapping a random vault key) with password fallback, as validated in the spike. Production adds: key-derivation review, lockout/attempt policy, wrong-password UX, and an explicit security review gate before store publish.
3. **Link/unlock screens**: currently bespoke extension pages; production moves them into webview-app (embed-style routes behind a host capability check) so they are Euclid-built, themed, and tested like every other screen. The extension keeps only a minimal bootstrap page.
4. **RP integration is Enterprise-only via the hosted page.** `@selfxyz/enterprise-sdk` is backend-only: RPs call `sessions.create()` and send users to the Self-hosted verification page (`session.verificationUrl`), which renders the QR/deeplink. The extension trigger (detect extension -> postMessage -> popup instead of QR) is built INTO that hosted page, so **every Enterprise RP gets extension support with zero integration work and zero new RP-facing API surface**. `@selfxyz/core`/`@selfxyz/qrcode` are outdated and will not be used by partners - no shim, no adapter, no RP-facing extension package, ever. The postMessage contract has exactly one consumer: the hosted page.
5. **Demo/validation RP**: `packages/extension-demo` stays an internal test harness for the postMessage contract; the end-to-end validation path moves to a real Enterprise flow (dashboard flow + `sessions.create` + signed webhook) so we dogfood the surface partners actually use.

## Chrome Web Store publishing (CI)

Goal: merging to the release branch publishes a new extension version with no human in the loop except the PR review itself.

- **Pipeline** (GitHub Actions in self/self):
  1. Trigger: push to `main` touching `packages/chrome-extension/**`, `packages/webview-app/**`, `packages/webview-bridge/**`, or `packages/mobile-sdk-alpha/**` (same paths-filter pattern as self-infra `staging.yml`).
  2. Build chain: common -> sdk -> bridge -> webview-app -> extension (the exact chain the harnesses use today).
  3. Gates: unit tests + `boot-check`, `import-check`, `disclose-check` puppeteer harnesses against Chrome for Testing (already headless-capable), gitleaks, bundle-size budget.
  4. Version: manifest `version` derived from a monotonic counter (date-based `YYYY.MM.DD.N`, mirroring self-infra image tags); the manifest `key` field is stripped for store builds (store assigns the real ID; the pinned key remains for local/dev loads).
  5. Upload: `chrome-webstore-upload-cli` with an OAuth refresh token stored in repo secrets (scoped Google Cloud project owned by the org, not an individual); publish target starts as **trusted testers**, flips to public per release train.
  6. Post-publish: job posts the version + store review status to the team channel; failed store review pages the owner.
- **Store review latency** is the one step we cannot automate (hours to days). Mitigation: publish cadence decoupled from merge cadence via the trusted-tester channel (instant) + public promotion when review clears. Proving-protocol changes must stay backward compatible for at least one store-review window since old extension versions linger.
- **Rollback**: store rollback is re-publishing the previous artifact; CI keeps the last N built zips as workflow artifacts, and the version counter never reuses a number.
- **Secrets**: refresh token + extension ID in GitHub environments with required reviewers; token rotation documented in the runbook.

## Versioning & cross-compatibility

Five independently-shipping parts touch one flow; the store's review latency (hours-days, plus users who never restart Chrome) means the extension is always the laggard. Rules:

| Interface | Versioning rule |
| --- | --- |
| Link QR payload (extension -> phone) | Carries an explicit `v` field. The phone supports current + previous QR version for >= 2 app releases (users update phone and extension independently, in either order) |
| Transfer envelope | Versioned, fail-closed on unknown versions (CEP-05) |
| Relayer event vocabulary | Additive-only. Never repurpose an existing event or change payload shapes; old extensions must keep working against a newer relayer (PR #166 follows this: new emissions only) |
| TEE proving protocol | Owned by the SDK; the extension embeds `mobile-sdk-alpha` at build time, so it tracks whatever the SDK supports. Server-side proving changes must tolerate one store-review window of stale clients |
| Hosted page <-> extension shim | postMessage contract carries a protocol version; the hosted page feature-detects and falls back to QR for absent/stale extensions - fallback IS the compatibility story |
| Bridge (webview-app <-> bridge-host) | Not an external interface: both sides are built from the same commit into one artifact; no cross-version support needed |
| Store artifact | Manifest version `YYYY.MM.DD.N`, monotonic, never reused; last-N zips retained for rollback |

Compatibility gate in CI (CEP-02): the harness suite runs the NEW extension against the CURRENT staging relayer and TEE - i.e., every merge proves the laggard-compatible direction before publishing.

## Security gates (blocking public listing)

1. Threat-model review of custody (vault, PRF wrapping, session key in `chrome.storage.session`) and transfer (envelope, SAS, QR trust).
2. Origin policy for the site shim: explicit origin allowlist decision (open vs registry), `externally_connectable` vs content-script relay decision, and anti-phishing UX for the approval popup (origin display, spoofing review).
3. Store-listing privacy disclosures + data-handling declaration (nothing leaves the device unencrypted; no analytics without consent).
4. Dependency + supply-chain: extension bundle is built from the monorepo only, no remote code (MV3 requirement), CSP stays `script-src 'self' 'wasm-unsafe-eval'`.

## Out of scope for v1

- Firefox/Safari ports (revisit once MV3 parity stabilizes).
- Document registration in the browser (NFC/KYC stays on mobile).
- Multi-device sync or revocation lists (unlink = reset, phone remains source of truth).
- Enterprise distribution (force-install policies).

## Backlog (mirrored in Linear; blocking edges in Linear relations)

| ID | Title | Blocked by | Notes |
| --- | --- | --- | --- |
| CEP-01 | Relayer session-relay robustness deployed + client workarounds retired | self-infra PR #166 | Server merged/deployed; collapse hello room; keep emit-on-connect |
| CEP-02 | Repo placement + CI build pipeline for the extension | - | Creates the production `packages/chrome-extension` on dev (ported from the spike branch, reviewed); build-on-merge, harnesses as CI gates, bundle budget |
| CEP-03 | Chrome Web Store publishing pipeline | CEP-02 | OAuth setup, versioning, trusted-tester channel, runbook |
| CEP-04 | Custody hardening + passkey-first production polish | - | PRF review, lockout policy, reset UX, key-derivation params |
| CEP-05 | Transfer protocol productization | CEP-01 | Versioned envelope, session expiry, SAS confirm mandatory, replay guard |
| CEP-06 | Euclid: extension-critical components | - | Loading Button state, Spinner, QRDisplay, EmojiSAS, secure InputField, biometric icon, selectable document rows, Toast (see UX.md) |
| CEP-07 | Link + unlock flows move into webview-app (Euclid screens) | CEP-06 | Kills bespoke pages; host capability flag |
| CEP-08 | Mobile app: production link flow (un-gate from dev menu) | CEP-05, CEP-06 | Settings entry, confirm-before-send SAS screen |
| CEP-09 | RP integration: extension trigger in the Enterprise hosted verification page | - | Detect + trigger from the hosted page (zero RP work); no legacy qrcode/core surface, ever |
| CEP-10 | Observability: error reporting + funnel analytics + relayer metrics | CEP-02 | Consent-gated; store-review canary alert |
| CEP-11 | Docs: RP integration guide, user help, maintenance runbook | CEP-03, CEP-09 | Demo RP graduates to docs sample |
| CEP-12 | Security review gate (custody, transfer, origin policy, store disclosures) | CEP-04, CEP-05, CEP-07, CEP-08, CEP-09 | Blocks public store listing |

Launch = CEP-03 pipeline green on trusted-tester channel + CEP-12 sign-off.

## Open questions

- ~~Store identity~~ RESOLVED (2026-07-29): same Google Workspace org as the Play Store presence, with a Chrome Web Store **group publisher** registered under it (publish rights group-managed, never personal); CI OAuth project in the same org. Setup mechanics belong to CEP-03.
- ~~Which repo/team owns the Enterprise hosted verification page?~~ RESOLVED (2026-07-29): `self-dashboard` repo, `apps/hosted-page` - QR rendering lives in `src/client/components/features/verification/` (`QRCodeDisplay.tsx`, `MobileVerification.tsx`), which is exactly where the extension branch (detect -> postMessage -> hide QR) slots in. CEP-09 is a feature PR there, coordinated with the dashboard owner; the shim module + contract sample stay in this monorepo.
- Origin policy: allowlist the hosted-page origin only (single origin we control). DECIDED by the Enterprise-only integration model (2026-07-29); security review verifies the implementation rather than re-opening the policy.
- ~~Popup scope~~ RESOLVED (2026-07-29): mini home stays in v1 (ID card, document selection, settings) - existing webview-app self-app-mode screens.
