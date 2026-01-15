// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Alert, Linking } from 'react-native';

import { discordUrl } from '@/consts/links';

export const DISCORD_COMING_SOON_BUTTON_TEXT = 'Get updates in Discord';

export const DISCORD_COMING_SOON_MESSAGE =
  'Get updates and support in our Discord community.';

export const DISCORD_SUPPORT_BUTTON_TEXT = 'Get support in Discord';

export const DISCORD_SUPPORT_MESSAGE =
  'Need help? Join our Discord to open a support ticket.';

export const DISCORD_SUPPORT_MESSAGE_SHORT =
  'Join our Discord to open a support ticket.';

export const DISCORD_TIP_MESSAGE =
  'Join our Discord to get support and open a ticket.';

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
