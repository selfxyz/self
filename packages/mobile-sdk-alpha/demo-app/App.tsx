// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

type Screen = 'home' | 'register' | 'generate' | 'prove';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [mockDocument, setMockDocument] = useState<Record<string, unknown> | null>(null);

  const navigate = (next: Screen) => setScreen(next);

  if (screen === 'generate') {
    const GenerateMock = require('./src/GenerateMock').default;
    return (
      <GenerateMock
        onGenerate={setMockDocument}
        onNavigate={navigate}
        onBack={() => navigate('home')}
      />
    );
  }

  if (screen === 'register') {
    const RegisterDocument = require('./src/RegisterDocument').default;
    return <RegisterDocument document={mockDocument} onBack={() => navigate('home')} />;
  }

  if (screen === 'prove') {
    const ProveQRCode = require('./src/ProveQRCode').default;
    return <ProveQRCode document={mockDocument} onBack={() => navigate('home')} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Self Demo App</Text>
      <Button title="Register Document" onPress={() => navigate('register')} />
      <Button title="Generate Mock" onPress={() => navigate('generate')} />
      <Button title="Prove QR Code" onPress={() => navigate('prove')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    marginBottom: 12,
    fontWeight: 'bold',
  },
});

export default App;
