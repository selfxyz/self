// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { ActivityIndicator, Button, Platform, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { faker } from '@faker-js/faker';
import { calculateContentHash, countryCodes, inferDocumentCategory, isMRZDocument } from '@selfxyz/common';
import type { DocumentMetadata, IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';
import {
  generateMockDocument,
  signatureAlgorithmToStrictSignatureAlgorithm,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';

import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/Ionicons';
import SafeAreaScrollView from '../components/SafeAreaScrollView';
import StandardHeader from '../components/StandardHeader';

const algorithmOptions = Object.keys(signatureAlgorithmToStrictSignatureAlgorithm);
const documentTypeOptions = ['mock_passport', 'mock_id_card', 'mock_aadhaar'] as const;
const countryOptions = Object.keys(countryCodes);

const defaultAge = '21';
const defaultExpiryYears = '5';
const defaultAlgorithm = 'sha256 rsa 65537 2048';
const defaultCountry = 'USA';
const defaultDocumentType = 'mock_passport';
const defaultOfac = false;

type Props = {
  onDocumentStored?: () => Promise<void> | void;
  onNavigate: (screen: 'home' | 'register' | 'prove') => void;
  onBack: () => void;
};

export default function GenerateMock({ onDocumentStored, onNavigate, onBack }: Props) {
  const selfClient = useSelfClient();

  const getRandomFirstName = () => faker.person.firstName().toUpperCase();
  const getRandomLastName = () => faker.person.lastName().toUpperCase();

  const [age, setAge] = useState(defaultAge);
  const [expiryYears, setExpiryYears] = useState(defaultExpiryYears);
  const [isInOfacList, setIsInOfacList] = useState(defaultOfac);
  const [algorithm, setAlgorithm] = useState(defaultAlgorithm);
  const [country, setCountry] = useState(defaultCountry);
  const [documentType, setDocumentType] = useState<(typeof documentTypeOptions)[number]>(defaultDocumentType);
  const [firstName, setFirstName] = useState(() => getRandomFirstName());
  const [lastName, setLastName] = useState(() => getRandomLastName());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setAge(defaultAge);
    setExpiryYears(defaultExpiryYears);
    setIsInOfacList(defaultOfac);
    setAlgorithm(defaultAlgorithm);
    setCountry(defaultCountry);
    setDocumentType(defaultDocumentType as (typeof documentTypeOptions)[number]);
    setFirstName(getRandomFirstName());
    setLastName(getRandomLastName());
    setError(null);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const ageNum = Number(age);
      const expiryNum = Number(expiryYears);
      if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 120) {
        throw new Error('Age must be a number between 0 and 120');
      }
      if (!Number.isFinite(expiryNum) || expiryNum < 0 || expiryNum > 30) {
        throw new Error('Expiry years must be a number between 0 and 30');
      }
      const firstNameValue = firstName?.trim() || getRandomFirstName();
      const lastNameValue = lastName?.trim() || getRandomLastName();
      const doc = await generateMockDocument({
        age: ageNum,
        expiryYears: expiryNum,
        isInOfacList,
        selectedAlgorithm: algorithm,
        selectedCountry: country,
        selectedDocumentType: documentType,
        firstName: firstNameValue,
        lastName: lastNameValue,
      });
      const documentId = calculateContentHash(doc);
      const catalog = await selfClient.loadDocumentCatalog();
      const existing = catalog.documents.find(entry => entry.id === documentId);

      await selfClient.saveDocument(documentId, doc);

      if (!existing) {
        const metadata: DocumentMetadata = {
          id: documentId,
          documentType: (doc as IDDocument).documentType,
          documentCategory:
            (doc as IDDocument).documentCategory || inferDocumentCategory((doc as IDDocument).documentType),
          data: isMRZDocument(doc) ? (doc as any).mrz : 'qrData' in doc ? (doc as any).qrData : '',
          mock: (doc as IDDocument).mock ?? false,
          isRegistered: false,
        };
        catalog.documents.push(metadata);
      }

      catalog.selectedDocumentId = documentId;
      await selfClient.saveDocumentCatalog(catalog);
      await onDocumentStored?.();
      // Auto-navigate to register screen after successful generation
      onNavigate('register');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaScrollView contentContainerStyle={styles.container} backgroundColor="#fafbfc">
      <StandardHeader title="Generate Mock Data" onBack={onBack} />
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Age</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={age} onChangeText={setAge} />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Expiry Years</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={expiryYears} onChangeText={setExpiryYears} />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First Name"
          placeholderTextColor="#999"
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last Name"
          placeholderTextColor="#999"
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.label}>OFAC Listed</Text>
        <Switch
          value={isInOfacList}
          onValueChange={setIsInOfacList}
          trackColor={{ false: '#d1d5db', true: '#34d399' }}
          thumbColor="#fff"
          ios_backgroundColor="#d1d5db"
        />
      </View>
      {documentType !== 'mock_aadhaar' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Algorithm</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={algorithm}
                onValueChange={(itemValue: string) => setAlgorithm(itemValue)}
                style={styles.picker}
              >
                {algorithmOptions.map(alg => (
                  <Picker.Item label={alg} value={alg} key={alg} />
                ))}
              </Picker>
              {Platform.OS === 'ios' && (
                <Icon name="chevron-down-outline" size={20} color="#000" style={styles.pickerIcon} />
              )}
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Country</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={country}
                onValueChange={(itemValue: string) => setCountry(itemValue)}
                style={styles.picker}
              >
                {countryOptions.map(code => (
                  <Picker.Item
                    label={`${code} - ${countryCodes[code as keyof typeof countryCodes]}`}
                    value={code}
                    key={code}
                  />
                ))}
              </Picker>
              {Platform.OS === 'ios' && (
                <Icon name="chevron-down-outline" size={20} color="#000" style={styles.pickerIcon} />
              )}
            </View>
          </View>
        </>
      )}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Document Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={documentType}
            onValueChange={(itemValue: string) => setDocumentType(itemValue as (typeof documentTypeOptions)[number])}
            style={styles.picker}
          >
            {documentTypeOptions.map(dt => (
              <Picker.Item label={dt} value={dt} key={dt} />
            ))}
          </Picker>
          {Platform.OS === 'ios' && (
            <Icon name="chevron-down-outline" size={20} color="#000" style={styles.pickerIcon} />
          )}
        </View>
      </View>
      <View style={styles.buttonRow}>
        <View style={styles.buttonWrapper}>
          <Button title="Reset" onPress={reset} color={Platform.OS === 'ios' ? '#007AFF' : undefined} />
        </View>
        <View style={styles.buttonWrapper}>
          <Button
            title="Generate"
            onPress={handleGenerate}
            disabled={loading}
            color={Platform.OS === 'ios' ? '#007AFF' : undefined}
          />
        </View>
      </View>
      {loading && <ActivityIndicator style={styles.spinner} size="large" color="#0000ff" />}
      {error && <Text style={styles.error}>{error}</Text>}
    </SafeAreaScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    marginBottom: 10,
  },
  label: {
    marginBottom: 4,
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    color: '#000',
    backgroundColor: '#fff',
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
    paddingHorizontal: 4,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  picker: {
    flex: 1,
    color: '#000',
    ...Platform.select({
      ios: {
        height: 40,
      },
      android: {
        height: 40,
      },
    }),
  },
  pickerIcon: {
    position: 'absolute',
    right: 12,
    top: 10,
    ...Platform.select({
      ios: {
        top: 10,
      },
    }),
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 6,
  },
  spinner: { marginVertical: 16 },
  error: { color: 'red', marginTop: 12, textAlign: 'center', fontSize: 14 },
});
