// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ComponentProps } from 'react';
import React from 'react';
import { SvgXml as RNSvgXml } from 'react-native-svg';

type Props = ComponentProps<typeof RNSvgXml>;

export const SvgXml: React.FC<Props> = props => <RNSvgXml {...props} />;
SvgXml.displayName = 'SvgXml';
export default SvgXml;
