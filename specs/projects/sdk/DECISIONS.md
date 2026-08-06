# SDK Project · Decisions Log

Durable record of direction changes for the SDK project. Append new
entries at the top; do not rewrite old ones — a superseded decision is
still the explanation for code that exists today.

[OVERVIEW.md](./OVERVIEW.md) describes the architecture as it stands
right now and carries no dates. This file carries the dates. If you are
tempted to add "On <date>, X changed" to `OVERVIEW.md`, it belongs here
instead.

Workstream-scoped decisions stay in their own workstream (see
[nav-hygiene/DECISIONS.md](./workstreams/nav-hygiene/DECISIONS.md) for
the per-question format). This file is for decisions that change the
shape of the project.

---

## 2026-08-06 · Expo SDK 56 / RN 0.85 deferred indefinitely

**Decision:** Stay on Expo SDK 55 / RN 0.83.9. SDK 56 is deferred, not
pending.

The RN `0.77.0 → 0.83.9`, React `18 → 19`, Expo `~52.0.40 → 55.0.20`
upgrade landed in PR #2049. The Phase 1 decision gate had already
recorded `SDK 55.0.0 fallback` on 2026-05-04 because SDK 56 was
canary-only.

Moving to SDK 56 / RN 0.85 would re-open the Jest preset migration, the
iOS `PassportOCRView` Fabric question, and a full round of device
validation, for no product gain. WebView-in-App is the priority, and it
moves the app's UI surface into the WebView — which changes what an RN
major is worth in the first place.

Revisit only on a security fix or a hard dependency floor. All
`Target SDK 56 / RN 0.85.x` columns in
[RN-UPGRADE-CHECKLIST.md](../../topics/RN-UPGRADE-CHECKLIST.md) are
inert until then.

---

## 2026-05-19 · Self app becomes a WebView host (WebView-in-App)

**Decision:** The Self app's UI surfaces are replaced by a single
WebView loading `webview-app`. `packages/rn-sdk/` is revived from paused
as the canonical RN-side bridge host (shell component, message router,
handlers, `SelfCrypto` native module).

`app/` consumes `rn-sdk` as a workspace dependency; third-party RN apps
install it from npm. This makes the three bridge-compatible shells
(Kotlin, Swift, React Native) symmetric.

`native-shell-android/ios` remain active but serve external SDK
consumers (KMP, partner wallets) rather than the wallet itself.

**Cutover model:** long-lived feature branch `feat/webview-in-app` off
`dev`, no production RemoteConfig flag. Legacy RN screens are deleted at
merge time.

**Status as of 2026-08-06:** not merged. See
[webview-in-app/SPEC.html](./workstreams/webview-in-app/SPEC.html) for
current state.

---

## 2026-05-19 · App WebView loads from the embedded bundle only

**Decision:** No OTA, no hosted-URL loading for the in-app WebView.

Remote loading was evaluated for iteration speed and rejected: a
remotely-controlled bundle inside the wallet is an attack surface that
outweighs the release-cadence benefit. The WebView loads the bundle
shipped in the binary.

Hosted-URL loading remains in scope for _external_ SDK consumers — see
[sdk-distribution/SPEC.md](./workstreams/sdk-distribution/SPEC.md) — and
`devServerUrl` is blocked in production builds.

---

## 2026-03-25 · WebView app becomes the active product surface

**Decision:** The active surface is `packages/webview-app/` and its
browser-safe flow. The implementation pass is a faithful 1:1 Euclid
screen migration with temporary mocked states and route triggers.

Explicitly **not** in that pass: real KYC/provider wiring, KYC
persistence, proving-machine wiring, host lifecycle completion, native
shell delivery.

End-to-end capture is delegated to a web-capable KYC provider through
the provider-agnostic contract in WV-02. Didit is the current provider
target, but active UI naming stays generic (`Kyc*`).

Historical native-shell, KMP, RN-shell, and provider-specific work is
retained in sibling or paused specs rather than deleted — see
[paused/INDEX.md](./paused/INDEX.md).
