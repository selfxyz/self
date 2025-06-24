// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { GOOGLE_SIGNIN_WEB_CLIENT_ID } from '@env';
import { Platform } from 'react-native';
import { signIn } from 'react-native-credentials-manager';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function googleSignIn() {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    const credential = await signIn(['google-signin'], {
      googleSignIn: { serverClientId: GOOGLE_SIGNIN_WEB_CLIENT_ID },
    });

    if (!credential || credential.type !== 'google-signin') {
      return null;
    }

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${credential.idToken}`,
    });
    const json = await response.json();

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${JSON.stringify(json)}`);
    }

    return { accessToken: json.access_token as string };
  } catch (error) {
    console.error(error);
    return null;
  }
}
