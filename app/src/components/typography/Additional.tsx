import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { slate400 } from '../../utils/colors';

interface AdditionalProps {
  text: string;
}

const Additional = ({ text }: AdditionalProps) => {
  return <Text style={styles.additional}>{text}</Text>;
};

export default Additional;

const styles = StyleSheet.create({
  additional: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
    color: slate400,
    marginTop: 10,
    fontFamily: 'DINOT-Medium',
  },
});
