import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { useIsFocused, useNavigation } from '@react-navigation/native';
import { View, XStack, YStack } from 'tamagui';

import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import {
  QRCodeScannerView,
  QRCodeScannerViewProps,
} from '../../components/native/QRCodeScanner';
import Additional from '../../components/typography/Additional';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import QRScan from '../../images/icons/qr_code.svg';
import QRUpload from '../../images/icons/qr_upload.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import useUserStore from '../../stores/userStore';
import { slate800 } from '../../utils/colors';
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

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        {!doneScanningQR && (
          <QRCodeScannerView onQRData={onQRData} isMounted={isFocused} />
        )}
        {null}
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
        <YStack alignItems="center" gap="$2.5" paddingBottom={20}>
          <YStack alignItems="center" gap="$6" pb="$2.5">
            <Title>Verify your Self ID</Title>
            <XStack gap="$6" alignSelf="flex-start" alignItems="flex-start">
              <View pt="$2">
                <QRScan height={40} width={40} color={slate800} />
              </View>
              <View maxWidth="75%">
                <Description style={styles.subheader}>
                  Scan a partner's QR code
                </Description>
                <Additional style={styles.description}>
                  Look for a QR code from a Self ID partner and position it in
                  the camera frame above.
                </Additional>
              </View>
            </XStack>
            <XStack gap="$6" alignSelf="flex-start" alignItems="flex-start">
              <View pt="$2">
                <QRUpload height={40} width={40} color={slate800} />
              </View>
              <View
                alignItems="flex-start"
                justifyContent="flex-start"
                maxWidth="75%"
              >
                <Description style={styles.subheader}>
                  Upload from photo roll
                </Description>
                <Additional style={styles.description}>
                  You can also upload an image of a Self ID QR code from your
                  camera roll instead.
                </Additional>
              </View>
            </XStack>
          </YStack>

          <SecondaryButton onPress={() => navigation.navigate('Home')}>
            Cancel
          </SecondaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default QRCodeViewFinderScreen;

const styles = StyleSheet.create({
  subheader: {
    color: slate800,
    textAlign: 'left',
    textAlignVertical: 'top',
  },
  description: {
    textAlign: 'left',
  },
});
