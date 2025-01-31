import { StyleSheet } from 'react-native';
import { black, slate400 } from '../../utils/colors';
import { styled } from 'tamagui';
import { BodyText } from './BodyText';

export const typography = StyleSheet.create({
  strong: {
    fontWeight: 'bold',
    color: black,
  },
});



export const Caption = styled(BodyText, {
  fontSize: 15,
  color: slate400,
  variants: {
    variant: {
      1: {
        fontSize: 14,
      },
      2: {
        fontSize: 15,
      }
    }
  }
});
