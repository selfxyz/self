# Self SDK — Overview

> Owner: Self Engineering
> Status: Active (WebView-first target; the Self app on `dev` is still the legacy RN architecture)

**Scope of this document:** how the SDK is put together _right now_, and
what that means for where you put code. It carries no dates and no
per-ticket status on purpose.

- **Why the architecture is this way, and when it changed** →
  [DECISIONS.md](./DECISIONS.md)
- **What is done and what is next** → the workstream `SPEC.md` files,
  indexed in [INDEX.md](./INDEX.md). They own status; this file does not.

## Read This First

Two architectures exist in this repo at the same time. Neither has
replaced the other.

|                            | Legacy RN app                     | WebView-first target                                                            |
| -------------------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| Where it lives             | `app/`, on `dev` — shipping today | `packages/webview-app` + `packages/rn-sdk`, hosted by `app/` behind a dead flag |
| Owns screens/state/proving | `app/` directly                   | TypeScript/WebView                                                              |
| UI library                 | tamagui `1.144.4`                 | `@selfxyz/euclid`                                                               |
| Status                     | **This is what production runs**  | **On `dev` but gated off — no user reaches it**                                 |

The WIA host is **merged, not absent**. `#2098` (squash `2b907d0`) landed
the in-app WebView host, routes, and bridge wiring on `dev`, but every
entry point is gated on `IS_WIA_ENABLED` in `app/src/utils/devUtils.ts`,
which is `false`. Every build — staging and store — takes the legacy
native path. Note the departure from the merge-time deletion model: the
legacy flow was **not** removed at merge, so both paths are live in the
tree and the WebView path is not exercised by store builds.

The cutover itself — flipping the flag and deleting the legacy path — is
not merged. That work sits on `feat/webview-in-app`, which last advanced
**2026-06-08** and is **135 commits behind `dev`** (62 ahead). Rebasing
it is a prerequisite, not a formality. Tracked in
[WebView-in-App Spec](./workstreams/webview-in-app/SPEC.html).

If you are reading a spec that describes the WebView as the app's host
surface, it is describing the **target**, not `dev`.

## North Star

- **Goal:** Deliver a reusable Self verification flow whose UI can be reviewed,
  QAed, and iterated inside the WebView/browser surface without waiting on
  provider or native integration.
- **Constraint:** The WebView pass is UI-first and mock-first. If a task exists
  only to make the flow production-real rather than visually and navigationally
  complete, it belongs in a later logic pass.

## Active Architecture

```text
┌──────────────────────────────────────────────────────┐
│                   HOST / REVIEWER                    │
│  Opens the webview/browser flow and exercises mock   │
│  branches via routes, query params, or mock state    │
└──────────────┬───────────────────────────────────────┘
               │ launch / inspect / review
               ▼
┌──────────────────────────────────────────────────────┐
│              WEBVIEW EXPERIENCE                       │
│               packages/webview-app                   │
│   Euclid screen wrappers + route orchestration +     │
│   temporary mocked provider / proving branches       │
└──────────────┬───────────────────────────────────────┘
               │ future logic pass only
               ▼
┌──────────────────────────────────────────────────────┐
│            WEBVIEW ENGINE / SHARED LOGIC              │
│            packages/mobile-sdk-alpha                 │
│   request parsing, stores, adapters, proof logic     │
└──────────────┬───────────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌─────────────────┐  ┌──────────────────────────────┐
│ Host callback   │  │ KYC Provider (web-capable)   │
│ contract (WV-04)│  │ Didit or another provider    │
│ future wiring   │  │ conforming to WV-02          │
└─────────────────┘  └──────────────────────────────┘
```

### Data Flow

1. The active pass launches the webview/browser flow directly into mocked or
   partially wired routes for review.
2. Registration screens use deterministic mock transitions for provider,
   success, failure, retry, and dismiss branches.
3. Disclose screens follow the same mock-first pattern until the later logic
   pass wires real provider and proving behavior.
4. Future logic work will normalize real provider output into
   `KycProviderResult`, persist KYC documents, run proving, and emit terminal
   host lifecycle results.

## Module Table

| Module               | Location                                                          | Status   | Current Role                                                                                                                                                                           | Action Needed                                           |
| -------------------- | ----------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Self Wallet app      | `app/`                                                            | Active   | **The shipping production app.** Owns screens, navigation, stores, and proving directly on `dev`. tamagui UI. Also carries the merged WIA WebView host, gated off by `IS_WIA_ENABLED`. | Flip the flag and delete the legacy path at WIA cutover |
| WebView UI           | `packages/webview-app/`                                           | Active   | Primary product surface, route orchestration, mock-first screen migration                                                                                                              | Finish remaining UI migration specs/routes              |
| SDK Core             | `packages/mobile-sdk-alpha/`                                      | Active   | Shared engine for WebView/browser delivery                                                                                                                                             | Keep browser entry clean and request-driven             |
| WebView Bridge       | `packages/webview-bridge/`                                        | Active   | Host callback surface for future lifecycle wiring                                                                                                                                      | Stable for current UI pass                              |
| Android Shell        | `packages/native-shell-android/`                                  | Deferred | Future thin Kotlin shell: keychain/crypto + WebView host                                                                                                                               | Not required for current UI migration                   |
| iOS Shell            | `packages/native-shell-ios/`                                      | Deferred | Future thin Swift shell: keychain/crypto + WebView host                                                                                                                                | Not required for current UI migration                   |
| Test App             | `packages/sdk-test-app/`                                          | Deferred | Future native E2E harness                                                                                                                                                              | Not required for current UI migration                   |
| KMP Native Shell     | `packages/kmp-sdk/`                                               | Active   | Native shell for KMP consumers — 3-domain scope (secureStorage, crypto, lifecycle)                                                                                                     | KR-01 (Android), KR-02 (iOS), KR-03 (validate)          |
| Swift Providers      | `packages/self-sdk-swift/`                                        | Active   | iOS keychain/crypto provider implementations for KMP SDK                                                                                                                               | Required by KR-02 (query param support)                 |
| RN SDK               | `packages/rn-sdk/`                                                | Active   | Bridge-compatible RN host shell + `SelfCrypto` native module. Consumed by `app/` (Self app) and publishable for 3rd-party RN apps.                                                     | Revived under `webview-in-app` (WIA-00).                |
| Native Consolidation | `app/ios/`, `packages/mobile-sdk-alpha/ios/`, related native code | Paused   | Historical native cleanup and parity track                                                                                                                                             | Keep as reference only for now                          |
| KMP Test App         | `packages/kmp-sdk-test-app/`                                      | Active   | E2E test harness for KMP SDK                                                                                                                                                           | Scope to 3-domain in KR-03                              |
| MiniPay Sample       | `packages/kmp-minipay-sample/`                                    | Paused   | Historical KMP integration example                                                                                                                                                     | May resume now that KMP path is active                  |
| MRZ Scanner          | `packages/rn-mrz-scanner/`                                        | Active   | RN native module: passport MRZ camera scan. Consumed by `app/` and the RN SDK capabilities handshake.                                                                                  | Covered by `rn-sdk-packaging`                           |
| NFC Passport         | `packages/rn-nfc-passport/`                                       | Active   | RN native module: passport NFC chip read. Same consumer set as MRZ scanner.                                                                                                            | Covered by `rn-sdk-packaging`                           |
| RN SDK Test App      | `packages/rn-sdk-test-app/`                                       | Active   | E2E harness for `rn-sdk`. Held at `jest@^29` — see RN upgrade follow-ups.                                                                                                              | Realign to `jest@30` when RN 0.85 lands                 |
| Mobile SDK Demo      | `packages/mobile-sdk-demo/`                                       | Active   | Standalone RN demo of `mobile-sdk-alpha` (RN 0.83.9, new architecture)                                                                                                                 | Keep in lockstep with SDK core                          |

## Old vs. New — Practical Differences

What a developer actually does differently. The architecture diagram
above is the _what_; this is the _day to day_.

### 1. Where new code goes

Ask **"can this run in the WebView?"** before writing anything. If yes
or maybe, it belongs in TypeScript.

| Kind of work                                                                                 | Goes in                                               |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Screens, flows, navigation, copy                                                             | `packages/webview-app/`                               |
| State machines, stores, parsing, validation, formatting, proving orchestration, shared types | `packages/mobile-sdk-alpha/src/`                      |
| Bridge message shapes and host callbacks                                                     | `packages/webview-bridge/`                            |
| Hardware, OS APIs, lifecycle, keychain, crypto signing/key-gen                               | native shells (`rn-sdk`, `native-shell-*`, `kmp-sdk`) |

Native handlers stay thin. If a Kotlin or Swift change is doing product
logic, it is in the wrong layer.

Caveat while the cutover is pending: work targeting the **shipping** app
still lands in `app/`. Ask which surface the change ships on before
applying the table.

### 2. `mobile-sdk-alpha` is dual-target, not RN-free

This is the most commonly misread rule in the repo.

`mobile-sdk-alpha` is **not** platform-agnostic source with a single RN
adapter folder. It is a dual-target package that ships an RN component
library _and_ a browser-safe core, and today `src/` contains ~59
`react-native` imports outside `src/adapters/react-native/`.

Portability is achieved by **build-time resolution**, not by banning
imports:

- **Export conditions** in `package.json` — the `"react-native"`
  condition resolves to `dist/esm/index.js`, `"browser"`/`"default"`
  resolve to `dist/esm/browser.js`. `src/index.ts` and `src/browser.ts`
  are separate entry points with deliberately different surfaces.
- **Platform-suffixed files** — `*.web.tsx` / `*.native.ts` variants
  (e.g. `haptic/trigger.web.ts`, `components/DelayedLottieView.web.tsx`).
- **11 `react-native` peer dependencies**, including
  `react-native-keychain`, `react-native-webview`, and `lottie-react-native`.

The rule that matters in practice: **anything reachable from
`src/browser.ts` must not pull in `react-native`.** RN imports elsewhere
in `src/` are expected and fine.

> No lint rule or dedicated test enforces it — `validate:exports` only
> asserts the ESM/named-export shape and does not inspect imports. Two
> things catch a leak:
>
> ```bash
> # Direct graph check — must print nothing
> pnpm --filter @selfxyz/mobile-sdk-alpha exec npx --yes madge --no-spinner src/browser.ts | grep -i react-native
>
> # Build gate — webview-app resolves the `browser` condition
> pnpm --filter @selfxyz/webview-app build
> ```
>
> `madge` is not a repo dependency; it runs via `npx`. Run both after
> touching shared modules.

### 3. The bridge is the only coupling point

Native shells and the WebView share a JSON protocol and nothing else. No
side channels, no custom messaging, no platform-specific extensions.
WebView code imports SDK **adapter interfaces**; native shells
**implement bridge handlers**. Code does not cross the boundary — only
messages do.

Practical consequence: adding a capability is a two-sided change (a
protocol message plus a handler per shell), never a direct call.

### 4. Keychain is native-managed

Secure storage has **no web fallback** by design. Browser-surface code
cannot read or write keychain material — it asks the shell over the
bridge. Do not add a `localStorage` path "for local dev"; that is the
failure mode this rule exists to prevent.

### 5. Fail closed on security boundaries

- Reject unknown bridge protocol versions rather than best-effort parsing.
- Block remote `devServerUrl` in production builds.
- Default-deny on session lifecycle edge cases.

The app WebView loads from the **embedded bundle only** — hosted-URL and
OTA loading were evaluated and rejected as an attack surface. This binds
**the Self app WebView surface only.** Hosted-URL loading for the
external native shells is a separate, live track (SD-01/SD-02/SD-03 in
[sdk-distribution](./workstreams/sdk-distribution/SPEC.md), Ready/High) and
is not covered by this rejection. **Security is the canonical rationale**
for the app surface; the operational objections in
[SPEC-HOSTED-LOADING](./workstreams/webview-in-app/SPEC-HOSTED-LOADING.html)
(offline first-launch, CDN single point of failure, uncontrolled WebView
caches) are additional, not the basis.

## Validation

Run the surface you touched. All commands verified against the current
workspace scripts.

Run these from the repo root — `pnpm --filter` keeps every command
rooted, so the block is safe to paste as a whole (a bare `cd` chain is
not: the first `cd` persists and breaks the next command).

```bash
# SDK core
pnpm --filter @selfxyz/mobile-sdk-alpha test && pnpm --filter @selfxyz/mobile-sdk-alpha types

# Bridge protocol
pnpm --filter @selfxyz/webview-bridge build && pnpm --filter @selfxyz/webview-bridge test

# WebView app — also the gate for RN leaking into the browser entry
pnpm --filter @selfxyz/webview-app build

# RN bridge host
pnpm --filter @selfxyz/rn-sdk test && pnpm --filter @selfxyz/rn-sdk types

# KMP shell
pnpm kmp:test

# Whole repo — tests included; lint/types/build alone is not a full pass
pnpm lint && pnpm types && pnpm build && pnpm test
```

The Self Wallet app has its own harness — see [app/AGENTS.md](../../../app/AGENTS.md)
for E2E and deployment. Workspace-specific rules live in the nearest
`AGENTS.md`; read it before working under `app/`,
`packages/mobile-sdk-alpha/`, `packages/webview-app/`, or `noir/`.

## Scope Rules

1. **The current pass is UI-first and mock-first.** The deliverable is complete,
   reviewable screen and route coverage, not production wiring.
2. **KYC provider is pluggable.** The Self KYC contract (WV-02) is
   provider-agnostic. Didit is the current provider target, but active naming
   should remain generic outside adapter specs.
3. **Host lifecycle completion is a later pass.** The callback contract is
   documented, but real terminal-result wiring is not required for current UI
   migration work.
4. **Historical implementation specs are retained, not deleted.** Native-shell,
   provider, and proving plans stay available for future implementation. See
   [Paused Work](./paused/INDEX.md); the reasoning is in [DECISIONS.md](./DECISIONS.md).
5. **This file describes the present, not the plan.** Direction changes go in
   [DECISIONS.md](./DECISIONS.md); ticket status goes in the workstream specs.
   If you find yourself adding a date or a checkbox here, it belongs elsewhere.
6. **Euclid screens require asset and inset verification.** Every screen
   imported from `@selfxyz/euclid` must be checked for URL-path asset
   references (Lottie animations, background images) and safe-area inset
   props. Missing assets cause silent failures (blank animations, black
   backgrounds). See the **Euclid Screen Migration Checklist** in
   `packages/webview-app/AGENTS.md` for the full protocol.

## Where To Work

- **Current UI migration source of truth:** [WebView Spec](./workstreams/webview/SPEC.md), [Screen Inventory](./workstreams/webview/SCREEN-INVENTORY.md), [Ticket Plan](./workstreams/webview/TICKET-PLAN.md)
- **Future provider/proving implementation context:** [WebView Spec](./workstreams/webview/SPEC.md) (`WV-05`, `WV-06`, `WV-08`, `WV-11`)
- **Future native shells (Kotlin + Swift):** [Native Shells Lite Spec](./workstreams/native-shells-lite/SPEC.md) (`NSL-01`, `NSL-02`, `NSL-03`)
- **Build pipeline:** [Build Pipeline Spec](./workstreams/build-pipeline/SPEC.md) (BP-01)
- **Shared engine follow-ups:** [SDK Core Spec](./workstreams/sdk-core/SPEC.md)
- **KMP revival (3-domain scope):** [KMP Revival Spec](./workstreams/kmp-revival/SPEC.md)
- **App WebView cutover:** [WebView-in-App Spec](./workstreams/webview-in-app/SPEC.html), [Nav-Hygiene Spec](./workstreams/nav-hygiene/SPEC.html)
- **RN/Expo toolchain state:** see below
- **Retained RN work:** [Paused Work Index](./paused/INDEX.md)
- **Why any of this is the way it is:** [DECISIONS.md](./DECISIONS.md)

## RN / Expo Toolchain State

The app workspace owns the RN and React majors. Root declares neither
package directly — it is the override host, not a consumer — and the
`overrides` in `pnpm-workspace.yaml` hold every RN-bearing workspace to
the same pair:

| Package        | Version   | Notes                                                   |
| -------------- | --------- | ------------------------------------------------------- |
| `react-native` | `0.83.9`  | Pinned exactly; also a workspace-wide `overrides` entry |
| `react`        | `^19.2.0` | Same                                                    |
| `expo`         | `55.0.20` | Bare workflow with Expo modules, not managed/Expo Go    |

Declaration sites, verified 2026-08-09 — seven manifests declare both
packages directly: `app`, `packages/mobile-sdk-alpha`,
`packages/mobile-sdk-demo`, `packages/rn-mrz-scanner`,
`packages/rn-nfc-passport`, `packages/rn-sdk`,
`packages/rn-sdk-test-app`. `packages/webview-app` declares `react` only
(no RN surface). `sdk/qrcode` declares a web-only `react` range
(`>=18.0.0 <20.0.0`) and is not an RN consumer. Do not reintroduce a
root-level `react` or `react-native`; the skew this section records as
closed lived there.

`@selfxyz/mobile-sdk-alpha` peers are narrowed to `react: ^19.0.0` and
`react-native: >=0.83.0 <0.86.0`. The workspaces that must satisfy those
peers are the SDK's **dependents** — `app`, `mobile-sdk-demo`,
`webview-app`, `webview-bridge` — which is a different set from the
RN-declaring list above. `webview-app` and `webview-bridge` consume the
SDK without declaring `react-native`; `rn-sdk` and `rn-sdk-test-app`
declare RN without consuming the SDK. A peer range may not be narrowed
ahead of the dependents, and the dependent set is the one to audit. (The
upgrade track's _Align Remaining Workspaces_ follow-up scoped five
workspaces: `app`, root, `mobile-sdk-demo`, `rn-sdk`, `rn-sdk-test-app`.
That is the historical alignment target, not either current set; root was
resolved by dropping its declaration rather than bumping it.) Read the
live values from the manifests, not this table.

New arch is on (`newArchEnabled=true`). The Android `PassportOCRView`
manager is Fabric; the two iOS native-component callsites stay on Paper
under a documented exception. The SDK's Android `SelfOCRViewManager` is
an active New Architecture defect tracked by
[RSP-06](./workstreams/rn-sdk-packaging/SPEC.md), not part of that
exception. Android is not uniformly Fabric —
`app/android/.../ui/QRCodeScannerViewManager.kt` is still a legacy
`ViewGroupManager` using commands and fragment replacement, registered
through `QRCodeScannerPackage` in `MainApplication.kt`; the active QR
screen uses `expo-camera` instead, so it is unexercised legacy rather
than a live Paper dependency. Expo SDK 56 / RN 0.85 is deferred
indefinitely. Both decisions, with their sunset triggers, are in
[DECISIONS.md](./DECISIONS.md). Dependency pins and overrides are owned
by [Monorepo Tooling](./workstreams/monorepo-tooling/SPEC.md).
