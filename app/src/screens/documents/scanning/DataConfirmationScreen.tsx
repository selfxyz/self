// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, TopNavigationDialogue, XIcon } from '@selfxyz/euclid';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  PrimaryButton,
  SecondaryButton,
} from '@selfxyz/mobile-sdk-alpha/components';
import { PassportEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { advercase } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { InputField } from '@/components/InputField';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { useKycLauncher } from '@/hooks/useKycLauncher';
import type { RootStackParamList } from '@/navigation';
import type { DocumentRoutesParamList } from '@/navigation/types';
import { trackEvent } from '@/services/analytics';

const EscapeIcon = ({ size, color }: { size: number; color: string }) => (
  <View testID="escape-button">
    <XIcon size={size} color={color} />
  </View>
);

export interface DocumentData {
  documentNumber: string;
  dateOfBirth: string;
  documentExpiryDate: string;
}

const DataConfirmationScreen: React.FC & {
  statusBar: { hidden: boolean; style: string };
} = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<DocumentRoutesParamList, 'DataConfirmation'>>();
  const fromNfcFailure = route.params?.fromNfcFailure ?? false;
  const selfClient = useSelfClient();
  const { useMRZStore } = selfClient;
  const insets = useSafeAreaInsets();
  const mrzData = useMRZStore();
  const navigateToHome = useHapticNavigation('Home', {
    action: 'cancel',
  });

  const { launchKycVerification, isLoading: isKycLoading } = useKycLauncher({
    countryCode: mrzData.countryCode,
  });
  const {
    passportNumber: originalDocumentNumber,
    dateOfBirth: originalDateOfBirth,
    dateOfExpiry: originalDocumentExpiryDate,
  } = mrzData;

  const [fields, setFields] = useState<DocumentData>({
    documentNumber: originalDocumentNumber,
    dateOfBirth: originalDateOfBirth,
    documentExpiryDate: originalDocumentExpiryDate,
  });

  const handleFieldChange = (field: keyof DocumentData, value: string) => {
    setFields(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleConfirmPress = () => {
    const { documentNumber, dateOfBirth, documentExpiryDate } = fields;

    const hasChanges =
      documentNumber !== originalDocumentNumber ||
      dateOfBirth !== originalDateOfBirth ||
      documentExpiryDate !== originalDocumentExpiryDate;

    if (hasChanges) {
      mrzData.setMRZForNFC({
        passportNumber: documentNumber,
        dateOfBirth,
        dateOfExpiry: documentExpiryDate,
        countryCode: mrzData.countryCode,
        documentType: mrzData.documentType,
      });
    }

    trackEvent(PassportEvents.DATA_CONFIRMATION_COMPLETED, {
      had_changes: hasChanges,
    });

    navigation.navigate('DocumentNFCScan');
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <TopNavigationDialogue
        variant="Primary"
        label="Data confirmation"
        escapeIcon={EscapeIcon}
        onEscape={() => navigateToHome()}
      />
      <Text style={styles.instructionText}>
        Please confirm the following information
      </Text>
      <View style={styles.fieldsContainer}>
        <InputField
          type="alphanumeric"
          label="Document number"
          value={fields.documentNumber}
          onChangeText={text => handleFieldChange('documentNumber', text)}
          style={styles.field}
        />

        <InputField
          type="date-of-birth"
          label="Date of birth"
          value={fields.dateOfBirth}
          onChangeText={text => handleFieldChange('dateOfBirth', text)}
          style={styles.field}
        />

        <InputField
          type="expiry-date"
          label="Document expiration date"
          value={fields.documentExpiryDate}
          onChangeText={text => handleFieldChange('documentExpiryDate', text)}
          style={styles.field}
        />
      </View>

      <YStack gap={12} style={styles.buttonContainer}>
        <PrimaryButton onPress={handleConfirmPress}>Continue</PrimaryButton>
        {fromNfcFailure && (
          <SecondaryButton
            onPress={launchKycVerification}
            disabled={isKycLoading}
          >
            {isKycLoading ? 'Loading...' : 'Try Alternative Verification'}
          </SecondaryButton>
        )}
      </YStack>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate50,
    justifyContent: 'space-between',
  },
  fieldsContainer: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  field: {
    marginBottom: 0,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  instructionText: {
    fontFamily: advercase,
    fontSize: 28,
    fontWeight: '400',
    color: colors.black,
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
});

DataConfirmationScreen.statusBar = {
  hidden: false,
  style: 'dark',
};

export default DataConfirmationScreen;
