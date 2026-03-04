# App Migration Plan: `@selfxyz/common` → `@selfxyz/new-common`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all 46 files in `app/` from `@selfxyz/common` to `@selfxyz/new-common`, then remove the old dependency.

**Architecture:** Pure import path swap — document types are field-for-field identical. The app uses Jest (not Vitest), Metro bundler with `unstable_enablePackageExports: true`. Some files (like `documentAttributes.ts`) can be refactored to use the `createDocument` adapter pattern from new-common, matching the refactoring already done in `mobile-sdk-alpha/src/documents/validation.ts`.

**Tech Stack:** React Native, TypeScript, Jest, Metro

---

## Context

- `circuits/`, `contracts/`, `packages/mobile-sdk-alpha/` are **already migrated**
- `new-common` is fully built (Tasks 1-16 complete)
- App uses Jest for tests with `moduleNameMapper` in `jest.config.cjs`
- Metro has `unstable_enablePackageExports: true` — sub-path exports work
- `@selfxyz/new-common` is NOT yet in `app/package.json`
- App uses 46 files with `@selfxyz/common` imports (40 source, 6 test)

## Import Path Mapping

| Old import | New import |
|---|---|
| `@selfxyz/common` (root) | `@selfxyz/new-common` |
| `@selfxyz/common/types` | `@selfxyz/new-common` |
| `@selfxyz/common/types/passport` | `@selfxyz/new-common` |
| `@selfxyz/common/types/certificates` | `@selfxyz/new-common` |
| `@selfxyz/common/utils/types` | `@selfxyz/new-common` |
| `@selfxyz/common/utils` | `@selfxyz/new-common` |
| `@selfxyz/common/utils/appType` | `@selfxyz/new-common` |
| `@selfxyz/common/utils/scope` | `@selfxyz/new-common` |
| `@selfxyz/common/utils/proving` | `@selfxyz/new-common` (encryptAES256GCM, getPayload, getWSDbRelayerUrl) |
| `@selfxyz/common/utils/passports/validate` | `@selfxyz/new-common` (isUserRegisteredWithAlternativeCSCA, AlternativeCSCA) |
| `@selfxyz/common/utils/passports` | `@selfxyz/new-common/src/testing/genMockIdDoc` (genMockIdDocAndInitDataParsing) |
| `@selfxyz/common/utils/certificate_parsing/parseCertificateSimple` | `@selfxyz/new-common` (parseCertificateSimple) |
| `@selfxyz/common/constants` | `@selfxyz/new-common` |
| `@selfxyz/common/constants/countries` | `@selfxyz/new-common` (countryCodes, getCountryISO2, countries, commonNames) |

**Key rule:** All types/values in the mapping table above are available from the root `@selfxyz/new-common` barrel EXCEPT:
- `genMockIdDocAndInitDataParsing`, `IdDocInput` → `@selfxyz/new-common/src/testing/genMockIdDoc`
- `countries`, `commonNames`, `getCountryISO2`, `alpha2ToAlpha3` → `@selfxyz/new-common` (re-exported from data barrel)

---

## Task 1: Add dependency and update build config

**Files:**
- Modify: `app/package.json`
- Modify: `app/jest.config.cjs` (if needed for new-common resolution)

**Step 1: Add `@selfxyz/new-common` to `app/package.json`**

Add under `dependencies`:
```json
"@selfxyz/new-common": "workspace:^"
```

**Step 2: Run `yarn install` from repo root**

Run: `yarn install`
Expected: Clean install, no errors

**Step 3: Verify new-common is resolvable**

Run: `cd app && node -e "require.resolve('@selfxyz/new-common')"`
Expected: Resolves to new-common package

---

## Task 2: Migrate type-only import files (16 files)

These files only import types — simplest to migrate. Change all `@selfxyz/common` paths to `@selfxyz/new-common`.

**Files to modify:**

1. `src/navigation/types.ts` — `DocumentCategory`
2. `src/navigation/app.tsx` — `DocumentCategory`
3. `src/screens/app/LoadingScreen.tsx` — `DocumentCategory`
4. `src/screens/kyc/KYCVerifiedScreen.tsx` — `DocumentCategory`
5. `src/screens/documents/scanning/DocumentNFCScanScreen.tsx` — `PassportData`
6. `src/screens/documents/management/DocumentDataInfoScreen.tsx` — `PassportMetadata`, `AadhaarData`
7. `src/screens/documents/management/IdDetailsScreen.tsx` — `DocumentCatalog`, `IDDocument`
8. `src/screens/home/HomeScreen.tsx` — `DocumentCatalog`, `IDDocument`
9. `src/integrations/nfc/nfcScanner.ts` — `PassportData`
10. `src/hooks/useProofDisclosureStalenessCheck.ts` — `SelfApp`
11. `src/utils/documents.ts` — `DocumentMetadata`
12. `src/stores/proofTypes.ts` — `EndpointType`, `UserIdType`
13. `src/stores/proofHistoryStore.ts` — `EndpointType`, `UserIdType`
14. `src/stores/userStore.ts` — `IdDocInput` → from `@selfxyz/new-common/src/testing/genMockIdDoc`
15. `src/components/navbar/HomeNavBar.tsx` — `SelfApp`
16. `src/components/Disclosures.tsx` — `SelfAppDisclosureConfig`

**Pattern:** For each file, replace:
```typescript
// OLD
import type { Foo } from '@selfxyz/common/utils/types';
import type { Foo } from '@selfxyz/common/types';
import type { Foo } from '@selfxyz/common/types/passport';
import type { Foo } from '@selfxyz/common';
import type { Foo } from '@selfxyz/common/utils';
import type { Foo } from '@selfxyz/common/utils/appType';

// NEW (all available from root barrel)
import type { Foo } from '@selfxyz/new-common';
```

**Exception:** `src/stores/userStore.ts` uses `IdDocInput` which is only in testing barrel:
```typescript
// OLD
import type { IdDocInput } from '@selfxyz/common/utils';
// NEW
import type { IdDocInput } from '@selfxyz/new-common/src/testing/genMockIdDoc';
```

**Step 1: Apply all 16 import changes**

**Step 2: Run type check**

Run: `cd app && npx tsc --noEmit 2>&1 | head -40`
Expected: No new type errors from these files

---

## Task 3: Migrate value+type import files — constants & country data (7 files)

**Files:**

1. `src/screens/dev/CreateMockScreen.tsx`
   ```typescript
   // OLD
   import { countryCodes } from '@selfxyz/common/constants';
   import { getCountryISO2 } from '@selfxyz/common/constants/countries';
   // NEW
   import { countryCodes, getCountryISO2 } from '@selfxyz/new-common';
   ```

2. `src/screens/dev/CreateMockScreenDeepLink.tsx`
   ```typescript
   // OLD
   import { countryCodes } from '@selfxyz/common/constants';
   import { getCountryISO2 } from '@selfxyz/common/constants/countries';
   import type { IdDocInput } from '@selfxyz/common/utils';
   import { genMockIdDocAndInitDataParsing } from '@selfxyz/common/utils/passports';
   // NEW
   import { countryCodes, getCountryISO2 } from '@selfxyz/new-common';
   import type { IdDocInput } from '@selfxyz/new-common/src/testing/genMockIdDoc';
   import { genMockIdDocAndInitDataParsing } from '@selfxyz/new-common/src/testing/genMockIdDoc';
   ```

3. `src/screens/shared/ComingSoonScreen.tsx`
   ```typescript
   // OLD
   import { countryCodes } from '@selfxyz/common/constants';
   // NEW
   import { countryCodes } from '@selfxyz/new-common';
   ```

4. `src/utils/disclosureUtils.ts`
   ```typescript
   // OLD
   import type { Country3LetterCode } from '@selfxyz/common/constants';
   import { countryCodes } from '@selfxyz/common/constants';
   import type { SelfAppDisclosureConfig } from '@selfxyz/common/utils/appType';
   // NEW
   import type { Country3LetterCode, SelfAppDisclosureConfig } from '@selfxyz/new-common';
   import { countryCodes } from '@selfxyz/new-common';
   ```

5. `src/navigation/deeplinks.ts`
   ```typescript
   // OLD
   import { countries } from '@selfxyz/common/constants/countries';
   import type { IdDocInput } from '@selfxyz/common/utils';
   // NEW
   import { countries } from '@selfxyz/new-common';
   import type { IdDocInput } from '@selfxyz/new-common/src/testing/genMockIdDoc';
   ```

6. `src/integrations/sumsub/sumsubService.ts`
   ```typescript
   // OLD
   import { alpha2ToAlpha3 } from '@selfxyz/common';
   // NEW
   import { alpha2ToAlpha3 } from '@selfxyz/new-common';
   ```

7. `src/stores/pendingKycStore.ts`
   ```typescript
   // OLD
   import { WS_DB_RELAYER } from '@selfxyz/common/constants';
   // NEW
   import { WS_DB_RELAYER } from '@selfxyz/new-common';
   ```

**Step 1: Apply all 7 import changes**

**Step 2: Run type check**

Run: `cd app && npx tsc --noEmit 2>&1 | head -40`
Expected: No new type errors

---

## Task 4: Migrate type-guard and value import files (10 files)

**Files:**

1. `src/components/homescreen/IdCard.tsx`
   ```typescript
   // OLD
   import type { AadhaarData } from '@selfxyz/common';
   import type { PassportData } from '@selfxyz/common/types/passport';
   import type { KycData } from '@selfxyz/common/utils/types';
   // NEW
   import type { AadhaarData, KycData, PassportData } from '@selfxyz/new-common';
   ```

2. `src/components/homescreen/IdCardRevealed.tsx`
   ```typescript
   // OLD
   import type { AadhaarData } from '@selfxyz/common';
   import { commonNames } from '@selfxyz/common/constants';
   import type { PassportData } from '@selfxyz/common/types/passport';
   import { isAadhaarDocument, isMRZDocument } from '@selfxyz/common/utils/types';
   // NEW
   import type { AadhaarData, PassportData } from '@selfxyz/new-common';
   import { commonNames, isAadhaarDocument, isMRZDocument } from '@selfxyz/new-common';
   ```

3. `src/components/homescreen/KycIdCard.tsx`
   ```typescript
   // OLD
   import { deserializeApplicantInfo } from '@selfxyz/common';
   import { commonNames } from '@selfxyz/common/constants/countries';
   import type { KycData } from '@selfxyz/common/utils/types';
   // NEW
   import type { KycData } from '@selfxyz/new-common';
   import { commonNames, deserializeApplicantInfo } from '@selfxyz/new-common';
   ```

4. `src/components/homescreen/cardSecurityBadge.ts`
   ```typescript
   // OLD
   import type { AadhaarData } from '@selfxyz/common';
   import type { PassportData } from '@selfxyz/common/types/passport';
   import { isAadhaarDocument, isMRZDocument } from '@selfxyz/common/utils/types';
   // NEW
   import type { AadhaarData, PassportData } from '@selfxyz/new-common';
   import { isAadhaarDocument, isMRZDocument } from '@selfxyz/new-common';
   ```

5. `src/hooks/useSelfAppData.ts`
   ```typescript
   // OLD
   import type { SelfApp } from '@selfxyz/common';
   import type { SelfAppDisclosureConfig } from '@selfxyz/common/utils/appType';
   import { formatEndpoint } from '@selfxyz/common/utils/scope';
   // NEW
   import type { SelfApp, SelfAppDisclosureConfig } from '@selfxyz/new-common';
   import { formatEndpoint } from '@selfxyz/new-common';
   ```

6. `src/hooks/useSumsubWebSocket.ts`
   ```typescript
   // OLD
   import { deserializeApplicantInfo } from '@selfxyz/common';
   import type { DocumentType, KycData } from '@selfxyz/common/utils/types';
   // NEW
   import type { DocumentType, KycData } from '@selfxyz/new-common';
   import { deserializeApplicantInfo } from '@selfxyz/new-common';
   ```

7. `src/screens/verification/ProveScreen.tsx`
   ```typescript
   // OLD
   import type { DocumentMetadata } from '@selfxyz/common';
   import { isMRZDocument } from '@selfxyz/common';
   // NEW
   import type { DocumentMetadata } from '@selfxyz/new-common';
   import { isMRZDocument } from '@selfxyz/new-common';
   ```

8. `src/screens/verification/DocumentSelectorForProvingScreen.tsx`
   Replace all `@selfxyz/common/utils/types` → `@selfxyz/new-common`

9. `src/screens/documents/management/ManageDocumentsScreen.tsx`
   ```typescript
   // OLD
   import { deserializeApplicantInfo } from '@selfxyz/common';
   import { ... } from '@selfxyz/common/utils/types';
   // NEW
   import { deserializeApplicantInfo, ...typeGuards } from '@selfxyz/new-common';
   ```

10. `src/services/points/utils.ts`
    ```typescript
    // OLD
    import { SelfAppBuilder } from '@selfxyz/common/utils/appType';
    // NEW
    import { SelfAppBuilder } from '@selfxyz/new-common';
    ```

**Step 1: Apply all 10 import changes**

**Step 2: Run type check**

Run: `cd app && npx tsc --noEmit 2>&1 | head -40`
Expected: No new type errors

---

## Task 5: Migrate complex files (6 files)

These files have multiple import lines and/or need careful mapping.

**Files:**

1. `src/utils/cardBackgroundSelector.ts`
   ```typescript
   // OLD
   import type { IDDocument } from '@selfxyz/common';
   import { deserializeApplicantInfo, isAadhaarDocument, isKycDocument, isMRZDocument } from '@selfxyz/common';
   // NEW
   import type { IDDocument } from '@selfxyz/new-common';
   import { deserializeApplicantInfo, isAadhaarDocument, isKycDocument, isMRZDocument } from '@selfxyz/new-common';
   ```

2. `src/proving/index.ts`
   ```typescript
   // OLD
   export { encryptAES256GCM, getPayload, getWSDbRelayerUrl } from '@selfxyz/common/utils/proving';
   // NEW
   export { encryptAES256GCM, getPayload, getWSDbRelayerUrl } from '@selfxyz/new-common';
   ```

3. `src/proving/validateDocument.ts`
   ```typescript
   // OLD
   import type { DocumentCategory, PassportData } from '@selfxyz/common/types';
   import { type AlternativeCSCA, isUserRegisteredWithAlternativeCSCA } from '@selfxyz/common/utils/passports/validate';
   // NEW
   import type { AlternativeCSCA, DocumentCategory, PassportData } from '@selfxyz/new-common';
   import { isUserRegisteredWithAlternativeCSCA } from '@selfxyz/new-common';
   ```

4. `src/screens/account/recovery/RecoverWithPhraseScreen.tsx`
   ```typescript
   // OLD
   import { isUserRegisteredWithAlternativeCSCA } from '@selfxyz/common/utils/passports/validate';
   // NEW
   import { isUserRegisteredWithAlternativeCSCA } from '@selfxyz/new-common';
   ```

5. `src/screens/account/recovery/AccountRecoveryChoiceScreen.tsx`
   ```typescript
   // OLD
   import { isUserRegisteredWithAlternativeCSCA } from '@selfxyz/common/utils/passports/validate';
   // NEW
   import { isUserRegisteredWithAlternativeCSCA } from '@selfxyz/new-common';
   ```

6. `src/providers/passportDataProvider.tsx` — most complex file
   ```typescript
   // OLD
   import { deserializeApplicantInfo } from '@selfxyz/common';
   import type { PublicKeyDetailsECDSA, PublicKeyDetailsRSA } from '@selfxyz/common/types/certificates';
   import { brutforceSignatureAlgorithmDsc, calculateContentHash, inferDocumentCategory } from '@selfxyz/common/utils';
   import { parseCertificateSimple } from '@selfxyz/common/utils/certificate_parsing/parseCertificateSimple';
   import type { AadhaarData, DocumentCatalog, DocumentMetadata, IDDocument, PassportData } from '@selfxyz/common/utils/types';
   import { isKycDocument, isMRZDocument } from '@selfxyz/common/utils/types';
   // NEW
   import type { AadhaarData, DocumentCatalog, DocumentMetadata, IDDocument, PassportData, PublicKeyDetailsECDSA, PublicKeyDetailsRSA } from '@selfxyz/new-common';
   import { bruteForceSignatureAlgorithmDsc, calculateContentHash, deserializeApplicantInfo, inferDocumentCategory, isKycDocument, isMRZDocument, parseCertificateSimple } from '@selfxyz/new-common';
   ```
   **Note:** `brutforceSignatureAlgorithmDsc` → `bruteForceSignatureAlgorithmDsc` (typo fixed in new-common). Must also update the call site.

**Step 1: Apply all 6 import changes**

**Step 2: Fix `brutforce` → `bruteForce` typo at call site in `passportDataProvider.tsx`**

Search for `brutforceSignatureAlgorithmDsc` in the file and rename to `bruteForceSignatureAlgorithmDsc`.

**Step 3: Run type check**

Run: `cd app && npx tsc --noEmit 2>&1 | head -40`
Expected: No new type errors

---

## Task 6: Refactor `documentAttributes.ts` to use `createDocument` adapter

This file has the same pattern as `mobile-sdk-alpha/src/documents/validation.ts` — three type-specific helper functions that manually extract attributes. Replace with the `IDocument` adapter pattern.

**File:** `src/utils/documentAttributes.ts`

**Step 1: Rewrite imports and `getDocumentAttributes` function**

Replace the old imports and three helper functions (`getKycAttributes`, `getAadhaarAttributes`, `getPassportAttributes`) with:

```typescript
import type { IDDocument } from '@selfxyz/new-common';
import { createDocument } from '@selfxyz/new-common';
```

Replace `getDocumentAttributes`:
```typescript
export function getDocumentAttributes(document: IDDocument): DocumentAttributes {
  const doc = createDocument(document);

  const nameSlice =
    doc.category === 'passport' || doc.category === 'id_card'
      ? doc.getDisclosureSlice('name')
      : (doc.getAttribute('name') || '') + '<<';

  const dob = doc.getAttribute('date_of_birth') || '';

  return {
    nameSlice,
    dobSlice: dob,
    yobSlice: dob.slice(0, 2),
    issuingStateSlice: doc.getAttribute('issuing_state') || '',
    nationalitySlice: doc.getAttribute('nationality') || '',
    passNoSlice: doc.getAttribute('document_number') || '',
    sexSlice: doc.getAttribute('gender') || '',
    expiryDateSlice: doc.getAttribute('expiry_date') || '',
    isPassportType: doc.category === 'passport',
  };
}
```

**Keep:** `DocumentAttributes` interface, `checkDocumentExpiration`, `formatDateFromYYMMDD`, `getDocumentScanPrompt`, `getDocumentTypeName`, `getNameAndSurname` — these are app-specific utilities.

**Remove:** `getKycAttributes`, `getAadhaarAttributes`, `getPassportAttributes` helper functions.

**Step 2: Run type check**

Run: `cd app && npx tsc --noEmit 2>&1 | head -40`
Expected: No new type errors

---

## Task 7: Migrate test files (6 files)

**Files:**

1. `tests/src/utils/documents.test.ts`
   ```typescript
   // OLD
   import type { DocumentMetadata } from '@selfxyz/common';
   // NEW
   import type { DocumentMetadata } from '@selfxyz/new-common';
   ```

2. `tests/src/utils/cardBackgroundSelector.test.ts`
   ```typescript
   // OLD
   import type { IDDocument } from '@selfxyz/common';
   import { serializeKycData } from '@selfxyz/common';
   // NEW
   import type { IDDocument } from '@selfxyz/new-common';
   import { serializeKycData } from '@selfxyz/new-common';
   ```

3. `tests/src/hooks/useProofDisclosureStalenessCheck.test.ts`
   ```typescript
   // OLD
   import type { SelfApp } from '@selfxyz/common';
   // NEW
   import type { SelfApp } from '@selfxyz/new-common';
   ```

4. `tests/src/screens/verification/DocumentSelectorForProvingScreen.test.tsx`
   Replace `@selfxyz/common/utils/types` → `@selfxyz/new-common`

5. `tests/src/screens/verification/ProvingScreenRouter.test.tsx`
   Replace `@selfxyz/common/utils/types` → `@selfxyz/new-common`

6. `tests/src/proving/validateDocument.test.ts`
   ```typescript
   // OLD
   import type { PassportData } from '@selfxyz/common/types';
   // Also update jest.mock path:
   jest.mock('@selfxyz/common/utils/passports/validate', ...)
   // NEW
   import type { PassportData } from '@selfxyz/new-common';
   jest.mock('@selfxyz/new-common', ...) // mock only the needed functions
   ```
   **Note:** The `jest.mock` path must match the actual import path in the source file (`@selfxyz/new-common`).

**Step 1: Apply all 6 test file changes**

**Step 2: Run tests**

Run: `cd app && yarn test --passWithNoTests 2>&1 | tail -30`
Expected: All tests pass

---

## Task 8: Update build config and remove old dependency

**Step 1: Remove `@selfxyz/common` from `app/package.json`**

Remove the line:
```json
"@selfxyz/common": "workspace:^",
```

**Step 2: Run `yarn install` from repo root**

Run: `yarn install`

**Step 3: Verify no remaining `@selfxyz/common` imports**

Run: `grep -rn "@selfxyz/common" app/src/ app/tests/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v docs/`
Expected: No output

**Step 4: Run type check**

Run: `cd app && npx tsc --noEmit 2>&1 | tail -10`
Expected: No errors

**Step 5: Run tests**

Run: `cd app && yarn test --passWithNoTests 2>&1 | tail -30`
Expected: All tests pass

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(app): migrate from @selfxyz/common to @selfxyz/new-common"
```

---

## Verification Checklist

- [ ] `@selfxyz/new-common` added to `app/package.json`
- [ ] All 40 source files migrated (zero `@selfxyz/common` imports)
- [ ] All 6 test files migrated
- [ ] `documentAttributes.ts` refactored to use `createDocument` adapter
- [ ] `brutforceSignatureAlgorithmDsc` → `bruteForceSignatureAlgorithmDsc` renamed at call site
- [ ] `@selfxyz/common` removed from `app/package.json`
- [ ] `cd app && npx tsc --noEmit` — zero errors
- [ ] `cd app && yarn test` — all tests pass
- [ ] `grep -rn "@selfxyz/common" app/src/ app/tests/` — no results
