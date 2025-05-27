import { styled, Text } from 'tamagui';

import { dinot } from '../../utils/fonts';

export const SubHeader = styled(Text, {
  fontFamily: dinot,
  lineHeight: 18,
  fontSize: 15,
  fontWeight: '500',
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  textAlign: 'center',
});
