// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import createDOMPurify from 'dompurify';
import {
  createElement,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
} from 'react';

type Props = {
  xml: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
} & HTMLAttributes<HTMLDivElement>;

export const SvgXml = forwardRef<HTMLDivElement, Props>(
  ({ xml, width, height, style, ...props }, ref) => {
    // Initialize DOMPurify for web browser environment
    const purify = createDOMPurify(window);
    const safe = purify.sanitize(xml, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
    return createElement('div', {
      ref,
      style: {
        width: width || 'auto',
        height: height || 'auto',
        display: 'inline-block',
        ...style,
      },
      dangerouslySetInnerHTML: { __html: safe },
      ...props,
    });
  },
);

SvgXml.displayName = 'SvgXml';
export default SvgXml;
