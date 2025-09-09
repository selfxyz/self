// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

export const Circle = React.forwardRef<
  SVGCircleElement,
  React.SVGProps<SVGCircleElement>
>((props, ref) => {
  return React.createElement('circle', { ref, ...props });
});

Circle.displayName = 'Circle';

export const Path = React.forwardRef<
  SVGPathElement,
  React.SVGProps<SVGPathElement>
>((props, ref) => {
  return React.createElement('path', { ref, ...props });
});

Path.displayName = 'Path';

export const Rect = React.forwardRef<
  SVGRectElement,
  React.SVGProps<SVGRectElement>
>((props, ref) => {
  return React.createElement('rect', { ref, ...props });
});

Rect.displayName = 'Rect';

// Re-export other common SVG components that might be used
export const Svg = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>((props, ref) => {
  return React.createElement('svg', { ref, ...props });
});

Svg.displayName = 'Svg';

// Mock SvgXml component for web builds
export const SvgXml = React.forwardRef<
  HTMLDivElement,
  {
    xml: string;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
  }
>(({ xml, width, height, style, ...props }, ref) => {
  return React.createElement('div', {
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
