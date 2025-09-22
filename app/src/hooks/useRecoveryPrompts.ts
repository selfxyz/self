// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect } from 'react';

import { useModal } from '@/hooks/useModal';
import { navigationRef } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';

// TODO: need to debug and test the logic. it pops up too often.
export default function useRecoveryPrompts() {
  const { loginCount, cloudBackupEnabled, hasViewedRecoveryPhrase } =
    useSettingStore();
  const { getAllDocuments } = usePassport();
  const { showModal, visible } = useModal({
    titleText: 'Protect your account',
    bodyText:
      'Enable cloud backup or save your recovery phrase so you can recover your account.',
    buttonText: 'Back up now',
    onButtonPress: async () => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('CloudBackupSettings', {
          nextScreen: 'SaveRecoveryPhrase',
        });
      }
    },
    onModalDismiss: () => {},
  } as const);

  useEffect(() => {
    async function maybePrompt() {
      if (!navigationRef.isReady()) {
        return;
      }
      if (!cloudBackupEnabled && !hasViewedRecoveryPhrase) {
        try {
          const docs = await getAllDocuments();
          if (Object.keys(docs).length === 0) {
            return;
          }
          const shouldPrompt =
            loginCount > 0 && (loginCount <= 3 || (loginCount - 3) % 5 === 0);
          if (shouldPrompt) {
            showModal();
          }
        } catch {
          // Silently fail to avoid breaking the hook
          // If we can't get documents, we shouldn't show the prompt
          return;
        }
      }
    }
    maybePrompt().catch(() => {});
  }, [
    loginCount,
    cloudBackupEnabled,
    hasViewedRecoveryPhrase,
    showModal,
    getAllDocuments,
  ]);

  return { visible };
}
