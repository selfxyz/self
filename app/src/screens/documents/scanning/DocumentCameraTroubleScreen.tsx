// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';
import { View, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { BodyText, Caption } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate100,
  slate300,
  slate400,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import Activity from '@/assets/icons/activity.svg';
import PassportCameraBulb from '@/assets/icons/passport_camera_bulb.svg';
import PassportCameraScan from '@/assets/icons/passport_camera_scan.svg';
import QrScan from '@/assets/icons/qr_scan.svg';
import Star from '@/assets/icons/star.svg';
import type { TipProps } from '@/components/Tips';
import Tips from '@/components/Tips';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { fetchAccessToken, launchSumsub } from '@/integrations/sumsub';
import SimpleScrolledTitleLayout from '@/layouts/SimpleScrolledTitleLayout';
import type { RootStackParamList } from '@/navigation';
import { flush as flushAnalytics } from '@/services/analytics';

const tips: TipProps[] = [
  {
    title: 'Use Good Lighting',
    body: 'Try scanning in a well-lit area to reduce glare or shadows on the ID page.',
    icon: <PassportCameraBulb width={28} height={28} />,
  },
  {
    title: 'Lay It Flat',
    body: 'Place your ID on a stable, flat surface to keep the ID page smooth and fully visible.',
    icon: <Star width={28} height={28} />,
  },
  {
    title: 'Hold Steady',
    body: 'Keep your phone as still as possible; any movement can cause blurry images.',
    icon: <Activity width={28} height={28} />,
  },
  {
    title: 'Fill the Frame',
    body: 'Make sure the entire ID page is within the camera view, with all edges visible.',
    icon: <QrScan width={28} height={28} />,
  },
  {
    title: 'Avoid Reflections',
    body: 'Slightly tilt the ID or your phone if bright lights create glare on the page.',
    icon: <PassportCameraScan width={28} height={28} />,
  },
];

const DocumentCameraTroubleScreen: React.FC = () => {
  const go = useHapticNavigation('DocumentCamera', { action: 'cancel' });
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selfClient = useSelfClient();
  const { useMRZStore } = selfClient;
  const { countryCode } = useMRZStore();
  const [isLoading, setIsLoading] = useState(false);

  // error screen, flush analytics
  useEffect(() => {
    flushAnalytics();
  }, []);

  const handleTryKyc = useCallback(async () => {
    setIsLoading(true);
    try {
      const accessToken = await fetchAccessToken();
      await launchSumsub({ accessToken: accessToken.token });
    } catch (error) {
      console.error('Error launching alternative verification:', error);
      navigation.navigate('VerificationFallback', {
        errorSource: 'sumsub_initialization',
        countryCode,
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigation, countryCode]);

  return (
    <SimpleScrolledTitleLayout
      title="Having trouble scanning your ID?"
      onDismiss={go}
      header={
        <Caption style={{ fontSize: 16, color: slate500, marginBottom: 18 }}>
          Here are a few tips that might help:
        </Caption>
      }
      footer={
        <YStack gap="$3">
          <Caption size="large" style={{ color: slate500 }}>
            Following these steps should help your phone's camera capture the ID
            page quickly and clearly!
          </Caption>

          <Caption
            size="large"
            style={{ color: slate500, marginTop: 12, marginBottom: 8 }}
          >
            Or try an alternative verification method:
          </Caption>

          <XStack
            backgroundColor={white}
            borderWidth={1}
            borderColor={slate300}
            borderRadius={'$5'}
            padding={'$3'}
            pressStyle={{
              transform: [{ scale: 0.97 }],
              backgroundColor: slate100,
            }}
            onPress={handleTryKyc}
            disabled={isLoading}
            opacity={isLoading ? 0.6 : 1}
          >
            <XStack alignItems="center" gap={'$3'} flex={1}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PassportCameraScan color={'#075985'} />
              </View>
              <YStack gap={'$1'}>
                <BodyText
                  style={{ fontSize: 24, fontFamily: dinot, color: black }}
                >
                  {isLoading ? 'Loading...' : 'Other IDs'}
                </BodyText>
                <BodyText
                  style={{ fontSize: 14, fontFamily: dinot, color: slate400 }}
                >
                  National ID, Driver's License etc.
                </BodyText>
              </YStack>
            </XStack>
          </XStack>
        </YStack>
      }
    >
      <Tips items={tips} />
    </SimpleScrolledTitleLayout>
  );
};

export default DocumentCameraTroubleScreen;
