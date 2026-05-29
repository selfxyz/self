# ANA-16: KYC Async Verdict Event

> Status: In Review
> Priority: High
> Depends on: ANA-12

- Workstream: analytics
- Backlog ID: ANA-16
- Branch: `feat/ana-16-kyc-verdict-event`

## Why

`KYC: Provider Closed outcome=completed` only means the user exited the third-party provider webapp. The actual identity verdict (approve/reject) arrives later, asynchronously, over websocket in `useKycWebSocket.ts`, which today emits no analytics. So true KYC conversion (provider-completed -> backend-approved) and the real rejection rate are not measurable, and the canonical `Scan Succeeded -> Proof Started` drop for KYC silently bundles rejected / pending / abandoned users.

## What

Add `KycEvents.VERIFICATION_RESOLVED` (`'KYC: Verification Resolved'`) emitted from the three `useKycWebSocket` socket handlers:

- `success` -> `outcome: 'approved'` (skipped when `kycData.mock`)
- `success` store failure -> `outcome: 'error'`, `error_code: 'store_failed'`
- `verification_failed` -> `outcome: 'rejected'`, `reason` (sanitized)
- `error` -> `outcome: 'error'`, `error_code: 'tee_error'`, `reason` (sanitized)

`duration_seconds` is provider-close-to-verdict latency, derived from the pending verification's `createdAt`. All payloads are non-PII (enum outcome, sanitized reason, provider id, latency).

Emission goes through a new SDK helper `trackKycVerdict` (in `onboardingFunnel.ts`). Unlike `trackBranchEvent`, it MUST emit even with no active attempt (the verdict often lands after the attempt is cleared / app restarted), stamping the funnel triple only when an attempt is still live, and no-opping for mock attempts.

## Out of scope

- Provider interior steps (selfie / liveness) - black box.
- Dashboard build - separate; the KYC funnel dashboard gets a Verification Resolved step once data lands.

## Validation

```bash
cd packages/mobile-sdk-alpha && yarn test onboardingFunnel && yarn types
cd app && yarn types
```

## Done

- `VERIFICATION_RESOLVED` constant + `trackKycVerdict` helper with unit tests.
- Emissions wired in all three `useKycWebSocket` handlers.
- Manual check: completed KYC -> `approved`; provider rejection -> `rejected`.
