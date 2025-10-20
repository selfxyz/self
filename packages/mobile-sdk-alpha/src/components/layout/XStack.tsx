// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';

import type { ViewProps } from './View';
import { View } from './View';

export const XStack: FC<ViewProps> = ({ flexDirection = 'row', ...props }) => {
  return <View flexDirection={flexDirection} {...props} />;
};
