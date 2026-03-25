# WV-06: Wire KYC Result Through Verification Pipeline

> Last updated: 2026-03-25
> Status: Ready
> Priority: High
> Depends on: WV-05 (In Progress — Sumsub Web SDK integration)

- Workstream: webview
- Backlog ID: WV-06
- Linear: SELF-2415
- Owner: TBD
- Branch: TBD
- PR: TBD

## Why

The KYC result pipeline is broken. `ProviderLaunchScreen` hands a
`KycProviderResult` to `ProviderResultScreen` via route state, but
`ProviderResultScreen` navigates directly to `/proving` without:

1. Extracting the attestation from the provider result
2. Constructing a `KycData` document from `serializedApplicantInfo`
3. Persisting the document via the documents adapter (keychain-backed)
4. Routing through `ConfirmIdentificationScreen` for ownership confirmation

This means the proving flow has no document to prove against.
`ConfirmIdentificationScreen` exists but is bypassed — the route from
provider result skips it entirely.

The RN app solves this in `app/src/hooks/useSumsubWebSocket.ts:93-137`:
receive attestation → `deserializeApplicantInfo()` → construct `KycData` →
`storeDocumentWithDeduplication()` → navigate. This spec implements the
equivalent pipeline for the webview app.

## What You Will Do

### 1. Create a KYC result store

**Create:** `packages/webview-app/src/stores/kycResultStore.ts`

The webview-app uses React Context for most state and already has `zustand`
as a dependency. Use a simple module-scoped store anyway — the KYC result
only needs to survive one navigation hop from `ProviderResultScreen` to
`ConfirmIdentificationScreen`, and a Zustand store would be overweight for
a single transient value that is cleared after use.

```typescript
import type { KycProviderResult } from '../types/kycProvider';

let _result: KycProviderResult | null = null;

export function setKycResult(result: KycProviderResult): void {
  _result = result;
}

export function getKycResult(): KycProviderResult | null {
  return _result;
}

export function clearKycResult(): void {
  _result = null;
}
```

### 2. Create a document construction utility

**Create:** `packages/webview-app/src/utils/buildKycDocument.ts`

Extract attestation fields from `KycProviderResult` and construct a `KycData`
document matching the shape the proving machine expects. Follow the same
pattern as `app/src/hooks/useSumsubWebSocket.ts:104-118`.

The return type separates the `KycData` payload (what gets stored via
`saveDocument()`) from the `DocumentMetadata` (what goes in the catalog).
This matches how `storeDocumentWithDeduplication()` works in
`packages/mobile-sdk-alpha/src/documents/utils.ts:211-256`.

The storage ID is a content hash for deduplication, following the same
pattern the SDK uses. Do not invent a local hash helper. Reuse the canonical
`calculateContentHash()` utility so KYC documents behave like other stored
documents.

```typescript
import { calculateContentHash } from '@selfxyz/common';
import { deserializeApplicantInfo } from '@selfxyz/common/utils/kyc/api';
import type { KycData, DocumentMetadata } from '@selfxyz/common/utils/types';
import type { KycProviderResult } from '../types/kycProvider';

export interface KycDocumentBundle {
  /** Content hash used as storage key and catalog ID */
  id: string;
  /** KycData payload — passed to documents.saveDocument(id, data) */
  data: KycData;
  /** Catalog entry — pushed to catalog.documents[] */
  metadata: DocumentMetadata;
}

export function buildKycDocument(result: KycProviderResult): KycDocumentBundle {
  if (!result.attestation) {
    throw new Error('Cannot build KYC document: attestation missing');
  }

  const { serializedApplicantInfo, signature, pubkey } = result.attestation;
  const applicantInfo = deserializeApplicantInfo(serializedApplicantInfo);

  const documentType = applicantInfo.idType;

  const data: KycData = {
    documentType,
    documentCategory: 'kyc',
    mock: applicantInfo.idNumber?.startsWith('Mock') ?? false,
    serializedApplicantInfo,
    signature,
    pubkey: [...pubkey],
  };

  // Content hash for deduplication — same utility used by the SDK's
  // storeDocumentWithDeduplication().
  const contentHash = calculateContentHash(data);

  const metadata: DocumentMetadata = {
    id: contentHash,
    documentType,
    documentCategory: 'kyc',
    data: serializedApplicantInfo,
    mock: data.mock,
    isRegistered: false,
    idType: applicantInfo.idType,
  };

  return { id: contentHash, data, metadata };
}
```

### 3. Update ProviderResultScreen to store result and route to confirm

**File:** `packages/webview-app/src/screens/onboarding/ProviderResultScreen.tsx`

Change the success/partial navigation path:

- **Before:** `success`/`partial` → navigate to `/proving`
- **After:** `success` with attestation → `setKycResult(result)` → navigate
  to `/onboarding/confirm`

Keep the existing error/cancel handling unchanged.

Add a guard: if status is `success` but `attestation` is missing, treat it
as an error with code `provider_missing_attestation`. This enforces the WV-02
contract requirement that success requires a complete attestation payload.

```typescript
import { setKycResult } from '../../stores/kycResultStore';

// In the button press handler, replace the success/partial case:
if (providerResult.status === 'success' && providerResult.attestation) {
  setKycResult(providerResult);
  navigate('/onboarding/confirm');
} else if (providerResult.status === 'success' && !providerResult.attestation) {
  // Contract violation: success without attestation
  analytics.trackEvent('provider_result_missing_attestation');
  // Show error state — do not advance
} else if (providerResult.status === 'partial') {
  // Partial results cannot advance into proving per WV-02 contract
  // Show "verification in progress" state with dismiss action
}
```

### 4. Update ConfirmIdentificationScreen to persist document

**File:** `packages/webview-app/src/screens/onboarding/ConfirmIdentificationScreen.tsx`

The current screen calls `lifecycle.setResult()` with a generic
`documentOwnershipConfirmed` claim and navigates home. Update it to:

1. Read the KYC result from the store on mount
2. Build the KYC document from the attestation
3. On confirm: persist the document via the documents adapter, then call
   `lifecycle.setResult()`, then navigate home

```typescript
import { getKycResult, clearKycResult } from '../../stores/kycResultStore';
import { buildKycDocument } from '../../utils/buildKycDocument';

export const ConfirmIdentificationScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic, lifecycle, documents } = useSelfClient();
  const { request, verificationId } = useVerificationRequest();

  const kycResult = getKycResult();

  useEffect(() => {
    if (!kycResult?.attestation) {
      // Guard: no result in store, return to a stable registration entry point
      // instead of re-entering provider launch without the required state.
      navigate('/onboarding/id-type', { replace: true });
      return;
    }
    haptic.trigger('success');
  }, [haptic, kycResult, navigate]);

  const onConfirm = useCallback(async () => {
    if (!kycResult?.attestation) return;

    haptic.trigger('selection');
    analytics.trackEvent('ownership_confirmed');

    try {
      // 1. Build document bundle (KycData + DocumentMetadata)
      const { id, data, metadata } = buildKycDocument(kycResult);

      // 2. Persist document payload
      await documents.saveDocument(id, data);

      // 3. Update catalog with correct DocumentMetadata schema
      // Uses selectedDocumentId (not selectedId) per common/src/utils/types.ts:36
      const catalog = await documents.loadDocumentCatalog();
      const existing = catalog.documents.find(d => d.id === id);
      if (!existing) {
        catalog.documents.push(metadata);
      }
      catalog.selectedDocumentId = id;
      await documents.saveDocumentCatalog(catalog);

      // 4. Report terminal result to host
      // This is NOT an intermediate provider success — it is the terminal
      // Self verification result for the registration path. The workstream
      // spec (SPEC.md:225) says "only the full verification lifecycle emits
      // lifecycle.setResult()." Document ownership confirmation IS that
      // terminal lifecycle event: the user has completed KYC, Self has
      // stored the document, and the registration verification is done.
      // Proving (if needed) is a separate verification session.
      await lifecycle.setResult({
        success: true,
        userId: request.userId,
        verificationId,
        claims: {
          resultType: 'documentOwnershipConfirmed',
          documentId: id,
        },
      });

      analytics.trackEvent('kyc_document_stored', { documentId: id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      analytics.trackEvent('kyc_document_store_error', { error: message });
    }

    clearKycResult();
    navigate('/');
  }, [analytics, documents, haptic, kycResult, lifecycle, navigate, request.userId, verificationId]);

  if (!kycResult?.attestation) return null;

  return (
    <StatusState
      variant="success"
      title="Confirm your identity"
      description="By continuing, you certify that this passport, biometric ID or Aadhaar card belongs to you and is not stolen or forged. Once registered with Self, this document will be permanently linked to your identity and can't be linked to another one."
      buttonText="Confirm"
      onButtonPress={onConfirm}
      icon={<CheckCircleIcon size={64} color={colors.green500} />}
    />
  );
};
```

### 5. Expose documents adapter from SelfClientProvider

**File:** `packages/webview-app/src/providers/SelfClientProvider.tsx`

The current `SelfClientAdapters` type includes `documents` from the bridge
adapters. Verify it is exposed via `useSelfClient()`. If not, add it to the
context value. The `documents` adapter provides `saveDocument()`,
`loadDocumentCatalog()`, and `saveDocumentCatalog()` — all needed by step 4.

This is a verification step, not necessarily a code change. If `documents` is
already in the context value, no modification needed.

## Files You Will Create

| File                                                 | What                                   | Risk    |
| ---------------------------------------------------- | -------------------------------------- | ------- |
| `packages/webview-app/src/stores/kycResultStore.ts`  | Module-scoped KYC result holder        | **Low** |
| `packages/webview-app/src/utils/buildKycDocument.ts` | Attestation → KycData document builder | **Low** |

## Files You Will Modify

| File                                                                          | Change                                             | Risk       |
| ----------------------------------------------------------------------------- | -------------------------------------------------- | ---------- |
| `packages/webview-app/src/screens/onboarding/ProviderResultScreen.tsx`        | Store result, route to confirm instead of proving  | **Medium** |
| `packages/webview-app/src/screens/onboarding/ConfirmIdentificationScreen.tsx` | Persist document on confirm, read from store       | **Medium** |
| `packages/webview-app/src/providers/SelfClientProvider.tsx`                   | Verify documents adapter is exposed (may be no-op) | **Low**    |
| `specs/projects/sdk/workstreams/webview/SPEC.md`                              | Update WV-06 status to In Progress                 | **None**   |

## Files You Will NOT Modify

| File                                                                   | Why                                                                  |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/webview-app/src/screens/onboarding/ProviderLaunchScreen.tsx` | Upstream of this spec — already produces KycProviderResult correctly |
| `packages/webview-app/src/screens/proving/ProvingScreen.tsx`           | Downstream — WV-08 wires proving to stored documents                 |
| `packages/webview-app/src/utils/sumsubProvider.ts`                     | Provider-specific code unchanged — WV-05 scope                       |
| `packages/webview-bridge/**`                                           | Bridge layer unchanged                                               |
| `packages/mobile-sdk-alpha/**`                                         | SDK unchanged                                                        |

## Constraints

- **Module-scoped store, not Zustand.** The webview-app has `zustand` as a
  dependency, but a module-scoped store is the right choice here: the KYC
  result is a single transient value that survives one navigation hop and is
  cleared after use. A Zustand store would be overweight for this.
- **Attestation is required for success.** `success` without `attestation` is
  a contract violation per WV-02. Do not advance past ProviderResultScreen
  without a complete attestation payload.
- **Partial does not advance.** Per the WV-02 contract, `partial` means the
  provider returned an insufficient outcome. Show a "verification in progress"
  state, not a confirmation screen.
- **Document storage uses the existing adapter.** Use whatever `documents`
  adapter is available in `SelfClientProvider`. Today that is IndexedDB
  (browser adapter); after WV-07 it will be keychain-backed. This spec does
  not depend on which adapter backs it.
- **`lifecycle.setResult()` is called once, and it is the terminal result.**
  The confirmation screen is the single point where `setResult()` fires for
  the KYC registration path. ProviderResultScreen does NOT call it (it only
  handles dismiss on error/cancel). This is consistent with the workstream
  spec (SPEC.md:225-228) which says "only the full Self verification
  lifecycle emits `VERIFICATION_COMPLETE` or calls `lifecycle.setResult`."
  Document ownership confirmation IS that terminal lifecycle event — the
  user completed provider KYC, Self stored the attested document, and
  the registration verification session is done. If the host later needs
  a ZK proof against this document, that is a separate disclose session
  with its own `lifecycle.setResult()` call.
- **Guard failures return to a stable route.** If `ConfirmIdentificationScreen`
  is entered without a stored KYC result, redirect to `/onboarding/id-type`
  rather than back into provider launch. Provider launch depends on upstream
  route state that may no longer be available on refresh or direct navigation.

## Terminal State Mapping

| Provider status         | Attestation present? | ProviderResultScreen action             | Next screen              |
| ----------------------- | -------------------- | --------------------------------------- | ------------------------ |
| `success`               | Yes                  | Store result                            | `/onboarding/confirm`    |
| `success`               | No                   | Show error (contract violation)         | Stay                     |
| `partial`               | —                    | Show "verification in progress"         | Stay (dismiss available) |
| `cancel`                | —                    | `lifecycle.dismiss({ reason: 'back' })` | `/`                      |
| `error` (retryable)     | —                    | Show error with retry                   | Back one step            |
| `error` (non-retryable) | —                    | `lifecycle.dismiss()`                   | `/`                      |

## Validation

```bash
# webview-app builds
cd packages/webview-app && yarn build

# Manual validation:
# 1. Complete Sumsub flow → ProviderResultScreen shows success
# 2. Button navigates to ConfirmIdentificationScreen (not /proving)
# 3. Confirm button persists document and calls lifecycle.setResult()
# 4. Cancel/error at ProviderResultScreen calls lifecycle.dismiss()
# 5. Direct navigation to /onboarding/confirm without result redirects back
```

## Definition of Done

- [ ] `kycResultStore` holds result between ProviderResultScreen and ConfirmIdentificationScreen
- [ ] `buildKycDocument()` constructs KycData from attestation using `deserializeApplicantInfo()`
- [ ] ProviderResultScreen routes success+attestation to `/onboarding/confirm`
- [ ] ProviderResultScreen rejects success without attestation (contract enforcement)
- [ ] ProviderResultScreen does not advance `partial` results
- [ ] ConfirmIdentificationScreen persists document via documents adapter
- [ ] ConfirmIdentificationScreen calls `lifecycle.setResult()` with document info
- [ ] Guard redirects if ConfirmIdentificationScreen is entered without a stored result
- [ ] `yarn workspace @selfxyz/webview-app build` passes
- [ ] Backlog row updated in SPEC.md

## Status Log

- 2026-03-25: Plan created.
