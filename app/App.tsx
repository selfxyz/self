// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// CI/CD Pipeline Test - July 31, 2025 - With Permissions Fix
import { Buffer } from 'buffer';
import React from 'react';
import { Platform } from 'react-native';
import { YStack } from 'tamagui';
import type {
  TurnkeyCallbacks,
  TurnkeyProviderConfig,
} from '@turnkey/react-native-wallet-kit';
import { TurnkeyProvider } from '@turnkey/react-native-wallet-kit';

import {
  TURNKEY_AUTH_PROXY_CONFIG_ID,
  TURNKEY_GOOGLE_CLIENT_ID,
  TURNKEY_ORGANIZATION_ID,
} from './env';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initSentry, wrapWithSentry } from './src/config/sentry';
import {
  TURNKEY_OAUTH_REDIRECT_URI_ANDROID,
  TURNKEY_OAUTH_REDIRECT_URI_IOS,
} from './src/devtools/mocks';
import AppNavigation from './src/navigation';
import { AuthProvider } from './src/providers/authProvider';
import { DatabaseProvider } from './src/providers/databaseProvider';
import { FeedbackProvider } from './src/providers/feedbackProvider';
import { LoggerProvider } from './src/providers/loggerProvider';
import { NotificationTrackingProvider } from './src/providers/notificationTrackingProvider';
import { PassportProvider } from './src/providers/passportDataProvider';
import { RemoteConfigProvider } from './src/providers/remoteConfigProvider';
import { SelfClientProvider } from './src/providers/selfClientProvider';

import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import '@walletconnect/react-native-compat';
import '@noble/curves/p256';
import 'sha256-uint8array';
import '@turnkey/encoding';
import '@turnkey/api-key-stamper';

initSentry();

global.Buffer = Buffer;

export const TURNKEY_CALLBACKS: TurnkeyCallbacks = {
  beforeSessionExpiry: ({ sessionKey: _sessionKey }) => {
    console.log('[Turnkey] Session nearing expiry');
  },
  onSessionExpired: ({ sessionKey: _sessionKey }) => {
    console.log('[Turnkey] Session expired');
  },
  onAuthenticationSuccess: ({
    action: _action,
    method: _method,
    identifier: _identifier,
  }) => {
    // console.log('[Turnkey] Auth success:', { action, method, identifier });
  },
  onError: error => {
    console.error('[Turnkey] Error:', error);
  },
};

export const TURNKEY_CONFIG: TurnkeyProviderConfig = {
  organizationId: TURNKEY_ORGANIZATION_ID!,
  authProxyConfigId: TURNKEY_AUTH_PROXY_CONFIG_ID!,
  autoRefreshManagedState: false,
  auth: {
    passkey: false,
    oauth: {
      // Should use custom scheme, NOT 'https' for IOS
      appScheme:
        Platform.OS === 'ios' ? 'com.warroom.proofofpassport' : 'https',
      redirectUri:
        Platform.OS === 'ios'
          ? TURNKEY_OAUTH_REDIRECT_URI_IOS
          : TURNKEY_OAUTH_REDIRECT_URI_ANDROID,
      google: {
        clientId: TURNKEY_GOOGLE_CLIENT_ID!,
        redirectUri:
          Platform.OS === 'ios'
            ? TURNKEY_OAUTH_REDIRECT_URI_IOS
            : TURNKEY_OAUTH_REDIRECT_URI_ANDROID,
      },
    },
  },
};

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <YStack flex={1} height="100%" width="100%">
        <RemoteConfigProvider>
          <LoggerProvider>
            <SelfClientProvider>
              <AuthProvider>
                <PassportProvider>
                  <DatabaseProvider>
                    <NotificationTrackingProvider>
                      <FeedbackProvider>
                        <TurnkeyProvider
                          config={TURNKEY_CONFIG}
                          callbacks={TURNKEY_CALLBACKS}
                        >
                          <AppNavigation />
                        </TurnkeyProvider>
                      </FeedbackProvider>
                    </NotificationTrackingProvider>
                  </DatabaseProvider>
                </PassportProvider>
              </AuthProvider>
            </SelfClientProvider>
          </LoggerProvider>
        </RemoteConfigProvider>
      </YStack>
    </ErrorBoundary>
  );
}

export default wrapWithSentry(App);
