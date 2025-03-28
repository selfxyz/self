import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import LottieView from 'lottie-react-native';
import { Anchor, Text, XStack, YStack } from 'tamagui';
import { useWindowDimensions } from 'tamagui';

import onboardingAnimation from '../assets/animations/launch_onboarding.json';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { BodyText } from '../components/typography/BodyText';
import { Caption } from '../components/typography/Caption';
import { privacyUrl, termsUrl } from '../consts/links';
import useConnectionModal from '../hooks/useConnectionModal';
import useHapticNavigation from '../hooks/useHapticNavigation';
import Logo from '../images/logo.svg';
import { ExpandableBottomLayout } from '../layouts/ExpandableBottomLayout';
import { black, slate50, slate100, slate500, white } from '../utils/colors';
import { advercase, dinot } from '../utils/fonts';

interface LaunchScreenProps {}

const LaunchScreen: React.FC<LaunchScreenProps> = ({}) => {
  useConnectionModal();
  const onStartPress = useHapticNavigation('PassportOnboarding');
  const skipToHome = useHapticNavigation('Home');
  const createMock = useHapticNavigation('CreateMock');
  const { height } = useWindowDimensions();
  const twoFingerTap = Gesture.Tap()
    .minPointers(2)
    .numberOfTaps(5)
    .onStart(() => {
      createMock();
    });

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <YStack flex={1} paddingTop="$10">
          <View style={styles.cardContainer}>
            <GestureDetector gesture={twoFingerTap}>
              <LottieView
                autoPlay={true}
                loop={false}
                source={onboardingAnimation}
                style={{
                  ...styles.animation,
                  height: height * 0.4,
                }}
                cacheComposition={true}
                renderMode="HARDWARE"
              />
            </GestureDetector>
          </View>
        </YStack>
        <YStack flex={1} justifyContent="flex-end">
          <XStack
            marginBottom="$10"
            alignItems="center"
            justifyContent="center"
            gap="$4"
          >
            <Logo style={styles.logo} />
            <Text
              onPress={__DEV__ ? skipToHome : undefined}
              style={styles.selfText}
            >
              Self
            </Text>
          </XStack>
        </YStack>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        backgroundColor={white}
        justifyContent="flex-end"
      >
        <BodyText style={styles.subheader}>
          The simplest way to verify identity for safety and trust wherever you
          are.
        </BodyText>
        <Caption style={styles.notice} size={'small'}>
          By continuing, you agree to the&nbsp;
          <Anchor style={styles.link} href={termsUrl}>
            User Terms and Conditions
          </Anchor>
          &nbsp;and acknowledge the&nbsp;
          <Anchor style={styles.link} href={privacyUrl}>
            Privacy notice
          </Anchor>
          &nbsp;of Self provided by Self Inc.
        </Caption>
        <PrimaryButton onPress={onStartPress}>Get Started</PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default LaunchScreen;

const styles = StyleSheet.create({
  animation: {
    aspectRatio: 1,
  },
  subheader: {
    fontWeight: '500',
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  link: {
    // must pass into Anchor component
    fontFamily: dinot,
    color: slate500,
    fontSize: 14,
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
  notice: {
    marginTop: 26,
    marginBottom: 10,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
    backgroundColor: slate50,
    borderColor: slate100,
    borderWidth: 1,
    borderStyle: 'solid',
    color: slate500,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  cardContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 0,
    flex: 1,
  },
  selfText: {
    fontFamily: advercase,
    fontSize: 36,
    fontWeight: '500',
    color: white,
  },
  card: {
    width: '100%',
    height: '100%',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
