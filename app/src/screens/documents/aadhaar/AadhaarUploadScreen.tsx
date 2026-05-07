// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Linking } from 'react-native';
import { Image, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  trackBranchEvent,
  trackOnboardingStep,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { BodyText, PrimaryButton } from '@selfxyz/mobile-sdk-alpha/components';
import {
  AadhaarEvents,
  OnboardingEvents,
} from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  slate100,
  slate200,
  slate400,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';
import { useAadhaar } from '@selfxyz/mobile-sdk-alpha/onboarding/import-aadhaar';

import AadhaarImage from '@/assets/images/512w.png';
import { useModal } from '@/hooks/useModal';
import {
  isQRScannerPhotoLibraryAvailable,
  scanQRCodeFromPhotoLibrary,
} from '@/integrations/qrScanner';
import type { RootStackParamList } from '@/navigation';
import { PrivacyMask } from '@/observability/PrivacyMask';
import { extraYPadding } from '@/utils/styleUtils';

const AadhaarUploadScreen: React.FC = () => {
  const paddingBottom = useSafeBottomPadding(extraYPadding + 50);

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selfClient = useSelfClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const aadhaarImageSource: ImageSourcePropType = AadhaarImage;

  const { showModal: showPermissionModal } = useModal({
    titleText: 'Photo Library Access Required',
    bodyText:
      'To upload QR codes from your photo library, please enable photo library access in your device settings.',
    buttonText: 'Open Settings',
    secondaryButtonText: 'Cancel',
    onButtonPress: () => {
      Linking.openSettings();
    },
    onModalDismiss: () => {},
  });

  // Fire SCAN_STARTED on canonical funnel only — branch funnel's UPLOAD_STARTED
  // fires on actual photo-library tap, not screen mount.
  useEffect(() => {
    trackOnboardingStep(selfClient, OnboardingEvents.SCAN_STARTED, {
      branch: 'aadhaar',
    });
  }, [selfClient]);

  const { processAadhaarQRCode } = useAadhaar();

  const onPhotoLibraryPress = useCallback(async () => {
    if (isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      trackBranchEvent(selfClient, AadhaarEvents.UPLOAD_STARTED);

      const qrCodeData = await scanQRCodeFromPhotoLibrary();
      trackBranchEvent(selfClient, AadhaarEvents.QR_SELECTED);
      await processAadhaarQRCode(qrCodeData);
      trackOnboardingStep(selfClient, OnboardingEvents.SCAN_SUCCEEDED, {
        branch: 'aadhaar',
      });
    } catch (error) {
      // Don't show error for user cancellation
      if (error instanceof Error && error.message.includes('cancelled')) {
        return;
      }

      // Handle permission errors specifically - check for exact message from native code
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('Photo library access is required')) {
        trackBranchEvent(selfClient, AadhaarEvents.PHOTO_PERMISSION_DENIED);
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
        trackBranchEvent(selfClient, AadhaarEvents.PHOTO_PERMISSION_DENIED);
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
        navigation.navigate('AadhaarUploadError', {
          errorType: 'general',
        } as never);
        return;
      }

      // Handle any other errors by showing error screen
      navigation.navigate('AadhaarUploadError', {
        errorType: 'general',
      } as never);
    } finally {
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    selfClient,
    processAadhaarQRCode,
    navigation,
    showPermissionModal,
  ]);

  return (
    <PrivacyMask>
      <YStack flex={1} backgroundColor={slate100} paddingBottom={paddingBottom}>
        <YStack flex={1} paddingHorizontal={20} paddingTop={20}>
          <YStack
            flex={1}
            justifyContent="center"
            alignItems="center"
            paddingVertical={20}
          >
            <Image
              source={aadhaarImageSource}
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
          <BodyText
            style={{ fontWeight: 'bold', fontSize: 18, textAlign: 'center' }}
          >
            Generate a QR code from the Aadhaar app
          </BodyText>
          <BodyText
            style={{ fontSize: 16, textAlign: 'center', color: slate500 }}
          >
            Save the QR code to your photo library and upload it here.
          </BodyText>
          <BodyText
            style={{
              fontSize: 12,
              textAlign: 'center',
              color: slate400,
              marginTop: 20,
            }}
          >
            SELF DOES NOT STORE THIS INFORMATION.
          </BodyText>
        </YStack>

        <YStack paddingHorizontal={25} backgroundColor={white} paddingTop={25}>
          <XStack gap="$3" alignItems="stretch">
            <YStack flex={1}>
              <PrimaryButton
                disabled={!isQRScannerPhotoLibraryAvailable() || isProcessing}
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
    </PrivacyMask>
  );
};

export default AadhaarUploadScreen;
