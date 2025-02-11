import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { slate700 } from '../../utils/colors';
import { dinot } from '../../utils/fonts';

interface CautionProps extends TextProps {}

const Caution = ({ children, style, ...props }: CautionProps) => {
  return (
    <Text {...props} style={[styles.Caution, style]}>
      {children}
    </Text>
  );
};

export default Caution;

const styles = StyleSheet.create({
  Caution: {
    fontFamily: dinot,
    color: slate700,
    fontSize: 18,
    fontWeight: '500',
  },
});
