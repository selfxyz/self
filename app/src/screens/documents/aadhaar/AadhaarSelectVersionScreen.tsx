// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useState } from 'react';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ImageUp } from '@tamagui/lucide-icons';

import {
  trackBranchEvent,
  trackOnboardingStep,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  AadhaarEvents,
  OnboardingEvents,
} from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { black } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import UnmaskedMockup from '@/assets/images/aadhaar_unmasked_mockup.png';
import { buttonTap } from '@/integrations/haptics';
import { isQRScannerPDFAvailable } from '@/integrations/qrScanner';
import type { RootStackParamList } from '@/navigation';
import type { AadhaarRoutesParamList } from '@/navigation/types';
import { PrivacyMask } from '@/observability/PrivacyMask';
import AadhaarInstructionScreen from '@/screens/documents/aadhaar/AadhaarInstructionScreen';

const AadhaarSelectVersionScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<AadhaarRoutesParamList, 'AadhaarSelectVersion'>>();
  const countryCode = route.params?.countryCode ?? '';
  const selfClient = useSelfClient();
  const [isProcessing, setIsProcessing] = useState(false);
  // Native PDF QR scanning is unavailable on web; without it the picker would
  // only ever lead to a general error, so gate the action on the capability.
  const pdfUploadAvailable = isQRScannerPDFAvailable();

  useEffect(() => {
    trackBranchEvent(selfClient, AadhaarEvents.INSTRUCTIONS_VIEWED, {
      screen: 'select_version',
    });
  }, [selfClient]);

  const onUploadPress = useCallback(async () => {
    if (isProcessing || !pdfUploadAvailable) {
      return;
    }

    try {
      buttonTap();
      setIsProcessing(true);
      // Aadhaar SCAN_STARTED fires when the picker opens (per analytics SPEC),
      // immediately before the branch UPLOAD_STARTED event.
      trackOnboardingStep(selfClient, OnboardingEvents.SCAN_STARTED, {
        branch: 'aadhaar',
      });
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
      });
    } catch {
      navigation.navigate('AadhaarUploadError', {
        errorType: 'general',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, pdfUploadAvailable, selfClient, navigation, countryCode]);

  return (
    <PrivacyMask>
      <AadhaarInstructionScreen
        screen="select_version"
        mockupImage={UnmaskedMockup}
        headerText="Select 'Unmasked'"
        bodyText="This is the only version of Aadhaar that can be accepted for verification."
        secondaryLabel="Upload"
        secondaryIcon={<ImageUp size={20} color={black} />}
        onSecondaryPress={onUploadPress}
        secondaryDisabled={isProcessing || !pdfUploadAvailable}
      />
    </PrivacyMask>
  );
};

export default AadhaarSelectVersionScreen;
