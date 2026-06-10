// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';

import { useOperatingMode } from '../providers/OperatingModeProvider';

/**
 * Renders one of two screens based on the current operating mode.
 *
 * Used where NAV-08's canonical path is shared between self-app and embed
 * but the underlying screens have not yet been merged. The wrapper itself
 * has no state — it just delegates to the right component.
 */
export const ModeDispatch: React.FC<{
  selfApp: React.ComponentType;
  embed: React.ComponentType;
}> = ({ selfApp: SelfAppScreen, embed: EmbedScreen }) => {
  const { mode } = useOperatingMode();
  return mode === 'embed' ? <EmbedScreen /> : <SelfAppScreen />;
};
