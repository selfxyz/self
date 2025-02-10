import React from 'react';
import { StyleSheet } from 'react-native';

import LottieView from 'lottie-react-native';

import ButtonsContainer from '../../components/ButtonsContainer';
import TextsContainer from '../../components/TextsContainer';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import Additional from '../../components/typography/Additional';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { slate100 } from '../../utils/colors';

interface PassportOnboardingScreenProps {}

const PassportOnboardingScreen: React.FC<
  PassportOnboardingScreenProps
> = ({}) => {
  const handleCameraPress = useHapticNavigation('PassportCamera');
  const onCancelPress = useHapticNavigation('Launch', 'cancel');

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <LottieView
          autoPlay
          loop={false}
          source={require('../../assets/animations/passport_onboarding.json')}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
        <TextsContainer>
          <Title>Scan your passport</Title>
          {/* TODO: consider moving textBreakStrategy to the component itself if we use it more often */}
          <Description textBreakStrategy="balanced">
            Open your passport to the first page to scan it.
          </Description>
          <Additional textBreakStrategy="balanced">
            Self ID will not capture an image of your passport. Our system is
            only reading the fields.
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
