import { styled, GetProps } from 'tamagui';

import { slate400 } from '../utils/colors';
import { BodyText } from './BodyText';
import React from 'react';


const _Caption = styled(BodyText, {
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
})
type CaptionProps = GetProps<typeof _Caption>;



export const Caption = _Caption as React.FC<CaptionProps>
