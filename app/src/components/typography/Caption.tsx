import { slate400 } from '../../utils/colors';
import { BodyText } from './BodyText';
import { styled } from 'tamagui';

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
