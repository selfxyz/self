// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { forwardRef } from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SvgXml: RNSvgXml } = require('react-native-svg');

type Props = {
  xml: string;
  width?: number;
  height?: number;
  style?: unknown;
};

export const SvgXml = forwardRef<React.ComponentRef<typeof RNSvgXml>, Props>(
  (p, ref) => <RNSvgXml ref={ref} {...p} />,
);
SvgXml.displayName = 'SvgXml';
export default SvgXml;
