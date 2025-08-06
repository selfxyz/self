// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type { PropsWithChildren } from 'react';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

interface ConnectedAppLayoutProps extends PropsWithChildren {}

export default function ConnectedAppLayout({
  children,
}: ConnectedAppLayoutProps) {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}
