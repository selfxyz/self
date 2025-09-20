// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { countryCodes, type IDDocument } from '@selfxyz/common';
import { generateMockDocument, signatureAlgorithmToStrictSignatureAlgorithm } from '@selfxyz/mobile-sdk-alpha';

import { Picker } from '@react-native-picker/picker';

const algorithmOptions = Object.keys(signatureAlgorithmToStrictSignatureAlgorithm);
const documentTypeOptions = ['mock_passport', 'mock_id_card'] as const;
const countryOptions = Object.keys(countryCodes);

const defaultAge = '21';
const defaultExpiryYears = '5';
const defaultAlgorithm = 'sha256 rsa 65537 2048';
const defaultCountry = 'USA';
const defaultDocumentType = 'mock_passport';
const defaultOfac = true;

type Props = {
  onGenerate?: (doc: IDDocument) => void;
  onNavigate: (screen: 'home' | 'register' | 'prove') => void;
  onBack: () => void;
};

export default function GenerateMock({ onGenerate, onNavigate, onBack }: Props) {
  const [age, setAge] = useState(defaultAge);
  const [expiryYears, setExpiryYears] = useState(defaultExpiryYears);
  const [isInOfacList, setIsInOfacList] = useState(defaultOfac);
  const [algorithm, setAlgorithm] = useState(defaultAlgorithm);
  const [country, setCountry] = useState(defaultCountry);
  const [documentType, setDocumentType] = useState<(typeof documentTypeOptions)[number]>(defaultDocumentType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IDDocument | null>(null);

  const reset = () => {
    setAge(defaultAge);
    setExpiryYears(defaultExpiryYears);
    setIsInOfacList(defaultOfac);
    setAlgorithm(defaultAlgorithm);
    setCountry(defaultCountry);
    setDocumentType(defaultDocumentType as (typeof documentTypeOptions)[number]);
    setResult(null);
    setError(null);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const ageNum = Number(age);
      const expiryNum = Number(expiryYears);
      if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 120) {
        throw new Error('Age must be a number between 0 and 120');
      }
      if (!Number.isFinite(expiryNum) || expiryNum < 0 || expiryNum > 30) {
        throw new Error('Expiry years must be a number between 0 and 30');
      }
      const doc = await generateMockDocument({
        age: ageNum,
        expiryYears: expiryNum,
        isInOfacList,
        selectedAlgorithm: algorithm,
        selectedCountry: country,
        selectedDocumentType: documentType,
      });
      setResult(doc);
      onGenerate?.(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="Back" onPress={onBack} />
      <Text style={styles.label}>Age</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={age} onChangeText={setAge} />
      <Text style={styles.label}>Expiry Years</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={expiryYears} onChangeText={setExpiryYears} />
      <View style={styles.switchRow}>
        <Text style={styles.label}>OFAC Listed</Text>
        <Switch value={isInOfacList} onValueChange={setIsInOfacList} />
      </View>
      <Text style={styles.label}>Algorithm</Text>
      <Picker selectedValue={algorithm} onValueChange={(itemValue: string) => setAlgorithm(itemValue)}>
        {algorithmOptions.map(alg => (
          <Picker.Item label={alg} value={alg} key={alg} />
        ))}
      </Picker>
      <Text style={styles.label}>Country</Text>
      <Picker selectedValue={country} onValueChange={(itemValue: string) => setCountry(itemValue)}>
        {countryOptions.map(code => (
          <Picker.Item label={`${code} - ${countryCodes[code as keyof typeof countryCodes]}`} value={code} key={code} />
        ))}
      </Picker>
      <Text style={styles.label}>Document Type</Text>
      <Picker
        selectedValue={documentType}
        onValueChange={(itemValue: string) => setDocumentType(itemValue as (typeof documentTypeOptions)[number])}
      >
        {documentTypeOptions.map(dt => (
          <Picker.Item label={dt} value={dt} key={dt} />
        ))}
      </Picker>
      <View style={styles.buttonRow}>
        <Button title="Reset" onPress={reset} />
        <Button title="Generate" onPress={handleGenerate} disabled={loading} />
      </View>
      {loading && <ActivityIndicator style={styles.spinner} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {result ? (
        <>
          <Text selectable style={styles.result}>
            {JSON.stringify(result, null, 2)}
          </Text>
          <View style={styles.navRow}>
            <Button title="Register Document" onPress={() => onNavigate('register')} />
            <Button title="Prove QR Code" onPress={() => onNavigate('prove')} />
          </View>
        </>
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  spinner: { marginVertical: 16 },
  error: { color: 'red', marginTop: 16 },
  result: { marginTop: 16, fontFamily: 'monospace' },
});
