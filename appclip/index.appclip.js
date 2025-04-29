/**
 * @format
 */

import React from 'react';
import { AppRegistry, StyleSheet, Text, View } from 'react-native';

const AppClip = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Hello Passport Scanner! 🚀</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

// Register the component with the name that matches what's used in SceneDelegate.m
AppRegistry.registerComponent('SelfClip', () => AppClip);
