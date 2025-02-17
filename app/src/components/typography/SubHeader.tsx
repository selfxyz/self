import { dinot } from '../../utils/fonts';
import { styled, Text } from 'tamagui';

export const SubHeader = styled(Text, {
  fontFamily: dinot,
  lineHeight: 18,
  fontSize: 15,
  fontWeight: '500',
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  textAlign: 'center',
});
