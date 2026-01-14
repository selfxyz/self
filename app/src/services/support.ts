// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Alert, Linking } from 'react-native';

import { discordUrl } from '@/consts/links';

export const openDiscordSupport = async (): Promise<void> => {
  try {
    const canOpen = await Linking.canOpenURL(discordUrl);
    if (canOpen) {
      await Linking.openURL(discordUrl);
    } else {
      console.warn('Cannot open Discord URL - no handler available');
      Alert.alert(
        'Unable to Open Link',
        'No app is available to open the Discord support link. Please install Discord or use a web browser.',
      );
    }
  } catch (error) {
    console.error(
      'Failed to open Discord support:',
      error instanceof Error ? error.message : String(error),
    );
    Alert.alert(
      'Error',
      'Unable to open Discord support. Please try again later or contact support through another method.',
    );
  }
};
