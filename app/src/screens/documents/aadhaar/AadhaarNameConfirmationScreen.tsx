// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BodyText, PrimaryButton } from '@selfxyz/mobile-sdk-alpha/components';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import { useAadhaarNameOptions } from '@/hooks/useAadhaarNameOptions';
import type { RootStackParamList } from '@/navigation';
import { extraYPadding } from '@/utils/styleUtils';

import { aadhaarNameStyles } from './aadhaarNameStyles';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { AadhaarEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

const AadhaarNameConfirmationScreen: React.FC = () => {
  const paddingBottom = useSafeBottomPadding(extraYPadding + 35);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selfClient = useSelfClient();
  const { trackEvent } = selfClient;
  const onContinueButtonPress = useCallback(() => {
    trackEvent(AadhaarEvents.CONTINUE_TO_REGISTRATION_PRESSED);
    navigation.navigate('AadhaarUploadSuccess');
  }, [navigation, trackEvent]);

  const {
    loading: isLoading,
    nameParts: nameOptions,
    firstNameIndex,
    lastNameIndex,
  } = useAadhaarNameOptions(navigation);

  if (isLoading) {
    return (
      <YStack style={styles.loadingContainer}>
        <BodyText style={styles.loadingText}>Loading Aadhaar data...</BodyText>
      </YStack>
    );
  }

  return (
    <YStack style={styles.container}>
      <BodyText style={styles.title}>Is this correct?</BodyText>
      <BodyText style={styles.subtitle}>
        Double check to make sure that your first and last name are
        appropriately selected. You won't be able to update this after your ID
        is registered.
      </BodyText>

      <YStack style={styles.sectionWrapper}>
        <BodyText style={styles.sectionLabel}>My first name is:</BodyText>
        <YStack gap={0} style={styles.optionsList}>
          <BodyText style={styles.nameLabel}>
            {nameOptions[firstNameIndex]}
          </BodyText>
        </YStack>
      </YStack>

      <YStack style={styles.sectionWrapper}>
        <BodyText style={styles.sectionLabel}>My last name is:</BodyText>
        <YStack gap={0} style={styles.optionsList}>
          <BodyText style={styles.nameLabel}>
            {nameOptions[lastNameIndex]}
          </BodyText>
        </YStack>
      </YStack>

      <YStack style={[styles.bottomBar, { paddingBottom }]}>
        <PrimaryButton onPress={onContinueButtonPress}>Continue</PrimaryButton>
      </YStack>
    </YStack>
  );
};

export default AadhaarNameConfirmationScreen;

const styles = aadhaarNameStyles;
