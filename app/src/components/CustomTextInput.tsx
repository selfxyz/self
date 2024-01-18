// src/components/CustomTextInput.tsx

import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

const CustomTextInput = ({ value, onChangeText, placeholder, keyboardType }) => {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="gray" // Set the placeholder text color to gray
      autoCapitalize="characters" 
      keyboardType={keyboardType}
      style={styles.input}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    color: 'black', // Set the input text color to black
    backgroundColor: 'white', // Ensure the background is white if not already set
    width: '90%', // Set width to 90% of the container
    alignSelf: 'center', // Center the TextInput in its container
  },
});

export default CustomTextInput;
