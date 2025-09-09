// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

// Mock BlurView component for web builds
export const BlurView = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    blurType?: string;
    blurAmount?: number;
    reducedTransparencyFallbackColor?: string;
  }
>(({ children, style, ...props }, ref) => {
  return React.createElement(
    'div',
    {
      ref,
      style: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        ...style,
      },
      ...props,
    },
    children,
  );
});

BlurView.displayName = 'BlurView';
