# WebView-Only Verification Experience — Implementation Spec

> Last updated: 2026-03-11
> Owner: WebView / Product Platform
> Project: [SDK Overview](../../OVERVIEW.md)
> Status: Active

## Scope Reset

On **March 11, 2026**, the active SDK scope changed to **WebView only, with no custom native modules**.

- The current client path should ship as a browser/WebView experience.
- Self-owned NFC, native MRZ/camera handlers, biometrics, keychain bridging, KMP shells, and RN native-shell packaging are out of scope for this workstream.
- End-to-end document capture and verification should route through a **web-capable KYC provider** such as Sumsub.
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

## Backlog

| ID    | Title                                                                                           | Status | Priority | Depends On | Plan                                                                                             | Notes                                                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------- | ------ | -------- | ---------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| WV-01 | Dynamic proof request items sourced from request context                                        | Done   | High     | -          | [plans/WV-01-dynamic-proof-request-items.md](./plans/WV-01-dynamic-proof-request-items.md)       | Existing active follow-up                                                                                                         |
| WV-02 | Define the KYC-provider contract for document capture, MRZ/liveness handoff, and result mapping | Done   | High     | -          | [plans/WV-02-kyc-provider-contract.md](./plans/WV-02-kyc-provider-contract.md)                   | Provider-backed path replaces Self-owned native scan flow; active contract is now documented                                      |
| WV-03 | Remove native NFC and native-scan assumptions from active WebView screens, copy, and docs       | Done   | High     | WV-02      | [plans/WV-03-remove-native-scan-assumptions.md](./plans/WV-03-remove-native-scan-assumptions.md) | Active UX/docs now route to a provider placeholder instead of Self-managed scan screens                                           |
| WV-04 | Define the host callback contract for launch, dismiss, and final result without native modules  | Done   | Medium   | WV-02      | [plans/WV-04-host-callback-contract.md](./plans/WV-04-host-callback-contract.md)               | Browser host fallback now uses `postMessage` for iframe/popup embedding while native transports keep their current behavior        |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

## Active Plans

| Plan                                                                                             | IDs   | Status |
| ------------------------------------------------------------------------------------------------ | ----- | ------ |
| [plans/WV-01-dynamic-proof-request-items.md](./plans/WV-01-dynamic-proof-request-items.md)       | WV-01 | Done   |
| [plans/WV-02-kyc-provider-contract.md](./plans/WV-02-kyc-provider-contract.md)                   | WV-02 | Done   |
| [plans/WV-03-remove-native-scan-assumptions.md](./plans/WV-03-remove-native-scan-assumptions.md) | WV-03 | Done   |
| [plans/WV-04-host-callback-contract.md](./plans/WV-04-host-callback-contract.md)                 | WV-04 | Done   |

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

For the active client path, Self delegates document capture and KYC to a web-capable provider and treats that provider as interchangeable. Sumsub is one example, not a hard dependency. This contract defines the Self-owned boundary that `WV-03` and `WV-04` build on.

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
- If provider `success` unlocks the KYC proof path and the later Self proof flow completes, Self emits `VERIFICATION_COMPLETE { success: true, verificationId, userId }`.
- If the verification session terminates after provider `partial`, `cancel`, or `error`, Self emits `VERIFICATION_COMPLETE { success: false, verificationId, userId, error }` using the normalized Self error code rather than the raw provider payload.

## Host Callback Contract

`WV-04` defines the lightweight host contract for the active WebView/browser path. The goal is to let a parent page, popup opener, or mobile WebView wrapper launch the flow and receive lifecycle callbacks without any custom native module.

### Transport Selection

- Android KMP, iOS KMP, and RN WebView transports remain the first-choice bridge path and are unchanged.
- When no native transport is available, `packages/webview-bridge` falls back to a browser host transport.
- The browser transport posts to `window.parent` when the flow is embedded in an iframe.
- If there is no parent frame but the flow was opened as a popup, the browser transport posts to `window.opener`.
- Browser host transport requires a `targetOrigin`. In development, the app may default to `*`. In production, the host must supply an explicit `targetOrigin` value in the launch URL or equivalent configuration.

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
- `self:dismiss`: sent when the user abandons or closes the flow. Payload is `{ reason: 'user_cancel' | 'back' | 'timeout' }`.

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
