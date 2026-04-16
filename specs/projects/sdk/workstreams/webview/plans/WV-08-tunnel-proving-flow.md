# WV-08: Wire Tunnel Flow with Real Proving Machine

> Last updated: 2026-03-24
> Status: Ready
> Priority: High
> Depends on: WV-05 (In Progress), WV-06 (Ready), WV-07 (Done)

- Workstream: webview
- Backlog ID: WV-08
- Owner: TBD
- Branch: TBD
- PR: TBD

## Phase Note

This spec is **next phase** work — blocked on provider integration (WV-05)
and KYC result persistence (WV-06) landing first. The tunnel flow currently
uses mocked proving; this spec replaces it with the real pipeline.

## Why

The tunnel flow is currently a pure UI mockup — hardcoded data, a 3-second
timer for "proving," and no real backend interaction. With WV-07 landing
`SelfClient` and `useProvingStore` in webview-app, the tunnel flow can drive
real ZK proof generation.

The tunnel flow is the first end-to-end integration: **KYC provider → store
document in keychain → provingMachine (register) → disclose →
lifecycle.setResult()**. Getting this working validates the entire WebView
proving pipeline.

## Prerequisites

- **WV-07 done** — `SelfClient` available in webview-app, `useProvingStore`
  accessible, keychain-backed documents adapter working
- **WV-05 done** — KYC provider SDK integrated in `ProviderLaunchScreen`
- **WV-06 done** — KYC result normalization into `KycProviderResult`

## What You Will Do

### 1. Wire KYC provider result → document storage

**File:** `packages/webview-app/src/screens/tunnel/` (new or modified screen)

After the KYC provider returns a successful `KycProviderResult`:

1. Extract attestation data (`serializedApplicantInfo`, `signature`, `pubkey`)
2. Transform into an `IDDocument` (using `@selfxyz/common` parsing utilities)
3. Call `storePassportData(selfClient, document)` — this persists to native
   keychain via the `createKeychainDocumentsAdapter` from WV-07

The KYC provider result contains the fields the circuit needs: country, idType,
idNumber, issuanceDate, expiryDate, fullName, dob, photoHash, phoneNumber,
gender, address.

### 2. Replace mock TunnelProvingScreen with real proving

**File:** `packages/webview-app/src/screens/tunnel/TunnelProvingScreen.tsx`

Replace the 3-second timer mock with real proving machine integration:

```typescript
import { useProvingStore } from '@selfxyz/mobile-sdk-alpha/browser';
import { useSelfClient } from '../../providers/SelfClientProvider';

export const TunnelProvingScreen: React.FC = () => {
  const { client } = useSelfClient();
  const currentState = useProvingStore(s => s.currentState);
  const init = useProvingStore(s => s.init);
  const error_code = useProvingStore(s => s.error_code);
  const reason = useProvingStore(s => s.reason);

  useEffect(() => {
    // Init proving machine with 'register' circuit type
    init(client, 'register');
  }, [client, init]);

  // Drive ProofGenerationScreen UI from currentState
  // idle → parsing_id_document → fetching_data → validating_document
  // → init_tee_connexion → ready_to_prove → proving → post_proving → completed
};
```

**State → UI mapping:**

| provingMachine state      | UI shown                                      |
| ------------------------- | --------------------------------------------- |
| `idle`                    | Loading spinner                               |
| `parsing_id_document`     | "Preparing document..."                       |
| `fetching_data`           | "Fetching verification data..."               |
| `validating_document`     | "Validating document..."                      |
| `init_tee_connexion`      | "Connecting to prover..."                     |
| `ready_to_prove`          | "Ready" (auto-confirm or user confirms)       |
| `proving`                 | "Generating proof..." (with Euclid animation) |
| `post_proving`            | "Finalizing..."                               |
| `completed`               | Navigate to result screen (success)           |
| `error` / `failure`       | Navigate to result screen (error with code)   |
| `passport_not_supported`  | Show unsupported document error               |
| `passport_data_not_found` | Show missing document error                   |

### 3. Wire disclose flow after register

**File:** `packages/webview-app/src/screens/tunnel/TunnelProvingScreen.tsx`

The tunnel flow runs register → disclose in sequence. After `completed` state
for register:

1. Listen for `completed` state on register circuit
2. Re-init proving machine with `'disclose'` circuit type
3. Show disclosure proving UI
4. On disclose `completed`, navigate to result screen

Use `useProvingStore` subscription to detect state transitions:

```typescript
useEffect(() => {
  if (currentState === 'completed' && circuitPhase === 'register') {
    // Register done, start disclose
    setCircuitPhase('disclose');
    init(client, 'disclose');
  } else if (currentState === 'completed' && circuitPhase === 'disclose') {
    // Both done, navigate to result
    navigate('/tunnel/proof/result', { state: { success: true } });
  } else if (currentState === 'error' || currentState === 'failure') {
    navigate('/tunnel/proof/result', {
      state: { success: false, error_code, reason },
    });
  }
}, [currentState, circuitPhase]);
```

### 4. Update TunnelResultScreen with real result

**File:** `packages/webview-app/src/screens/tunnel/TunnelResultScreen.tsx`

Replace hardcoded success with navigation state from proving:

- Success: show "Identity Verified" with Euclid StatusState
- Failure: show error with code and reason, offer retry
- On "Continue": call `lifecycle.setResult()` then `lifecycle.dismiss()`

### 5. Wire tunnel route sequence

**File:** `packages/webview-app/src/App.tsx`

Update tunnel routes if needed. The flow becomes:

```
/tunnel/tour/:step
  → /tunnel/kyc
  → /tunnel/registration/country
  → /tunnel/registration/id-type
  → /tunnel/provider (KYC provider — from WV-05)
  → /tunnel/provider-result (normalize KYC result — from WV-06)
  → /tunnel/proof/generating (real provingMachine — this spec)
  → /tunnel/proof/result (real result — this spec)
```

### 6. Handle user confirmation gate

**File:** `packages/webview-app/src/screens/tunnel/TunnelProofReceiptScreen.tsx`

The proving machine has a `ready_to_prove` state where it waits for user
confirmation. Wire the receipt screen's "Verify" button to call
`useProvingStore.getState().setUserConfirmed(client)` so the proving machine
transitions from `ready_to_prove` → `proving`.

Alternatively, pass `userConfirmed: true` to `init()` to auto-confirm in the
tunnel flow.

## Files You Will Modify

| File                                                                   | Change                                   | Risk       |
| ---------------------------------------------------------------------- | ---------------------------------------- | ---------- |
| `packages/webview-app/src/screens/tunnel/TunnelProvingScreen.tsx`      | Replace mock with real provingMachine    | **Medium** |
| `packages/webview-app/src/screens/tunnel/TunnelResultScreen.tsx`       | Wire real result from proving state      | **Low**    |
| `packages/webview-app/src/screens/tunnel/TunnelProofReceiptScreen.tsx` | Wire user confirmation to provingMachine | **Low**    |
| `packages/webview-app/src/App.tsx`                                     | Update tunnel routes if needed           | **Low**    |
| `specs/projects/sdk/workstreams/webview/SPEC.md`                       | Add WV-08 to backlog                     | **None**   |

## Files You Will NOT Modify

| File                                                         | Why                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| `packages/mobile-sdk-alpha/src/proving/provingMachine.ts`    | Engine unchanged — consumed as-is                      |
| `packages/webview-bridge/**`                                 | Bridge layer unchanged — WV-07 already handled mapping |
| `packages/native-shell-android/**`                           | No new native handlers needed                          |
| `packages/native-shell-ios/**`                               | No new native handlers needed                          |
| `packages/webview-app/src/screens/proving/ProvingScreen.tsx` | Non-tunnel proving screen — separate concern           |
| `packages/webview-app/src/providers/SelfClientProvider.tsx`  | Already wired in WV-07                                 |

## Files You May Create

| File                                                               | What                                               |
| ------------------------------------------------------------------ | -------------------------------------------------- |
| `packages/webview-app/src/hooks/useProvingFlow.ts`                 | Optional: shared hook for register→disclose chain  |
| `packages/webview-app/src/screens/tunnel/TunnelProviderScreen.tsx` | If tunnel needs its own KYC provider launch screen |

## Constraints

- **No provingMachine changes.** The engine is consumed as-is from
  mobile-sdk-alpha. If behavior doesn't match expectations, file a separate
  SDK Core issue.
- **Tunnel flow is the proving integration point.** Do not change the
  non-tunnel `ProvingScreen` — that follows a different flow (external app
  requests proof of an already-registered document).
- **Register then disclose.** The tunnel flow always runs both circuits in
  sequence. Register creates the on-chain identity, disclose proves specific
  attributes to the requesting party.
- **The KYC provider provides the document.** NFC scanning is not part of this
  flow. The `IDDocument` is constructed from the provider's KYC attestation, not
  from passport chip data.

## Resolved Questions

1. **IDDocument shape from KYC attestation** — `KycData` (from
   `@selfxyz/common/utils/types`) is already a subtype of `IDDocument`.
   Construct it directly from the provider's attestation:
   ```typescript
   const kycData: KycData = {
     documentType: deserializeApplicantInfo(attestation.serializedApplicantInfo)
       .idType,
     documentCategory: 'kyc',
     mock: false,
     signature: attestation.signature,
     pubkey: attestation.pubkey,
     serializedApplicantInfo: attestation.serializedApplicantInfo,
   };
   ```
   `deserializeApplicantInfo()` from `@selfxyz/common/utils/kyc/api` parses
   the base64 blob into structured fields. The proving machine calls this
   internally when it needs circuit inputs. The RN app has a reference
   implementation in `app/src/hooks/useSumsubWebSocket.ts` (note: that file
   still uses prior Sumsub naming).
2. **DSC circuit** — Not needed for KYC documents. The tunnel flow runs
   `register → disclose` only. DSC is only relevant for NFC-scanned
   passports where the Document Signer Certificate needs updating.
3. **Auto-confirm vs user gate** — Deferred. This is a design decision for
   when the full Euclid screen set is integrated. For now, use
   `userConfirmed: true` in the `init()` call to auto-confirm. The receipt
   screen already shows disclosures before proving starts.

## Validation

```bash
# webview-app builds
cd packages/webview-app && yarn build

# Manual: launch tunnel flow in test app, verify:
# 1. KYC provider completes → document stored in keychain
# 2. Proving machine transitions through states
# 3. Proof generated successfully (or meaningful error)
# 4. Result screen shows real outcome
# 5. lifecycle.setResult() sends proof to host
```

## Definition of Done

- [ ] TunnelProvingScreen drives real provingMachine (no 3-second mock)
- [ ] KYC provider result stored as IDDocument in native keychain via secureStorage
- [ ] Register circuit runs to completion (or meaningful error state)
- [ ] Disclose circuit runs after register completes
- [ ] TunnelResultScreen shows real success/failure from proving state
- [ ] `lifecycle.setResult()` called with proof data on success
- [ ] Error/failure states show actionable UI
- [ ] `yarn build` passes for webview-app
- [ ] Backlog row added in SPEC.md

## Status Log

- 2026-03-24: Plan created.
