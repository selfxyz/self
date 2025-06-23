//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import React, { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

interface ConnectedAppLayoutProps extends PropsWithChildren {}

export default function ConnectedAppLayout({
  children,
}: ConnectedAppLayoutProps) {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}
