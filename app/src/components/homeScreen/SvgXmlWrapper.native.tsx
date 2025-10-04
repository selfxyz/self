// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ComponentProps, ComponentRef } from 'react';
import React, { forwardRef } from 'react';
import { SvgXml as RNSvgXml } from 'react-native-svg';

type Props = ComponentProps<typeof RNSvgXml>;

export const SvgXml = forwardRef<ComponentRef<typeof RNSvgXml>, Props>(
  (props, ref) => <RNSvgXml ref={ref} {...props} />,
);
SvgXml.displayName = 'SvgXml';
export default SvgXml;
