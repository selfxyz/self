// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import LottieView from 'lottie-react-native';
import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { View, XStack, YStack } from 'tamagui';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { useSelfAppStore } from '@selfxyz/mobile-sdk-alpha/stores';

import qrScanAnimation from '@/assets/animations/qr_scan.json';
import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import type { QRCodeScannerViewProps } from '@/components/native/QRCodeScanner';
import { QRCodeScannerView } from '@/components/native/QRCodeScanner';
import Additional from '@/components/typography/Additional';
import Description from '@/components/typography/Description';
import { Title } from '@/components/typography/Title';
import useConnectionModal from '@/hooks/useConnectionModal';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import QRScan from '@/images/icons/qr_code.svg';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { black, slate800, white } from '@/utils/colors';
import { parseAndValidateUrlParams } from '@/utils/deeplinks';

const QRCodeViewFinderScreen: React.FC = () => {
  const { trackEvent } = useSelfClient();
  const { visible: connectionModalVisible } = useConnectionModal();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [doneScanningQR, setDoneScanningQR] = useState(false);
  const navigateToProve = useHapticNavigation('Prove');
  const navigateToHome = useHapticNavigation('Home');
  const onCancelPress = useCallback(() => {
    navigateToHome();
  }, [navigateToHome]);

  // This resets to the default state when we navigate back to this screen
  useFocusEffect(
    useCallback(() => {
      setDoneScanningQR(false);
    }, []),
  );

  const onQRData = useCallback<QRCodeScannerViewProps['onQRData']>(
    async (error, uri) => {
      if (doneScanningQR) {
        return;
      }
      if (error) {
        trackEvent(ProofEvents.QR_SCAN_FAILED, {
          reason: 'scan_error',
          error: error.message || error.toString(),
        });
        console.error(error);
        navigation.navigate('QRCodeTrouble');
      } else {
        setDoneScanningQR(true);
        const validatedParams = parseAndValidateUrlParams(uri!);
        const { sessionId, selfApp } = validatedParams;
        if (selfApp) {
          try {
            trackEvent(ProofEvents.QR_SCAN_SUCCESS, {
              scan_type: 'selfApp',
            });
            const selfAppJson = JSON.parse(selfApp);
            useSelfAppStore.getState().setSelfApp(selfAppJson);
            useSelfAppStore.getState().startAppListener(selfAppJson.sessionId);
            setTimeout(() => {
              navigateToProve();
            }, 100);
          } catch (parseError) {
            trackEvent(ProofEvents.QR_SCAN_FAILED, {
              reason: 'invalid_selfApp_json',
              error:
                parseError instanceof Error
                  ? parseError.message
                  : 'JSON parse error',
            });
            console.error('Error parsing selfApp JSON:', parseError);
            setDoneScanningQR(false); // Reset to allow another scan attempt
            navigation.navigate('QRCodeTrouble');
            return;
          }
        } else if (sessionId) {
          trackEvent(ProofEvents.QR_SCAN_SUCCESS, {
            scan_type: 'sessionId',
          });
          useSelfAppStore.getState().cleanSelfApp();
          useSelfAppStore.getState().startAppListener(sessionId);
          setTimeout(() => {
            navigateToProve();
          }, 100);
        } else {
          trackEvent(ProofEvents.QR_SCAN_FAILED, {
            reason: 'missing_fields',
            details: 'No sessionId or selfApp',
          });
          console.error('No sessionId or selfApp found in QR code');
          setDoneScanningQR(false); // Reset to allow another scan attempt
          navigation.navigate('QRCodeTrouble');
          return;
        }
      }
    },
    [doneScanningQR, navigation, navigateToProve, trackEvent],
  );

  const shouldRenderCamera = !connectionModalVisible && !doneScanningQR;

  return (
    <>
      <ExpandableBottomLayout.Layout backgroundColor={white}>
        <ExpandableBottomLayout.TopSection roundTop backgroundColor={black}>
          {shouldRenderCamera && (
            <>
              <QRCodeScannerView onQRData={onQRData} isMounted={isFocused} />
              <LottieView
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

            <SecondaryButton
              trackEvent={ProofEvents.QR_SCAN_CANCELLED}
              onPress={onCancelPress}
            >
              Cancel
            </SecondaryButton>
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
