// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { generateMockDocument, signatureAlgorithmToStrictSignatureAlgorithm } from '@selfxyz/mobile-sdk-alpha';

const algorithmOptions = Object.keys(signatureAlgorithmToStrictSignatureAlgorithm);
const documentTypeOptions = ['mock_passport', 'mock_id_card'] as const;
const countryOptions = ['US', 'CA', 'GB'];

export default function GenerateMock() {
  const [age, setAge] = useState('30');
  const [expiryYears, setExpiryYears] = useState('10');
  const [isInOfacList, setIsInOfacList] = useState(false);
  const [algorithmIndex, setAlgorithmIndex] = useState(algorithmOptions.indexOf('sha256 rsa 65537 2048'));
  const [countryIndex, setCountryIndex] = useState(0);
  const [documentIndex, setDocumentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const cycleAlgorithm = () => setAlgorithmIndex((algorithmIndex + 1) % algorithmOptions.length);
  const cycleCountry = () => setCountryIndex((countryIndex + 1) % countryOptions.length);
  const cycleDocument = () => setDocumentIndex((documentIndex + 1) % documentTypeOptions.length);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const doc = await generateMockDocument({
        age: Number(age),
        expiryYears: Number(expiryYears),
        isInOfacList,
        selectedAlgorithm: algorithmOptions[algorithmIndex],
        selectedCountry: countryOptions[countryIndex],
        selectedDocumentType: documentTypeOptions[documentIndex],
      });
      setResult(doc);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Age</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={age} onChangeText={setAge} />
      <Text style={styles.label}>Expiry Years</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={expiryYears} onChangeText={setExpiryYears} />
      <View style={styles.switchRow}>
        <Text style={styles.label}>OFAC Listed</Text>
        <Switch value={isInOfacList} onValueChange={setIsInOfacList} />
      </View>
      <View style={styles.selectorRow}>
        <Text style={styles.label}>Algorithm: {algorithmOptions[algorithmIndex]}</Text>
        <Button title="Change" onPress={cycleAlgorithm} />
      </View>
      <View style={styles.selectorRow}>
        <Text style={styles.label}>Country: {countryOptions[countryIndex]}</Text>
        <Button title="Change" onPress={cycleCountry} />
      </View>
      <View style={styles.selectorRow}>
        <Text style={styles.label}>Document: {documentTypeOptions[documentIndex]}</Text>
        <Button title="Change" onPress={cycleDocument} />
      </View>
      <Button title="Generate" onPress={handleGenerate} disabled={loading} />
      {loading && <ActivityIndicator style={styles.spinner} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {result ? (
        <Text selectable style={styles.result}>
          {JSON.stringify(result, null, 2)}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { marginVertical: 8, fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  spinner: { marginVertical: 16 },
  error: { color: 'red', marginTop: 16 },
  result: { marginTop: 16, fontFamily: 'monospace' },
});
