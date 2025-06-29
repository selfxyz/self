// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { GOOGLE_SIGNIN_WEB_CLIENT_ID } from '@env';
import {
  AuthConfiguration,
  authorize,
  AuthorizeResult,
} from 'react-native-app-auth';

const config: AuthConfiguration = {
  issuer: 'https://accounts.google.com',
  clientId: GOOGLE_SIGNIN_WEB_CLIENT_ID,
  redirectUrl: 'com.proofofpassportapp:/oauthredirect',
  scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  additionalParameters: { access_type: 'offline', prompt: 'consent' as const },
};

export async function googleSignIn(): Promise<AuthorizeResult | null> {
  try {
    return await authorize(config);
  } catch (error) {
    console.error(error);
    return null;
  }
}
