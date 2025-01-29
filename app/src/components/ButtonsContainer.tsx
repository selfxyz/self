import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ButtonsContainerProps {
  children: React.ReactNode;
}

const ButtonsContainer = ({ children }: ButtonsContainerProps) => {
  return <View style={styles.buttonsContainer}>{children}</View>;
};

export default ButtonsContainer;

const styles = StyleSheet.create({
  buttonsContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
});
