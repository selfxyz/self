// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

// CI/CD Pipeline Test - July 31, 2025 - With Permissions Fix
import { Buffer } from 'buffer';
import React from 'react';
import { YStack } from 'tamagui';

import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigation from './src/navigation';
import { AuthProvider } from './src/providers/authProvider';
import { DatabaseProvider } from './src/providers/databaseProvider';
import { NotificationTrackingProvider } from './src/providers/notificationTrackingProvider';
import { PassportProvider } from './src/providers/passportDataProvider';
import { RemoteConfigProvider } from './src/providers/remoteConfigProvider';
import { initSentry, wrapWithSentry } from './src/Sentry';

initSentry();

global.Buffer = Buffer;

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <YStack flex={1} height="100%" width="100%">
        <RemoteConfigProvider>
          <AuthProvider>
            <PassportProvider>
              <DatabaseProvider>
                <NotificationTrackingProvider>
                  <AppNavigation />
                </NotificationTrackingProvider>
              </DatabaseProvider>
            </PassportProvider>
          </AuthProvider>
        </RemoteConfigProvider>
      </YStack>
    </ErrorBoundary>
  );
}

export default wrapWithSentry(App);
