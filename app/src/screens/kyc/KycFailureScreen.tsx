// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  incrementAttemptRetryCount,
  trackBranchEvent,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  AbstractButton,
  Description,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { KycEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  slate600,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import ShieldErrorIcon from '@/assets/icons/shield_error.svg';
import SupportUuidRow from '@/components/support/SupportUuidRow';
import { buttonTap } from '@/integrations/haptics';
import { KYC_PROVIDER } from '@/integrations/kyc';
import type { RootStackParamList } from '@/navigation';

type KycFailureRouteParams = {
  countryCode?: string;
  canRetry?: boolean;
};

type KycFailureRoute = RouteProp<Record<string, KycFailureRouteParams>, string>;

const KycFailureScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<KycFailureRoute>();
  const insets = useSafeAreaInsets();
  const selfClient = useSelfClient();

  const canRetry = route.params?.canRetry ?? true;

  const handleDismiss = useCallback(() => {
    buttonTap();
    navigation.navigate('Home', {});
  }, [navigation]);

  const handleTryAgain = useCallback(() => {
    buttonTap();
    const attemptCount = incrementAttemptRetryCount('kyc');
    trackBranchEvent(selfClient, KycEvents.RETRY_TRIGGERED, {
      provider: KYC_PROVIDER,
      attempt_count: attemptCount,
    });
    navigation.navigate('CountryPicker');
  }, [navigation, selfClient]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <YStack
        flex={1}
        justifyContent="flex-end"
        alignItems="center"
        paddingBottom={60}
      >
        <ShieldErrorIcon width={150} height={150} />
      </YStack>
      <YStack
        paddingHorizontal={32}
        alignItems="center"
        gap={16}
        marginBottom={64}
      >
        <Title style={styles.title}>
          Unfortunately we couldn't verify your ID
        </Title>
        <Description style={styles.description}>
          This may be because the files you uploaded were unreadable for some
          other issue.
        </Description>
      </YStack>
      <YStack gap={12} paddingHorizontal={24} paddingBottom={32}>
        <SupportUuidRow />
        <AbstractButton
          bgColor="transparent"
          color={white}
          borderColor={slate600}
          borderWidth={1}
          style={styles.button}
          onPress={handleDismiss}
        >
          Dismiss
        </AbstractButton>
        {canRetry && (
          <AbstractButton
            bgColor={white}
            color={black}
            style={styles.button}
            onPress={handleTryAgain}
          >
            Try again
          </AbstractButton>
        )}
      </YStack>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: black,
  },
  title: {
    color: white,
    textAlign: 'center',
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 1,
  },
  description: {
    color: white,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 30,
  },
  button: {
    borderRadius: 100,
  },
});

export default KycFailureScreen;
