// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import type { ViewProps } from 'react-native';
import { StyleSheet } from 'react-native';
import { Mask } from '@sentry/react-native';

// ANA-13: defense-in-depth wrapper for screens that display biometric or
// document data. The global mobileReplayIntegration already masks all text /
// images / vectors; this wrapper marks an entire subtree as redacted so that
// even unmasked native primitives (camera previews, custom views) do not leak
// into Session Replay.
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
