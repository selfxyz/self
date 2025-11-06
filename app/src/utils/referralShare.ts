// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Alert, Linking, Platform, Share } from 'react-native';

/**
 * Shares a message via the native Share API.
 *
 * @param message - The message to share
 * @param url - The URL to share
 * @param title - The title of the share
 */
export const shareViaNative = async (
  message: string,
  url: string,
  title: string,
): Promise<void> => {
  try {
    await Share.share({
      message,
      title,
      url,
    });
  } catch (error) {
    console.error('Error sharing:', error);
  }
};

/**
 * Shares a message via SMS/iMessage.
 *
 * @param message - The message to share
 * @throws Will show an alert if the Messages app cannot be opened
 */
export const shareViaSMS = async (message: string): Promise<void> => {
  try {
    // iOS uses sms:&body=, Android uses sms:?body=
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${separator}body=${encodeURIComponent(message)}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      if (Platform.OS === 'android') {
        try {
          await Linking.openURL(url);

          return;
        } catch {
          // same as for WhatsApp, we try anyway and show alert if it fails
        }
      }

      Alert.alert('Error', 'Unable to open Messages app');
    }
  } catch (error) {
    console.error('Error opening Messages:', error);
    Alert.alert('Error', 'Failed to open Messages app');
  }
};

/**
 * Shares a message via WhatsApp.
 *
 * @param message - The message to share
 * @throws Will show an alert if WhatsApp is not installed or cannot be opened
 */
export const shareViaWhatsApp = async (message: string): Promise<void> => {
  try {
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

    const schemeToCheck = Platform.OS === 'ios' ? 'whatsapp://' : url;

    const canOpen = await Linking.canOpenURL(schemeToCheck);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // openURL() works even if canOpenURL() returns false in android
      if (Platform.OS === 'android') {
        try {
          await Linking.openURL(url);
          return;
        } catch {
          //atleast we tried
          //fallthrough to show alert
        }
      }
      Alert.alert(
        'WhatsApp Not Installed',
        'Please install WhatsApp to share via this method, or use the Share button instead.',
        [{ text: 'OK' }],
      );
    }
  } catch (error) {
    console.error('Error opening WhatsApp:', error);
    Alert.alert('Error', 'Failed to open WhatsApp');
  }
};
