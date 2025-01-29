import React from 'react';
import { StyleSheet, View } from 'react-native';

interface TextsContainerProps {
  children: React.ReactNode;
}

const TextsContainer = ({ children }: TextsContainerProps) => {
  return <View style={styles.textsContainer}>{children}</View>;
};

export default TextsContainer;

const styles = StyleSheet.create({
  textsContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
});
