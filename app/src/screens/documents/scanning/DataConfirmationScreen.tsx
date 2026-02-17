// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DataConfirmationScreen as EuclidDataConfirmationScreen } from '@selfxyz/euclid';
import type { DocumentData } from '@selfxyz/euclid';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { PassportEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import useHapticNavigation from '@/hooks/useHapticNavigation';
import type { RootStackParamList } from '@/navigation';
import { trackEvent } from '@/services/analytics';
import { calculateFirstDifference, type FirstDifference } from '@/utils/diffCalculator';

const DataConfirmationScreen: React.FC & {
  statusBar: { hidden: boolean; style: string };
} = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selfClient = useSelfClient();
  const { useMRZStore } = selfClient;
  const insets = useSafeAreaInsets();

  const mrzData = useMRZStore();
  const {
    passportNumber: originalDocumentNumber,
    dateOfBirth: originalDateOfBirth,
    dateOfExpiry: originalDocumentExpiryDate,
  } = mrzData;

  const navigateToHome = useHapticNavigation('Home', {
    action: 'cancel',
  });

  const onClose = () => {
    navigateToHome();
  };

  const onConfirmationPressed = (data: DocumentData) => {
    const { documentNumber, dateOfBirth, documentExpiryDate } = data;

    const hasChanges =
      documentNumber !== originalDocumentNumber ||
      dateOfBirth !== originalDateOfBirth ||
      documentExpiryDate !== originalDocumentExpiryDate;

    if (hasChanges) {
      const diffs: Record<string, FirstDifference | null> = {};

      if (documentNumber !== originalDocumentNumber) {
        diffs.document_number = calculateFirstDifference(originalDocumentNumber, documentNumber);
      }

      if (dateOfBirth !== originalDateOfBirth) {
        diffs.date_of_birth = calculateFirstDifference(originalDateOfBirth, dateOfBirth);
      }

      if (documentExpiryDate !== originalDocumentExpiryDate) {
        diffs.document_expiry_date = calculateFirstDifference(originalDocumentExpiryDate, documentExpiryDate);
      }

      const filteredDiffs = Object.fromEntries(
        Object.entries(diffs).filter(([, diff]) => diff !== null)
      );

      trackEvent(PassportEvents.MRZ_DATA_MODIFIED, {
        diffs: filteredDiffs,
        fields_changed: Object.keys(filteredDiffs),
        total_changes: Object.keys(filteredDiffs).length,
      });

      mrzData.setMRZForNFC({
        ...mrzData,
        passportNumber: documentNumber,
        dateOfBirth,
        dateOfExpiry: documentExpiryDate,
      });
    }

    trackEvent(PassportEvents.DATA_CONFIRMATION_COMPLETED, {
      had_changes: hasChanges,
    });

    navigation.navigate('DocumentNFCScan');
  };

  return (
    <EuclidDataConfirmationScreen
      insets={insets}
      documentNumber={originalDocumentNumber}
      dateOfBirth={originalDateOfBirth}
      documentExpiryDate={originalDocumentExpiryDate}
      onConfirmationPressed={onConfirmationPressed}
      onClose={onClose}
    />
  );
};

DataConfirmationScreen.statusBar = EuclidDataConfirmationScreen.statusBar;

export default DataConfirmationScreen;
