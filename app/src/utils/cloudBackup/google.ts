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
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Token exchange failed (${response.status}): ${errorText}`,
      );
    }

    const json = await response.json();

    if (!json.access_token || typeof json.access_token !== 'string') {
      throw new Error('Invalid response: missing or invalid access_token');
    }
    return { accessToken: json.access_token };
  } catch (error) {
    console.error(error);
    return null;
  }
}
