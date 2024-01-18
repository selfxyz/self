// src/components/Button.tsx

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const CustomButton = ({ onPress, title }) => {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button]}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007bff', // A blue color
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25, // Rounded corners
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2, // Android shadow
    shadowOpacity: 0.25, // iOS shadow
    shadowRadius: 3.84,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    marginTop: 20, // Add some margin at the top
    width: '90%', // Set width to 90% of the container
    alignSelf: 'center', // Center the TextInput in its container
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomButton;
