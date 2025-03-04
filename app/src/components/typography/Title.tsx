import { advercase } from '../../utils/fonts';
import { styled, Text } from 'tamagui';

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
