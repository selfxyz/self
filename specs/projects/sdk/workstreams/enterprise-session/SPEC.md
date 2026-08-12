<!--
SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
SPDX-License-Identifier: BUSL-1.1
NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.
-->

# SPEC — Enterprise Session Mode (rn-sdk embed)

Status: Active · Updated 2026-08-03

Partner apps embedding `@selfxyz/rn-sdk` run Self Enterprise's session-based
flow: the partner backend creates a session (`@selfxyz/enterprise-sdk`
`sessions.create`, secret `sk_` key) and hands the app only the session
reference (the `verificationUrl` / session id). The SDK resolves the
verification config from edge-api's public session endpoint before the
WebView boots. The API key never reaches the client; results remain
authoritative only via the partner's `verification.completed` webhook.

## Architecture decision

Resolution happens **on the RN host side, before the WebView boots**
(`EnterpriseSessionGate` in `packages/rn-sdk/src/SelfVerification.tsx`). By
boot time the WebView sees an ordinary inline embed request, so:

- SPEC-MODES stays intact (two modes; embed's fail-closed `userId`+`scope`
  validation passes unchanged) — no third mode, no bridge protocol change.
- No CORS (RN `fetch`, not the `file://`-origin WebView).
- The session id — a bearer secret; see Security — never appears in the
  WebView URL and is excluded from diagnostics.

The resolver (`packages/rn-sdk/src/enterpriseSession.ts`) replicates the
hosted page's client-side SelfApp derivation (self-dashboard
`apps/hosted-page/.../buildDisclosures.ts`, `self-sdk.config.ts`), an
intentional duplication until ES-01 moves it server-side:

| Request field | Derivation from `GET /v1/sessions/:id` |
|---|---|
| `scope` | `orgId` dashes stripped, first 30 chars |
| `appEndpoint` | `verifier[.staging].self.xyz/verify` by `environment` (`test`→staging) — pinned client-side; not in any API response |
| `endpointType` / `environment` | `test` → `staging_https`/`stg`, else `https`/`prod` |
| `userId` / `userIdType` | `externalUuid` / `uuid` |
| `appName` | `flowName` ?? `Self Verification` |
| `disclosures` | `predicatesConfig` → boolean keys (`fullName`→`name`, `documentNumber`→`passport_number`, `dateOfBirth`→`date_of_birth`, `gender`, `nationality`, `expirationDate`→`expiry_date`, `issuingState`→`issuing_state`) + `minimumAge:<n>` + `ofac`; non-empty `includedCountries` → request `nationality` (allowlist enforced verifier-side) |
| `userDefinedData` | **exactly** `{"verificationId":"<session-uuid>"}` — the verifier's only proof↔session correlation (parsed from `userContextData.slice(128)`) |
| `verificationId` | session uuid (preserves the host↔`selfApp.sessionId` invariant) |
| `version` | `2` (webview parser defaults to 1) |

Lifecycle handled client-side (edge-api has no expiry sweeper): local
`expiresAt` check, `status !== 'pending'` rejection. Typed failures:
`SESSION_REF_INVALID` / `SESSION_NOT_FOUND` / `SESSION_EXPIRED` /
`SESSION_ALREADY_PROCESSED` / `SESSION_RESOLVE_FAILED`, surfaced through
`onFailure` and a retryable error overlay.

`verificationUrl` parsing accepts both today's UUID path segment and the
planned opaque `verify_<env>_<random>` token (edge-api comments say the URL
flips to token-as-canonical-id later).

## Security

- The session UUID is a bearer capability (~122 bits) — and post-completion
  the public GET returns `proofAttributes` (disclosed PII). Never log it,
  never put it in analytics/diagnostics payloads (the resolver emits only the
  error `code` in `onLoadDiagnostic`).
- Completion signals to the client (`onSuccess`) are UX-only; partners must
  trust only the signed webhook.

## Backlog

| ID | Title | Status | Notes |
|---|---|---|---|
| ES-01 | Server-derived `selfApp` block on `GET /v1/sessions/:id` | Open (enterprise team) | Removes the client-side derivation duplication; the verifier base URL is the one input absent from every API response today. Also: gate `proofAttributes` on the public GET (PII readable by UUID post-completion); fix `sessionDetailResponse` schema drift vs the wire `PublicSessionResponse`; confirm timing of the UUID→token URL flip. |
| ES-02 | rn-sdk session resolution + request surface | Done | `enterpriseSession.ts` resolver + `EnterpriseSessionGate`; `VerificationRequest.enterpriseSession`; 19 unit tests. |
| ES-03 | Example app enterprise mode | Done | `rn-sdk-example-app` third launch mode; zero-setup via edge-api's magic test id `acedaced-aced-4ace-aced-acedacedaced` (canned pending session, `minimumAge: 18`, never expires — verified live). |
| ES-04 | WebView-side resolution for non-RN hosts | Deferred | KMP/native shells need the resolve inside webview-app (async `VerificationRequestProvider`), which requires the SPEC-MODES amendment. Also deferred: Self-app deeplink ingestion of `verify.self.xyz/s/...` (universal-link entitlements only cover `redirect.self.xyz`). |

## Validation

```bash
pnpm --filter @selfxyz/rn-sdk test && pnpm --filter @selfxyz/rn-sdk typecheck
pnpm --filter @selfxyz/rn-sdk-example-app types
```

On-device (example app): paste the magic test id → resolving overlay → embed
disclose screen shows minimum-age 18 — proves resolve + derivation + routing
against the real API. Full-proof e2e: create a staging session with a real
flow, verify with a registered document, poll `GET /v1/sessions/:id` to
`valid` and confirm the partner webhook fired.
