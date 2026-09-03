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
    noBiometrics: `Recovering from ${STORAGE_NAME} needs biometric unlock. Turn on Face ID, fingerprint or device unlock in your device settings and come back, or recover with your recovery phrase below.`,
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

  /**
   * Failure messages for both recovery screens, keyed by the reason each screen
   * tracks. A superset of either screen's cases, so indexing it only compiles
   * while a screen's error union stays a subset of these keys.
   */
  errors: {
    no_backup_found: `We couldn’t find a backup in ${STORAGE_NAME}. Backups don’t move between platforms — one made on Android can’t be restored on iPhone, and one made on iPhone can’t be restored on Android. Use your recovery phrase instead.`,
    cloud_unavailable: `Sign in to ${STORAGE_NAME} in your device settings, then try again. You can also recover with your recovery phrase.`,
    sign_in_cancelled: `The ${STORAGE_NAME} sign-in was dismissed before it finished. Try again, or use your recovery phrase.`,
    sign_in_failed: `Something went wrong signing in to ${STORAGE_NAME}. Try again, or recover with your recovery phrase.`,
    backup_corrupt: `We found a backup in ${STORAGE_NAME} but couldn’t read it. Recover with your recovery phrase instead.`,
    // Unreachable from the restore flow (backup_conflict is enable-only), but
    // the key must exist: the choice screen indexes this map with the full
    // CloudBackupErrorReason union.
    backup_conflict: `Your ${STORAGE_NAME} account already has a Self backup that doesn’t match this device. It was left untouched.`,
    backup_read_failed: `We couldn’t reach ${STORAGE_NAME}. Check your connection and try again.`,
    backup_not_synced: `Your backup is still syncing from ${STORAGE_NAME}. Keep the app open and try again in a moment.`,
    invalid_mnemonic:
      'That doesn’t look like a valid recovery phrase. Make sure all 24 words are correct and in the right order.',
    restore_failed:
      'We couldn’t restore your account with this phrase. Please double-check and try again.',
    // The cloud path validates the phrase before restoring it, so a failure
    // here is this device refusing to store the secret — telling the user to
    // check a phrase they never typed would send them nowhere.
    secret_storage_failed:
      'We found your backup but couldn’t save it securely on this device. Make sure your device lock is set up, then try again.',
    not_registered:
      'This recovery phrase doesn’t match a registered ID. If you registered with a different phrase, try that one instead.',
    // The cloud path: a backup exists on the account, so Self was used
    // before — just not with the document on this device. The app holds one
    // secret per install, so the only usable exit is this document's phrase.
    backup_not_registered: `We found a Self backup in ${STORAGE_NAME}, but it’s not the one used with this document. Enter the recovery phrase you used with this document instead.`,
    network_error:
      'We couldn’t reach the Self network to verify your ID. Check your connection and try again.',
    unexpected_error: 'Something went wrong. Please try again.',
  },
} as const;
