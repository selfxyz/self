// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { Image, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  extractQRDataFields,
  getAadharRegistrationWindow,
} from '@selfxyz/common/utils';
import type { AadhaarData } from '@selfxyz/common/utils/types';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { AadhaarEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { BodyText } from '@/components/typography/BodyText';
import { useModal } from '@/hooks/useModal';
import AadhaarImage from '@/images/512w.png';
import { useSafeAreaInsets } from '@/mocks/react-native-safe-area-context';
import type { RootStackParamList } from '@/navigation';
import { storePassportData } from '@/providers/passportDataProvider';
import { slate100, slate200, slate400, slate500, white } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';
import {
  isQRScannerPhotoLibraryAvailable,
  scanQRCodeFromPhotoLibrary,
} from '@/utils/qrScanner';

const AadhaarUploadScreen: React.FC = () => {
  const { bottom } = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { trackEvent } = useSelfClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { showModal: showPermissionModal } = useModal({
    titleText: 'Photo Library Access Required',
    bodyText:
      'To upload QR codes from your photo library, please enable photo library access in your device settings.',
    buttonText: 'Open Settings',
    secondaryButtonText: 'Cancel',
    onButtonPress: () => {
      trackEvent(AadhaarEvents.PERMISSION_SETTINGS_OPENED);
      Linking.openSettings();
    },
    onModalDismiss: () => {
      trackEvent(AadhaarEvents.PERMISSION_MODAL_DISMISSED);
    },
  });

  // Track screen entry
  useEffect(() => {
    trackEvent(AadhaarEvents.UPLOAD_SCREEN_OPENED);

    // Track button state based on photo library availability
    if (isQRScannerPhotoLibraryAvailable()) {
      trackEvent(AadhaarEvents.UPLOAD_BUTTON_ENABLED);
    } else {
      trackEvent(AadhaarEvents.UPLOAD_BUTTON_DISABLED);
      trackEvent(AadhaarEvents.PHOTO_LIBRARY_UNAVAILABLE);
    }
  }, [trackEvent]);

  const validateAAdhaarTimestamp = useCallback(
    async (timestamp: string) => {
      //timestamp is in YYYY-MM-DD HH:MM format
      trackEvent(AadhaarEvents.TIMESTAMP_VALIDATION_STARTED);

      const currentTimestamp = new Date().getTime();
      const timestampDate = new Date(timestamp);
      const timestampTimestamp = timestampDate.getTime();
      const diff = currentTimestamp - timestampTimestamp;
      const diffMinutes = diff / (1000 * 60);

      const allowedWindow = await getAadharRegistrationWindow();
      const isValid = diffMinutes <= allowedWindow;

      if (isValid) {
        trackEvent(AadhaarEvents.TIMESTAMP_VALIDATION_SUCCESS);
      } else {
        trackEvent(AadhaarEvents.TIMESTAMP_VALIDATION_FAILED);
      }

      return isValid;
    },
    [trackEvent],
  );

  const processAadhaarQRCode = useCallback(
    async (qrCodeData: string) => {
      try {
        if (
          !qrCodeData ||
          typeof qrCodeData !== 'string' ||
          qrCodeData.length < 100
        ) {
          trackEvent(AadhaarEvents.QR_CODE_INVALID_FORMAT);
          throw new Error('Invalid QR code format - too short or not a string');
        }

        if (!/^\d+$/.test(qrCodeData)) {
          trackEvent(AadhaarEvents.QR_CODE_INVALID_FORMAT);
          throw new Error('Invalid QR code format - not a numeric string');
        }

        if (qrCodeData.length < 100) {
          trackEvent(AadhaarEvents.QR_CODE_INVALID_FORMAT);
          throw new Error(
            'QR code too short - likely not a valid Aadhaar QR code',
          );
        }

        trackEvent(AadhaarEvents.QR_DATA_EXTRACTION_STARTED);
        let extractedFields;
        try {
          extractedFields = extractQRDataFields(qrCodeData);
          trackEvent(AadhaarEvents.QR_DATA_EXTRACTION_SUCCESS);
        } catch {
          trackEvent(AadhaarEvents.QR_CODE_PARSE_FAILED);
          throw new Error('Failed to parse Aadhaar QR code - invalid format');
        }

        if (
          !extractedFields.name ||
          !extractedFields.dob ||
          !extractedFields.gender
        ) {
          trackEvent(AadhaarEvents.QR_CODE_MISSING_FIELDS);
          throw new Error('Invalid Aadhaar QR code - missing required fields');
        }

        if (!(await validateAAdhaarTimestamp(extractedFields.timestamp))) {
          trackEvent(AadhaarEvents.QR_CODE_EXPIRED);
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

        trackEvent(AadhaarEvents.DATA_STORAGE_STARTED);
        await storePassportData(aadhaarData);
        trackEvent(AadhaarEvents.DATA_STORAGE_SUCCESS);

        trackEvent(AadhaarEvents.QR_UPLOAD_SUCCESS);

        navigation.navigate('AadhaarUploadSuccess');
      } catch (error) {
        // Check if it's a QR code expiration error
        const errorType: 'expired' | 'general' =
          error instanceof Error && error.message === 'QRCODE_EXPIRED'
            ? 'expired'
            : 'general';

        trackEvent(AadhaarEvents.ERROR_SCREEN_NAVIGATED, { errorType });
        (navigation.navigate as any)('AadhaarUploadError', { errorType });
      }
    },
    [navigation, trackEvent, validateAAdhaarTimestamp],
  );

  const onPhotoLibraryPress = useCallback(async () => {
    if (isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      trackEvent(AadhaarEvents.PROCESSING_STARTED);

      const qrCodeData = await scanQRCodeFromPhotoLibrary();
      await processAadhaarQRCode(qrCodeData);
    } catch (error) {
      trackEvent(AadhaarEvents.QR_UPLOAD_FAILED, {
        error:
          error instanceof Error
            ? error.message
            : error?.toString() || 'Unknown error',
      });

      // Don't show error for user cancellation
      if (error instanceof Error && error.message.includes('cancelled')) {
        trackEvent(AadhaarEvents.USER_CANCELLED_SELECTION);
        return;
      }

      // Handle permission errors specifically - check for exact message from native code
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('Photo library access is required')) {
        trackEvent(AadhaarEvents.PERMISSION_MODAL_OPENED);
        showPermissionModal();
        return;
      }

      // Also check for other permission-related error messages
      if (
        errorMessage.includes('permission') ||
        errorMessage.includes('access') ||
        errorMessage.includes('Settings') ||
        errorMessage.includes('enable access')
      ) {
        trackEvent(AadhaarEvents.PERMISSION_MODAL_OPENED);
        showPermissionModal();
        return;
      }

      // Handle QR code scanning/processing errors
      if (
        errorMessage.includes('No QR code found') ||
        errorMessage.includes('QR code') ||
        errorMessage.includes('Failed to process') ||
        errorMessage.includes('Invalid')
      ) {
        (navigation.navigate as any)('AadhaarUploadError', {
          errorType: 'general' as const,
        });
        return;
      }

      // Handle any other errors by showing error screen
      (navigation.navigate as any)('AadhaarUploadError', {
        errorType: 'general' as const,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    trackEvent,
    processAadhaarQRCode,
    navigation,
    showPermissionModal,
  ]);

  return (
    <YStack
      flex={1}
      backgroundColor={slate100}
      paddingBottom={bottom + extraYPadding + 50}
    >
      <YStack flex={1} paddingHorizontal={20} paddingTop={20}>
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          paddingVertical={20}
        >
          <Image
            source={AadhaarImage}
            width="100%"
            height="100%"
            objectFit="contain"
          />
        </YStack>
      </YStack>

      <YStack
        paddingHorizontal={20}
        paddingTop={20}
        alignItems="center"
        paddingVertical={25}
        borderBlockWidth={1}
        borderBlockColor={slate200}
      >
        <BodyText fontWeight="bold" fontSize={18} textAlign="center">
          Generate a QR code from the mAadaar app
        </BodyText>
        <BodyText fontSize={16} textAlign="center" color={slate500}>
          Save the QR code to your photo library and upload it here.
        </BodyText>
        <BodyText
          fontSize={12}
          textAlign="center"
          color={slate400}
          marginTop={20}
        >
          SELF DOES NOT STORE THIS INFORMATION.
        </BodyText>
      </YStack>

      <YStack paddingHorizontal={25} backgroundColor={white} paddingTop={25}>
        <XStack gap="$3" alignItems="stretch">
          <YStack flex={1}>
            <PrimaryButton
              disabled={!isQRScannerPhotoLibraryAvailable() || isProcessing}
              trackEvent={AadhaarEvents.QR_UPLOAD_REQUESTED}
              onPress={onPhotoLibraryPress}
            >
              {isProcessing ? 'Processing...' : 'Upload QR code'}
            </PrimaryButton>
          </YStack>
          {/* TODO: Implement camera-based QR scanning for Aadhaar */}
          {/* <Button
            aspectRatio={1}
            backgroundColor={slate200}
            borderRadius="$2"
            justifyContent="center"
            alignItems="center"
            pressStyle={{
              backgroundColor: slate50,
              scale: 0.98,
            }}
            hoverStyle={{
              backgroundColor: slate300,
            }}
            onPress={onCameraScanPress}
            disabled={isProcessing}
          >
            <ScanIcon width={28} height={28} color={black} />
          </Button> */}
        </XStack>
      </YStack>
    </YStack>
  );
};

export default AadhaarUploadScreen;
