// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { navigationRef } from '@/navigation';
import { registerModalCallbacks } from '@/utils/modalCallbackRegistry';

export const showErrorModal = (title?: string, message?: string): void => {
  if (!navigationRef.isReady()) {
    console.warn('Navigation not ready, cannot show error modal');
    return;
  }

  // Check if a modal is already open
  const currentRoute = navigationRef.getCurrentRoute();
  if (currentRoute?.name === 'Modal') {
    // Modal already open, skip showing another one
    return;
  }

  const callbackId = registerModalCallbacks({
    onButtonPress: () => {},
    onModalDismiss: () => {},
  });

  navigationRef.navigate('Modal', {
    titleText: title ?? 'Something went wrong',
    bodyText: message ?? 'An error occurred. Please try again.',
    buttonText: 'OK',
    callbackId,
  });
};
