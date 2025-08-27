// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import { Button, Text, YStack } from 'tamagui';

import { getSKIPEM } from '@selfxyz/common/utils/csca';
import { initPassportDataParsing } from '@selfxyz/common/utils/passports';

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
    <YStack space="$4" padding="$4">
      <Text fontSize="$6" fontWeight="bold">
        NFC Scanner
      </Text>
      <Button onPress={() => onNFCScan({})}>Simulate NFC Scan</Button>
    </YStack>
  );
};
