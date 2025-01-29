import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { slate500 } from '../../utils/colors';

interface DescriptionProps {
  text: string;
}

const Description = ({ text }: DescriptionProps) => {
  return <Text style={styles.description}>{text}</Text>;
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
