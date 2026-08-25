// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
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
import { CloudBackupError } from '@/services/cloud-backup/errors';

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

/**
 * A user cancel is only recognisable by its message on Android ("User
 * cancelled flow"), except tapping Deny on Google's consent page, which
 * arrives as the OAuth code `access_denied`. iOS dismissals produce a generic
 * "error -3" message this cannot match — acceptable, since backup routes iOS
 * to iCloud and never reaches this flow.
 */
function isSignInCancellation(error: unknown): boolean {
  if ((error as { code?: unknown })?.code === 'access_denied') {
    return true;
  }
  return error instanceof Error && /cancel/i.test(error.message);
}

/**
 * @returns the authorization result, or null when the user cancelled. Any
 * other failure — misconfiguration, revoked consent, no network — throws,
 * so it is never mistaken for a cancel.
 */
export async function googleSignIn(): Promise<AuthorizeResult | null> {
  try {
    return await authorize(config);
  } catch (error) {
    if (isSignInCancellation(error)) {
      return null;
    }
    console.error(error);
    const code = (error as { code?: unknown })?.code;
    throw new CloudBackupError(
      'sign_in_failed',
      `Google sign-in failed${typeof code === 'string' ? ` (${code})` : ''}`,
      { cause: error },
    );
  }
}
