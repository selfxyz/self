# Didit Liveness Enablement (Self Wallet, iOS + Android)

> Last updated: 2026-04-30
> Status: Ready

- Workstream: webview (KYC-provider-contract follow-up; implementation lives in `app/`)
- Backlog IDs: WV-18
- Owner: Mobile / KYC
- Branch: TBD
- PR: TBD

## Why

- Didit liveness is an available anti-spoofing layer (3D flash, passive, etc.) configurable per workflow at the Didit Business Console. The Self Wallet currently launches Didit verification through a workflow that does not require liveness, so spoof attempts (printed photo, replay) are not gated.
- The `@didit-protocol/sdk-react-native` SDK has no client-side toggle for liveness — it executes whatever the workflow declares (verified against Didit docs: liveness is a workflow-level setting, not an SDK parameter). Enabling liveness for iOS + Android is therefore primarily a workflow / TEE configuration change, with one mandatory client fix to make the gate effective.
- The mandatory client fix: `useKycLauncher.ts` does not branch on `session.status` and currently routes a Didit-`Declined` outcome (the status returned when liveness fails) to `KycSuccess`. The web path in `packages/webview-app/src/utils/kycProvider.ts` handles this correctly; the native app does not. Without this fix, turning on liveness would still let users complete registration after a failed liveness check.

## Scope

This spec covers **server-side enforced liveness, gate fix only**: liveness runs as part of the Didit workflow and a failed check produces a `Declined` session that the TEE refuses to attest. The verdict is not added to the KYC byte layout and is not visible to circuits. The client trusts the TEE. Failure copy stays generic — liveness-specific UX is a separate follow-up (see "Follow-ups").

Specifically:

1. Coordinate with the Didit Console + KYC TEE owners so that:
   - The active workflow used by `${KYC_TEE_URL}/session` has 3D Flash liveness enabled.
   - The TEE returns a `Declined` session status for sessions where Didit reports a liveness failure and does not produce a signed `serializedApplicantInfo` for those sessions.
2. Fix the `Declined`-as-success bug across **all three** native call sites of `launchKycVerification` so a liveness-driven decline routes to the existing `KycFailure` screen. The web path (`packages/webview-app/src/utils/kycProvider.ts:96-119`) already handles `Declined` correctly and is not changed.
3. Mirror the web path's status mapping: `session.status === 'Approved'` → success, `'Declined'` → `KycFailure`, anything else → `KycFailure` with `canRetry: true`.
4. Manual test: spoof attempt (printed photo / replay video) on iOS simulator and Android emulator/device produces a `KycFailure` route from each entry point. Live attempt completes normally.

## Out of Scope

- **Attested / circuit-visible liveness.** Adding a liveness verdict byte to the 295-byte KYC layout in `common/src/utils/kyc/constants.ts`, threading it through `packages/webview-app/src/utils/buildKycDocument.ts`, and exposing it as a selectable field. Tracked separately as a follow-up.
- **Liveness-specific failure UX.** The `KycFailure` route accepts only `{ countryCode?, canRetry? }` (`app/src/navigation/types.ts:173`) and `KycFailureScreen.tsx` renders fixed generic copy. Plumbing a liveness-specific message would require new route params, screen branching, copy decisions, and a `declineReason` shape that mirrors whatever Didit's RN SDK actually emits. That is a separate spec.
- **Tightening `KycVerificationResult.session.status`.** Leaving as `string` for this PR. A discriminated union would require a real `KycKnownStatus | { kind: 'unknown'; raw: string }` shape and consumer updates; not worth the change for a gate-only fix.
- **Bumping the Didit RN SDK or iOS/Android native pods.** `@didit-protocol/sdk-react-native@3.2.8` and `DiditSDK` 3.2.6 already execute whatever the workflow specifies. 3D Flash predates 3.2.x.
- **Web (`webview-app`) liveness.** The web path already handles `Declined` correctly. Enabling liveness in the web flow is a Console-only change against the same workflow.
- **Any change to `KYC_TEE_URL` configuration in `app/env.ts`.** The endpoint stays the same; the workflow it points at is what gains liveness.
- **Selector / disclosure UX.** Liveness is not a disclosable field in this spec.

## Files to Modify

Three native call sites currently call `launchKycVerification` and only branch on `result.type`. All three must additionally branch on `result.session?.status === 'Declined'` and route to `KycFailure` instead of `KycSuccess`:

- `app/src/hooks/useKycLauncher.ts:88-119` — primary launcher hook used by document scan/NFC trouble screens, Aadhaar, and registration fallback. After the `result.type === 'completed'` branch, route `session.status === 'Declined'` to the existing `onError` / `KycFailure` path with `canRetry: true`. Anything other than `'Approved'` also goes to `KycFailure`.
- `app/src/providers/selfClientProvider.tsx:362` — second call site, inside the proving flow. Same status branching; the proving machine must not advance when status is not `'Approved'`.
- `app/src/screens/documents/selection/LogoConfirmationScreen.tsx:81-111` — third call site (non-chip-document branch). Currently routes any `result.type === 'completed'` directly to `KycSuccess`. Add the `Declined` → `KycFailure` branch and call `failOnboardingAttempt(selfClient, 'scan_started', 'kyc_declined:<status>')` for telemetry parity with the existing `kyc_failed:` path.

Other:

- `app/src/integrations/kyc/kycService.ts:69` — no behavior change. Add a one-line code comment noting that liveness is workflow-controlled, not an SDK parameter, so future readers don't try to add a flag here.
- `app/tests/` — Jest tests covering `useKycLauncher`, `LogoConfirmationScreen`, and the `selfClientProvider` KYC handler. Each test drives a `{ type: 'completed', session: { status: 'Declined' } }` mock and asserts the failure path (no `KycSuccess` navigation, no proving-machine advance). Honor the test-memory rules from `app/AGENTS.md` and `feedback_test_memory_oom.md`: hoisted imports, `Mock*` aliases, no nested `require('react-native')`, tests under `app/tests/`.
- `specs/projects/sdk/workstreams/webview/SPEC.md` — already updated alongside this spec (backlog row + Active Plans row for WV-18).

## Files Not to Modify

- `common/src/utils/kyc/constants.ts` (byte layout — out of scope; touching this is the attested-liveness follow-up).
- `packages/webview-app/src/utils/kycProvider.ts` and `buildKycDocument.ts` (web path; already correct for Declined).
- `app/env.ts` and `.env*` (no new environment variables; workflow ID stays TEE-side).
- iOS `Podfile` / `Podfile.lock` and Android `build.gradle`. No SDK or pod bump in this PR (per Decisions: 3D Flash predates 3.2.x).
- Any KYC circuit code in `circuits/`.

## Preconditions

- **Didit Business Console** (out of repo, ops/product owned): the workflow that the KYC TEE creates sessions against has a liveness feature enabled with an agreed threshold.
- **KYC TEE backend** (separate repo — confirm location with the TEE owner; not present in `selfapp`): does not produce a signed `serializedApplicantInfo` for sessions where Didit reports a failed liveness, and surfaces `Declined` status to the client. If the TEE currently passes through any Didit outcome unmodified, no change is needed beyond pointing it at the liveness-enabled workflow.
- **Coordination order:** TEE/console change can ship before the client fix without harm (current client would still incorrectly mark a liveness-declined session as success — same as today's behavior for non-liveness declines, so no regression). The client fix can ship before the TEE/console change without harm (just no decline outcomes to handle yet). Either order is safe; recommend client-fix lands first so the gate is wired before liveness is turned on.

## Decisions

- **Liveness method: 3D Flash.** Self's threat model (ZK identity proofs tied to a real human) demands the strongest available anti-spoof; passive single-image is insufficient against video replay. Configured on the Didit Console; no client impact.
- **Threshold: Didit default.** Tune later from telemetry; do not block this PR on a number.
- **Fix all three native call sites identically.** Hook + proving provider + LogoConfirmationScreen. Centralizing this in a shared helper is tempting but out of scope — three small symmetric edits is less risky than introducing a new abstraction in this PR.
- **Generic failure copy.** Do not change `KycFailureScreen` or its route params. Liveness-specific UX is a separate spec.
- **Do not bump the Didit RN SDK or iOS pod.** 3D Flash predates 3.2.x.

## Implementation Steps

1. Update `app/src/hooks/useKycLauncher.ts` to branch on `result.session?.status` after `result.type === 'completed'`. Mirror `packages/webview-app/src/utils/kycProvider.ts:96-119`: `'Approved'` → success path, anything else → existing failure path (`onError` if provided, otherwise `navigation.navigate('KycFailure', { countryCode, canRetry: true })`).
2. Apply the same branching in `app/src/providers/selfClientProvider.tsx:362`.
3. Apply the same branching in `app/src/screens/documents/selection/LogoConfirmationScreen.tsx:107-111`. Add `failOnboardingAttempt(selfClient, 'scan_started', 'kyc_declined:<status>')` on the new non-Approved branch for telemetry symmetry with the existing `kyc_failed:` path.
4. Add the one-line comment to `app/src/integrations/kyc/kycService.ts:69` noting workflow-controlled liveness.
5. Add Jest tests per "Files to Modify".
6. Manual test on iOS simulator + Android emulator against a TEE staging env pointed at a 3D Flash-enabled workflow, exercising **all three entry points**:
   - Hook entry: e.g. `DocumentCameraTroubleScreen` → "Try Alternative Verification".
   - Proving entry: registration through `selfClientProvider`.
   - Logo confirmation entry: non-chip document selection → "Proceed with an external verifier".
   - For each: spoof (printed photo) → `KycFailure`; live capture → `KycSuccess`; cancellation → existing cancel path.
7. Coordinate ship order with the TEE/Console owner per "Preconditions".

## Validation

```bash
# From repo root
yarn lint && yarn types

# From app/
cd app && yarn test --testPathPattern='(useKycLauncher|LogoConfirmation|selfClientProvider)'
node scripts/check-test-requires.cjs

# Build sanity (per app/AGENTS.md Pre-PR Checklist)
yarn ios     # iOS simulator builds
yarn android # Android emulator builds
```

Expected:

- New tests pass; no Declined-as-success regressions in existing tests.
- iOS and Android builds succeed; no native-pod changes.
- Manual liveness spoof on staging produces a `KycFailure` route from each of the three entry points on both platforms.

## Definition of Done

- [ ] `useKycLauncher.ts`, `selfClientProvider.tsx:362`, and `LogoConfirmationScreen.tsx` all branch on `session.status` and route non-`Approved` outcomes to the existing `KycFailure` path.
- [ ] Jest tests cover the `Declined` → failure routing for each of the three call sites.
- [ ] `webview/SPEC.md` backlog and Active Plans tables include WV-18 (already done alongside this spec).
- [ ] Manual spoof + live test from each of the three entry points on iOS and Android against a 3D Flash-enabled staging workflow, recorded in the PR description.
- [ ] PR targets `dev`, well under the 1k–3k LOC target.

## Follow-ups (separate specs, not this PR)

- **Attested liveness in the KYC byte layout.** Add 1–2 bytes for liveness verdict + threshold in `common/src/utils/kyc/constants.ts`, update `KYC_REVEAL_DATA_INDICES`, `KYC_SELECTOR_BITS`, parsers in `webview-app/src/utils/buildKycDocument.ts`, the corresponding KYC circuit, and any selector UI. Coordinate a TEE serializer bump in lockstep. Circuit-visible change; requires a backwards-compatibility plan for already-issued KYC documents.
- **Liveness-specific failure UX.** Extend `KycFailure` route params with a `declineReason` shape, branch the screen copy, and plumb the reason from the RN SDK callback. Depends on confirming Didit's actual decline payload shape.
- **Centralized status mapping.** Once the three call sites stabilize, extract the `result.type` + `session.status` mapping to a single helper in `app/src/integrations/kyc/`. Skipped here to keep the PR diff minimal.
- **Liveness telemetry.** Analytics event from the failure branches if product wants visibility into liveness failure rates.

## Status Log

- 2026-04-30: Created. Decision: server-side enforcement only; attested liveness, liveness-specific UX, and helper extraction all deferred. Identified the `Declined`-as-success bug across three call sites (`useKycLauncher.ts`, `selfClientProvider.tsx:362`, `LogoConfirmationScreen.tsx:81-111`) as the precondition for an effective liveness gate.
