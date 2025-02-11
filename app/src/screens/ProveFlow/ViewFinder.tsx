import React, { useCallback, useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';

import { useIsFocused, useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { View, XStack, YStack } from 'tamagui';

import qrScanAnimation from '../../assets/animations/qr_scan.json';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import {
  QRCodeScannerView,
  QRCodeScannerViewProps,
} from '../../components/native/QRCodeScanner';
import Additional from '../../components/typography/Additional';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import QRScan from '../../images/icons/qr_code.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import useUserStore from '../../stores/userStore';
import { black, slate800 } from '../../utils/colors';
import handleQRCodeScan from '../../utils/qrCodeNew';

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
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const store = useUserStore();
  const [doneScanningQR, setDoneScanningQR] = useState(false);
  const onQRData = useCallback<QRCodeScannerViewProps['onQRData']>(
    async (error, uri) => {
      if (doneScanningQR) {
        // return
      }
      if (error) {
        // TODO: handle error better
        console.error(error);
      } else {
        setDoneScanningQR(true);
        const encodedData = parseUrlParams(uri!);
        await handleQRCodeScan(encodedData.get('data')!);
        navigation.navigate('ProveScreen');
      }
    },
    [store, navigation, doneScanningQR],
  );
  const onCancelPress = useHapticNavigation('Home', 'cancel');

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={black} />
      <ExpandableBottomLayout.Layout>
        <ExpandableBottomLayout.TopSection roundTop>
          {!doneScanningQR && (
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
        <ExpandableBottomLayout.BottomSection>
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
