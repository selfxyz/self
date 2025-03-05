import React, { useMemo } from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { slate700 } from '../../utils/colors';
import { dinot } from '../../utils/fonts';

interface CautionProps extends TextProps {}

const Caution = ({ children, style, ...props }: CautionProps): JSX.Element => {
  const styling = useMemo(() => [styles.Caution, style], [style]);
  return (
    <Text {...props} style={styling}>
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
