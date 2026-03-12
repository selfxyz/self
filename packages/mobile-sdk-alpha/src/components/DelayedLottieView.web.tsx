// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { CSSProperties } from 'react';
import { useEffect } from 'react';

interface DelayedLottieViewWebProps {
  onAnimationFinish?: () => void;
  style?: CSSProperties;
  testID?: string;
  [key: string]: unknown;
}

/**
 * DelayedLottieView for web placeholder component.
 * Immediately fires onAnimationFinish so screens gating on it can progress.
 * Forwards style and testID to preserve layout and testability on web.
 */
export const DelayedLottieView = (props: DelayedLottieViewWebProps) => {
  const { onAnimationFinish, style, testID, ...rest } = props;

  useEffect(() => {
    onAnimationFinish?.();
  }, []);

  return <div style={style} data-testid={testID} />;
};
