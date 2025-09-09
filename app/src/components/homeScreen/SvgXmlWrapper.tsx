// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { createElement, forwardRef } from 'react';
import { Platform } from 'react-native';

// Platform-specific SvgXml component
const SvgXmlWrapper = forwardRef<
  HTMLDivElement | SVGSVGElement,
  {
    xml: string;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
  }
>(({ xml, width, height, style, ...props }, ref) => {
  if (Platform.OS === 'web') {
    // Use our mock for web
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
  }

  // Use the real SvgXml for native platforms
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SvgXml } = require('react-native-svg');
  return (
    <SvgXml xml={xml} width={width} height={height} style={style} {...props} />
  );
});

SvgXmlWrapper.displayName = 'SvgXmlWrapper';

export { SvgXmlWrapper as SvgXml };
