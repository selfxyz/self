// src/components/ToggleButton.tsx

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const ToggleButton = ({ onToggle, initialState = false, titles = ['Off', 'On'] }) => {
  const [isToggled, setIsToggled] = useState(initialState);

  const handlePress = () => {
    const newState = !isToggled;
    setIsToggled(newState);
    if (onToggle) {
      onToggle(newState);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.button, isToggled ? styles.toggled : styles.notToggled]}
    >
      <Text style={styles.text}>{isToggled ? titles[1] : titles[0]}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    marginVertical: 10,
  },
  toggled: {
    backgroundColor: 'blue',
  },
  notToggled: {
    backgroundColor: 'gray',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ToggleButton;
