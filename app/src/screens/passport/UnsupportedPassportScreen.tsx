import LottieView from 'lottie-react-native';
import React, { useEffect } from 'react';

import warnAnimation from '../../assets/animations/warning.json';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { Caption } from '../../components/typography/Caption';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { PassportEvents } from '../../consts/analytics';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import analytics from '../../utils/analytics';
import { black, white } from '../../utils/colors';
import { notificationError } from '../../utils/haptic';
import { styles } from '../prove/ProofRequestStatusScreen';

const { flush: flushAnalytics } = analytics();

const UnsupportedPassportScreen: React.FC = () => {
  const onPress = useHapticNavigation('Launch');
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
