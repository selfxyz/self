// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  failOnboardingAttempt,
  setOnboardingBranch,
  trackOnboardingStep,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  BodyText,
  ButtonsContainer,
  PrimaryButton,
  SecondaryButton,
} from '@selfxyz/mobile-sdk-alpha/components';
import { OnboardingEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  slate100,
  slate400,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { advercase, dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import EPassportLogo from '@/assets/icons/epassport_logo.svg';
import { DocumentFlowNavBar } from '@/components/navbar/DocumentFlowNavBar';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { buttonTap } from '@/integrations/haptics';
import { createKycSession, launchKycVerification } from '@/integrations/kyc';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import { useFeedback } from '@/providers/feedbackProvider';

type LogoConfirmationScreenRouteProp = RouteProp<
  RootStackParamList,
  'LogoConfirmation'
>;

const LogoConfirmationScreen: React.FC = () => {
  const route = useRoute<LogoConfirmationScreenRouteProp>();
  const { countryCode } = route.params;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showModal } = useFeedback();
  const navigateToOnboarding = useHapticNavigation('DocumentOnboarding');
  const selfClient = useSelfClient();
  const { trackEvent } = selfClient;

  const handleConfirm = useCallback(() => {
    buttonTap();
    trackEvent('App: Logo Confirmation Answered', { answer: 'yes' });
    navigateToOnboarding();
  }, [navigateToOnboarding, trackEvent]);

  const handleNotFound = useCallback(() => {
    buttonTap();
    trackEvent('App: Logo Confirmation Answered', { answer: 'no' });
    // "No" on the chip-symbol check routes through the KYC provider —
    // update the canonical funnel branch accordingly.
    setOnboardingBranch('kyc');
    showModal({
      titleText: 'Document Not Supported',
      bodyText:
        "To complete registration of a document without a biometric chip, you'll be redirected to our third party verification partner.",
      buttonText: 'Proceed with an external verifier',
      onButtonPress: async () => {
        let scanStarted = false;
        try {
          const session = await createKycSession();
          trackOnboardingStep(selfClient, OnboardingEvents.SCAN_STARTED, {
            branch: 'kyc',
          });
          scanStarted = true;
          const result = await launchKycVerification(session.sessionToken);

          // User cancelled/dismissed without completing verification
          if (result.type === 'cancelled') {
            failOnboardingAttempt(selfClient, 'scan_started', 'kyc_cancelled');
            return;
          }

          // Verification failed (provider error/rejection)
          if (result.type === 'failed') {
            console.error(
              'KYC verification failed:',
              result.error?.type ?? 'unknown',
            );
            failOnboardingAttempt(
              selfClient,
              'scan_started',
              `kyc_failed:${result.error?.type ?? 'unknown'}`,
            );
            navigation.navigate('KycFailure', {
              countryCode,
              canRetry: true,
            });
            return;
          }

          // Provider returned a completed session — only Approved counts as
          // success. Liveness Declined / In Review must route to KycFailure.
          const sessionStatus = result.session?.status;
          if (sessionStatus !== 'Approved') {
            failOnboardingAttempt(
              selfClient,
              'scan_started',
              `kyc_declined:${sessionStatus ?? 'unknown'}`,
            );
            navigation.navigate('KycFailure', {
              countryCode,
              canRetry: true,
            });
            return;
          }

          // Verification succeeded - navigate to KycSuccessScreen
          trackOnboardingStep(selfClient, OnboardingEvents.SCAN_SUCCEEDED, {
            branch: 'kyc',
          });
          navigation.navigate('KycSuccess', { sessionId: session.sessionId });
        } catch {
          console.error('Error launching KYC verification');
          failOnboardingAttempt(
            selfClient,
            scanStarted ? 'scan_started' : 'pre_start',
            scanStarted ? 'kyc_launch_error' : 'kyc_session_error',
          );
          showModal({
            titleText: 'Error',
            bodyText: 'Unable to start verification. Please try again.',
            buttonText: 'OK',
            onButtonPress: () => {},
          });
        }
      },
    });
  }, [countryCode, navigation, selfClient, showModal, trackEvent]);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={slate100}>
      <DocumentFlowNavBar title="GETTING STARTED" />
      <ExpandableBottomLayout.TopSection backgroundColor={slate100}>
        <YStack alignItems="center" gap={24} maxWidth={340}>
          <BodyText
            style={{
              fontSize: 20,
              fontFamily: advercase,
              textAlign: 'center',
              color: black,
            }}
          >
            Does your document have this symbol?
          </BodyText>

          <YStack
            backgroundColor={white}
            borderRadius={16}
            padding={24}
            shadowColor={black}
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={8}
            elevation={4}
          >
            <EPassportLogo width={160} height={98} />
          </YStack>

          <BodyText
            style={{
              fontSize: 16,
              fontFamily: dinot,
              textAlign: 'center',
              color: slate400,
            }}
          >
            This symbol indicates your document has a biometric chip, which is
            required for registration.
          </BodyText>
        </YStack>
      </ExpandableBottomLayout.TopSection>

      <ExpandableBottomLayout.BottomSection backgroundColor={slate100}>
        <ButtonsContainer>
          <PrimaryButton onPress={handleConfirm}>Yes</PrimaryButton>
          <SecondaryButton onPress={handleNotFound}>No</SecondaryButton>
        </ButtonsContainer>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default LogoConfirmationScreen;
