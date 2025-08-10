// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

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
