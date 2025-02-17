import qrScanAnimation from '../../assets/animations/qr_scan.json';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import {
  QRCodeScannerView,
  QRCodeScannerViewProps,
} from '../../components/native/QRCodeScanner';
import Additional from '../../components/typography/Additional';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useConnectionModal from '../../hooks/useConnectionModal';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import QRScan from '../../images/icons/qr_code.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { useApp } from '../../stores/appProvider';
import { useProofInfo } from '../../stores/proofProvider';
import { black, slate800, white } from '../../utils/colors';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { View, XStack, YStack } from 'tamagui';

interface QRCodeViewFinderScreenProps {}

// TODO: replace this with proper tested lib
// or react-native-url-polyfill -> new URL(uri)
const parseUrlParams = (url: string): Map<string, string> => {
  const [, queryString] = url.split('?');
  const params = new Map<string, string>();
  if (queryString) {
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      params.set(key, decodeURIComponent(value));
    });
  }
  return params;
};

const QRCodeViewFinderScreen: React.FC<QRCodeViewFinderScreenProps> = ({}) => {
  const { visible: connectionModalVisible } = useConnectionModal();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { setSelectedApp, cleanSelfApp } = useProofInfo();
  const [doneScanningQR, setDoneScanningQR] = useState(false);
  const { startAppListener } = useApp();

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
        console.error(error);
      } else {
        setDoneScanningQR(true);
        const encodedData = parseUrlParams(uri!);
        const sessionId = encodedData.get('sessionId');
        if (!sessionId) {
          console.error('No sessionId found in QR code');
          return;
        }

        // Clean up first
        cleanSelfApp();

        // Start the app listener and wait a moment for the connection
        startAppListener(sessionId, setSelectedApp);

        // Small delay to ensure the websocket connection is established
        setTimeout(() => {
          navigation.navigate('ProveScreen');
        }, 100);
      }
    },
    [
      doneScanningQR,
      navigation,
      startAppListener,
      cleanSelfApp,
      setSelectedApp,
    ],
  );
  const onCancelPress = useHapticNavigation('Home', { action: 'cancel' });

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
            <YStack alignItems="center" gap="$6" pb="$2.5">
              <Title>Verify your ID</Title>
              <XStack gap="$6" alignSelf="flex-start" alignItems="flex-start">
                <View pt="$2">
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

            <SecondaryButton onPress={onCancelPress}>Cancel</SecondaryButton>
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
