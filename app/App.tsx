// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// CI/CD Pipeline Test - July 31, 2025 - With Permissions Fix
import { Buffer } from 'buffer';
import React from 'react';
import { YStack } from 'tamagui';

import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigation from './src/navigation';
import { AuthProvider } from './src/providers/authProvider';
import { DatabaseProvider } from './src/providers/databaseProvider';
import { FeedbackProvider } from './src/providers/feedbackProvider';
import { LoggerProvider } from './src/providers/loggerProvider';
import { NotificationTrackingProvider } from './src/providers/notificationTrackingProvider';
import { PassportProvider } from './src/providers/passportDataProvider';
import { RemoteConfigProvider } from './src/providers/remoteConfigProvider';
import { SelfClientProvider } from './src/providers/selfClientProvider';
import { initSentry, wrapWithSentry } from './src/Sentry';

initSentry();

global.Buffer = Buffer;

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
                        <AppNavigation />
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
