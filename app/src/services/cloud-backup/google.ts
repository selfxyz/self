// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AuthConfiguration, AuthorizeResult } from 'react-native-app-auth';
import { authorize } from 'react-native-app-auth';
import { GOOGLE_SIGNIN_ANDROID_CLIENT_ID } from '@env';
import { GDrive } from '@robinbobin/react-native-google-drive-api-wrapper';

import {
  googleDriveAppDataScope,
  googleOAuthAuthorizationEndpoint,
  googleOAuthTokenEndpoint,
} from '@/consts/links';

// Ensure the client ID is available at runtime (skip in test environment)
const isTestEnvironment =
  process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;

if (!isTestEnvironment && !GOOGLE_SIGNIN_ANDROID_CLIENT_ID) {
  throw new Error(
    'GOOGLE_SIGNIN_ANDROID_CLIENT_ID environment variable is not set',
  );
}

const config: AuthConfiguration = {
  // DEBUG: log config for Auth
  // ensure this prints the correct values before calling authorize
  clientId: GOOGLE_SIGNIN_ANDROID_CLIENT_ID || 'mock-client-id',
  redirectUrl: 'com.proofofpassportapp:/oauth2redirect',
  scopes: [googleDriveAppDataScope],
  serviceConfiguration: {
    authorizationEndpoint: googleOAuthAuthorizationEndpoint,
    tokenEndpoint: googleOAuthTokenEndpoint,
  },
  additionalParameters: { access_type: 'offline', prompt: 'consent' as const },
};

export async function createGDrive() {
  const response = await googleSignIn();
  if (!response) {
    // user canceled
    return null;
  }
  const gdrive = new GDrive();
  gdrive.accessToken = response.accessToken;
  return gdrive;
}

export async function googleSignIn(): Promise<AuthorizeResult | null> {
  try {
    return await authorize(config);
  } catch (error) {
    console.error(error);
    return null;
  }
}
