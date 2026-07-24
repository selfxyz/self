// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useState } from 'react';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ImageUp } from '@tamagui/lucide-icons';

import { trackBranchEvent, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { AadhaarEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { black } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import UnmaskedMockup from '@/assets/images/aadhaar_unmasked_mockup.png';
import { buttonTap } from '@/integrations/haptics';
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

  const onUploadPress = useCallback(async () => {
    if (isProcessing) {
      return;
    }

    try {
      buttonTap();
      setIsProcessing(true);
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
  }, [isProcessing, selfClient, navigation, countryCode]);

  return (
    <PrivacyMask>
      <AadhaarInstructionScreen
        mockupImage={UnmaskedMockup}
        headerText="Select 'Unmasked'"
        bodyText="This is the only version of Aadhaar that can be accepted for verification."
        secondaryLabel="Upload"
        secondaryIcon={<ImageUp size={20} color={black} />}
        onSecondaryPress={onUploadPress}
        secondaryDisabled={isProcessing}
      />
    </PrivacyMask>
  );
};

export default AadhaarSelectVersionScreen;
