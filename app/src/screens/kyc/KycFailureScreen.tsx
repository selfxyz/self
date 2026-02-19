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
  AbstractButton,
  Description,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate600,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import ShieldErrorIcon from '@/assets/icons/shield_error.svg';
import { useResponsiveScale } from '@/hooks/useResponsiveScale';
import { buttonTap } from '@/integrations/haptics';
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
  const s = useResponsiveScale();
  const localStyles = React.useMemo(() => createStyles(s), [s]);

  const canRetry = route.params?.canRetry ?? true;

  const handleDismiss = useCallback(() => {
    buttonTap();
    navigation.navigate('Home', {});
  }, [navigation]);

  const handleTryAgain = useCallback(() => {
    buttonTap();
    navigation.navigate('CountryPicker');
  }, [navigation]);

  return (
    <View style={[localStyles.container, { paddingBottom: insets.bottom }]}>
      <YStack
        flex={1}
        justifyContent="flex-end"
        alignItems="center"
        paddingBottom={s(60)}
      >
        <ShieldErrorIcon width={s(150)} height={s(150)} />
      </YStack>
      <YStack
        paddingHorizontal={s(32)}
        alignItems="center"
        gap={s(16)}
        marginBottom={s(64)}
      >
        <Title style={localStyles.title}>
          Unfortunately we couldn't verify your ID
        </Title>
        <Description style={localStyles.description}>
          This may be because the files you uploaded were unreadable for some
          other issue.
        </Description>
      </YStack>
      <YStack gap={s(12)} paddingHorizontal={s(24)} paddingBottom={s(32)}>
        <AbstractButton
          bgColor="transparent"
          color={white}
          borderColor={slate600}
          borderWidth={1}
          style={localStyles.button}
          onPress={handleDismiss}
        >
          Dismiss
        </AbstractButton>
        {canRetry && (
          <AbstractButton
            bgColor={white}
            color={black}
            style={localStyles.button}
            onPress={handleTryAgain}
          >
            Try again
          </AbstractButton>
        )}
      </YStack>
    </View>
  );
};

const createStyles = (s: (value: number) => number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: black,
    },
    title: {
      color: white,
      textAlign: 'center',
      fontSize: s(36),
      lineHeight: s(44),
      letterSpacing: s(1),
    },
    description: {
      color: white,
      textAlign: 'center',
      fontSize: s(20),
      lineHeight: s(30),
    },
    button: {
      borderRadius: s(100),
    },
  });

export default KycFailureScreen;
