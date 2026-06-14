# AUD-05 — Bridge protocol surface audit

> Linear: TBD — create the tracking issue and attach this plan before investigation starts (protocol Stage 1)
> Workstream: [Codebase Audits](../SPEC.md)
> Status: Draft (pre-drafted ahead of AUD-02 completion; requires recon refresh + owner re-review at activation)
> Priority: High
> Depends on: — (no hard dependency; feeds AUD-09 which audits the WebView app riding on this bridge)
> Time box: 4 working days of investigation + 1 day for report and review gate. Question-list items
> still open at expiry split into a new `AUD-NN` backlog row; the audit does not extend.
> Audit PR contents: findings report + characterization tests only. Target <1.2k LOC of test code
> (TS/RN + Kotlin/Swift unit tests combined).

## Context

You are auditing the **bridge protocol** — the JSON contract that lets the WebView engine reach
native capabilities (NFC, biometrics, secure storage, crypto, camera, lifecycle, …) without
knowing which shell it runs in. The TS bridge client (`webview-bridge`), the React Native SDK host
(`packages/rn-sdk`), and the two native shells (`packages/native-shell-android` Kotlin,
`packages/native-shell-ios` Swift) are independent implementations of the same wire format and the
same trust boundary. The CLAUDE.md invariants this audit measures
against are explicit: **fail closed on security boundaries** (reject unknown protocol versions,
block remote `devServerUrl` in production, default-deny session lifecycle edge cases), **the
bridge protocol is the only coupling**, and **adapter interfaces are the coupling layer**.

This is a security boundary: the Android/iOS native WebView shells default to remote content
(`https://self-app-alpha.vercel.app`), while the RN SDK host defaults to embedded files but still
exposes the same native bridge. That bridge is the channel through which WebView code asks native
code to sign with private keys, read secure storage, and return verification results. A gap in
origin-trust, version-gating, or response handling here is a direct path from WebView content to
native key material.

Reconnaissance (2026-06-11) read every core file across the bridge surfaces at the cited
lines and produced the suspected-issue list embedded in the question list. Treat every "suspected"
item as unverified: confirm or refute each with a trace or a reproduction, per the workstream's
evidence standard.

## Scope

### In scope (the complete file inventory)

| Area                                                             | Files                                                                                                                                                                                                                                                            | LOC   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| TS bridge client (transport, request/response, events, teardown) | `packages/webview-bridge/src/bridge.ts`                                                                                                                                                                                                                          | 453   |
| TS wire-format validation                                        | `packages/webview-bridge/src/schema.ts`                                                                                                                                                                                                                          | 127   |
| TS protocol types + constants                                    | `packages/webview-bridge/src/types.ts`                                                                                                                                                                                                                           | 154   |
| TS adapter coupling layer                                        | `packages/webview-bridge/src/adapters/*.ts` (auth 27, crypto 69, keychain-documents 56, sdk-adapter-map 68, + nfc/nav/analytics/storage/lifecycle/camera/documents/biometrics/haptic)                                                                            | 621   |
| TS mock transport                                                | `packages/webview-bridge/src/mock.ts`                                                                                                                                                                                                                            | 159   |
| RN SDK router + KMP transport                                    | `packages/rn-sdk/src/bridge/{MessageRouter,KmpBridgeTransport,types}.ts`                                                                                                                                                                                         | 282   |
| RN SDK handlers                                                  | `packages/rn-sdk/src/handlers/*.ts`                                                                                                                                                                                                                              | 1,385 |
| RN SDK WebView host + native KMP module                          | `packages/rn-sdk/src/SelfVerification.tsx`, `packages/rn-sdk/android/src/main/java/xyz/self/rnsdk/SelfBridgeModule.kt`                                                                                                                                           | 763   |
| Android router + models + handler base                           | `packages/native-shell-android/src/main/kotlin/xyz/self/sdk/bridge/{MessageRouter,BridgeModels,BridgeHandler}.kt`                                                                                                                                                | 267   |
| Android handlers                                                 | `packages/native-shell-android/.../handlers/{SecureStorageHandler,LifecycleHandler,CryptoHandler}.kt`                                                                                                                                                            | 246   |
| Android WebView host + nav policy                                | `packages/native-shell-android/.../webview/{AndroidWebViewHost,SelfVerificationActivity,RemoteNavigationPolicy}.kt`                                                                                                                                              | 576   |
| iOS router + models + handler base                               | `packages/native-shell-ios/Sources/SelfNativeShell/Bridge/{MessageRouter,BridgeModels,BridgeHandler}.swift`                                                                                                                                                      | 276   |
| iOS handlers                                                     | `packages/native-shell-ios/.../Handlers/{SecureStorageHandler,LifecycleHandler,CryptoHandler}.swift`                                                                                                                                                             | 273   |
| iOS WebView host + nav policy                                    | `packages/native-shell-ios/.../WebView/{SelfWebViewHost,RemoteNavigationPolicy}.swift`                                                                                                                                                                           | 262   |
| Existing tests                                                   | `packages/webview-bridge/src/__tests__/{schema,adapters,bridge,analytics-web,documents-web}.test.ts` (991), `packages/rn-sdk/src/__tests__/*.test.ts` (1,920), `packages/native-shell-android/src/test/**` (1,385), `packages/native-shell-ios/Tests/**` (1,461) | —     |

### Out of scope

- The **WebView app** that consumes the bridge (`packages/webview-app/src/`) — its providers,
  secret handling, recovery/proving screens. That is **AUD-09** (newly added to the backlog).
  You trace `createSdkAdapters` (`sdk-adapter-map.ts`) as the coupling seam and stop at the
  adapter interface.
- The mobile app's `app/src/screens/.../WebViewHostScreen` and WIA bundle pipeline — note any
  divergence from the SDK hosts' protocol as a `Needs investigation` lead, but do not audit the app
  screen here. The package-level RN SDK host (`packages/rn-sdk/src/SelfVerification.tsx`) is in
  scope because it is a shipped bridge implementation.
- Individual native capability **implementations** behind the handlers (the actual keychain crypto,
  the NFC reader — AUD-01/AUD-02 own those). You audit the handler dispatch, error mapping, and
  fail-closed behavior, not the crypto inside `CryptoHandler`.
- Bundle hosting / OTA policy as a product decision — but **do** flag the discrepancy between the
  shells' `https://self-app-alpha.vercel.app` remote default and the project's stated
  embedded-bundle-only posture for the RN app (see `project_wia_no_ota`); reconcile which product
  each applies to (Q2.4).
- Fixing anything. The workstream invariant is read-only.

## Question list (fixed — do not add questions mid-audit; new leads go to `Needs investigation`)

### Q1 — Origin trust and the message-injection boundary

1. **Q1.1 (suspected Major).** Native→WebView delivery is string-built JS evaluated via
   `evaluateJavascript`/`evaluateJavaScript`: RN SDK `escapeForJs`
   (`packages/rn-sdk/src/bridge/MessageRouter.ts:18-27`), Android `escapeForJs`
   (`MessageRouter.kt:150-160`) and iOS `escapeForJs` (`MessageRouter.swift:112-119`) hand-escape
   six sequences (`\`, `'`, `\n`, `\r`, U+2028, U+2029) and wrap in single quotes. Enumerate every
   character/sequence that can appear in a `BridgeResponse`/`BridgeEvent` JSON (which carries
   attacker-influenceable `details`, `message`, `data`) and prove the escape set is complete — or
   find a payload that breaks out of the string literal and executes in the WebView. Confirm all
   host implementations escape equivalently. This is the highest-severity question; verify carefully
   before fast-pathing.
2. **Q1.2 (suspected Major).** Trust gating differs across the host implementations. Android checks
   `isMainFrame` **and** `isTrustedBridgeOrigin` then passes the computed boolean
   (`AndroidWebViewHost.kt:191-205`); iOS checks `message.frameInfo.isMainFrame` and
   `isTrustedBridgeFrameInfo(securityOrigin)` then **hardcodes** `isTrustedSource: true`
   (`SelfWebViewHost.swift:116-122`). Confirm the iOS guard is equivalent (the `guard` returns
   before the call on failure) and that neither shell trusts a subframe or cross-origin frame for
   bridge traffic. Verify `isTrustedBridgeOrigin` excludes the Didit origin (`AndroidWebViewHost.kt:264-270`
   omits Didit, unlike navigation/permission trust) — i.e., Didit pages can navigate but cannot
   drive the bridge. For `packages/rn-sdk`, establish the equivalent trust model: `onMessage`
   accepts WebView frames without origin metadata (`SelfVerification.tsx:529-537`), the KMP-backed
   secure-storage path forwards selected messages to `SelfBridgeModule.routeMessage(...,
isTrustedSource = true)` (`SelfBridgeModule.kt:42-45`), and the safety claim appears to depend on
   embedded-bundle loading plus `__DEV__`-only dev-server use.
3. **Q1.3 (suspected Medium).** The TS client registers `_handleResponse`/`_handleEvent` as
   methods on the global `SelfNativeBridge` (`bridge.ts:74`, `:255`, `:273`). Any script running
   in the WebView main frame can call them and inject a forged response/event, satisfying a
   pending request (`resolveResponse`, `:287-311`) with attacker data. Establish the trust model:
   is this acceptable because only first-party bundle code runs in the frame, or does remote-loaded
   content (Q2.4) make it reachable? Document the assumption the design depends on.
4. **Q1.4.** `BrowserHostTransport` (`bridge.ts:38-59`, `:141-166`) accepts `targetOrigin: '*'`
   and, when set, skips the `event.origin` check (`:143`). Trace where `browserHost.targetOrigin`
   is configured and whether `'*'` is reachable in any shipped path — a wildcard origin on a
   `postMessage` channel that dispatches `lifecycle:cancel` events is a fail-open boundary.

### Q2 — Fail-closed invariants (the CLAUDE.md security contract)

1. **Q2.1.** Version gating: confirm all bridge routers reject
   `version !== BRIDGE_PROTOCOL_VERSION (1)`.
   TS `parseMessage` throws `Unsupported protocol version` (`schema.ts:104-107`); Android returns
   `UNSUPPORTED_VERSION` (`MessageRouter.kt:47-62`); iOS returns `UNSUPPORTED_VERSION`
   (`MessageRouter.swift:33-41`); RN SDK returns `UNSUPPORTED_VERSION`
   (`packages/rn-sdk/src/bridge/MessageRouter.ts:67-89`). Verify the TS **outgoing** path and
   `parseHostMessage` (`bridge.ts:438-446`) also pin version 1, and that there is no
   negotiation/downgrade path.
2. **Q2.2 (suspected Major).** Remote `devServerUrl`/debug-origin blocking in production. Android
   `initialContentUrl` `require(...startsWith("https://"))` in release (`AndroidWebViewHost.kt:235-237`)
   and only adds the debug `127.0.0.1:5173` origin rule when `isDebugMode`
   (`:282-293`); iOS gates `localhost:5173` on `isDebugMode` (`SelfWebViewHost.swift:51-62`,
   `:129-133`). RN SDK derives dev-server use from `__DEV__ && devServerUrl`
   (`SelfVerification.tsx:296`, `:543-548`) and otherwise loads embedded files (`:551-561`).
   Establish how `isDebugMode` / `__DEV__` is set in release builds on each platform and prove a
   release build cannot be coerced into loading or trusting `http://localhost` / `127.0.0.1`. If
   the debug flag can be flipped via config/intent/launch argument, that is a fail-open finding.
3. **Q2.3.** Domain/method dispatch: unknown domain → `DOMAIN_NOT_FOUND`/`UNKNOWN_DOMAIN`
   (`MessageRouter.kt:64-80`, `MessageRouter.swift:43-51`); unknown method → handler throws
   `METHOD_NOT_FOUND` (e.g. `LifecycleHandler.kt:30`). Confirm every registered handler
   default-denies unknown methods rather than no-opping, and that a generic `Exception` maps to
   `INTERNAL_ERROR`/`HANDLER_ERROR` without leaking native stack/PII into `error.message`
   (`MessageRouter.kt:109-123`, `MessageRouter.swift:70-77`,
   `packages/rn-sdk/src/bridge/MessageRouter.ts:142-171` use raw exception messages).
4. **Q2.4 (suspected Major — policy reconciliation).** The Android/iOS native shells default to
   loading the WebView from `https://self-app-alpha.vercel.app/tunnel/tour/1`
   (`AndroidWebViewHost.kt:212`, `SelfWebViewHost.swift:8`). The project memory states WIA loads
   from an **embedded bundle only**, with OTA/hosted URL rejected as an attack vector. Reconcile:
   does this remote default apply to a different product (native SDK shell vs RN SDK embedded host),
   and what integrity protection exists for remotely-loaded content (SRI, pinning, signed bundle)?
   Cross-check the RN SDK's file-loading
   posture (`SelfVerification.tsx:543-561`) and permissive WebView flags (`:631-637`). The report
   must force an owner decision
   on whether the remote default is the accepted posture for this surface.

### Q3 — Request/response lifecycle and resource safety (TS client `bridge.ts`)

1. **Q3.1 (suspected Medium).** `resolveResponse` keys pending requests by `response.requestId`
   (`bridge.ts:288`). A forged or duplicate response resolves and deletes the entry; a second
   response for the same id is a silent no-op (`:289-292`). Combined with Q1.3, trace whether a
   forged early response can pre-empt the real native response and whether the 30s timeout
   (`:197-200`) correctly fires when no response ever arrives. Confirm `fire()` (`:215-227`)
   genuinely needs no response and leaks no pending entry.
2. **Q3.2.** `destroy()` (`bridge.ts:351-372`) rejects all pending, clears listeners, nulls the
   global. Trace use-after-destroy: `send` throws (`:126-128`) but `fire` does not check
   `destroyed` before building the message (`:215`) — confirm whether `fire` after `destroy` throws
   via `send` or silently builds-and-drops. Establish there is no double-free / leaked timer.
3. **Q3.3.** `request` rejects when `!transport` (`:181-183`) but `send` only logs-and-drops the
   same condition (`:133-136`); reconcile the two and confirm a dropped fire-and-forget can't leave
   the WebView awaiting a UI state that never advances.

### Q4 — Session lifecycle and result-delivery races

1. **Q4.1 (suspected Major).** Android `LifecycleResultGate` (`LifecycleHandler.kt:58-68`) is a
   plain unsynchronized `Boolean` claimed inside `runOnUiThread` blocks. `dismiss` and `setResult`
   both `tryClaim()` then `activity.finish()` (`:33-55`). Trace concurrent `setResult`+`dismiss`
   (the WebView can fire both): is the gate's single-threaded confinement to the UI thread
   actually guaranteed for every caller, and can a `dismiss` after a claimed `setResult` still call
   `finish()` twice or clobber the result code? Cross-check the iOS race tests
   (`LifecycleHandlerRaceTests.swift`) for the equivalent guarantee and any asymmetry.
2. **Q4.2.** `setResult` success mapping: `RESULT_OK` vs `RESULT_FIRST_USER` keyed on
   `payload["success"] == true` (`LifecycleHandler.kt:49-50`, `:77`). Trace what the embedding app
   receives when `success` is absent, non-boolean, or the payload is the un-nested form
   (`extractPayload` falls back to `JsonObject(params)`, `:71-75`). Confirm a malformed result
   can't be read as success.
3. **Q4.3.** The `lifecycle:cancel` event path: browser-host `self:cancel` →
   `dispatchEvent` (`bridge.ts:151-164`). Trace that a cancel delivered after the verification
   already resolved is default-denied (no double-completion), tying back to the result gate.

### Q5 — Adapter coupling-layer integrity (`webview-bridge/src/adapters/`)

1. **Q5.1.** The adapters are the only code that crosses the bridge boundary on the TS side.
   Confirm none leak the `WebViewBridge` instance or raw transport to SDK/UI code, and that
   `createSdkAdapters` (`sdk-adapter-map.ts:35-68`) wires only interface-typed adapters. Flag any
   adapter that reaches around the bridge (side channel) — a CLAUDE.md invariant violation.
2. **Q5.2 (suspected Medium).** Response-shape validation in adapters is inconsistent. `crypto.ts`
   validates `signature`/`publicKey`/`keyRef` are non-empty strings and throws otherwise
   (`crypto.ts:30-33`, `:38-41`, `:46-49`); audit every other adapter (`auth`, `keychain-documents`,
   `nfc-scanner`, `navigation`, etc.) for whether they trust the bridge response shape blindly.
   A security-critical adapter (`auth.getPrivateKey`) returning an unvalidated bridge payload is a
   finding.
3. **Q5.3.** `navigation.goTo` builds a path with `new URLSearchParams(params)` and `navigate()`
   (`sdk-adapter-map.ts:51-57`). Trace whether route name / params from the WebView side can drive
   navigation to an unintended route, and confirm `scanner: webNFCScannerShim` (`:60`) is the
   correct no-op for the web/WebView context (NFC happens natively).

### Q6 — Schema completeness vs the typed contract

1. **Q6.1 (suspected Medium).** `parseMessage`/`validateRequest` (`schema.ts:50-56`) assert only
   `method` is a string and `params` is an object — **no per-method param validation**. The rich
   param types in `types.ts` (`NfcScanParams`, `BiometricAuthParams`, `VerificationResult`, …) are
   compile-time only and never enforced at the boundary. Establish where (if anywhere) params are
   validated before reaching a native capability, and what a handler does with missing/malformed
   params (e.g., `CryptoHandler` sign with absent `keyRef`). Note: native uses
   `ignoreUnknownKeys = true` (`MessageRouter.kt:21`) — confirm that's safe for forward-compat and
   doesn't silently drop required fields.
2. **Q6.2.** `mock.ts` (159 LOC) ships in the package. Confirm it's test-only / not bundled into a
   production transport path, and record for AUD-06 if it leaks into shipped builds.

### Q7 — Existing-coverage characterization

1. **Q7.1.** For the existing test suites — TS bridge client (`__tests__/`, 991 LOC), RN SDK
   (`packages/rn-sdk/src/__tests__/*.test.ts`, 1,920 LOC), Android (`src/test/**`, 1,385 LOC incl.
   `MessageRouterEscapeTest`), iOS (`Tests/**`, 1,461 LOC incl. `LifecycleHandlerRaceTests`) —
   record what each actually asserts versus mock wiring, and map every Q1–Q6 question to
   `covered / partially covered / uncovered`. The escape and race tests already exist; assess
   whether they cover the Q1.1 / Q4.1 scenarios or leave gaps. This table anchors the report's
   test-gap acceptance criteria and feeds AUD-04.

## Method

1. Work the questions in order Q1 → Q2 → Q4 → Q5 → Q3 → Q6 → Q7 (highest candidate severity
   first, so the time box truncates the tail, not the head).
2. For each question: trace the full call path with `path:line` citations across the TS bridge
   client, RN SDK host/router, Android shell, and iOS shell, then classify per the workstream
   severity rubric. Suspected severities above are priors, not conclusions. For
   cross-implementation questions (Q1.1, Q1.2, Q2.1, Q4.1), confirm parity or document the
   asymmetry explicitly — divergence between shells is itself a finding class.
3. Reproduce every confirmed Critical/Major as a characterization test pinning **current**
   behavior, in the implementation where it lives:
   - TS bridge client: extend `packages/webview-bridge/src/__tests__/` (`bridge.test.ts`,
     `schema.test.ts`, `adapters.test.ts`). Run with `yarn test` in the package.
   - RN SDK host/router: extend `packages/rn-sdk/src/__tests__/` (`MessageRouter.test.ts`,
     `KmpBridgeTransport.test.ts`, handler tests). Run with `yarn test` in the package.
   - Android native shell: extend `packages/native-shell-android/src/test/kotlin/xyz/self/sdk/...`
     (e.g. `MessageRouterEscapeTest`, a new `RemoteNavigationPolicyTest` if absent). Run the
     package Gradle test task.
   - iOS native shell: extend `packages/native-shell-ios/Tests/SelfNativeShellTests/`. Run via the
     package's Swift test command.
     Name tests so the linked finding is obvious
     (`describe('AUD-05 Q1.1: escapeForJs U+2028 breakout', ...)`).
4. The Q1.1 escape question must be answered by **constructing concrete payloads** and asserting
   the escaped output is inert, not by inspection — this is the load-bearing security claim.
5. Platform behavior you cannot establish from source (e.g., whether `isDebugMode` is reachable in
   a signed release, Q2.2) goes to `Needs investigation` with a named manual-test procedure
   (build variant, how the flag is set, expected vs observed), not a guess.
6. A confirmed Critical security finding (Q1.1 breakout, Q2.2 release debug-origin trust, Q2.4
   unprotected remote load) triggers the workstream fast-path immediately: confidential Linear
   issue with full detail the same day; the report carries a redacted reference.

## Deliverables

1. **Findings report** — `docs/reviews/2026-MM-DD-bridge-protocol-audit.md` with the workstream's
   required sections: header block, summary, severity-bucketed findings with per-finding
   acceptance criteria, `Needs investigation` leads with dispositions, follow-up issues grouped
   into PR-sized buckets (the `/gaps-to-issues` input), adversarial verification log, what works
   well, validation.
2. **Characterization tests** — merged in the audit PR, one per confirmed Critical/Major finding,
   in TS / RN TS / Kotlin / Swift as appropriate; documented manual-test procedures for
   build-variant findings (Q2.2).
3. **Cross-implementation parity table** — for Q1/Q2/Q4, a TS-client-vs-RN-SDK-vs-Android-vs-iOS
   row per invariant showing where each enforces, diverges, or omits a check. Included in the
   report.
4. **Coverage map** (Q7.1 table) — included in the report; copied to AUD-04's plan when scoped.
5. **Bridge-boundary input for AUD-09** — the adapter coupling-seam map (Q5) handed to the
   WebView-app audit.

## Files you will NOT modify

- Anything under `packages/webview-bridge/src/`, `packages/rn-sdk/src/`,
  `packages/rn-sdk/android/src/main/`, `packages/native-shell-android/src/main/`,
  `packages/native-shell-ios/Sources/` — the audit is read-only.
- Build configs, gradle/swift package manifests — if a new test needs a fixture the harness lacks,
  add it under the existing test directories only.
- `specs/projects/sdk/workstreams/audits/SPEC.md` — with one exception: you may update the
  AUD-05 **backlog row** (status, plan link) as required by the definition of done. Protocol
  text, invariants, and other rows are off limits; protocol changes you discover go in this
  plan's status log for the owner to apply.

## Validation

```bash
cd packages/webview-bridge
yarn build
yarn test
yarn typecheck

cd ../rn-sdk
yarn test
yarn typecheck

cd ../native-shell-android
./gradlew testDebugUnitTest

cd ../native-shell-ios
swift test
```

All suites must pass with the new characterization tests in place. The report's Validation section
records these commands and their output. If the iOS Swift toolchain is unavailable in the audit
environment, the iOS-side characterization tests are written and their intended assertions
documented, with execution deferred to CI — note this explicitly in the report.

## Definition of done

1. Every Q1–Q7 sub-question answered with citations across every in-scope bridge surface, or
   explicitly moved to `Needs investigation` with a disposition (workstream Stage 4 rules).
2. Findings report merged in `docs/reviews/` with all required sections and the parity table.
3. Characterization tests merged and green for every confirmed Critical/Major finding (TS bridge,
   RN SDK, and Android native shell at minimum; iOS executed in CI if not locally); manual-test
   procedures documented for build-variant findings.
4. Any confirmed Critical security finding fast-pathed at discovery (confidential issue exists,
   report redacted).
5. Adversarial review gate passed; owner status set.
6. Linear issues created for accepted Critical/Major findings; AUD-05 backlog row updated; any
   invariant this audit invalidates flagged in the owning workstream's `SPEC.md` (e.g., if Q2.4
   reconciliation changes the stated bundle-hosting posture).

## Status log

- 2026-06-11 — Plan pre-drafted from reconnaissance of the TS bridge client, Android native shell,
  and iOS native shell read at cited lines. Drafted before AUD-02 execution per the sequential
  pre-drafting rule; requires recon refresh + owner re-review at activation.
- 2026-06-11 — AUD-09 (WebView app surface) added to the backlog mid-drafting at owner request;
  scoped as the consumer of this bridge and made dependent on AUD-05 so this audit's adapter
  coupling-seam map (Q5) and origin-trust findings feed it. AUD-05's out-of-scope section updated
  to hand the WebView-app surface to AUD-09 rather than absorbing it.
- 2026-06-11 — Review pass added the omitted `packages/rn-sdk` bridge surface (router, handlers,
  WebView host, KMP transport/native module), corrected native-shell paths to include `packages/`,
  and replaced the stale `yarn kmp:test` validation with the native-shell Android Gradle test task.
