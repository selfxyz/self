import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { black } from '../../utils/colors';

interface TitleProps {
  text: string;
}

const Title = ({ text }: TitleProps) => {
  return <Text style={styles.title}>{text}</Text>;
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
