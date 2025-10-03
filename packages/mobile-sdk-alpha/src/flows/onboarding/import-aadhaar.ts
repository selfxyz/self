// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';

import { extractQRDataFields, getAadharRegistrationWindow } from '@selfxyz/common/utils';
import type { AadhaarData } from '@selfxyz/common/utils/types';

import { AadhaarEvents } from '../../constants/analytics';
import { useSelfClient } from '../../context';
import { storePassportData } from '../../documents/utils';
import { SdkEvents } from '../../types/events';

export const getErrorMessages = (errorType: 'general' | 'expired') => {
  if (errorType === 'expired') {
    return {
      title: 'QR Code Has Expired',
      description:
        'You uploaded a valid Aadhaar QR code, but unfortunately it has expired. Please generate a new QR code from the mAadhaar app and try again.',
    };
  }

  return {
    title: 'There was a problem reading the code',
    description:
      'Please ensure the QR code is clear and well-lit, then try again. For best results, take a screenshot of the QR code instead of photographing it.',
  };
};

export function useAadhaar() {
  const selfClient = useSelfClient();

  const validateAAdhaarTimestamp = useCallback(
    async (timestamp: string) => {
      //timestamp is in YYYY-MM-DD HH:MM format
      selfClient.trackEvent(AadhaarEvents.TIMESTAMP_VALIDATION_STARTED);

      const currentTimestamp = new Date().getTime();
      const timestampDate = new Date(timestamp);
      const timestampTimestamp = timestampDate.getTime();
      const diff = currentTimestamp - timestampTimestamp;
      const diffMinutes = diff / (1000 * 60);

      const allowedWindow = await getAadharRegistrationWindow();
      const isValid = diffMinutes <= allowedWindow;

      if (isValid) {
        selfClient.trackEvent(AadhaarEvents.TIMESTAMP_VALIDATION_SUCCESS);
      } else {
        selfClient.trackEvent(AadhaarEvents.TIMESTAMP_VALIDATION_FAILED);
      }

      return isValid;
    },
    [selfClient.trackEvent],
  );

  const processAadhaarQRCode = useCallback(
    async (qrCodeData: string) => {
      try {
        if (!qrCodeData || typeof qrCodeData !== 'string' || qrCodeData.length < 100) {
          selfClient.trackEvent(AadhaarEvents.QR_CODE_INVALID_FORMAT);
          throw new Error('Invalid QR code format - too short or not a string');
        }

        if (!/^\d+$/.test(qrCodeData)) {
          selfClient.trackEvent(AadhaarEvents.QR_CODE_INVALID_FORMAT);
          throw new Error('Invalid QR code format - not a numeric string');
        }

        if (qrCodeData.length < 100) {
          selfClient.trackEvent(AadhaarEvents.QR_CODE_INVALID_FORMAT);
          throw new Error('QR code too short - likely not a valid Aadhaar QR code');
        }

        selfClient.trackEvent(AadhaarEvents.QR_DATA_EXTRACTION_STARTED);
        let extractedFields;
        try {
          extractedFields = extractQRDataFields(qrCodeData);
          selfClient.trackEvent(AadhaarEvents.QR_DATA_EXTRACTION_SUCCESS);
        } catch {
          selfClient.trackEvent(AadhaarEvents.QR_CODE_PARSE_FAILED);
          throw new Error('Failed to parse Aadhaar QR code - invalid format');
        }

        if (!extractedFields.name || !extractedFields.dob || !extractedFields.gender) {
          selfClient.trackEvent(AadhaarEvents.QR_CODE_MISSING_FIELDS);
          throw new Error('Invalid Aadhaar QR code - missing required fields');
        }

        if (!(await validateAAdhaarTimestamp(extractedFields.timestamp))) {
          selfClient.trackEvent(AadhaarEvents.QR_CODE_EXPIRED);
          throw new Error('QRCODE_EXPIRED');
        }

        const aadhaarData: AadhaarData = {
          documentType: 'aadhaar',
          documentCategory: 'aadhaar',
          mock: false,
          qrData: qrCodeData,
          extractedFields: extractedFields,
          signature: [],
          publicKey: '',
          photoHash: '',
        };

        selfClient.trackEvent(AadhaarEvents.DATA_STORAGE_STARTED);
        await storePassportData(selfClient, aadhaarData);
        selfClient.trackEvent(AadhaarEvents.DATA_STORAGE_SUCCESS);

        selfClient.trackEvent(AadhaarEvents.QR_UPLOAD_SUCCESS);
        selfClient.emit(SdkEvents.PROVING_AADHAAR_UPLOAD_SUCCESS);
      } catch (error) {
        // Check if it's a QR code expiration error
        const errorType: 'expired' | 'general' =
          error instanceof Error && error.message === 'QRCODE_EXPIRED' ? 'expired' : 'general';

        selfClient.trackEvent(AadhaarEvents.ERROR_SCREEN_NAVIGATED, {
          errorType,
        });
        selfClient.emit(SdkEvents.PROVING_AADHAAR_UPLOAD_FAILURE, {
          errorType,
        });
      }
    },
    [selfClient, validateAAdhaarTimestamp],
  );

  return { processAadhaarQRCode };
}
