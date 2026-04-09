// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { STORAGE_NAME } from '@/services/cloud-backup';

export const recoveryCopy = {
  /** First screen: recover vs register decision */
  entry: {
    title: 'Recover your Self account',
    description:
      'If you already registered a document, recover your existing account first. Re-scanning your passport without recovering will create a new account and your previous registration will be lost.',
    actions: {
      recover: 'Recover my account',
      register: 'Register a new ID instead',
    },
  },

  /** Second screen: pick a recovery method */
  choice: {
    title: 'Recover your Self account',
    description: 'Choose how you want to recover your account.',
    noBiometrics:
      'Cloud recovery requires biometrics, which are unavailable on this device. You can still recover using your recovery phrase.',
    actions: {
      cloud: (restoring: boolean) =>
        `${restoring ? 'Recovering' : 'Recover'} from ${STORAGE_NAME}${restoring ? '\u2026' : ''}`,
      or: 'OR',
      phrase: 'Enter your recovery phrase',
    },
  },

  /** Recovery phrase entry screen */
  phrase: {
    instructions:
      'Your recovery phrase has 24 words. Enter the words in the correct order, separated by spaces.',
    placeholder: 'Enter or paste your recovery phrase',
    paste: 'PASTE',
    submit: 'Continue',
  },
} as const;
