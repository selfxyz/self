// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Linking } from 'react-native';

import { supportFormUrl } from '@/consts/links';
import { navigationRef } from '@/navigation';

export const SUPPORT_FORM_BUTTON_TEXT = 'Send feedback';

export const SUPPORT_FORM_COMING_SOON_BUTTON_TEXT = 'Let us know';

export const SUPPORT_FORM_COMING_SOON_MESSAGE =
  'Want your document supported? Let us know.';

export const SUPPORT_FORM_MESSAGE = 'Have feedback? Please fill out our form.';

export const SUPPORT_FORM_TIP_MESSAGE = 'Have feedback? Let us know.';

/**
 * Imperatively open the support form using navigationRef.
 * Safe to call from anywhere — inside or outside the React Navigation tree.
 * Falls back to opening the URL in the system browser if navigation is not ready.
 */
export const openSupportForm = (): void => {
  if (navigationRef.isReady()) {
    navigationRef.navigate('WebView', {
      url: supportFormUrl,
      title: 'Get Support',
    });
  } else {
    Linking.openURL(supportFormUrl).catch(err =>
      console.warn('Failed to open support form URL:', err),
    );
  }
};
