// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConnectivityBanner } from '@/components/ConnectivityBanner';

type ConnectedAppLayoutProps = PropsWithChildren;

export default function ConnectedAppLayout({
  children,
}: ConnectedAppLayoutProps) {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>{children}</View>
        <View
          pointerEvents="box-none"
          style={{
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 1000,
          }}
        >
          <ConnectivityBanner />
        </View>
      </View>
    </SafeAreaProvider>
  );
}
