//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import 'react-native-get-random-values';

import { Buffer } from 'buffer';
import React from 'react';
import { YStack } from 'tamagui';

import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigation from './src/navigation';
import { AuthProvider } from './src/providers/authProvider';
import { DatabaseProvider } from './src/providers/databaseProvider';
import { NotificationTrackingProvider } from './src/providers/notificationTrackingProvider';
import { PassportProvider } from './src/providers/passportDataProvider';
import { initSentry, wrapWithSentry } from './src/Sentry';

initSentry();

global.Buffer = Buffer;

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <YStack f={1} h="100%" w="100%">
        <AuthProvider>
          <PassportProvider>
            <DatabaseProvider>
              <NotificationTrackingProvider>
                <AppNavigation />
              </NotificationTrackingProvider>
            </DatabaseProvider>
          </PassportProvider>
        </AuthProvider>
      </YStack>
    </ErrorBoundary>
  );
}

export default wrapWithSentry(App);
