// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Alert, Linking } from 'react-native';

import { supportFormUrl } from '@/consts/links';

export const SUPPORT_FORM_BUTTON_TEXT = 'Send feedback';

export const SUPPORT_FORM_COMING_SOON_BUTTON_TEXT = 'Let us know';

export const SUPPORT_FORM_COMING_SOON_MESSAGE =
  'Want your document supported? Let us know.';

export const SUPPORT_FORM_MESSAGE = 'Have feedback? Please fill out our form.';

export const SUPPORT_FORM_TIP_MESSAGE = 'Have feedback? Let us know.';

export const openSupportForm = async (): Promise<void> => {
  try {
    const canOpen = await Linking.canOpenURL(supportFormUrl);
    if (canOpen) {
      await Linking.openURL(supportFormUrl);
    } else {
      console.warn('Cannot open support form URL - no handler available');
      Alert.alert(
        'Unable to Open Link',
        'No app is available to open the support form. Please try again using a web browser.',
      );
    }
  } catch (error) {
    console.error(
      'Failed to open support form:',
      error instanceof Error ? error.message : String(error),
    );
    Alert.alert(
      'Error',
      'Unable to open support form. Please try again later or contact support through another method.',
    );
  }
};
