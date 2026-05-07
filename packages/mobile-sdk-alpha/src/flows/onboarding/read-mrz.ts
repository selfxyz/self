// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { RefObject } from 'react';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { trackBranchEvent } from '../../analytics/onboardingFunnel';
import { BiometricEvents } from '../../constants/analytics';
import { useSelfClient } from '../../context';
import { checkScannedInfo, formatDateToYYMMDD } from '../../processing/mrz';
import { SdkEvents } from '../../types/events';
import type { MRZInfo } from '../../types/public';

// Dev-only error injection - uses injected devConfig from SDK context
// No cross-package requires needed

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
  const shouldTrigger = selfClient.config?.devConfig?.shouldTrigger;

  return {
    onPassportRead: useCallback(
      (error: Error | null, result?: MRZInfo) => {
        const scanDurationSeconds = calculateScanDurationSeconds(scanStartTimeRef);

        // Dev-only: Check for injected unknown error
        if (shouldTrigger?.('mrz_unknown_error')) {
          console.log('[DEV] Injecting MRZ unknown error');
          selfClient.emit(SdkEvents.DOCUMENT_MRZ_READ_FAILURE);
          return;
        }

        if (error) {
          console.error(error);

          selfClient.emit(SdkEvents.DOCUMENT_MRZ_READ_FAILURE);
          return;
        }

        if (!result) {
          console.error('No result from passport scan');

          return;
        }

        const { documentNumber, dateOfBirth, dateOfExpiry, documentType, issuingCountry } = result;

        const formattedDateOfBirth = Platform.OS === 'ios' ? formatDateToYYMMDD(dateOfBirth) : dateOfBirth;
        const formattedDateOfExpiry = Platform.OS === 'ios' ? formatDateToYYMMDD(dateOfExpiry) : dateOfExpiry;

        // Dev-only: Check for injected invalid format error
        const shouldInjectInvalidFormat = shouldTrigger?.('mrz_invalid_format') || false;

        if (
          shouldInjectInvalidFormat ||
          !checkScannedInfo(documentNumber, formattedDateOfBirth, formattedDateOfExpiry)
        ) {
          if (shouldInjectInvalidFormat) {
            console.log('[DEV] Injecting MRZ invalid format error');
          }

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

        const trimmedDocType = documentType?.trim().toLowerCase() ?? '';
        const branchDocumentType = trimmedDocType === 'i' || trimmedDocType.startsWith('id') ? 'id_card' : 'passport';

        trackBranchEvent(selfClient, BiometricEvents.MRZ_CAPTURED, {
          document_type: branchDocumentType,
          duration_seconds: parseFloat(scanDurationSeconds),
        });

        selfClient.emit(SdkEvents.DOCUMENT_MRZ_READ_SUCCESS);
      },
      [selfClient, shouldTrigger],
    ),
  };
}
