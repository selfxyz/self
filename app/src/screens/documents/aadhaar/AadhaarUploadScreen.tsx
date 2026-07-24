// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect } from 'react';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { trackOnboardingStep, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { OnboardingEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import DownloadMockup from '@/assets/images/aadhaar_download_mockup.png';
import { buttonTap } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';
import type { AadhaarRoutesParamList } from '@/navigation/types';
import { PrivacyMask } from '@/observability/PrivacyMask';
import AadhaarInstructionScreen from '@/screens/documents/aadhaar/AadhaarInstructionScreen';

const AadhaarUploadScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<AadhaarRoutesParamList, 'AadhaarUpload'>>();
  const countryCode = route.params?.countryCode ?? '';
  const selfClient = useSelfClient();

  useEffect(() => {
    trackOnboardingStep(selfClient, OnboardingEvents.SCAN_STARTED, {
      branch: 'aadhaar',
    });
  }, [selfClient]);

  const onNextPress = useCallback(() => {
    buttonTap();
    navigation.navigate('AadhaarSelectVersion', { countryCode });
  }, [navigation, countryCode]);

  return (
    <PrivacyMask>
      <AadhaarInstructionScreen
        mockupImage={DownloadMockup}
        headerText="Download Aadhaar"
        bodyText="Next you'll need to select the type of Aadhaar you'll download"
        secondaryLabel="Next"
        onSecondaryPress={onNextPress}
      />
    </PrivacyMask>
  );
};

export default AadhaarUploadScreen;
