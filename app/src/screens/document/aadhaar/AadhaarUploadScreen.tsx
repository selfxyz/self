// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { Image, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';

import {
  extractQRDataFields,
  getAadharRegistrationWindow,
} from '@selfxyz/common/utils';
import type { AadhaarData } from '@selfxyz/common/utils/types';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { BodyText } from '@/components/typography/BodyText';
import { useModal } from '@/hooks/useModal';
import AadhaarImage from '@/images/512w.png';
import { useSafeAreaInsets } from '@/mocks/react-native-safe-area-context';
import { storePassportData } from '@/providers/passportDataProvider';
import { slate100, slate200, slate400, slate500, white } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';
import {
  isQRScannerPhotoLibraryAvailable,
  scanQRCodeFromPhotoLibrary,
} from '@/utils/qrScanner';

const AadhaarUploadScreen: React.FC = () => {
  const { bottom } = useSafeAreaInsets();
  const navigation = useNavigation();
  const { trackEvent } = useSelfClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { showModal: showPermissionModal } = useModal({
    titleText: 'Photo Library Access Required',
    bodyText:
      'To upload QR codes from your photo library, please enable photo library access in your device settings.',
    buttonText: 'Open Settings',
    secondaryButtonText: 'Cancel',
    onButtonPress: () => {
      console.log('Opening device settings for photo library access');
      Linking.openSettings();
    },
    onModalDismiss: () => {
      console.log('Permission modal dismissed');
    },
  });

  console.log('AadhaarUploadScreen: Permission modal initialized');

  const validateAAdhaarTimestamp = useCallback(async (timestamp: string) => {
    //timestamp is in YYYY-MM-DD HH:MM format
    const currentTimestamp = new Date().getTime();
    const timestampDate = new Date(timestamp);
    const timestampTimestamp = timestampDate.getTime();
    const diff = currentTimestamp - timestampTimestamp;
    const diffMinutes = diff / (1000 * 60);

    const allowedWindow = await getAadharRegistrationWindow();
    return diffMinutes <= allowedWindow;
  }, []);

  const processAadhaarQRCode = useCallback(
    async (qrCodeData: string) => {
      try {
        console.log('Processing Aadhaar QR code:', qrCodeData);

        if (
          !qrCodeData ||
          typeof qrCodeData !== 'string' ||
          qrCodeData.length < 100
        ) {
          throw new Error('Invalid QR code format - too short or not a string');
        }

        if (!/^\d+$/.test(qrCodeData)) {
          throw new Error('Invalid QR code format - not a numeric string');
        }

        console.log('Parsing Aadhaar QR data...');
        if (qrCodeData.length < 100) {
          throw new Error(
            'QR code too short - likely not a valid Aadhaar QR code',
          );
        }

        let extractedFields;
        try {
          extractedFields = extractQRDataFields(qrCodeData);
          console.log('Extracted Aadhaar fields:', extractedFields);
        } catch (error) {
          console.error('Error extracting fields:', error);
          throw new Error('Failed to parse Aadhaar QR code - invalid format');
        }

        if (
          !extractedFields.name ||
          !extractedFields.dob ||
          !extractedFields.gender
        ) {
          throw new Error('Invalid Aadhaar QR code - missing required fields');
        }

        if (!(await validateAAdhaarTimestamp(extractedFields.timestamp))) {
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

        console.log('Storing Aadhaar data to keychain...');

        await storePassportData(aadhaarData);

        console.log('Aadhaar data stored successfully');

        trackEvent(ProofEvents.QR_SCAN_SUCCESS, {
          scan_type: 'aadhaar_upload',
        });

        navigation.navigate('AadhaarUploadSuccess');
      } catch (error) {
        console.error('Error processing Aadhaar QR code:', error);
        trackEvent(ProofEvents.QR_SCAN_FAILED, {
          reason: 'aadhaar_processing_error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Check if it's a QR code expiration error
        const errorType = error instanceof Error && error.message === 'QRCODE_EXPIRED'
          ? 'expired'
          : 'general';

        (navigation.navigate as any)('AadhaarUploadError', { errorType });
      }
    },
    [navigation, trackEvent],
  );

  const onPhotoLibraryPress = useCallback(async () => {
    if (isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      trackEvent(ProofEvents.QR_SCAN_REQUESTED, {
        from: 'aadhaar_photo_library',
      });

      const qrCodeData = await scanQRCodeFromPhotoLibrary();
      await processAadhaarQRCode(qrCodeData);
    } catch (error) {
      trackEvent(ProofEvents.QR_SCAN_FAILED, {
        reason: 'aadhaar_photo_library_error',
        error:
          error instanceof Error
            ? error.message
            : error?.toString() || 'Unknown error',
      });

      console.error('Aadhaar photo library QR scan error:', error);

      // Don't show error for user cancellation
      if (error instanceof Error && error.message.includes('cancelled')) {
        console.log('User cancelled photo selection');
        return;
      }

      // Handle permission errors specifically - check for exact message from native code
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log('Error message for matching:', errorMessage);

      if (errorMessage.includes('Photo library access is required')) {
        console.log(
          'Exact match: Showing permission modal for photo library access',
        );
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
        console.log(
          'Pattern match: Detected permission-related error, showing modal',
        );
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
        console.log(
          'QR code scanning/processing error, navigating to error screen',
        );
        (navigation.navigate as any)('AadhaarUploadError', { errorType: 'general' });
        return;
      }

      // Handle any other errors by showing error screen
      console.log('Unknown error, navigating to error screen');
      (navigation.navigate as any)('AadhaarUploadError', { errorType: 'general' });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, trackEvent, processAadhaarQRCode]);

  const onCameraScanPress = useCallback(() => {
    if (isProcessing) {
      return;
    }

    // TODO: Implement camera-based QR scanning for Aadhaar
    // This could navigate to a camera screen or open a modal
    console.log('Open Aadhaar QR camera scanner');

    trackEvent(ProofEvents.QR_SCAN_REQUESTED, {
      from: 'aadhaar_camera',
    });
  }, [isProcessing, trackEvent]);

  return (
    <YStack flex={1} backgroundColor={slate100}>
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

      <YStack
        paddingHorizontal={25}
        backgroundColor={white}
        paddingBottom={bottom + extraYPadding + 35}
        paddingTop={25}
      >
        <XStack gap="$3" alignItems="stretch">
          <YStack flex={1}>
            <PrimaryButton
              disabled={!isQRScannerPhotoLibraryAvailable() || isProcessing}
              onPress={onPhotoLibraryPress}
            >
              {isProcessing ? 'Processing...' : 'Upload QR code'}
            </PrimaryButton>
          </YStack>
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
