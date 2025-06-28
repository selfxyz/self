// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { GOOGLE_SIGNIN_WEB_CLIENT_ID } from '@env';
import { Platform } from 'react-native';
import { signIn } from 'react-native-credentials-manager';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function googleSignIn() {
  if (Platform.OS !== 'android') {
    console.log('[GoogleSignIn] Not on Android, skipping');
    return null;
  }

  console.log('[GoogleSignIn] Starting Google sign-in process...');
  console.log(
    '[GoogleSignIn] Using serverClientId:',
    GOOGLE_SIGNIN_WEB_CLIENT_ID,
  );

  try {
    const credential = await signIn(['google-signin'], {
      googleSignIn: { serverClientId: GOOGLE_SIGNIN_WEB_CLIENT_ID },
    });

    console.log('[GoogleSignIn] Credential result:', credential);
    console.log(
      '[GoogleSignIn] Available credential fields:',
      Object.keys(credential || {}),
    );

    if (!credential || credential.type !== 'google-signin') {
      console.log('[GoogleSignIn] No valid credential returned');
      return null;
    }

    // Log what we actually got from the credentials manager
    const credentialAny = credential as any;
    console.log('[GoogleSignIn] Credential properties:', {
      type: credential.type,
      hasIdToken: !!credential.idToken,
      hasAccessToken: !!credentialAny.accessToken,
      hasAuthCode: !!credentialAny.authorizationCode,
      hasServerAuthCode: !!credentialAny.serverAuthCode,
      allProps: Object.keys(credential),
    });

    // Check if we have an access token (some implementations might provide it)
    if (credentialAny.accessToken) {
      console.log(
        '[GoogleSignIn] Got access token directly from credentials manager',
      );
      return { accessToken: credentialAny.accessToken };
    }

    // Check if we have a server auth code (authorization code)
    if (credentialAny.serverAuthCode || credentialAny.authorizationCode) {
      const authCode =
        credentialAny.serverAuthCode || credentialAny.authorizationCode;
      console.log(
        '[GoogleSignIn] Got authorization code, exchanging for tokens...',
      );

      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=authorization_code&code=${authCode}&client_id=${GOOGLE_SIGNIN_WEB_CLIENT_ID}`,
      });

      console.log(
        '[GoogleSignIn] Token exchange response status:',
        response.status,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GoogleSignIn] Token exchange failed:', errorText);
        throw new Error(
          `Token exchange failed (${response.status}): ${errorText}`,
        );
      }

      const json = await response.json();
      console.log('[GoogleSignIn] Token exchange response:', json);

      if (!json.access_token || typeof json.access_token !== 'string') {
        console.error('[GoogleSignIn] Invalid access token in response:', json);
        throw new Error('Invalid response: missing or invalid access_token');
      }

      console.log('[GoogleSignIn] Successfully got access token');
      return { accessToken: json.access_token };
    }

    // If we only have ID token, we need to inform about the limitation
    console.error(
      '[GoogleSignIn] Only ID token available, but Google Drive API requires access token',
    );
    console.error(
      '[GoogleSignIn] To fix this, configure your Google Cloud Console:',
    );
    console.error(
      '[GoogleSignIn] 1. Go to APIs & Services → Library → Enable "Google Drive API"',
    );
    console.error(
      '[GoogleSignIn] 2. Go to OAuth consent screen → Scopes → Add "https://www.googleapis.com/auth/drive.file"',
    );
    console.error(
      '[GoogleSignIn] 3. Make sure your web client ID is properly configured',
    );
    console.error('[GoogleSignIn] Current setup:', {
      idToken: !!credential.idToken,
      needsAccessToken: true,
      availableFields: Object.keys(credential),
    });

    throw new Error(
      'Google Drive API not configured - enable Drive API and add scopes in Google Cloud Console',
    );
  } catch (error) {
    console.error('[GoogleSignIn] Error in sign-in process:', error);
    return null;
  }
}
