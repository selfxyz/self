// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { View } from 'tamagui';

import { getSKIPEM, initPassportDataParsing } from '@selfxyz/common';

import { useSelfClient } from '../../context';
import { MRZInfo, ScanResultNFC } from '../../types/public';
import type { ScreenProps } from '../../types/ui';

//TODO:question - Should we pass mrzData through internal state (from PassportCameraScreen) or take it from the user?
export const NFCScannerScreen = ({ onSuccess, onFailure, mrzData }: ScreenProps & { mrzData: MRZInfo }) => {
  const client = useSelfClient();

  const onNFCScan = useCallback(
    async (_nfcData: any) => {
      try {
        // scan the document
        const scanResult = await client.scanDocument({
          mode: 'nfc',
          passportNumber: mrzData.documentNumber,
          dateOfBirth: mrzData.dateOfBirth,
          dateOfExpiry: mrzData.dateOfExpiry,
        });

        const skiPem = await getSKIPEM('production');
        const _parsedPassportData = initPassportDataParsing((scanResult as ScanResultNFC).passportData, skiPem);

        // register the document
        onSuccess();
      } catch (error) {
        onFailure(error as Error);
      }
    },
    [client, onSuccess, onFailure],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NFC Scanner</Text>
      <TouchableOpacity style={styles.button} onPress={() => onNFCScan({})}>
        <Text style={styles.buttonText}>Simulate NFC Scan</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
