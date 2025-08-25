// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { styled, Text } from 'tamagui';

import { dinot } from '@/utils/fonts';

export const SubHeader = styled(Text, {
  fontFamily: dinot,
  lineHeight: 18,
  fontSize: 15,
  fontWeight: '500',
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  textAlign: 'center',
});
