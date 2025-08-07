// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import LottieView from 'lottie-react-native';
import React, { useEffect } from 'react';

import warnAnimation from '@src/assets/animations/warning.json';
import { PrimaryButton } from '@src/components/buttons/PrimaryButton';
import { Caption } from '@src/components/typography/Caption';
import Description from '@src/components/typography/Description';
import { Title } from '@src/components/typography/Title';
import { PassportEvents } from '@src/consts/analytics';
import useHapticNavigation from '@src/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@src/layouts/ExpandableBottomLayout';
import { styles } from '@src/screens/prove/ProofRequestStatusScreen';
import analytics from '@src/utils/analytics';
import { black, white } from '@src/utils/colors';
import { notificationError } from '@src/utils/haptic';
import { hasAnyValidRegisteredDocument } from '@src/utils/proving/validateDocument';

const { flush: flushAnalytics } = analytics();

const UnsupportedPassportScreen: React.FC = () => {
  const navigateToLaunch = useHapticNavigation('Launch');
  const navigateToHome = useHapticNavigation('Home');

  const onPress = async () => {
    const hasValidDocument = await hasAnyValidRegisteredDocument();
    if (hasValidDocument) {
      navigateToHome();
    } else {
      navigateToLaunch();
    }
  };
  useEffect(() => {
    notificationError();
    // error screen, flush analytics
    flushAnalytics();
  }, []);

  return (
    <>
      <ExpandableBottomLayout.Layout backgroundColor={black}>
        <ExpandableBottomLayout.TopSection backgroundColor={black}>
          <LottieView
            autoPlay
            loop={false}
            source={warnAnimation}
            style={styles.animation}
            cacheComposition={true}
            renderMode="HARDWARE"
          />
        </ExpandableBottomLayout.TopSection>
        <ExpandableBottomLayout.BottomSection gap={20} backgroundColor={white}>
          <Title textAlign="center">There was a problem</Title>
          <Description textAlign="center" style={{ color: black }}>
            It looks like your passport is not currently supported by Self.
          </Description>
          <Caption size="small" textAlign="center" textBreakStrategy="balanced">
            Don't panic, we're working hard to extend support to more regions.
          </Caption>
          <PrimaryButton
            trackEvent={PassportEvents.DISMISS_UNSUPPORTED_PASSPORT}
            onPress={onPress}
          >
            Dismiss
          </PrimaryButton>
        </ExpandableBottomLayout.BottomSection>
      </ExpandableBottomLayout.Layout>
    </>
  );
};

export default UnsupportedPassportScreen;
