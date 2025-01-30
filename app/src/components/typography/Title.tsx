import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { black } from '../../utils/colors';

interface TitleProps extends TextProps {}

const Title = ({ children, style, ...props }: TitleProps) => {
  return (
    <Text {...props} style={[styles.title, style]}>
      {children}
    </Text>
  );
};

export default Title;

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    lineHeight: 35,
    color: black,
    fontFamily: 'Advercase-Regular',
  },
});
