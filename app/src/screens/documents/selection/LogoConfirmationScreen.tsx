// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import { YStack } from '@selfxyz/mobile-sdk-alpha/components';
import { slate100 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { LogoConfirmationScreen as SDKLogoConfirmationScreen } from '@selfxyz/mobile-sdk-alpha';

import EPassportLogo from '@/assets/icons/epassport_logo.svg';

import { DocumentFlowNavBar } from '@/components/navbar/DocumentFlowNavBar';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import type { RootStackParamList } from '@/navigation';
import { useFeedback } from '@/providers/feedbackProvider';
import { extraYPadding } from '@/utils/styleUtils';

type LogoConfirmationScreenRouteProp = RouteProp<
  RootStackParamList,
  'LogoConfirmation'
>;

const LogoConfirmationScreen: React.FC = () => {
  const route = useRoute<LogoConfirmationScreenRouteProp>();
  const { documentType = '', countryCode = '' } = route.params || {};
  const bottom = useSafeAreaInsets().bottom;
  const { showModal } = useFeedback();
  const navigateToOnboarding = useHapticNavigation('DocumentOnboarding');

  const handleConfirm = useCallback(() => {
    navigateToOnboarding();
  }, [navigateToOnboarding]);

  const handleNotFound = useCallback(() => {
    showModal({
      titleText: 'Document Not Supported',
      bodyText: 'Your document is not supported as it is not a biometric ID.',
      buttonText: 'OK',
      onButtonPress: () => {},
    });
  }, [showModal]);

  return (
    <YStack flex={1} backgroundColor={slate100}>
      <DocumentFlowNavBar title="GETTING STARTED" />
      <SDKLogoConfirmationScreen
        documentType={documentType}
        countryCode={countryCode}
        logo={<EPassportLogo width={160} height={98} />}
        safeAreaBottom={safeAreaBottom}
        confirmButtonText="Yes"
        notFoundButtonText="Proceed with external verifier"
        onConfirm={handleConfirm}
        onNotFound={handleNotFound}
      />
    </YStack>
  );
};

export default LogoConfirmationScreen;
