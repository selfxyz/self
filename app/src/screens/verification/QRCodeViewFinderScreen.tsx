// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, XStack, YStack } from 'tamagui';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DelayedLottieView, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  Additional,
  Description,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate800,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import qrScanAnimation from '@/assets/animations/qr_scan.json';
import QRScan from '@/assets/icons/qr_code.svg';
import type { QRCodeScannerViewProps } from '@/components/native/QRCodeScanner';
import { QRCodeScannerView } from '@/components/native/QRCodeScanner';
import { NavBar } from '@/components/navbar/BaseNavBar';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { buttonTap } from '@/integrations/haptics';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import { parseAndValidateUrlParams } from '@/navigation/deeplinks';
import { useVerificationGateStore } from '@/stores/verificationGateStore';
import {
  evaluateGoogleUsatGate,
  isGoogleUsatForceEnabledForTesting,
} from '@/utils/googleUsatGate';

const QRCodeViewFinderScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [doneScanningQR, setDoneScanningQR] = useState(false);
  const { top: safeAreaTop } = useSafeAreaInsets();
  const navigateToDocumentSelector = useHapticNavigation(
    'ProvingScreenRouter',
    {
      params: { entryPoint: 'qr_scan' },
    },
  );

  // This resets to the default state when we navigate back to this screen
  useFocusEffect(
    useCallback(() => {
      setDoneScanningQR(false);
    }, []),
  );

  const handleGoBack = useCallback(() => {
    buttonTap();
    navigation.goBack();
  }, [navigation]);

  const onQRData = useCallback<QRCodeScannerViewProps['onQRData']>(
    async (error, uri) => {
      if (doneScanningQR) {
        return;
      }
      if (error) {
        console.error(error);
        navigation.navigate('QRCodeTrouble');
      } else {
        setDoneScanningQR(true);
        const validatedParams = parseAndValidateUrlParams(uri!);
        const { sessionId, selfApp } = validatedParams;
        if (selfApp) {
          try {
            const selfAppJson = JSON.parse(selfApp);
            const gate = await evaluateGoogleUsatGate(selfClient, selfAppJson);
            if (gate === 'block') {
              trackEvent(ProofEvents.GOOGLE_USAT_BLOCKED, {
                entry_point: 'qr_scan',
                reason: 'no_high_security_doc',
              });
              useVerificationGateStore.getState().open({
                reason: 'google_usat_high_security_required',
                entryPoint: 'qr_scan',
                requesterName: selfAppJson.appName,
              });
              setDoneScanningQR(false);
              return;
            }

            selfClient.getSelfAppState().setSelfApp(selfAppJson);
            selfClient
              .getSelfAppState()
              .startAppListener(selfAppJson.sessionId);

            setTimeout(() => {
              navigateToDocumentSelector();
            }, 100);
          } catch (parseError) {
            console.error('Error parsing selfApp JSON:', parseError);
            setDoneScanningQR(false); // Reset to allow another scan attempt
            navigation.navigate('QRCodeTrouble');
            return;
          }
        } else if (sessionId) {
          if (isGoogleUsatForceEnabledForTesting()) {
            trackEvent(ProofEvents.GOOGLE_USAT_BLOCKED, {
              entry_point: 'qr_scan',
              reason: 'no_high_security_doc',
            });
            useVerificationGateStore.getState().open({
              reason: 'google_usat_high_security_required',
              entryPoint: 'qr_scan',
              requesterName: 'Google USAT Faucet',
            });
            setDoneScanningQR(false);
            return;
          }

          selfClient.getSelfAppState().cleanSelfApp();
          selfClient.getSelfAppState().startAppListener(sessionId);

          setTimeout(() => {
            navigateToDocumentSelector();
          }, 100);
        } else {
          console.error('No sessionId or selfApp found in QR code');
          setDoneScanningQR(false); // Reset to allow another scan attempt
          navigation.navigate('QRCodeTrouble');
          return;
        }
      }
    },
    [doneScanningQR, navigation, navigateToDocumentSelector, selfClient],
  );

  const shouldRenderCamera = !doneScanningQR;

  return (
    <>
      <ExpandableBottomLayout.Layout backgroundColor={white}>
        <ExpandableBottomLayout.TopSection roundTop backgroundColor={black}>
          <NavBar.Container
            paddingTop={safeAreaTop}
            paddingHorizontal="$4"
            paddingBottom="$2"
            position="absolute"
            top={0}
            left={0}
            right={0}
            backgroundColor="transparent"
            zIndex={1}
          >
            <NavBar.LeftAction
              component="back"
              color={white}
              onPress={handleGoBack}
            />
          </NavBar.Container>
          {shouldRenderCamera && (
            <>
              <QRCodeScannerView onQRData={onQRData} isMounted={isFocused} />
              <DelayedLottieView
                autoPlay
                loop
                source={qrScanAnimation}
                style={styles.animation}
                cacheComposition={true}
                renderMode="HARDWARE"
              />
            </>
          )}
          {null}
        </ExpandableBottomLayout.TopSection>
        <ExpandableBottomLayout.BottomSection backgroundColor={white}>
          <YStack alignItems="center" gap="$2.5" paddingBottom={20}>
            <YStack alignItems="center" gap="$6" paddingBottom="$2.5">
              <Title>Verify your ID</Title>
              <XStack gap="$6" alignSelf="flex-start" alignItems="flex-start">
                <View paddingTop="$2">
                  <QRScan height={40} width={40} color={slate800} />
                </View>
                <View maxWidth="75%">
                  <Description style={styles.subheader}>
                    Scan a partner's QR code
                  </Description>
                  <Additional style={styles.description}>
                    Look for a QR code from a Self partner and position it in
                    the camera frame above.
                  </Additional>
                </View>
              </XStack>
            </YStack>
          </YStack>
        </ExpandableBottomLayout.BottomSection>
      </ExpandableBottomLayout.Layout>
    </>
  );
};

export default QRCodeViewFinderScreen;

const styles = StyleSheet.create({
  animation: {
    position: 'absolute',
    width: '115%',
    height: '115%',
  },
  subheader: {
    color: slate800,
    textAlign: 'left',
    textAlignVertical: 'top',
  },
  description: {
    textAlign: 'left',
  },
});
