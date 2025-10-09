// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { createElement, forwardRef } from 'react';

export const Circle = forwardRef<
  SVGCircleElement,
  React.SVGProps<SVGCircleElement>
>((props, ref) => {
  return createElement('circle', { ref, ...props });
});

Circle.displayName = 'Circle';

export const Path = forwardRef<SVGPathElement, React.SVGProps<SVGPathElement>>(
  (props, ref) => {
    return createElement('path', { ref, ...props });
  },
);

Path.displayName = 'Path';

export const Rect = forwardRef<SVGRectElement, React.SVGProps<SVGRectElement>>(
  (props, ref) => {
    return createElement('rect', { ref, ...props });
  },
);

Rect.displayName = 'Rect';

// Re-export other common SVG components that might be used
export const Svg = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  (props, ref) => {
    return createElement('svg', { ref, ...props });
  },
);

Svg.displayName = 'Svg';

// Mock SvgXml component for web builds
export const SvgXml = forwardRef<
  HTMLDivElement,
  {
    xml: string;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
  }
>(({ xml, width, height, style, ...props }, ref) => {
  return createElement('div', {
    ref,
    style: {
      width: width || 'auto',
      height: height || 'auto',
      display: 'inline-block',
      ...style,
    },
    dangerouslySetInnerHTML: { __html: xml },
    ...props,
  });
});

SvgXml.displayName = 'SvgXml';
