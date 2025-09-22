// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

type ConnectedAppLayoutProps = PropsWithChildren;

export default function ConnectedAppLayout({
  children,
}: ConnectedAppLayoutProps) {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}
