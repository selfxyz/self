import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { black } from '../../utils/colors';

interface TitleProps extends TextProps {}
/*
 * Used for Prominent Top Page Titles
 */
const LargeTitle = ({ children, style, ...props }: TitleProps) => {
  return (
    <Text {...props} style={[styles.title, style]}>
      {children}
    </Text>
  );
};

export default LargeTitle;

const styles = StyleSheet.create({
  title: {
    fontSize: 38,
    lineHeight: 47,
    color: black,
    fontFamily: 'Advercase-Regular',
  },
});
