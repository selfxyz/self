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

## 2026-08-09 · RN upgrade closed out; iOS stays on Paper by exception

**Decision:** The RN 0.83 / Expo 55 upgrade track is closed. The four
`specs/topics/RN-UPGRADE-*.md` docs are archived, their live items are
re-homed to owning workstreams, and iOS keeps its Paper view components
under a formal exception rather than a Fabric migration.

Verified against the repo on 2026-08-09, which closed most of what
SELF-3786 tracked:

- **Android Fabric migration is done.** `PassportOCRViewManager.kt` is a
  `SimpleViewManager<PassportCameraView>` driven by the generated
  `setIsMounted`, with no fragment-replace, no commands, and no
  `ReactNativeFeatureFlags.override` block. `codegenConfig` is in
  `app/package.json` and the app-local `CameraMLKitFragment` is deleted.
  Every acceptance criterion in the Fabric doc is met.
- **Workspace RN/React alignment is done.** All five workspaces declare
  `react-native@0.83.9` / `react@^19.2.0`; root declares neither
  directly; `mobile-sdk-alpha` peers narrowed to `react: ^19.0.0` /
  `react-native: >=0.83.0 <0.86.0`. This closes the PLAN's
  _Align Remaining Workspaces_ follow-up on its own stated criteria.
- **React 19 / Compiler lint cleanup is effectively done.** `app/src`
  reports **1** `react-hooks` warning
  (`DevApduCaptureScreen.tsx:54`, `set-state-in-effect`), down from 26.
  All four Compiler-bailout families are at zero, including the site the
  follow-up doc recorded as deferred (`ProveScreen:232`). The residue is
  SELF-2802: fix that one site and restore the five rules from `warn` to
  `error` in `app/.eslintrc.cjs:142-146`.

**Forward path — WebView-in-App on the KMP framework, not an RN major.**
Restating the direction so the deferral is not read as "0.85 later":
there is no plan to take RN 0.85. The investment goes into WebView-in-App
with KMP as the native framework, which is what makes an RN major
low-value rather than merely inconvenient — the UI surface moves into the
WebView, and the native shell underneath is the thing being built out.
Treat an RN 0.85 proposal as needing a fresh justification against this
direction, not as resumed work.

Note the scope gap this opens: `workstreams/kmp-revival/SPEC.md` still
frames KMP as an **option offered to consumers** who already use Kotlin
Multiplatform, alongside native-shells-lite. If KMP is also the framework
under the Self app's own WebView host, that spec's purpose section
understates its role and needs a scope pass. Flagged, not resolved here.

**iOS Paper exception.** `app/src/components/native/PassportCamera.tsx:41`
still calls `requireNativeComponent('PassportOCRView')`, and
`packages/mobile-sdk-alpha/src/components/MRZScannerView.tsx:38` is a
second Paper site. Both stay. Migrating iOS to Fabric buys nothing while
RN 0.83 keeps Paper interop working, and WebView-in-App plus the
native-hardware-handlers spike are both routes that would replace these
components rather than port them. **Sunset trigger:** an RN or Expo bump
that drops Paper interop, or a Fabric-only requirement from
`native-hardware-handlers`. Whoever hits that trigger owns the migration
and unifies the `onPassportRead` payload — Android's is `{ data: string }`,
iOS keeps a wider `string | object` union local to `PassportCamera.tsx`.

Scope correction to the archived follow-up doc: it paired this decision
with an audit of `QRCodeScanner.tsx`, which no longer uses
`requireNativeComponent` at all (it is on `expo-camera`). The second
Paper site is `MRZScannerView.tsx`, in the SDK.

**Device-flow validation evidence.** The six flow checks (auth, camera,
permissions, push init, webview, NFC/passport scan) stay de-prioritized
and unowned. They were a pre-rollout gate and the rollout happened.
Nothing records a per-flow pass, so do not cite them as validated — but
do not re-run the checklist either. The intended evidence path is the
Mixpanel funnel, and it is **not yet usable for this**: AUD-08
(analytics fire-site correctness) is still Backlog and explicitly lists
`SCAN_STARTED` terminal pairing and NFC retry double-firing as open
questions. Cite the funnel as regression evidence only after AUD-08
lands. Anyone needing certainty on one flow before then runs that flow.

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
[RN-UPGRADE-CHECKLIST.md](../../archive/rn-upgrade/RN-UPGRADE-CHECKLIST.md)
are inert until then. (That checklist was archived 2026-08-09 — see the
entry above.)

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

**Departure from that model, 2026-05:** `#2098` (squash `2b907d0`)
merged the WIA host, routes, and bridge wiring to `dev` _without_
deleting the legacy screens, gating it instead on the build-time
constant `IS_WIA_ENABLED` in `app/src/utils/devUtils.ts` (`false`). Not
a RemoteConfig flag — nothing flips at runtime — but both paths now live
in the tree, and the WebView path ships in store builds unexercised.

**Status as of 2026-08-06:** host merged and gated off; the cutover
(flipping the constant and deleting the legacy path) is unmerged on
`feat/webview-in-app`. See
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
