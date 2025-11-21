// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { createElement, forwardRef } from 'react';

type BlurViewProps = React.HTMLAttributes<HTMLDivElement> & {
  blurType?: string;
  blurAmount?: number;
  reducedTransparencyFallbackColor?: string;
  pointerEvents?: 'auto' | 'none';
};

// Mock BlurView component for web builds
export const BlurView = forwardRef<HTMLDivElement, BlurViewProps>(
  ({ children, style, pointerEvents, blurAmount, ...props }, ref) => {
    return createElement(
      'div',
      {
        ref,
        style: {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: `blur(${typeof blurAmount === 'number' ? blurAmount : 10}px)`,
          pointerEvents: pointerEvents,
          ...style,
        },
        // Do not spread pointerEvents as a DOM attribute
        ...props,
      },
      children,
    );
  },
);

BlurView.displayName = 'BlurView';
