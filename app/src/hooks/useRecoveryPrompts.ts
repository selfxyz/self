// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useEffect } from 'react';

import { navigationRef } from '../navigation';
import { useSettingStore } from '../stores/settingStore';
import { useModal } from './useModal';

export default function useRecoveryPrompts() {
  const { loginCount, cloudBackupEnabled, hasViewedRecoveryPhrase } =
    useSettingStore();
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
    if (!navigationRef.isReady()) {
      return;
    }
    if (!cloudBackupEnabled && !hasViewedRecoveryPhrase) {
      const shouldPrompt =
        loginCount > 0 && (loginCount <= 3 || (loginCount - 3) % 5 === 0);
      if (shouldPrompt) {
        showModal();
      }
    }
  }, [loginCount, cloudBackupEnabled, hasViewedRecoveryPhrase, showModal]);

  return { visible };
}
