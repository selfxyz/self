// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { v5 as uuidv5 } from 'uuid';
import type { StaticScreenProps } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DelayedLottieView, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import loadingAnimation from '@selfxyz/mobile-sdk-alpha/animations/loading/misc.json';
import {
  AbstractButton,
  Description,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { useResponsiveScale } from '@/hooks/useResponsiveScale';
import { useSumsubWebSocket } from '@/hooks/useSumsubWebSocket';
import { buttonTap } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';
import {
  getFCMToken,
  registerDeviceToken,
  requestNotificationPermission,
  SELF_UUID_NAMESPACE,
} from '@/services/notifications/notificationService';
import { useSettingStore } from '@/stores/settingStore';

type KycSuccessRouteParams = StaticScreenProps<
  | {
      userId?: string;
    }
  | undefined
>;

const KycSuccessScreen: React.FC<KycSuccessRouteParams> = ({
  route: { params },
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userId = params?.userId;
  const insets = useSafeAreaInsets();
  const setFcmToken = useSettingStore(state => state.setFcmToken);
  const selfClient = useSelfClient();
  const { trackEvent } = selfClient;
  const s = useResponsiveScale();
  const localStyles = React.useMemo(() => createStyles(s), [s]);

  const hasSubscribedRef = useRef<boolean>(false);

  const handleWebSocketSuccess = useCallback(() => {
    console.log(
      '[KycSuccessScreen] Verification complete, registration flow triggered',
    );
  }, []);

  const handleWebSocketError = useCallback((error: string) => {
    console.error('[KycSuccessScreen] WebSocket error:', error);
  }, []);

  const handleVerificationFailed = useCallback((reason: string) => {
    console.log('[KycSuccessScreen] Verification failed:', reason);
  }, []);

  const { subscribe, unsubscribeAll } = useSumsubWebSocket({
    onSuccess: handleWebSocketSuccess,
    onError: handleWebSocketError,
    onVerificationFailed: handleVerificationFailed,
  });

  useEffect(() => {
    if (userId && !hasSubscribedRef.current) {
      hasSubscribedRef.current = true;
      console.log('[KycSuccessScreen] Subscribing to userId:', userId);
      subscribe(userId);
    }

    return () => {
      hasSubscribedRef.current = false;
      unsubscribeAll();
    };
  }, [userId, subscribe, unsubscribeAll]);

  const handleReceiveUpdates = useCallback(async () => {
    buttonTap();

    if ((await requestNotificationPermission()) && userId) {
      const token = await getFCMToken();
      if (token) {
        setFcmToken(token);
        trackEvent(ProofEvents.FCM_TOKEN_STORED);

        const sessionId = uuidv5(userId, SELF_UUID_NAMESPACE);
        await registerDeviceToken(sessionId, token);
      }
    }

    // Navigate to Home regardless of permission result
    navigation.navigate('Home', {});
  }, [navigation, setFcmToken, trackEvent, userId]);

  const handleCheckLater = () => {
    buttonTap();
    navigation.navigate('Home', {});
  };

  return (
    <View style={[localStyles.container, { paddingBottom: insets.bottom }]}>
      <View style={localStyles.centerSection}>
        <View style={localStyles.animationContainer}>
          <DelayedLottieView
            autoPlay
            loop={true}
            source={loadingAnimation}
            style={localStyles.animation}
            cacheComposition={true}
            renderMode="HARDWARE"
          />
        </View>
        <YStack
          paddingHorizontal={s(24)}
          justifyContent="center"
          alignItems="center"
          gap={s(12)}
        >
          <Title style={localStyles.title}>Your ID is being verified</Title>
          <Description style={localStyles.description}>
            Turn on push notifications to receive an update on your
            verification. It's also safe the close the app and come back later.
          </Description>
        </YStack>
      </View>
      <YStack gap={s(12)} paddingHorizontal={s(20)} paddingBottom={s(24)}>
        <AbstractButton
          bgColor={white}
          color={black}
          onPress={handleReceiveUpdates}
        >
          Receive live updates
        </AbstractButton>
        <AbstractButton
          bgColor="transparent"
          color={white}
          borderColor="rgba(255, 255, 255, 0.3)"
          borderWidth={1}
          onPress={handleCheckLater}
        >
          I will check back later
        </AbstractButton>
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
    centerSection: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    animationContainer: {
      width: s(80),
      height: s(80),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: s(32),
    },
    animation: {
      width: s(160),
      height: s(160),
    },
    title: {
      color: white,
      textAlign: 'center',
      fontSize: s(28),
      letterSpacing: s(1),
    },
    description: {
      color: white,
      textAlign: 'center',
      fontSize: s(18),
    },
  });

export default KycSuccessScreen;
