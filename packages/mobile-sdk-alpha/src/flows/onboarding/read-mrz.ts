// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { RefObject } from 'react';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { PassportEvents } from '../../constants/analytics';
import { useSelfClient } from '../../context';
import { checkScannedInfo, formatDateToYYMMDD } from '../../processing/mrz';
import { SdkEvents } from '../../types/events';
import type { MRZInfo } from '../../types/public';

export type { MRZScannerViewProps } from '../../components/MRZScannerView';
export { MRZScannerView } from '../../components/MRZScannerView';

export function mrzReadInstructions() {
  return 'Lay your document flat and position the machine readable text in the viewfinder';
}

const calculateScanDurationSeconds = (scanStartTimeRef: RefObject<number>) => {
  if (!scanStartTimeRef.current) return '0.00';

  // Calculate scan duration in seconds with exactly 2 decimal places
  return ((Date.now() - scanStartTimeRef.current) / 1000).toFixed(2);
};

export function useReadMRZ(scanStartTimeRef: RefObject<number>) {
  const selfClient = useSelfClient();

  return {
    onPassportRead: useCallback(
      (error: Error | null, result?: MRZInfo) => {
        const scanDurationSeconds = calculateScanDurationSeconds(scanStartTimeRef);

        if (error) {
          console.error(error);

          selfClient.trackEvent(PassportEvents.CAMERA_SCAN_FAILED, {
            reason: 'unknown_error',
            error: error.message || 'Unknown error',
            duration_seconds: parseFloat(scanDurationSeconds),
          });

          // TODO: Add error handling here
          return;
        }

        if (!result) {
          console.error('No result from passport scan');
          selfClient.trackEvent(PassportEvents.CAMERA_SCAN_FAILED, {
            reason: 'invalid_input',
            error: 'No result from scan',
            duration_seconds: parseFloat(scanDurationSeconds),
          });

          return;
        }

        const { documentNumber, dateOfBirth, dateOfExpiry, documentType, issuingCountry } = result;

        const formattedDateOfBirth = Platform.OS === 'ios' ? formatDateToYYMMDD(dateOfBirth) : dateOfBirth;
        const formattedDateOfExpiry = Platform.OS === 'ios' ? formatDateToYYMMDD(dateOfExpiry) : dateOfExpiry;

        if (!checkScannedInfo(documentNumber, formattedDateOfBirth, formattedDateOfExpiry)) {
          selfClient.trackEvent(PassportEvents.CAMERA_SCAN_FAILED, {
            reason: 'invalid_format',
            passportNumberLength: documentNumber.length,
            dateOfBirthLength: formattedDateOfBirth.length,
            dateOfExpiryLength: formattedDateOfExpiry.length,
            duration_seconds: parseFloat(scanDurationSeconds),
          });

          selfClient.emit(SdkEvents.DOCUMENT_MRZ_READ_FAILURE);
          return;
        }

        selfClient.getMRZState().setMRZForNFC({
          passportNumber: documentNumber,
          dateOfBirth: formattedDateOfBirth,
          dateOfExpiry: formattedDateOfExpiry,
          documentType: documentType?.trim() || '',
          countryCode: issuingCountry?.trim().toUpperCase() || '',
        });

        selfClient.trackEvent(PassportEvents.CAMERA_SCAN_SUCCESS, {
          duration_seconds: parseFloat(scanDurationSeconds),
        });

        selfClient.emit(SdkEvents.DOCUMENT_MRZ_READ_SUCCESS);
      },
      [selfClient],
    ),
  };
}
