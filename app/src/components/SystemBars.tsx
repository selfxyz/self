// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Platform } from 'react-native';
import { SystemBars as EdgeToEdgeSystemBars } from 'react-native-edge-to-edge';

export type { SystemBarStyle } from 'react-native-edge-to-edge';

type SystemBarsProps = React.ComponentProps<typeof EdgeToEdgeSystemBars>;

export const SystemBars: React.FC<SystemBarsProps> = props => {
  if (Platform.OS === 'android') {
    return null;
  }

  return <EdgeToEdgeSystemBars {...props} />;
};
