import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { slate500 } from '../../utils/colors';

interface DescriptionProps extends TextProps {}

const Description = ({ children, style, ...props }: DescriptionProps) => {
  return (
    <Text
      {...props}
      textBreakStrategy="balanced"
      style={[styles.description, style]}
    >
      {children}
    </Text>
  );
};

export default Description;

const styles = StyleSheet.create({
  description: {
    color: slate500,
    fontSize: 18,
    lineHeight: 23,
    textAlign: 'center',
    fontFamily: 'DINOT-Medium',
  },
});
