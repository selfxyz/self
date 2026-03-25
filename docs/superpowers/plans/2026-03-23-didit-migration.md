# Sumsub to Didit Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Sumsub React Native SDK with the Didit React Native SDK for KYC identity verification in the Self Wallet app.

**Architecture:** 1:1 SDK swap. The backend (didit-tee) is already migrated. The app creates a Didit session via the TEE, launches the Didit native SDK with the session token, then subscribes to Socket.IO by `sessionId` to receive signed KYC data. The Socket.IO protocol, 295-byte payload format, and proving machine trigger are unchanged.

**Tech Stack:** React Native, TypeScript, Zustand, Socket.IO, `@didit-protocol/sdk-react-native`

**Spec:** `docs/superpowers/specs/2026-03-23-didit-migration-design.md`

**CRITICAL — DO NOT CHANGE:** The string `'sumsub'` appears in nullifier generation code (`common/src/utils/kyc/utils.ts:36`, `new-common/src/documents/kyc/utils.ts:33`, `common/src/utils/passports/passport.ts:221`, `circuits/tests/register/register_kyc.test.ts:54`). This is a **cryptographic input** for on-chain nullifiers. Changing it would invalidate existing nullifiers. Leave it as-is.

---

## Task 1: Package swap — remove Sumsub SDK, add Didit SDK

**Files:**
- Modify: `app/package.json:113` — remove `@sumsub/react-native-mobilesdk-module`, add `@didit-protocol/sdk-react-native`
- Delete: `patches/@sumsub+react-native-mobilesdk-module+1.40.2.patch`
- Delete: `app/src/types/sumsub.d.ts`

- [ ] **Step 1: Remove Sumsub package and add Didit package**

```bash
cd app && yarn remove @sumsub/react-native-mobilesdk-module && yarn add @didit-protocol/sdk-react-native
```

- [ ] **Step 2: Delete the Sumsub patch file**

```bash
rm patches/@sumsub+react-native-mobilesdk-module+1.40.2.patch
```

- [ ] **Step 3: Delete the Sumsub type declarations**

```bash
rm app/src/types/sumsub.d.ts
```

- [ ] **Step 4: Commit**

```bash
git add app/package.json yarn.lock patches/ app/src/types/ && git commit -m "chore: swap @sumsub/react-native-mobilesdk-module for @didit-protocol/sdk-react-native"
```

---

## Task 2: Env var rename — `SUMSUB_TEE_URL` to `DIDIT_TEE_URL`

**Files:**
- Modify: `app/env.ts:34-35`
- Modify: `app/env.sample:13`
- Modify: `.github/workflows/mobile-deploy.yml:718,1179`

- [ ] **Step 1: Update `app/env.ts`**

Replace lines 34-36 (remove both `SUMSUB_TEE_URL` and `SUMSUB_TEST_TOKEN`):
```typescript
// Before
export const SUMSUB_TEE_URL =
  process.env.SUMSUB_TEE_URL || 'http://localhost:8080';
export const SUMSUB_TEST_TOKEN = process.env.SUMSUB_TEST_TOKEN;

// After
export const DIDIT_TEE_URL =
  process.env.DIDIT_TEE_URL || 'http://localhost:8080';
```

- [ ] **Step 2: Update `app/env.sample`**

Replace line 13:
```
DIDIT_TEE_URL=
```

- [ ] **Step 3: Update `.github/workflows/mobile-deploy.yml`**

Replace both occurrences (lines 718 and 1179):
```yaml
# Before
SUMSUB_TEE_URL: ${{ secrets.SUMSUB_TEE_URL }}
# After
DIDIT_TEE_URL: ${{ secrets.DIDIT_TEE_URL }}
```

- [ ] **Step 4: Commit**

```bash
git add app/env.ts app/env.sample .github/workflows/mobile-deploy.yml && git commit -m "chore: rename SUMSUB_TEE_URL to DIDIT_TEE_URL"
```

---

## Task 3: Shared type rename — `PendingKycVerification.userId` to `sessionId`

**Files:**
- Modify: `common/src/utils/types.ts:93-105`

- [ ] **Step 1: Update the `PendingKycVerification` interface and comments**

In `common/src/utils/types.ts`, replace lines 93-105:

```typescript
// pending - pending didit verification
// processing - didit verification completed and pending onchain confirmation
// failed - didit verification failed
export type PendingKycStatus = 'pending' | 'processing' | 'failed';

export interface PendingKycVerification {
  sessionId: string; // Correlation key from createSession()
  createdAt: number; // Timestamp when verification started
  status: PendingKycStatus; // Current status
  errorMessage?: string; // Error message if failed
  timeoutAt: number; // When to consider timed out
  documentId?: string; // Content hash of stored KYC document
}
```

- [ ] **Step 2: Commit**

```bash
git add common/src/utils/types.ts && git commit -m "refactor: rename PendingKycVerification.userId to sessionId"
```

---

## Task 4: Create Didit integration module

**Files:**
- Create: `app/src/integrations/didit/types.ts`
- Create: `app/src/integrations/didit/diditService.ts`
- Create: `app/src/integrations/didit/index.ts`
- Delete: `app/src/integrations/sumsub/sumsubService.ts`
- Delete: `app/src/integrations/sumsub/types.ts`
- Delete: `app/src/integrations/sumsub/index.ts`

- [ ] **Step 1: Create `app/src/integrations/didit/types.ts`**

```typescript
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export interface SessionResponse {
  sessionId: string;
  sessionToken: string;
}

export interface DiditVerificationResult {
  type: 'completed' | 'cancelled' | 'failed';
  session?: {
    status: string;
    sessionId: string;
  };
  error?: {
    type: string;
    message: string;
  };
}

export interface ApplicantInfoSerialized {
  signature: string;
  applicantInfo: string;
  pubkey: Array<string>;
}
```

- [ ] **Step 2: Create `app/src/integrations/didit/diditService.ts`**

```typescript
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { DIDIT_TEE_URL } from '@env';
import { startVerification } from '@didit-protocol/sdk-react-native';

import type { DiditVerificationResult, SessionResponse } from '@/integrations/didit/types';

export interface DiditConfig {
  locale?: string;
  debug?: boolean;
}

const FETCH_TIMEOUT_MS = 30000;

export const createSession = async (): Promise<SessionResponse> => {
  const apiUrl = DIDIT_TEE_URL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiUrl}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to create Didit session (HTTP ${response.status})`,
      );
    }

    const body = await response.json();

    if (typeof body === 'string') {
      return JSON.parse(body) as SessionResponse;
    }

    return body as SessionResponse;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error(
          `Request to Didit TEE timed out after ${FETCH_TIMEOUT_MS / 1000}s`,
        );
      }
      throw new Error(`Failed to create Didit session: ${err.message}`);
    }

    throw new Error('Failed to create Didit session: Unknown error');
  }
};

export const launchDidit = async (
  sessionToken: string,
  config?: DiditConfig,
): Promise<DiditVerificationResult> => {
  const result = await startVerification(sessionToken, {
    languageCode: config?.locale ?? 'en',
    loggingEnabled: config?.debug ?? __DEV__,
  });

  return result as DiditVerificationResult;
};
```

- [ ] **Step 3: Create `app/src/integrations/didit/index.ts`**

```typescript
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type {
  ApplicantInfoSerialized,
  DiditVerificationResult,
  SessionResponse,
} from '@/integrations/didit/types';
export {
  type DiditConfig,
  createSession,
  launchDidit,
} from '@/integrations/didit/diditService';
```

- [ ] **Step 4: Delete Sumsub integration files**

```bash
rm -rf app/src/integrations/sumsub/
```

- [ ] **Step 5: Commit**

```bash
git add app/src/integrations/ && git commit -m "feat: add Didit integration module, remove Sumsub integration"
```

---

## Task 5: Create `useDiditWebSocket` hook

**Files:**
- Create: `app/src/hooks/useDiditWebSocket.ts`
- Delete: `app/src/hooks/useSumsubWebSocket.ts`

- [ ] **Step 1: Create `app/src/hooks/useDiditWebSocket.ts`**

This is the `useSumsubWebSocket.ts` hook with all `userId` references renamed to `sessionId` and the import updated to `DIDIT_TEE_URL`.

```typescript
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { DIDIT_TEE_URL } from '@env';

import { deserializeApplicantInfo } from '@selfxyz/common';
import type { DocumentType, KycData } from '@selfxyz/common/utils/types';

import type { ApplicantInfoSerialized } from '@/integrations/didit/types';
import { navigationRef } from '@/navigation';
import { storeDocumentWithDeduplication } from '@/providers/passportDataProvider';
import { usePendingKycStore } from '@/stores/pendingKycStore';

interface UseDiditWebSocketOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onVerificationFailed?: (reason: string) => void;
  skipAddPending?: boolean;
}

export function useDiditWebSocket(options: UseDiditWebSocketOptions = {}) {
  const {
    onSuccess,
    onError,
    onVerificationFailed,
    skipAddPending = false,
  } = options;

  const addPendingVerification = usePendingKycStore(
    state => state.addPendingVerification,
  );
  const updateVerificationStatus = usePendingKycStore(
    state => state.updateVerificationStatus,
  );
  const getPendingVerification = usePendingKycStore(
    state => state.getPendingVerification,
  );

  const socketsRef = useRef<Map<string, Socket>>(new Map());
  const subscribedSessionIdsRef = useRef<Set<string>>(new Set());

  const subscribe = useCallback(
    (sessionId: string) => {
      if (subscribedSessionIdsRef.current.has(sessionId)) {
        console.log('[DiditWebSocket] Already subscribed to sessionId:', sessionId);
        return;
      }

      const existingVerification = getPendingVerification(sessionId);
      const isProcessing = existingVerification?.status === 'processing';

      if (isProcessing) {
        console.log(
          '[DiditWebSocket] Verification in processing state, skipping for sessionId:',
          sessionId,
        );
        return;
      }

      if (!skipAddPending) {
        console.log(
          '[DiditWebSocket] Adding pending verification for sessionId:',
          sessionId,
        );
        addPendingVerification(sessionId);
      }
      subscribedSessionIdsRef.current.add(sessionId);

      console.log('[DiditWebSocket] Connecting to WebSocket:', DIDIT_TEE_URL);
      const socket = io(DIDIT_TEE_URL, {
        transports: ['websocket', 'polling'],
      });

      socketsRef.current.set(sessionId, socket);

      socket.on('connect', () => {
        console.log(
          '[DiditWebSocket] Connected, subscribing to session:',
          sessionId,
        );
        socket.emit('subscribe', sessionId);
      });

      socket.on('success', async (data: ApplicantInfoSerialized) => {
        console.log(
          '[DiditWebSocket] Received applicant info for sessionId:',
          sessionId,
        );

        try {
          const applicantInfoDeserialized = deserializeApplicantInfo(
            data.applicantInfo,
          );
          const kycData: KycData = {
            documentType: applicantInfoDeserialized.idType as DocumentType,
            documentCategory: 'kyc',
            mock: applicantInfoDeserialized.idNumber.startsWith('Mock'),
            signature: data.signature,
            pubkey: data.pubkey,
            serializedApplicantInfo: data.applicantInfo,
          };
          const documentId = await storeDocumentWithDeduplication(kycData);
          console.log(
            '[DiditWebSocket] KYC data stored successfully, documentId:',
            documentId,
          );

          updateVerificationStatus(sessionId, 'processing', undefined, documentId);

          if (navigationRef.isReady()) {
            navigationRef.navigate('KYCVerified', { documentId });
          }

          onSuccess?.();
        } catch (err) {
          console.error('[DiditWebSocket] Failed to store KYC data:', err);
          updateVerificationStatus(
            sessionId,
            'failed',
            'Failed to store KYC data',
          );
          onError?.('Failed to store KYC data');
        }

        socket.disconnect();
        socketsRef.current.delete(sessionId);
        subscribedSessionIdsRef.current.delete(sessionId);
      });

      socket.on('verification_failed', (reason: string) => {
        console.log('[DiditWebSocket] Verification failed:', reason);
        updateVerificationStatus(sessionId, 'failed', reason);
        onVerificationFailed?.(reason);

        socket.disconnect();
        socketsRef.current.delete(sessionId);
        subscribedSessionIdsRef.current.delete(sessionId);
      });

      socket.on('error', (errorMessage: string) => {
        console.error('[DiditWebSocket] Socket error:', errorMessage);
        updateVerificationStatus(sessionId, 'failed', errorMessage);
        onError?.(errorMessage);

        socket.disconnect();
        socketsRef.current.delete(sessionId);
        subscribedSessionIdsRef.current.delete(sessionId);
      });

      socket.on('disconnect', () => {
        console.log('[DiditWebSocket] Disconnected for sessionId:', sessionId);
      });
    },
    [
      addPendingVerification,
      updateVerificationStatus,
      getPendingVerification,
      onSuccess,
      onError,
      onVerificationFailed,
      skipAddPending,
    ],
  );

  const unsubscribe = useCallback((sessionId: string) => {
    const socket = socketsRef.current.get(sessionId);
    if (socket) {
      socket.disconnect();
      socketsRef.current.delete(sessionId);
    }
    subscribedSessionIdsRef.current.delete(sessionId);
  }, []);

  const unsubscribeAll = useCallback(() => {
    socketsRef.current.forEach(socket => {
      socket.disconnect();
    });
    socketsRef.current.clear();
    subscribedSessionIdsRef.current.clear();
  }, []);

  const isSubscribed = useCallback((sessionId: string) => {
    return subscribedSessionIdsRef.current.has(sessionId);
  }, []);

  return {
    subscribe,
    unsubscribe,
    unsubscribeAll,
    isSubscribed,
  };
}
```

- [ ] **Step 2: Delete `app/src/hooks/useSumsubWebSocket.ts`**

```bash
rm app/src/hooks/useSumsubWebSocket.ts
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add useDiditWebSocket hook, remove useSumsubWebSocket"
```

---

## Task 6: Create `useDiditLauncher` hook

**Files:**
- Create: `app/src/hooks/useDiditLauncher.ts`
- Delete: `app/src/hooks/useSumsubLauncher.ts`

- [ ] **Step 1: Create `app/src/hooks/useDiditLauncher.ts`**

```typescript
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { sanitizeErrorMessage } from '@selfxyz/mobile-sdk-alpha';

import { createSession, launchDidit } from '@/integrations/didit';
import type { DiditVerificationResult } from '@/integrations/didit/types';
import type { RootStackParamList } from '@/navigation';

export type FallbackErrorSource = 'mrz_scan_failed' | 'nfc_scan_failed';

export interface UseDiditLauncherOptions {
  countryCode: string;
  errorSource: FallbackErrorSource;
  onSuccess?: (result: DiditVerificationResult, sessionId: string) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  onError?: (error: unknown, result?: DiditVerificationResult) => void | Promise<void>;
}

export const useDiditLauncher = (options: UseDiditLauncherOptions) => {
  const { countryCode, errorSource, onSuccess, onCancel, onError } = options;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isLoading, setIsLoading] = useState(false);

  const launchDiditVerification = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await createSession();
      const result = await launchDidit(session.sessionToken);

      if (result.type === 'cancelled') {
        await onCancel?.();
        return;
      }

      if (result.type === 'failed') {
        const error = result.error?.message || result.error?.type || 'Unknown error';
        const safeError = sanitizeErrorMessage(error);
        console.error('Didit verification failed:', safeError);

        if (onError) {
          await onError(safeError, result);
        } else {
          if (errorSource === 'mrz_scan_failed') {
            navigation.navigate('RegistrationFallbackMRZ', { countryCode });
          } else {
            navigation.navigate('RegistrationFallbackNFC', { countryCode });
          }
        }
        return;
      }

      // type === 'completed'
      if (onSuccess) {
        await onSuccess(result, session.sessionId);
      } else {
        navigation.navigate('KycSuccess', { sessionId: session.sessionId });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const safeError = sanitizeErrorMessage(errorMessage);
      console.error('Error launching Didit verification:', safeError);

      if (onError) {
        await onError(safeError);
      } else {
        if (errorSource === 'mrz_scan_failed') {
          navigation.navigate('RegistrationFallbackMRZ', { countryCode });
        } else {
          navigation.navigate('RegistrationFallbackNFC', { countryCode });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigation, countryCode, errorSource, onSuccess, onCancel, onError]);

  return {
    launchDiditVerification,
    isLoading,
  };
};
```

- [ ] **Step 2: Delete `app/src/hooks/useSumsubLauncher.ts`**

```bash
rm app/src/hooks/useSumsubLauncher.ts
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add useDiditLauncher hook, remove useSumsubLauncher"
```

---

## Task 7: Update `pendingKycStore` — rename `userId` to `sessionId`, bump version

**Files:**
- Modify: `app/src/stores/pendingKycStore.ts` (entire file)

- [ ] **Step 1: Rename all `userId` references to `sessionId` and bump persist version**

Replace the entire store. Key changes:
- All `userId` params/variables → `sessionId`
- `v.userId` → `v.sessionId`
- Add `version: 1` to persist config (forces store reset on upgrade)

```typescript
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  PendingKycStatus,
  PendingKycVerification,
} from '@selfxyz/common/utils/types';

const VERIFICATION_TIMEOUT_MS = 48 * 60 * 60 * 1000; // 48 hours

interface PendingKycState {
  pendingVerifications: PendingKycVerification[];

  addPendingVerification: (sessionId: string) => void;
  updateVerificationStatus: (
    sessionId: string,
    status: PendingKycStatus,
    errorMessage?: string,
    documentId?: string,
  ) => void;
  removePendingVerification: (sessionId: string) => void;
  removeExpiredVerifications: () => void;
  clearAllPendingVerifications: () => void;
  hasPendingVerification: () => boolean;
  getPendingVerification: (
    sessionId: string,
  ) => PendingKycVerification | undefined;
}

export const usePendingKycStore = create<PendingKycState>()(
  persist(
    (set, get) => ({
      pendingVerifications: [],

      addPendingVerification: (sessionId: string) => {
        const now = Date.now();
        set(state => ({
          pendingVerifications: [
            ...state.pendingVerifications.filter(v => v.sessionId !== sessionId),
            {
              sessionId,
              createdAt: now,
              status: 'pending',
              timeoutAt: now + VERIFICATION_TIMEOUT_MS,
            },
          ],
        }));
      },

      updateVerificationStatus: (
        sessionId: string,
        status: PendingKycStatus,
        errorMessage?: string,
        documentId?: string,
      ) => {
        set(state => ({
          pendingVerifications: state.pendingVerifications.map(v =>
            v.sessionId === sessionId
              ? {
                  ...v,
                  status,
                  errorMessage,
                  ...(documentId && { documentId }),
                }
              : v,
          ),
        }));
      },

      removePendingVerification: (sessionId: string) => {
        set(state => ({
          pendingVerifications: state.pendingVerifications.filter(
            v => v.sessionId !== sessionId,
          ),
        }));
      },

      removeExpiredVerifications: () => {
        const now = Date.now();
        set(state => ({
          pendingVerifications: state.pendingVerifications.filter(
            v => v.timeoutAt > now,
          ),
        }));
      },

      clearAllPendingVerifications: () => {
        set({ pendingVerifications: [] });
      },

      hasPendingVerification: () =>
        get().pendingVerifications.some(v => v.status === 'pending'),

      getPendingVerification: (sessionId: string) =>
        get().pendingVerifications.find(v => v.sessionId === sessionId),
    }),
    {
      name: 'pending-kyc-storage',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

- [ ] **Step 2: Commit**

```bash
git add app/src/stores/pendingKycStore.ts && git commit -m "refactor: rename userId to sessionId in pendingKycStore, bump persist version"
```

---

## Task 8: Update `errorInjectionStore` — rename Sumsub triggers to Didit

**Files:**
- Modify: `app/src/stores/errorInjectionStore.ts:11-46`

- [ ] **Step 1: Rename all Sumsub error injection references**

In the `InjectedErrorType` union (line 19-20), replace:
```typescript
  | 'didit_initialization'
  | 'didit_verification';
```

In `ERROR_GROUPS` (lines 30-33), replace:
```typescript
  Didit: [
    'didit_initialization',
    'didit_verification',
  ] as InjectedErrorType[],
```

In `ERROR_LABELS` (lines 44-45), replace:
```typescript
  didit_initialization: 'Didit: Initialization',
  didit_verification: 'Didit: Verification',
```

- [ ] **Step 2: Commit**

```bash
git add app/src/stores/errorInjectionStore.ts && git commit -m "refactor: rename sumsub error injection triggers to didit"
```

---

## Task 9: Update navigation types — `KycSuccess` route params

**Files:**
- Modify: `app/src/navigation/types.ts:154-158`

- [ ] **Step 1: Update `KycSuccess` route params**

Replace:
```typescript
  KycSuccess:
    | {
        sessionId?: string;
      }
    | undefined;
```

- [ ] **Step 2: Commit**

```bash
git add app/src/navigation/types.ts && git commit -m "refactor: rename KycSuccess route param userId to sessionId"
```

---

## Task 10: Update `KycSuccessScreen` — use `useDiditWebSocket`

**Files:**
- Modify: `app/src/screens/kyc/KycSuccessScreen.tsx`

- [ ] **Step 1: Update imports and hook usage**

Replace import (line 24):
```typescript
import { useDiditWebSocket } from '@/hooks/useDiditWebSocket';
```

Update route params type (lines 35-40):
```typescript
type KycSuccessRouteParams = StaticScreenProps<
  | {
      sessionId?: string;
    }
  | undefined
>;
```

Update the component to use `sessionId`:
- Line 47: `const sessionId = params?.sessionId;`
- Line 69: `const { subscribe, unsubscribeAll } = useDiditWebSocket({`
- Line 76-79: change `userId` → `sessionId` in the subscribe effect
- Line 97: `const sessionNotificationId = uuidv5(sessionId, SELF_UUID_NAMESPACE);` (rename variable for clarity)

- [ ] **Step 2: Commit**

```bash
git add app/src/screens/kyc/KycSuccessScreen.tsx && git commit -m "refactor: update KycSuccessScreen to use useDiditWebSocket and sessionId"
```

---

## Task 11: Update `usePendingKycRecovery` — use `useDiditWebSocket`

**Files:**
- Modify: `app/src/hooks/usePendingKycRecovery.ts`

- [ ] **Step 1: Update import and rename references**

Replace import (line 7):
```typescript
import { useDiditWebSocket } from '@/hooks/useDiditWebSocket';
```

Replace hook call (line 42):
```typescript
  const { subscribe, unsubscribeAll } = useDiditWebSocket({
```

Rename all `v.userId` → `v.sessionId` references (lines 68, 81, 100, 119, 124).
Update log messages from `[SumsubWebSocket]`/`useSumsubWebSocket` to `[DiditWebSocket]`/`useDiditWebSocket` in comments.

- [ ] **Step 2: Commit**

```bash
git add app/src/hooks/usePendingKycRecovery.ts && git commit -m "refactor: update usePendingKycRecovery to use useDiditWebSocket and sessionId"
```

---

## Task 12: Update `selfClientProvider` — use Didit SDK

**Files:**
- Modify: `app/src/providers/selfClientProvider.tsx`

- [ ] **Step 1: Update imports**

Replace the Sumsub import (line 26):
```typescript
// Before
import { fetchAccessToken, launchSumsub } from '@/integrations/sumsub';
// After
import { createSession, launchDidit } from '@/integrations/didit';
```

- [ ] **Step 2: Replace the KYC launch block (lines 342-428)**

Replace the entire `case 'kyc':` async block with:

```typescript
            case 'kyc':
              (async () => {
                try {
                  if (
                    useErrorInjectionStore
                      .getState()
                      .shouldTrigger('didit_initialization')
                  ) {
                    console.log('[DEV] Injecting Didit initialization error');
                    throw new Error(
                      'Injected Didit initialization error for testing',
                    );
                  }

                  const session = await createSession();
                  const result = await launchDidit(session.sessionToken);

                  console.log('[Didit] Result:', JSON.stringify(result));

                  if (result.type === 'cancelled') {
                    console.log(
                      '[Didit] User cancelled or closed without completing',
                    );
                    return;
                  }

                  const shouldInjectVerificationError = useErrorInjectionStore
                    .getState()
                    .shouldTrigger('didit_verification');

                  if (result.type === 'failed' || shouldInjectVerificationError) {
                    if (shouldInjectVerificationError) {
                      console.log('[DEV] Injecting Didit verification error');
                    } else {
                      const safeError = sanitizeErrorMessage(
                        result.error?.message || result.error?.type || 'unknown_error',
                      );
                      console.error('KYC provider failed:', safeError);
                    }
                    if (navigationRef.isReady()) {
                      navigationRef.navigate('KycFailure', {
                        countryCode,
                        canRetry: true,
                      });
                    }
                    return;
                  }

                  console.log(
                    '[Didit] Verification submitted, status:',
                    result.session?.status,
                  );
                  if (navigationRef.isReady()) {
                    navigationRef.navigate('KycSuccess', {
                      sessionId: session.sessionId,
                    });
                  }
                } catch (error) {
                  const safeInitError = sanitizeErrorMessage(
                    error instanceof Error ? error.message : String(error),
                  );
                  console.error('Error in KYC flow:', safeInitError);
                  if (navigationRef.isReady()) {
                    navigationRef.navigate('KycConnectionError', {
                      countryCode,
                    });
                  }
                }
              })();
              break;
```

- [ ] **Step 3: Update the country code comment**

Line 319: change "Store country code early so it's available for Sumsub fallback flows" to "Store country code early so it's available for Didit fallback flows"

- [ ] **Step 4: Commit**

```bash
git add app/src/providers/selfClientProvider.tsx && git commit -m "refactor: update selfClientProvider to use Didit SDK"
```

---

## Task 13: Update fallback screens (5 files) — swap `useSumsubLauncher` for `useDiditLauncher`

**Files:**
- Modify: `app/src/screens/documents/scanning/DocumentNFCTroubleScreen.tsx`
- Modify: `app/src/screens/documents/scanning/DocumentCameraTroubleScreen.tsx`
- Modify: `app/src/screens/documents/scanning/RegistrationFallbackMRZScreen.tsx`
- Modify: `app/src/screens/documents/scanning/RegistrationFallbackNFCScreen.tsx`
- Modify: `app/src/screens/documents/aadhaar/AadhaarUploadErrorScreen.tsx`

- [ ] **Step 1: In each file, replace the import**

```typescript
// Before
import { useSumsubLauncher } from '@/hooks/useSumsubLauncher';
// After
import { useDiditLauncher } from '@/hooks/useDiditLauncher';
```

- [ ] **Step 2: In each file, replace the hook call**

```typescript
// Before
const { launchSumsubVerification, isLoading } = useSumsubLauncher({
// After
const { launchDiditVerification, isLoading } = useDiditLauncher({
```

- [ ] **Step 3: In each file, replace the function call in handlers**

```typescript
// Before
await launchSumsubVerification();
// After
await launchDiditVerification();
```

And update any `onPress={launchSumsubVerification}` to `onPress={launchDiditVerification}`.

- [ ] **Step 4: Commit**

```bash
git add app/src/screens/documents/ && git commit -m "refactor: update 5 fallback screens to use useDiditLauncher"
```

---

## Task 14: Update `LogoConfirmationScreen` — full Sumsub→Didit rewrite

**Files:**
- Modify: `app/src/screens/documents/selection/LogoConfirmationScreen.tsx:29-100`

- [ ] **Step 1: Replace imports**

```typescript
// Before (lines 29-32)
import {
  fetchAccessToken,
  launchSumsub,
} from '@/integrations/sumsub/sumsubService';

// After
import {
  createSession,
  launchDidit,
} from '@/integrations/didit';
```

- [ ] **Step 2: Rewrite `handleNotFound` callback (lines 62-100)**

```typescript
      onButtonPress: async () => {
        try {
          const session = await createSession();
          const result = await launchDidit(session.sessionToken);

          if (result.type === 'cancelled') {
            return;
          }

          if (result.type === 'failed') {
            console.error(
              'Didit verification failed:',
              result.error?.type ?? 'unknown',
            );
            navigation.navigate('KycFailure', {
              countryCode,
              canRetry: true,
            });
            return;
          }

          navigation.navigate('KycSuccess', { sessionId: session.sessionId });
        } catch {
          console.error('Error launching Didit verification');
          showModal({
            titleText: 'Error',
            bodyText: 'Unable to start verification. Please try again.',
            buttonText: 'OK',
          });
        }
      },
```

- [ ] **Step 3: Commit**

```bash
git add app/src/screens/documents/selection/LogoConfirmationScreen.tsx && git commit -m "refactor: update LogoConfirmationScreen to use Didit SDK"
```

---

## Task 15: Update `KycIdCard` comment

**Files:**
- Modify: `app/src/components/homescreen/KycIdCard.tsx:33`

- [ ] **Step 1: Update the comment**

```typescript
// Before
 * Maps KYC idType to display title.
 * idType values from Sumsub: "drivers_licence", "passport", "NATIONAL ID", etc.

// After
 * Maps KYC idType to display title.
 * idType values: "drivers_licence", "passport", "NATIONAL ID", etc.
```

- [ ] **Step 2: Update the component JSDoc (line 49)**

```typescript
// Before
 * Used for documents verified through Sumsub KYC flow (drivers license, etc.).
// After
 * Used for documents verified through KYC flow (drivers license, etc.).
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/homescreen/KycIdCard.tsx && git commit -m "docs: remove Sumsub references from KycIdCard comments"
```

---

## Task 16: Update test infrastructure — jest mocks and config

**Files:**
- Modify: `app/jest.setup.js:1287-1311`
- Modify: `app/jest.config.cjs:19`
- Modify: `app/react-native.config.cjs:9-13`
- Modify: `app/tests/src/screens/kyc/KycSuccessScreen.test.tsx`
- Modify: `app/tests/src/hooks/usePendingKycRecovery.test.ts`
- Modify: `app/tests/src/navigation.test.tsx`

- [ ] **Step 1: Update `app/jest.setup.js` — replace Sumsub mock (lines 1287-1311)**

```javascript
// Mock @didit-protocol/sdk-react-native
jest.mock('@didit-protocol/sdk-react-native', () => ({
  __esModule: true,
  startVerification: jest.fn().mockResolvedValue({
    type: 'completed',
    session: { status: 'approved', sessionId: 'mock-session-id' },
  }),
  startVerificationWithWorkflow: jest.fn().mockResolvedValue({
    type: 'completed',
    session: { status: 'approved', sessionId: 'mock-session-id' },
  }),
}));
```

- [ ] **Step 2: Update `app/jest.config.cjs` line 19**

Replace `@sumsub` with `@didit-protocol` in the `transformIgnorePatterns`:

```javascript
'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-community|@segment/analytics-react-native|@openpassport|react-native-keychain|react-native-check-version|react-native-nfc-manager|react-native-passport-reader|react-native-gesture-handler|uuid|@stablelib|@react-native-google-signin|react-native-cloud-storage|@react-native-clipboard|@react-native-firebase|@selfxyz|@sentry|@anon-aadhaar|react-native-svg|react-native-svg-circle-country-flags|react-native-blur-effect|@didit-protocol)/)',
```

- [ ] **Step 3: Update `app/react-native.config.cjs` (lines 9-13)**

```javascript
// Disable Didit SDK autolinking during E2E testing to avoid build issues
if (process.env.E2E_TESTING === '1') {
  dependencies['@didit-protocol/sdk-react-native'] = {
    platforms: { android: null, ios: null },
  };
}
```

- [ ] **Step 4: Update test files — replace `useSumsubWebSocket` mocks and `userId` fixtures**

In `app/tests/src/screens/kyc/KycSuccessScreen.test.tsx` and `app/tests/src/hooks/usePendingKycRecovery.test.ts`:

Replace:
```typescript
jest.mock('@/hooks/useSumsubWebSocket', ...);
```
With:
```typescript
jest.mock('@/hooks/useDiditWebSocket', ...);
```

And update all mock references from `useSumsubWebSocket` to `useDiditWebSocket`.

**Also rename all `userId` references in test fixture data to `sessionId`:**
- In `usePendingKycRecovery.test.ts`: replace `userId: 'user-123'` (and similar) with `sessionId: 'session-123'` throughout. Also update variable names like `mockUserId` → `mockSessionId`.
- In `KycSuccessScreen.test.tsx`: replace `userId: mockUserId` with `sessionId: mockSessionId`, rename `mockUserId` variables, and update test descriptions (e.g., "should handle missing userId" → "should handle missing sessionId").

- [ ] **Step 5: Update `app/tests/src/navigation.test.tsx` — replace Sumsub mock**

Replace the `@sumsub/react-native-mobilesdk-module` mock with the same `@didit-protocol/sdk-react-native` mock from step 1.

- [ ] **Step 6: Commit**

```bash
git add app/jest.setup.js app/jest.config.cjs app/react-native.config.cjs app/tests/ && git commit -m "test: update jest mocks and config for Didit SDK"
```

---

## Task 17: Update native build config — Podfile and build.gradle

**Files:**
- Modify: `app/ios/Podfile:1-16`
- Modify: `app/android/build.gradle:45`

- [ ] **Step 1: Update `app/ios/Podfile` — remove Sumsub, add Didit**

Replace lines 1-16 (from `source "https://cdn.cocoapods.org/"` through `end`) with just:
```ruby
source "https://cdn.cocoapods.org/"
```

This removes the `SumSubstance/Specs.git` source, `IDENSIC_WITH_FISHERMAN` env var, and the `unless ENV["E2E_TESTING"]` block. The E2E autolinking disable is handled by `react-native.config.cjs`.

Then, inside the `target 'Self'` block (after other pods), add the DiditSDK pod:
```ruby
pod 'DiditSDK', :podspec => 'https://raw.githubusercontent.com/didit-protocol/sdk-ios/main/DiditSDK.podspec'
```

Leave `use_frameworks!` (line 18) and everything below it untouched.

- [ ] **Step 2: Update `app/android/build.gradle` line 45**

Replace:
```groovy
        maven { url "https://maven.sumsub.com/repository/maven-public/" }
```
With:
```groovy
        maven { url "https://raw.githubusercontent.com/didit-protocol/sdk-android/main/repository" }
```

- [ ] **Step 3: Commit**

```bash
git add app/ios/Podfile app/android/build.gradle && git commit -m "build: swap Sumsub native deps for Didit in Podfile and build.gradle"
```

---

## Task 18: Validate — type check, lint, and test

- [ ] **Step 1: Type check**

```bash
cd app && yarn types
```

Expected: no errors.

- [ ] **Step 2: Lint**

```bash
yarn lint
```

Expected: no errors.

- [ ] **Step 3: Run tests**

```bash
cd app && yarn test
```

Expected: all tests pass. If tests fail due to `userId` → `sessionId` rename in test fixtures, update the fixtures.

- [ ] **Step 4: Fix any issues found, then commit**

```bash
git add -A && git commit -m "fix: resolve any type/lint/test issues from Didit migration"
```

---

## Summary

| Task | Description | Files changed |
|------|-------------|---------------|
| 1 | Package swap | 3 |
| 2 | Env var rename | 3 |
| 3 | Shared type rename | 1 |
| 4 | Didit integration module | 6 (3 create, 3 delete) |
| 5 | useDiditWebSocket hook | 2 (1 create, 1 delete) |
| 6 | useDiditLauncher hook | 2 (1 create, 1 delete) |
| 7 | pendingKycStore | 1 |
| 8 | errorInjectionStore | 1 |
| 9 | Navigation types | 1 |
| 10 | KycSuccessScreen | 1 |
| 11 | usePendingKycRecovery | 1 |
| 12 | selfClientProvider | 1 |
| 13 | 5 fallback screens | 5 |
| 14 | LogoConfirmationScreen | 1 |
| 15 | KycIdCard comment | 1 |
| 16 | Test infrastructure | 6 |
| 17 | Native build config | 2 |
| 18 | Validate | 0 |
