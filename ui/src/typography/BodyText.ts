import { GetProps, styled, Text } from 'tamagui';

import { dinot } from '../utils/fonts';

export type BodyTextProps = GetProps<typeof BodyText>;

export const BodyText = styled(Text, {
  fontFamily: dinot,
}) as typeof Text;
