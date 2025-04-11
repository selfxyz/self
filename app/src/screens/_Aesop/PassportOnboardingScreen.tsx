import React, { useEffect, useRef } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

import LottieView from 'lottie-react-native';

import passportOnboardingAnimation from '../../assets/animations/passport_onboarding.json';
import ButtonsContainer from '../../components/ButtonsContainer';
import TextsContainer from '../../components/TextsContainer';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import Additional from '../../components/typography/Additional';
import Description from '../../components/typography/Description';
import { DescriptionTitle } from '../../components/typography/DescriptionTitle';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import Scan from '../../images/icons/passport_camera_scan.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { black, slate100, white } from '../../utils/colors';

interface PassportOnboardingScreenProps {}

const PassportOnboardingScreen: React.FC<
  PassportOnboardingScreenProps
> = ({}) => {
  const handleCameraPress = useHapticNavigation('PassportCamera');
  const onCancelPress = useHapticNavigation('Launch', { action: 'cancel' });
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <StatusBar barStyle="light-content" backgroundColor={white} />
      <ExpandableBottomLayout.TopSection backgroundColor={white}>
        <LottieView
          ref={animationRef}
          autoPlay={false}
          loop={false}
          onAnimationFinish={() => {
            setTimeout(() => {
              animationRef.current?.play();
            }, 5000); // Pause 5 seconds before playing again
          }}
          source={passportOnboardingAnimation}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        style={styles.bottomSection}
        backgroundColor={white}
      >
        <TextsContainer style={styles.textContainer}>
          <View style={styles.textIconWrapper}>
            <Scan
              style={styles.scanIcon}
              height={40}
              width={40}
              color={black}
            />
            <View>
              <DescriptionTitle>Open to the photograph page</DescriptionTitle>
              <Description textBreakStrategy="balanced">
                Lay the Passport flat and position the machine readable text in
                the viewfinder.
              </Description>
            </View>
          </View>
        </TextsContainer>
        <TextsContainer>
          <Additional textBreakStrategy="balanced">
            Self will not capture an image of your passport.
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
  textIconWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scanIcon: {
    marginRight: 10,
  },
  textContainer: {
    marginBottom: 10,
  },
  bottomSection: {
    paddingBottom: 32,
  },
});
