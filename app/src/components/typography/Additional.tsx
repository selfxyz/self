import React, { useMemo } from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { slate400 } from '../../utils/colors';
import { dinot } from '../../utils/fonts';

interface AdditionalProps extends TextProps {}

const Additional = ({
  children,
  style,
  ...props
}: AdditionalProps): JSX.Element => {
  const styling = useMemo(() => [styles.additional, style], [style]);
  return (
    <Text {...props} style={styling}>
      {children}
    </Text>
  );
};

export default Additional;

const styles = StyleSheet.create({
  additional: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
    color: slate400,
    marginTop: 10,
    fontFamily: dinot,
  },
});
