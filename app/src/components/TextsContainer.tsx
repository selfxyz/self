import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface TextsContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

const TextsContainer = ({ children, style }: TextsContainerProps) => {
  return <View style={[styles.textsContainer, style]}>{children}</View>;
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
