# SPEC — Operating Modes (wallet vs tunnel)

> Last updated: 2026-05-19
> Owner: SDK / WebView UI
> Parent: [WebView-in-App](./SPEC.md)
> Status: Active

## Scope

The same `webview-app` bundle ships two operating modes:

- **Tunnel mode** — host invokes the WebView for a single verification.
  The user registers (if not already), discloses, the host receives a
  terminal result, the WebView exits. No home, no settings, no
  persistent UI. This is what 3rd-party RN apps (and the eventual
  Kotlin/Swift SDK consumers) embed.
- **Wallet mode** — the WebView is the persistent UI of the Self
  Wallet RN app. Home screen, proof history, settings (cloud backup,
  recovery, notifications), multiple entry points (deep links, QR
  scans, dev shortcuts). Long-lived; survives across attempts.

Both modes load the same JS bundle, use the same `SelfClient`,
same proving machine, and the same bridge adapters. **The distinction
is initial-routing + termination semantics, not a fork.**

This spec defines the contract that lets the host signal which mode
the WebView should boot in. It covers `WIA-16` (mode contract in the
bridge) and is consumed by `webview/` for `WV-MD-*` implementation
work in webview-app.

### In scope

- The bridge-level signal that selects mode at boot.
- Tunnel-mode termination semantics (when does the WebView call
  `lifecycle.setResult` / `lifecycle.dismiss`).
- Wallet-mode persistence semantics (when does the WebView stay
  resident vs unmount).
- Mode-exclusive surfaces (what each mode renders / does not render).
- Shared surfaces (registration, proving, KYC capture) and how they
  branch terminally based on mode.

### Out of scope

- Forking the bundle. There is one `@selfxyz/webview-app` bundle.
- Forking the npm package. There is one `@selfxyz/rn-sdk`.
- A third mode (e.g., "embedded preview", "demo"). Two modes only.
- Per-screen feature flags. Mode is a single decision at boot.
- Mode switching mid-session. The mode is fixed for the WebView's
  lifetime; relaunching the WebView is the only way to change mode.

## Decisions

1. **Mode is signaled via `lifecycle.getConfig()` response, not via URL
   or query param.** The WebView calls `bridge.lifecycle.getConfig()`
   during its initial mount. The host returns
   `{ mode: 'tunnel' | 'wallet', verificationRequest?, ... }`. The
   WebView routes accordingly.
2. **Default mode is wallet.** If the host returns no mode field, or
   the WebView is opened in a browser without a bridge, it boots into
   wallet mode at `/`. This keeps the Self Wallet path unchanged and
   makes browser-based testing predictable.
3. **Tunnel requires an inbound `verificationRequest`.** A host that
   declares `mode: 'tunnel'` must include a `verificationRequest`
   payload with at minimum `userId`, `scope`, and `disclosures`. A
   tunnel-mode boot with a missing or malformed request fails closed
   — the WebView renders a recoverable error rather than falling back
   to wallet mode.
4. **Tunnel terminates exactly once.** Successful disclose calls
   `lifecycle.setResult({ success: true, ... })` then
   `lifecycle.dismiss()`. Failure calls `setResult({ success: false,
   errorCode, errorMessage })` then `dismiss()`. Cancellation calls
   `dismiss()` only. The WebView does not navigate to a home screen
   after a terminal event in tunnel mode — there is no home screen.
5. **Wallet stays resident.** A completed flow in wallet mode (proof
   generated, settings change saved, etc.) returns the user to `/`
   (or whichever stack root makes sense for that flow). Wallet mode
   never calls `lifecycle.dismiss()` on its own — only the host
   unmounts it.
6. **Shared screens infer mode from a context, not from props.** The
   registration flow, proving machine, KYC capture, and recovery flow
   exist in both modes. They consume an `OperatingMode` context to
   decide terminal behavior (tunnel: emit result + dismiss; wallet:
   navigate home). Per-screen mode props are forbidden.
7. **`/tunnel/*` URL prefix stays internal.** The host does not
   navigate the WebView to `/tunnel/tour/1`; the WebView itself
   chooses where to start based on the mode value from
   `getConfig`. The URL prefix is an implementation detail of how
   tunnel screens are organized, not a host contract.

## Architecture

```mermaid
flowchart TD
  Boot[WebView mount] --> Cfg[bridge.lifecycle.getConfig]
  Cfg -->|{ mode, verificationRequest, ... }| Decide{mode}
  Decide -->|tunnel| TunnelGuard{verificationRequest<br/>present + valid?}
  TunnelGuard -->|no| Err[Recoverable error<br/>setResult failure + dismiss]
  TunnelGuard -->|yes| TunnelStart[/tunnel/tour/1]
  Decide -->|wallet| WalletStart[/ HomeScreen]
  Decide -->|missing| WalletStart
  TunnelStart --> Reg[Shared registration flow]
  WalletStart --> Reg
  Reg --> Prove[Shared proving flow]
  Prove --> Term{OperatingMode<br/>context}
  Term -->|tunnel| TR[setResult + dismiss]
  Term -->|wallet| WHome[navigate /]
```

The shared engine (registration, proving, KYC capture) is mode-blind
in its internals. Terminal navigation reads the `OperatingMode`
context once and routes accordingly.

## Mode-Exclusive Surfaces

| Surface                              | Wallet | Tunnel |
| ------------------------------------ | ------ | ------ |
| `/` HomeScreen (document catalog)    | ✓      | —      |
| `/settings/*` (cloud backup, etc.)   | ✓      | —      |
| `/proving/history`                   | ✓      | —      |
| `/manage-documents`                  | ✓      | —      |
| Persistent profile / points / referrals | ✓   | —      |
| `/tunnel/tour/:step` welcome         | —      | ✓      |
| `/tunnel/proof/result` exit          | —      | ✓      |
| `/tunnel/recovery-required` gate     | —      | ✓      |
| Registration flow (`/onboarding/*`)  | ✓      | ✓      |
| Proving flow                         | ✓      | ✓      |
| KYC capture (provider modal)         | ✓      | ✓      |
| Recovery flow                        | ✓      | ✓      |

Shared rows reuse the same components. The terminal behavior differs
via `OperatingMode` context; the screens themselves do not branch.

## Invariants

1. One bundle, one package. No mode-specific build, no mode-specific
   npm artifact. A consumer chooses mode by what they pass to
   `lifecycle.getConfig`, not by which package they install.
2. Mode is decided once at WebView boot and never changes for the
   lifetime of that WebView instance.
3. Tunnel mode always emits exactly one terminal envelope to the host
   (`setResult` for success/failure, `dismiss` for cancel). A tunnel
   that completes without emitting a terminal envelope is a bug.
4. Wallet mode never emits a terminal envelope on its own. Only the
   host (RN app) can unmount the WebView.
5. Wallet-only routes are unreachable from tunnel mode. If a tunnel
   flow tries to navigate to `/settings/...`, the router returns a
   404-equivalent and the flow continues at its current step.
6. Tunnel-only routes are unreachable from wallet mode by the same
   rule, with the exception that wallet flows MAY internally use the
   shared registration/proving screens (which are not tunnel-only).
7. Browser-host fallback (WebView opened in a browser tab with no
   native transport) always renders wallet mode. Tunnel mode is a
   native-host feature; reviewer/QA browser sessions never see it.

## Backlog (this topic)

| ID     | Title                                                          | Status  |
| ------ | -------------------------------------------------------------- | ------- |
| WIA-16 | `mode` + `verificationRequest` in lifecycle.getConfig response | Pending |

Downstream items live in the `webview/` workstream (`WV-MD-*`),
which owns the actual webview-app implementation:

- `WV-MD-01` Mode-aware initial routing in webview-app entry.
- `WV-MD-02` `OperatingMode` React context + provider, consumed by
  shared registration/proving/recovery flows for terminal navigation.
- `WV-MD-03` Tunnel-mode guard: validate `verificationRequest`
  shape, fail closed on missing/malformed input.
- `WV-MD-04` Router 404s for cross-mode navigation attempts.
- `WV-MD-05` Wallet-mode parity work that was already in the
  `webview/` backlog (settings, deep-link router, etc.) explicitly
  tagged as wallet-mode.

The `webview/` workstream's `SPEC.md` should add the `WV-MD-*` block
to its backlog and link back to this spec.

## RN Host Implications

The Self Wallet RN app, when mounting `<SelfVerification />` (or the
eventual `<SelfWalletShell />`), passes `mode: 'wallet'` in its
`lifecycle.getConfig` handler response. 3rd-party RN apps embedding
`@selfxyz/rn-sdk` pass `mode: 'tunnel'` along with their
`verificationRequest`. The handler in `packages/rn-sdk/`'s
`LifecycleHandler` accepts an optional `mode` field in its config and
defaults to wallet when consuming hosts do not specify.

This means a small change to `LifecycleHandler` in `rn-sdk`: the
`getConfig` return object gains a `mode` field, plumbed from a new
prop on `<SelfVerification />` (or a separate `<SelfWalletShell />`
component, TBD in `WIA-16`'s plan).

## Cross-Workstream Coordination

- **`webview/`** owns `WV-MD-01..05` implementation in webview-app.
  Update its `SPEC.md` to list those items and cross-link here.
- **`rn-sdk` package** owns the `LifecycleHandler` change to surface
  `mode` in `getConfig`. Belongs to `WIA-16`'s plan.
- **`webview-bridge`** stays unchanged — the bridge protocol already
  supports arbitrary fields in `lifecycle.getConfig` responses.

## Validation

- A wallet-mode boot lands on `/` and shows HomeScreen with no
  `verificationRequest` consumed.
- A tunnel-mode boot with a valid `verificationRequest` lands on
  `/tunnel/tour/1` and completes by emitting `setResult` + `dismiss`.
- A tunnel-mode boot with a missing `verificationRequest` shows a
  recoverable error and emits `setResult({ success: false, errorCode:
  'INVALID_REQUEST' })`.
- A tunnel flow that tries to navigate to `/settings/security` stays
  on its current screen; the router does not honor the navigation.
- A WebView opened in a desktop browser with no native bridge boots
  into wallet mode regardless of any query params.
