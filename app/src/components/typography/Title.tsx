import { styled, Text } from 'tamagui';

import { advercase } from '../../utils/fonts';

export const Title = styled(Text, {
  fontSize: 28,
  lineHeight: 35,
  fontFamily: advercase,
  variants: {
    size: {
      large: {
        fontSize: 38,
        lineHeight: 47,
      },
    },
  },
});
