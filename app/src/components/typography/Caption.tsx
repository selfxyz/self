// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { styled } from 'tamagui';

import { slate400 } from '../../utils/colors';
import { BodyText } from './BodyText';

export const Caption = styled(BodyText, {
  fontSize: 15,
  color: slate400,
  variants: {
    size: {
      small: {
        fontSize: 14,
      },
      large: {
        fontSize: 16,
      },
    },
  },
});
