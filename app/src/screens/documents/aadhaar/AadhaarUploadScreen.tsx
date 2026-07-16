// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image, XStack, YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  trackBranchEvent,
  trackOnboardingStep,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  BodyText,
  PrimaryButton,
  SecondaryButton,
} from '@selfxyz/mobile-sdk-alpha/components';
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
import { useAadhaar } from '@selfxyz/mobile-sdk-alpha/onboarding/import-aadhaar';

import AadhaarImage from '@/assets/images/512w.png';
import { useModal } from '@/hooks/useModal';
import {
  isQRScannerPDFAvailable,
  isQRScannerPhotoLibraryAvailable,
  scanQRCodeFromPhotoLibrary,
} from '@/integrations/qrScanner';
import type { RootStackParamList } from '@/navigation';
import type { AadhaarRoutesParamList } from '@/navigation/types';
import { PrivacyMask } from '@/observability/PrivacyMask';
import { extraYPadding } from '@/utils/styleUtils';

const AadhaarUploadScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const paddingBottom = insets.bottom + extraYPadding;

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<AadhaarRoutesParamList, 'AadhaarUpload'>>();
  const countryCode = route.params?.countryCode ?? '';
  const selfClient = useSelfClient();
  const [processingAction, setProcessingAction] = useState<
    'pdf' | 'photo' | null
  >(null);
  const isProcessing = processingAction !== null;
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
      setProcessingAction('photo');
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
      setProcessingAction(null);
    }
  }, [
    isProcessing,
    selfClient,
    processAadhaarQRCode,
    navigation,
    showPermissionModal,
  ]);

  const onPdfPress = useCallback(async () => {
    if (isProcessing) {
      return;
    }

    try {
      setProcessingAction('pdf');
      trackBranchEvent(selfClient, AadhaarEvents.UPLOAD_STARTED);

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      navigation.navigate('AadhaarPdfPassword', {
        fileUri: result.assets[0].uri,
        countryCode,
      } as never);
    } catch {
      navigation.navigate('AadhaarUploadError', {
        errorType: 'general',
      } as never);
    } finally {
      setProcessingAction(null);
    }
  }, [isProcessing, selfClient, navigation, countryCode]);

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
            Upload your unmasked e-Aadhaar
          </BodyText>
          <BodyText
            style={{ fontSize: 16, textAlign: 'center', color: slate500 }}
          >
            Download the unmasked e-Aadhaar PDF from the mAadhaar app and upload
            it. Or crop out the QR code and upload it as an image.
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

        <YStack
          paddingHorizontal={25}
          backgroundColor={white}
          paddingTop={25}
          gap="$3"
        >
          {isQRScannerPDFAvailable() ? (
            <XStack gap="$3" alignItems="stretch">
              <YStack flex={1}>
                <PrimaryButton disabled={isProcessing} onPress={onPdfPress}>
                  {processingAction === 'pdf'
                    ? 'Processing...'
                    : 'Upload e-Aadhaar PDF'}
                </PrimaryButton>
              </YStack>
            </XStack>
          ) : null}
          <XStack gap="$3" alignItems="stretch">
            <YStack flex={1}>
              {isQRScannerPDFAvailable() ? (
                <SecondaryButton
                  disabled={!isQRScannerPhotoLibraryAvailable() || isProcessing}
                  onPress={onPhotoLibraryPress}
                >
                  {processingAction === 'photo'
                    ? 'Processing...'
                    : 'Upload QR code'}
                </SecondaryButton>
              ) : (
                <PrimaryButton
                  disabled={!isQRScannerPhotoLibraryAvailable() || isProcessing}
                  onPress={onPhotoLibraryPress}
                >
                  {processingAction === 'photo'
                    ? 'Processing...'
                    : 'Upload QR code'}
                </PrimaryButton>
              )}
            </YStack>
          </XStack>
        </YStack>
      </YStack>
    </PrivacyMask>
  );
};

export default AadhaarUploadScreen;
