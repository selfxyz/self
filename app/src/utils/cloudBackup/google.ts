//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import { GOOGLE_SIGNIN_WEB_CLIENT_ID } from '@env';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  webClientId: GOOGLE_SIGNIN_WEB_CLIENT_ID,
  offlineAccess: true,
});

export async function googleSignIn() {
  try {
    await GoogleSignin.hasPlayServices();
    if ((await GoogleSignin.signInSilently()).type === 'success') {
      return await GoogleSignin.getTokens();
    }
    if ((await GoogleSignin.signIn()).type === 'success') {
      return await GoogleSignin.getTokens();
    }
    // user cancelled
    return null;
  } catch (error) {
    console.error(error);
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.IN_PROGRESS:
          return null;
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error('GooglePlayServices not available');
      }
    }
    throw error;
  }
}
