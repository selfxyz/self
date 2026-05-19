// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import type { ViewProps } from 'react-native';
import { StyleSheet } from 'react-native';
import { Mask } from '@sentry/react-native';

export const PrivacyMask: React.FC<ViewProps> = ({
  children,
  style,
  ...rest
}) => (
  <Mask style={[styles.fill, style]} {...rest}>
    {children}
  </Mask>
);

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
