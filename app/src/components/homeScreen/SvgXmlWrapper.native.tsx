// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { forwardRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SvgXml as RNSvgXml } from 'react-native-svg';

type Props = {
  xml: string;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export const SvgXml = forwardRef<any, Props>((p, _ref) => <RNSvgXml {...p} />);
SvgXml.displayName = 'SvgXml';
export default SvgXml;
