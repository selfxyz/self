import React from 'react';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text>Register Document</Text>
      <Text>Generate Mock</Text>
      <Text>Prove QR Code</Text>
      {/* Additional screens to wire later: MRZ Manual Entry, Proof Request History, SDK Playground */}
    </View>
  );
}
