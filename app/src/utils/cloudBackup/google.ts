// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { GOOGLE_SIGNIN_ANDROID_CLIENT_ID } from '@env';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

export async function googleSignIn() {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: GOOGLE_SIGNIN_ANDROID_CLIENT_ID,
      scopes: ['https://www.googleapis.com/auth/drive.appdata'],
      offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
    });

    // Check if device has Google Play Services
    await GoogleSignin.hasPlayServices();

    // Sign in the user
    await GoogleSignin.signIn();

    // Get access token
    const tokens = await GoogleSignin.getTokens();

    return { accessToken: tokens.accessToken };
  } catch (error) {
    console.error('Google Sign-In error:', error);
    return null;
  }
}
