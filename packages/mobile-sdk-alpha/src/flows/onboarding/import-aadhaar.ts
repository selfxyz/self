// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';

import { extractQRDataFields, getAadharRegistrationWindow } from '@selfxyz/common/utils';
import type { AadhaarData } from '@selfxyz/common/utils/types';

import { trackBranchEvent } from '../../analytics/onboardingFunnel';
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
    async (timestamp: string): Promise<{ isValid: boolean; ageDays: number }> => {
      //timestamp is in YYYY-MM-DD HH:MM format
      const currentTimestamp = new Date().getTime();
      const timestampTimestamp = new Date(timestamp).getTime();
      const diffMinutes = (currentTimestamp - timestampTimestamp) / (1000 * 60);
      const ageDays = parseFloat((diffMinutes / (60 * 24)).toFixed(2));

      const allowedWindow = await getAadharRegistrationWindow();
      const isValid = Number.isFinite(diffMinutes) && diffMinutes >= 0 && diffMinutes <= allowedWindow;

      return { isValid, ageDays };
    },
    [],
  );

  const processAadhaarQRCode = useCallback(
    async (qrCodeData: string) => {
      const storeStartedAt = Date.now();
      try {
        if (!qrCodeData || typeof qrCodeData !== 'string' || qrCodeData.length < 100) {
          trackBranchEvent(selfClient, AadhaarEvents.QR_PARSE_FAILED, { reason: 'invalid_format' });
          throw new Error('Invalid QR code format - too short or not a string');
        }

        if (!/^\d+$/.test(qrCodeData)) {
          trackBranchEvent(selfClient, AadhaarEvents.QR_PARSE_FAILED, { reason: 'invalid_format' });
          throw new Error('Invalid QR code format - not a numeric string');
        }

        let extractedFields;
        try {
          extractedFields = extractQRDataFields(qrCodeData);
        } catch {
          trackBranchEvent(selfClient, AadhaarEvents.QR_PARSE_FAILED, { reason: 'parse_error' });
          throw new Error('Failed to parse Aadhaar QR code - invalid format');
        }

        if (!extractedFields.name || !extractedFields.dob || !extractedFields.gender) {
          trackBranchEvent(selfClient, AadhaarEvents.QR_PARSE_FAILED, { reason: 'missing_fields' });
          throw new Error('Invalid Aadhaar QR code - missing required fields');
        }

        const { isValid: timestampValid, ageDays } = await validateAAdhaarTimestamp(extractedFields.timestamp);
        if (!timestampValid) {
          trackBranchEvent(selfClient, AadhaarEvents.TIMESTAMP_EXPIRED, { qr_age_days: ageDays });
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

        await storePassportData(selfClient, aadhaarData);
        trackBranchEvent(selfClient, AadhaarEvents.DATA_STORED, {
          duration_seconds: parseFloat(((Date.now() - storeStartedAt) / 1000).toFixed(2)),
        });

        selfClient.emit(SdkEvents.PROVING_AADHAAR_UPLOAD_SUCCESS);
      } catch (error) {
        // Check if it's a QR code expiration error
        const errorType: 'expired' | 'general' =
          error instanceof Error && error.message === 'QRCODE_EXPIRED' ? 'expired' : 'general';

        selfClient.emit(SdkEvents.PROVING_AADHAAR_UPLOAD_FAILURE, {
          errorType,
        });
      }
    },
    [selfClient, validateAAdhaarTimestamp],
  );

  return { processAadhaarQRCode };
}
