import { styled, Text, GetProps } from 'tamagui';

import { dinot } from '../utils/fonts';

export type DescriptionTitleProps = GetProps<typeof DescriptionTitle>;

export const DescriptionTitle = styled(Text, {
  fontSize: 18,
  lineHeight: 35,
  fontFamily: dinot,
}) as typeof Text;
