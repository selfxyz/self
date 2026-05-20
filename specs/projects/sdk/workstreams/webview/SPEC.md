# WebView-Only Verification Experience — Implementation Spec

> Last updated: 2026-03-25
> Owner: WebView / Product Platform
> Project: [SDK Overview](../../OVERVIEW.md)
> Status: Active

## Scope Reset

On **March 11, 2026**, the active SDK scope changed to **WebView only, with no custom native modules**.

- The current client path should ship as a browser/WebView experience.
- Self-owned NFC, native MRZ/camera handlers, biometrics, keychain bridging, KMP shells, and RN native-shell packaging are out of scope for this workstream.
- End-to-end document capture and verification should route through a **web-capable KYC provider** (currently Didit).
- The paused native specs are preserved under [SDK Paused Work](../../paused/INDEX.md) for possible future reuse in Self Wallet or other mobile-native projects.

## North Star

- **Goal:** Deliver the Self verification flow as a WebView/browser-native experience that does not depend on custom native modules.
- **Success metric:** A host launches the web flow, the user completes provider-backed capture/KYC and Self proof steps, and the host receives a consistent result using a web-friendly integration contract.
- **Constraint:** If a feature requires custom native modules for the current client path, it belongs in paused work unless product scope changes.

## Context

**What you own now:**

- `packages/webview-app/` — primary UI and orchestration surface
- Web-native host integration patterns — URL params, postMessage, or equivalent minimal host callback contract
- KYC-provider handoff points and result mapping inside the web flow
- Active coordination with `packages/mobile-sdk-alpha/` for browser-safe engine behavior

**What is no longer in this workstream's active scope:**

- Custom native bridge handlers for NFC, camera/MRZ, biometrics, secure storage, or lifecycle
- KMP shell delivery
- RN native-shell delivery
- Native MRZ/NFC consolidation

## Execution Model

- Stable WebView-first context lives in this file.
- PR-sized execution lives under [`plans/`](./plans/).
- If work touches native-module delivery, stop and check [SDK Paused Work](../../paused/INDEX.md).

## Current Execution Note

The active screen-migration pass is intentionally narrower than the long-term
webview backlog.

- Registration and onboarding migration work should be treated as **faithful
  1:1 Euclid design ports with temporary mocked states**.
- Those mocked states may ship temporarily in prod until a later team replaces
  them with production flow logic.
- Logic and integration notes still belong in the specs, but they should be
  labeled as future follow-up work and should not drive implementation in the
  current design pass.
- Deprioritized 3.1 work currently includes **EU ID**, **Aadhaar**, and
  **Points**.

### Execution order

1. **Screen migration** (current) — WV-09, WV-12, then WV-13–WV-16
2. **Tunnel flow** (next) — WV-05, WV-06, WV-08 (real Didit + KYC + proving)
3. **Disclose** — WV-11 (real proving on the main disclose route)
4. **Social login** — not yet spec'd in this workstream
5. **Launch readiness** — not yet spec'd in this workstream

## Backlog

| ID             | Title                                                                                           | Status      | Priority | Depends On          | Plan                                                                                             | Notes                                                                                                                                                                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------- | ----------- | -------- | ------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WV-01          | Dynamic proof request items sourced from request context                                        | Done        | High     | -                   | [plans/WV-01-dynamic-proof-request-items.md](./plans/WV-01-dynamic-proof-request-items.md)       | Existing active follow-up                                                                                                                                                                                                                                                                                         |
| WV-02          | Define the KYC-provider contract for document capture, MRZ/liveness handoff, and result mapping | Done        | High     | -                   | [plans/WV-02-kyc-provider-contract.md](./plans/WV-02-kyc-provider-contract.md)                   | Provider-backed path replaces Self-owned native scan flow; active contract is now documented                                                                                                                                                                                                                      |
| WV-03          | Remove native NFC and native-scan assumptions from active WebView screens, copy, and docs       | Done        | High     | WV-02               | [plans/WV-03-remove-native-scan-assumptions.md](./plans/WV-03-remove-native-scan-assumptions.md) | Active UX/docs now route to a provider placeholder instead of Self-managed scan screens                                                                                                                                                                                                                           |
| WV-04          | Define the host callback contract for launch, dismiss, and final result without native modules  | Done        | Medium   | WV-02               | [plans/WV-04-host-callback-contract.md](./plans/WV-04-host-callback-contract.md)                 | Browser host fallback now uses `postMessage` for iframe/popup embedding while native transports keep their current behavior                                                                                                                                                                                       |
| WV-05          | Integrate KYC provider Web SDK into ProviderLaunchScreen                                        | In Progress | High     | WV-02               | [plans/WV-05-kyc-provider-sdk.md](./plans/WV-05-kyc-provider-sdk.md)                             | **Next phase.** Needs rework for Didit (prior Sumsub branch is stale)                                                                                                                                                                                                                                             |
| WV-06          | Wire KYC result through verification pipeline to host lifecycle callback                        | Ready       | High     | WV-05               | [plans/WV-06-kyc-result-flow.md](./plans/WV-06-kyc-result-flow.md)                               | **Next phase.** KYC result → kycResultStore → ConfirmIdentificationScreen → lifecycle.setResult()                                                                                                                                                                                                                 |
| WV-07          | SelfClient assembly and proving machine export for WebView                                      | Done        | High     | SC-03               | [plans/WV-07-selfclient-proving-assembly.md](./plans/WV-07-selfclient-proving-assembly.md)       | Export useProvingStore, map bridge→SDK adapters, keychain-backed documents, create real SelfClient                                                                                                                                                                                                                |
| WV-08          | Wire tunnel flow with real proving machine (register → disclose)                                | Ready       | High     | WV-05, WV-06, WV-07 | [plans/WV-08-tunnel-proving-flow.md](./plans/WV-08-tunnel-proving-flow.md)                       | **Next phase.** Replace mock tunnel proving with real provingMachine: KYC → store doc → prove → disclose → result                                                                                                                                                                                                 |
| WV-09          | Registration core (tour, outcomes, mocked provider handoff)                                     | Ready       | High     | -                   | [plans/WV-09-registration-core.md](./plans/WV-09-registration-core.md)                           | Critical path: 7 Euclid wrappers (tour + outcomes) plus mocked provider transitions; minimum viable registration spine                                                                                                                                                                                            |
| WV-10          | EU ID defer record                                                                              | Deferred    | Low      | -                   | [plans/WV-10-eu-id-helper-flow.md](./plans/WV-10-eu-id-helper-flow.md)                           | EU ID is a 3.1 follow-up alongside Aadhaar and Points; not part of the active registration mock-migration pass                                                                                                                                                                                                    |
| WV-11          | Disclose core                                                                                   | Ready       | High     | WV-07, WV-08        | [plans/WV-11-disclose-core.md](./plans/WV-11-disclose-core.md)                                   | **Next phase.** Request-context entry → proof request → generation → result                                                                                                                                                                                                                                       |
| WV-12          | Registration prompts (social sign-on, conflict, notifications)                                  | Ready       | Medium   | WV-09               | [plans/WV-12-registration-prompts.md](./plans/WV-12-registration-prompts.md)                     | 4 Euclid wrappers split from WV-09; not required for minimum registration spine                                                                                                                                                                                                                                   |
| WV-13          | Proof overlays, history, and post-proof support                                                 | Blocked     | Medium   | WV-11               | —                                                                                                | Spec needed; receipt, history, dialogues, success/backup prompts, KYC pending/success, Nova splash                                                                                                                                                                                                                |
| WV-14          | Home, document management, and ID data                                                          | Blocked     | Medium   | WV-11               | —                                                                                                | Spec needed; IDDataScreen, ManageDocumentsScreen, HomeScreen follow-through                                                                                                                                                                                                                                       |
| WV-15          | Recovery and backup surfaces                                                                    | In Progress | Low      | WV-14               | [plans/SELF-2504-onboarding-recovery-phrase.md](./plans/SELF-2504-onboarding-recovery-phrase.md) | Active slice: add onboarding recovery phrase route after registration success, before notifications. Remaining recovery/backup surfaces still need follow-up planning.                                                                                                                                            |
| WV-16          | Settings follow-through and support routes                                                      | Done        | Low      | WV-14               | —                                                                                                | Delivered: haptic wiring on all menu items, dev-mode mock generation fixed, Manage Documents description fixed, DevRouteMenu Settings + Tunnel groups added, settings screen tests. Deferred: notification toggle and backup-enabled persistence (requires storage design decision, not blocking UI completeness) |
| WV-17          | Recovery phrase restore flow for WebView and tunnel account recovery                            | In Progress | High     | WV-07, WV-08        | [plans/WV-17-recovery-phrase-restore-flow.md](./plans/WV-17-recovery-phrase-restore-flow.md)     | Existing recovery screens are UI-only in webview today. This spec wires phrase-based restore, selected-document validation, and tunnel resume without importing app-only providers.                                                                                                                               |
| WV-EUCLID-TODO | Shared UI to build in Euclid before adopting in WebView + RN app                                | In Progress | Medium   | -                   | [plans/WV-EUCLID-TODO.md](./plans/WV-EUCLID-TODO.md)                                             | Running backlog of components that belong in `@selfxyz/euclid` so WebView and the RN app share one implementation. Current items: Eligible Perks card (reverted on `codex/add-eligible-perks-card-to-id-data-view`).                                                                                              |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

## Active Plans

| Plan                                                                                             | IDs   | Status                                    |
| ------------------------------------------------------------------------------------------------ | ----- | ----------------------------------------- |
| [plans/WV-01-dynamic-proof-request-items.md](./plans/WV-01-dynamic-proof-request-items.md)       | WV-01 | Done                                      |
| [plans/WV-02-kyc-provider-contract.md](./plans/WV-02-kyc-provider-contract.md)                   | WV-02 | Done                                      |
| [plans/WV-03-remove-native-scan-assumptions.md](./plans/WV-03-remove-native-scan-assumptions.md) | WV-03 | Done                                      |
| [plans/WV-04-host-callback-contract.md](./plans/WV-04-host-callback-contract.md)                 | WV-04 | Done                                      |
| [plans/WV-05-kyc-provider-sdk.md](./plans/WV-05-kyc-provider-sdk.md)                             | WV-05 | In Progress (needs rework for Didit)      |
| [plans/WV-06-kyc-result-flow.md](./plans/WV-06-kyc-result-flow.md)                               | WV-06 | Ready                                     |
| [plans/WV-07-selfclient-proving-assembly.md](./plans/WV-07-selfclient-proving-assembly.md)       | WV-07 | Done                                      |
| [plans/WV-08-tunnel-proving-flow.md](./plans/WV-08-tunnel-proving-flow.md)                       | WV-08 | Ready                                     |
| [plans/WV-09-registration-core.md](./plans/WV-09-registration-core.md)                           | WV-09 | Ready                                     |
| [plans/WV-10-eu-id-helper-flow.md](./plans/WV-10-eu-id-helper-flow.md)                           | WV-10 | Deferred (out of initial webview release) |
| [plans/WV-11-disclose-core.md](./plans/WV-11-disclose-core.md)                                   | WV-11 | Ready                                     |
| [plans/WV-12-registration-prompts.md](./plans/WV-12-registration-prompts.md)                     | WV-12 | Ready                                     |
| [plans/WV-17-recovery-phrase-restore-flow.md](./plans/WV-17-recovery-phrase-restore-flow.md)     | WV-17 | In Progress                               |

## Completion Checklist

- [x] Active backlog reflects the WebView-only client scope
- [x] KYC-provider dependency is explicit wherever scan/KYC UX is described
- [x] Active docs do not imply Self-managed NFC or native scanning for the current client path
- [x] Host integration contract is clear without assuming custom native modules

## Problem Statement

The previous SDK plan assumed a shared WebView plus native shells for hardware-heavy features. That is no longer the active delivery target. The current client wants the WebView experience without custom native modules, which changes the implementation boundary:

- Web UI, proof orchestration, and result handling stay in Self-owned code.
- Capture-heavy verification steps should be delegated to a web-capable KYC provider.
- Host integration should stay lightweight and browser/WebView-native.

## Design Principles

1. **WebView-first means web-native first.** Prefer browser/WebView integration patterns over any platform-specific bridge.
2. **Do not rebuild KYC infrastructure in native code.** If end-to-end scanning or liveness is needed, use the provider flow instead of reviving Self-managed native modules.
3. **Keep active UX honest.** If a step is provider-owned or paused, the active specs and screens must say so.
4. **Preserve reusable work without letting it drive scope.** Historical native work lives in [SDK Paused Work](../../paused/INDEX.md).
5. **Keep the engine portable.** `mobile-sdk-alpha` still needs clean browser-safe behavior because it powers the active WebView flow.

## KYC Provider Contract

For the active client path, Self delegates document capture and KYC to a web-capable provider (currently Didit) and treats that provider as interchangeable. The contract is provider-agnostic. This defines the Self-owned boundary that `WV-03` and `WV-04` build on.

### Boundary Decisions

- The active contract is provider-agnostic. Provider-specific SDK/bootstrap details are implementation concerns, not part of the normative spec.
- The provider must return control to a Self-owned route or callback inside the same WebView/browser verification session.
- Self normalizes provider output inside the web flow before any host callback. Providers do not call the host lifecycle adapter directly.
- `SdkInitialConfig.verificationRequest` remains the host-supplied launch input. `VERIFICATION_COMPLETE` and the bridge lifecycle adapter remain the host-facing terminal surfaces.
- A provider `success` result is not the same thing as final verification success. It only means Self has enough provider-owned evidence to continue the Self proof path.

### Provider Launch Request

Self derives provider launch parameters from the active verification session plus `SdkInitialConfig.verificationRequest`.

Required launch fields:

- `verificationId`: Self correlation ID for the current verification session. Reuse this value in the final `VERIFICATION_COMPLETE` payload.
- `returnUrl`: Self-owned URL or callback target that re-enters the same WebView/browser flow after provider completion.

Pass through when present on `VerificationRequest`:

- `userId`: Host/user correlation key.
- `scope`: Proof scope used by downstream Self flows.
- `disclosures`: Requested disclosure set when provider policy selection needs it.

Optional Self context:

- `env`: `prod` or `stg` when Self must route to matching provider environments.

Provider auth tokens, SDK bootstrapping handles, and vendor-specific applicant/session IDs are intentionally out of scope for the public Self contract. They may exist in implementation code, but they do not change the launch contract above.

### Normalized Provider Result

Self expects provider output to normalize into this internal shape before any host callback:

```ts
type KycProviderResult = {
  status: 'success' | 'partial' | 'cancel' | 'error';
  verificationId: string;
  provider: string;
  providerSessionId?: string;
  providerApplicantId?: string;
  /** ISO 8601 UTC timestamp, for example 2026-03-11T18:42:15.000Z */
  completedAt?: string;
  attestation?: {
    serializedApplicantInfo: string;
    signature: string;
    pubkey: [string, string];
  };
  error?: {
    code:
      | 'provider_cancelled'
      | 'provider_timeout'
      | 'provider_rejected'
      | 'provider_missing_attestation'
      | 'provider_unavailable'
      | 'provider_protocol_error'
      | 'provider_unknown_error';
    message: string;
    retryable?: boolean;
    providerCode?: string;
  };
};
```

Status semantics:

- `success`: The provider reached a terminal approved/completed state and returned the full attestation payload required for Self proof work.
- `partial`: The provider returned a recognized but insufficient outcome, such as manual review, incomplete capture, or an approved session without the required attestation payload. Implementations must preserve whether the partial state is still review-pending or is structurally incomplete.
- `cancel`: The user or provider explicitly cancelled or abandoned the session.
- `error`: The provider flow failed because of timeout, transport failure, rejected callback payload, provider unavailability, or another technical/provider-side error.

### Required Downstream Fields For Self Proof Steps

Only a small subset of provider output is required for the Self proof path:

- `attestation.serializedApplicantInfo`
- `attestation.signature`
- `attestation.pubkey`

`serializedApplicantInfo` must encode the applicant fields currently consumed by the KYC circuit path in `@selfxyz/common`:

- `country`
- `idType`
- `idNumber`
- `issuanceDate`
- `expiryDate`
- `fullName`
- `dob`
- `photoHash`
- `phoneNumber`
- `gender`
- `address`

Self stores those fields as a `KycData` document (`documentCategory: 'kyc'`). The circuits consume the attestation blob plus signature/public key; they do not require raw provider capture artifacts.

Correlation fields required outside the circuit path:

- `verificationId`
- `providerSessionId`
- `providerApplicantId`

Provider data that is not required downstream for Self proof steps:

- raw MRZ text
- document images or selfies
- liveness recordings
- OCR confidence/debug output
- provider step-by-step audit logs

Those fields may be retained as provider evidence or for support operations, but they are outside the Self proof contract.

### Cancellation, Timeout, And Error Mapping

Normalize provider outcomes as follows:

- Provider-approved result with complete attestation payload: `status: 'success'`
- Provider-approved or provider-returned result without complete attestation payload: `status: 'partial'`, `error.code: 'provider_missing_attestation'`, `retryable: false`
- Provider state such as `pending`, `on_hold`, `manual_review`, or equivalent non-terminal review outcome: `status: 'partial'`, with no terminal host callback until Self decides the session has either resumed, expired, or been explicitly aborted
- Explicit close, cancel, back-out, or hosted-flow abandonment signalled by the provider: `status: 'cancel'`, `error.code: 'provider_cancelled'`
- User closes the host WebView/browser tab or Self loses the session before an explicit provider cancellation callback arrives: treat as `error`, `error.code: 'provider_timeout'`, unless the provider later confirms an explicit cancellation
- Session TTL expiry, callback deadline expiry, or no provider return within the Self-owned timeout window: `status: 'error'`, `error.code: 'provider_timeout'`, `retryable: true`
- Provider-declared rejection/failure outcome: `status: 'error'`, `error.code: 'provider_rejected'`
- Network/auth/bootstrap/callback-shape failures: `status: 'error'`, `error.code: 'provider_unavailable'` or `provider_protocol_error`

Host-facing mapping rules:

- Provider results are inputs to the Self flow, not direct host results.
- Only the full Self verification lifecycle emits `VERIFICATION_COMPLETE` or calls `lifecycle.setResult`.
- For the registration path, the terminal lifecycle event occurs when Self has stored the attested KYC document and the user confirms ownership. That registration session may emit `VERIFICATION_COMPLETE { success: true, verificationId, userId }` without running a ZK proof.
- For a disclose / proving path, provider-backed or previously stored identity data may unlock the later Self proof flow, and that separate session emits `VERIFICATION_COMPLETE { success: true, verificationId, userId }` when proving completes.
- If the verification session terminates after provider `partial`, `cancel`, or `error`, Self emits `VERIFICATION_COMPLETE { success: false, verificationId, userId, error }` using the normalized Self error code rather than the raw provider payload.

## Host Callback Contract

`WV-04` defines the lightweight host contract for the active WebView/browser path. The goal is to let a parent page, popup opener, or mobile WebView wrapper launch the flow and receive lifecycle callbacks without any custom native module.

### Transport Selection

- Android KMP, iOS KMP, and RN WebView transports remain the first-choice bridge path and are unchanged.
- When no native transport is available, `packages/webview-bridge` falls back to a browser host transport.
- The browser transport posts to `window.parent` when the flow is embedded in an iframe.
- If there is no parent frame but the flow was opened as a popup, the browser transport posts to `window.opener`.
- Browser host transport requires a `targetOrigin`. In development, the app may default to `*`. In production, the host must supply an explicit `targetOrigin` value in the launch URL or equivalent configuration, and URL-supplied `*` is rejected.

### Host Message Envelope

All browser-host lifecycle callbacks use this envelope:

```ts
type SelfHostMessage = {
  type: 'self:ready' | 'self:result' | 'self:dismiss';
  version: 1;
  payload: Record<string, unknown>;
};
```

Message semantics:

- `self:ready`: sent once the Self client mounts. Payload is `{}` or `{ verificationId }`.
- `self:result`: sent on the terminal verification outcome. Payload is `VerificationResult` with `success`, optional `userId`, optional `verificationId`, and optional `error`.
- `self:dismiss`: sent when the user abandons or closes the flow. Payload is `{}` for generic teardown or `{ reason: 'user_cancel' | 'back' | 'timeout' }` when Self can classify the exit path.

### Request Context

Hosts may supply these browser-host fields in the launch URL:

- `verificationId`: optional correlation key echoed in `self:ready` and terminal result payloads.
- `targetOrigin`: optional in development, required for production browser embedding. The app normalizes it to an origin string before using `postMessage`.

The existing request fields (`userId`, `scope`, `disclosures`, `appName`, `appEndpoint`, `timestamp`) remain unchanged.

### Lifecycle Wiring Rules

- `lifecycle.ready()` fires from `SelfClientProvider` as soon as the flow mounts, including `verificationId` when present.
- `lifecycle.setResult()` must receive the full `VerificationResult` payload from terminal screens, not `{ type }`.
- In browser-host mode, `lifecycle.setResult()` is fire-and-forget and must not wait for a native response or hit the 30-second bridge timeout.
- Explicit cancel and back-out actions must call `lifecycle.dismiss()` so the host can tear down the iframe, popup, or WebView shell.
- Result screens use `dismiss` for teardown when the terminal result was already sent. If a terminal screen failed before sending the result, it may retry `setResult()` instead.

### Host-Initiated Cancellation

- Hosts may post `self:cancel` with `version: 1` to the embedded flow.
- The browser bridge normalizes that into a `lifecycle:cancel` event inside the app.
- The active WebView app handles that event by returning to the home route without emitting another host callback.

## In Scope

- WebView/browser UX for the active verification flow
- Request-driven proof configuration and request-item rendering
- Provider handoff, loading, return, and result-mapping states
- Minimal host integration contract for launch/result/dismiss
- Documentation cleanup so the active spec set matches the new scope

## Out of Scope

- Self-managed NFC flows
- Self-managed native MRZ/camera scanning
- New native bridge handlers or bridge-protocol expansion to support the current client path
- KMP packaging, XCFramework/AAR publishing, or RN native-shell publishing
- Native consolidation cleanup work

## Definition of Done

> **Done when:** the active verification flow works as a WebView/browser-native experience, provider-backed capture/KYC is clearly integrated into the flow, hosts can launch and receive results without custom native modules, and the active SDK specs no longer depend on paused native assumptions.

## Validation

Use Yarn-based validation for active packages:

```bash
yarn workspace @selfxyz/mobile-sdk-alpha test
yarn workspace @selfxyz/mobile-sdk-alpha types
yarn workspace @selfxyz/webview-app build
```

## Related Specs

| Spec                                     | Relationship                                               |
| ---------------------------------------- | ---------------------------------------------------------- |
| [SDK Core Spec](../sdk-core/SPEC.md)     | Active dependency for browser/WebView-safe engine behavior |
| [SDK Overview](../../OVERVIEW.md)        | Current project scope and module status                    |
| [SDK Paused Work](../../paused/INDEX.md) | Historical native/KMP/RN work retained for future reuse    |
