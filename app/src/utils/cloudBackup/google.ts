// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { GOOGLE_SIGNIN_ANDROID_CLIENT_ID } from '@env';
import { authorize } from 'react-native-app-auth';
import { REDIRECT_URL } from '@selfxyz/common';
import { Platform } from 'react-native';


export async function googleSignIn() {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    const result = await authorize({
      issuer: 'https://accounts.google.com',
      clientId: GOOGLE_SIGNIN_ANDROID_CLIENT_ID,
      redirectUrl: REDIRECT_URL,
      scopes: [
        'openid',
        'profile',
        'email',
        'https://www.googleapis.com/auth/drive.appdata',
      ],
      additionalParameters: { access_type: 'offline' },
      serviceConfiguration: {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      },
    });

    if (!result || !result.accessToken) {
      return null;
    }

    return { accessToken: result.accessToken };
  } catch (error) {
    console.error(error);
    return null;
  }
}
