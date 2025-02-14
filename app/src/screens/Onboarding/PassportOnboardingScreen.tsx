import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';

import LottieView from 'lottie-react-native';

import passportOnboardingAnimation from '../../assets/animations/passport_onboarding.json';
import ButtonsContainer from '../../components/ButtonsContainer';
import TextsContainer from '../../components/TextsContainer';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import Additional from '../../components/typography/Additional';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { black, slate100, white } from '../../utils/colors';

interface PassportOnboardingScreenProps {}

const PassportOnboardingScreen: React.FC<
  PassportOnboardingScreenProps
> = ({}) => {
  const handleCameraPress = useHapticNavigation('PassportCamera');
  const onCancelPress = useHapticNavigation('Launch', { action: 'cancel' });

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <StatusBar barStyle="light-content" backgroundColor={black} />
      <ExpandableBottomLayout.TopSection roundTop backgroundColor={black}>
        <LottieView
          autoPlay
          loop={false}
          source={passportOnboardingAnimation}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        <TextsContainer>
          <Title>Scan your passport</Title>
          {/* TODO: consider moving textBreakStrategy to the component itself if we use it more often */}
          <Description textBreakStrategy="balanced">
            Open your passport to the first page to scan it.
          </Description>
          <Additional textBreakStrategy="balanced">
            Self will not capture an image of your passport. Our system is only
            reading the fields.
          </Additional>
        </TextsContainer>
        <ButtonsContainer>
          <PrimaryButton onPress={handleCameraPress}>Open Camera</PrimaryButton>
          <SecondaryButton onPress={onCancelPress}>Cancel</SecondaryButton>
        </ButtonsContainer>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default PassportOnboardingScreen;

const styles = StyleSheet.create({
  animation: {
    backgroundColor: slate100,
    width: '115%',
    height: '115%',
  },
});
