# Self Browser Extension - PRD

> Last updated: 2026-07-29
> Owner: Remi Colin
> Status: Draft for review
> Companion docs: [PRODUCTION.md](./PRODUCTION.md) (engineering), [UX.md](./UX.md) (design). Feasibility proven by the spike ([SPEC.md](./SPEC.md), real-device validated 2026-07-27, branch is reference-only).

## Problem

Self verification lives on the phone. Every desktop verification forces a device switch: the user is on a website, gets a QR, must find their phone, unlock it, open Self, scan, approve, and return to the browser. On desktop - where most KYC/age-gated onboarding happens - that context switch is the biggest drop-off point in the funnel, and it repeats on every single verification. Password-manager-style browser extensions have taught users that identity actions can be two clicks in the corner of the screen.

## Product

A Chrome extension that holds the user's Self account (transferred once from the phone, end-to-end encrypted) and approves disclosure requests directly in the browser. Proofs are generated in the same TEE pipeline as mobile - nothing in the proving chain changes, only where the approval happens.

**One-line pitch:** link your phone once, then prove who you are from the browser in two clicks.

## Users

1. **End users on desktop** - verify without reaching for the phone. The phone remains the source of truth (registration, backup, recovery); the extension is a satellite.
2. **Enterprise relying parties** - get higher desktop conversion for free. Zero integration: the Self-hosted verification page detects the extension and offers it instead of the QR. RPs keep calling `sessions.create()` exactly as documented.
3. **Self engineering** - must not inherit a second product to maintain. The extension is a thin shell (~1.5k LOC) over the webview-app build, the SDK, the bridge contract, and Euclid; releases are fully automated to the Chrome Web Store.

## What ships (functional requirements)

| # | Capability | Requirement |
| --- | --- | --- |
| F1 | Account link | QR handshake phone->extension; E2E-encrypted transfer (P-256 ECDH + AES-256-GCM); **emoji safety check gates the send**: both devices show the same 4 emojis derived from the shared secret, and the user explicitly presses "Encrypt & send my account" on the phone after comparing |
| F2 | Custody | Passkey-first (Touch ID via WebAuthn PRF; no password exists in that mode); password fallback for non-PRF machines; lost-credential path = reset this browser + relink (phone unaffected) |
| F3 | Disclosure | Enterprise hosted verification page detects the extension -> popup with consent screen (requesting origin shown) -> hold-to-approve -> TEE proof -> same webhook the RP already handles; QR fallback whenever the extension is absent, locked, or stale |
| F4 | Documents | All document categories transfer (passport, EU ID, Aadhaar, KYC); user selects the active proving document in the extension |
| F5 | Feedback | Every wait has a state (per UX.md loading inventory); failures are explicit and mirrored on both devices during linking |

## Non-goals (v1)

- Document registration in the browser (NFC/KYC stays on mobile).
- Firefox/Safari, enterprise force-install, multi-device sync, revocation lists.
- Any integration surface for legacy `@selfxyz/qrcode`/`@selfxyz/core` - those packages are dead for partners; the hosted page is the only trigger origin.
- Standalone identity: the extension never registers or recovers an account; no phone, no extension.

## Success metrics

| Metric | Target (first 90 days public) |
| --- | --- |
| Desktop verification completion rate (extension vs QR baseline) | measurably higher; instrumented from day one (CEP-10) |
| Median time-to-proof on desktop, request -> verified | < 45s (vs QR flow baseline) |
| Link-flow completion once QR is scanned | > 90% |
| Repeat verification via extension for linked users | > 80% choose extension over QR |
| Maintenance load | extension keeps working across webview-app/SDK releases with zero extension-only PRs in a normal month; store publish requires zero manual steps |

## Launch gates

1. Relayer robustness deployed (self-infra PR #166) - CEP-01.
2. Store CI pipeline green on trusted-tester channel - CEP-02/03.
3. Security review sign-off (custody, transfer, origin policy, store disclosures) - CEP-12. Blocks public listing; trusted testers may precede it.
4. Enterprise-flow dogfood: one real dashboard flow verifying end-to-end through the extension (session -> popup -> TEE -> signed webhook).

## Release plan

1. **Internal** (unpacked/pinned-key builds): team QA, harnesses in CI.
2. **Trusted testers** (store, unlisted channel): every merge auto-publishes; partners we invite.
3. **Public listing**: after CEP-12 sign-off; promotion is a manual workflow trigger, still no manual build steps.

## Top risks

| Risk | Mitigation |
| --- | --- |
| Chrome Web Store review latency/rejection | trusted-tester channel decouples publish from review; protocol changes stay one-review-window backward compatible; store-review canary alert (CEP-10) |
| Browser custody of identity secrets erodes trust | passkey-first custody, security review gate, phone stays source of truth, reset-and-relink recovery |
| Phishing via fake trigger pages | extension only accepts triggers from the hosted-page origin (single origin we control); consent popup displays requesting origin |
| WebAuthn PRF availability gaps (older macOS/Chrome, Windows variance) | password custody fallback ships at parity; PRF support detected at link time |
| Hosted-page team bandwidth (trigger lands in their repo) | trigger is a small, feature-flagged addition; contract sample maintained in extension-demo harness |

## Open decisions for review

1. Which repo/team owns the Enterprise hosted verification page (determines where CEP-09 lands)?
2. Store identity: existing Self Google developer account vs dedicated org account (CEP-03 OAuth).
3. Popup scope in v1: mini home (documents + settings) as specced, or disclosure-only? UX.md recommends keeping the mini home.
