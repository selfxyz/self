// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import passportScanAnimation from 'src/animations/passport_scan.json';
import { Additional, Description, SecondaryButton, Title, View, XStack, YStack } from 'src/components';
import { DelayedLottieView } from 'src/components/DelayedLottieView';
import { MRZScannerView } from 'src/components/MRZScannerView';
import { PassportEvents } from 'src/constants/analytics';
import { black, slate400, slate800, white } from 'src/constants/colors';
import { useSelfClient } from 'src/context';
import { mrzReadInstructions, useReadMRZ } from 'src/flows/onboarding/read-mrz';
import { ExpandableBottomLayout } from 'src/layouts/ExpandableBottomLayout';
import { SdkEvents } from 'src/types/events';
import type { MRZInfo } from 'src/types/public';
import { dinot } from 'src/utils/fonts';

import Scan from '../../svgs/passport_camera_scan.svg';

type Props = {
  onBack: () => void;
  onSuccess: () => void;
};

export const DocumentCameraScreen = ({ onBack }: Props) => {
  const scanStartTimeRef = useRef(Date.now());
  const selfClient = useSelfClient();
  const { onPassportRead } = useReadMRZ(scanStartTimeRef);

  const handleMRZDetected = useCallback(
    (mrzData: MRZInfo) => {
      onPassportRead(null, mrzData);
    },
    [onPassportRead],
  );

  const handleScannerError = useCallback(
    (error: string) => {
      selfClient.emit(SdkEvents.ERROR, new Error(`MRZ scanner error: ${error}`));
    },
    [selfClient],
  );

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <MRZScannerView onMRZDetected={handleMRZDetected} onError={handleScannerError} />
        <DelayedLottieView
          autoPlay
          loop
          source={passportScanAnimation}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        <YStack alignItems="center" gap="$2.5">
          <YStack alignItems="center" gap="$6" paddingBottom="$2.5">
            <Title>Scan your ID</Title>
            <XStack gap="$6" alignSelf="flex-start" alignItems="flex-start">
              <View paddingTop="$2">
                <Scan height={40} width={40} color={slate800} />
              </View>
              <View maxWidth="75%">
                <Description style={styles.subheader}>Open to the photograph page</Description>
                <Additional style={styles.description}>{mrzReadInstructions()}</Additional>
              </View>
            </XStack>
          </YStack>

          <Additional style={styles.disclaimer}>SELF WILL NOT CAPTURE AN IMAGE OF YOUR PASSPORT.</Additional>

          <SecondaryButton trackEvent={PassportEvents.CAMERA_SCREEN_CLOSED} onPress={onBack}>
            Cancel
          </SecondaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

const styles = StyleSheet.create({
  animation: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  subheader: {
    color: slate800,
    textAlign: 'left',
    textAlignVertical: 'top',
  },
  description: {
    textAlign: 'left',
  },
  disclaimer: {
    fontFamily: dinot,
    textAlign: 'center',
    fontSize: 11,
    color: slate400,
    textTransform: 'uppercase',
    width: '100%',
    alignSelf: 'center',
    letterSpacing: 0.44,
    marginTop: 0,
    marginBottom: 10,
  },
});
