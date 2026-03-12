// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect } from 'react';

/**
 * DelayedLottieView for web placeholder component.
 * Immediately fires onAnimationFinish so screens gating on it can progress.
 */
export const DelayedLottieView = (props: { onAnimationFinish?: () => void; [key: string]: unknown }) => {
  useEffect(() => {
    props.onAnimationFinish?.();
  }, []);

  return <div />;
};
