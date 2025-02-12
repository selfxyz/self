import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Anchor, Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { privacyUrl, termsUrl } from '../consts/links';
import { BodyText } from '../components/typography/BodyText';
import { Caption } from '../components/typography/Caption';
import useHapticNavigation from '../hooks/useHapticNavigation';
import GetStartedCard from '../images/card-style-2.svg';
import Logo from '../images/logo.svg';
import { ExpandableBottomLayout } from '../layouts/ExpandableBottomLayout';
import { black, slate50, slate100, slate500, white } from '../utils/colors';
import { advercase, dinot } from '../utils/fonts';

interface LaunchScreenProps {}

const LaunchScreen: React.FC<LaunchScreenProps> = ({}) => {
  const onStartPress = useHapticNavigation('PassportCamera');

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <YStack
          flex={1}
          justifyContent="flex-start"
          paddingVertical="$2"
          gap="$4"
        >
          <View style={styles.cardContainer}>
            <GetStartedCard style={styles.card} />
          </View>
          <YStack flex={1} justifyContent="flex-end">
            <XStack
              marginBottom="$10"
              alignItems="center"
              justifyContent="center"
              gap="$4"
            >
              <Logo style={styles.logo} />
              <Text style={styles.selfText}>Self</Text>
            </XStack>
          </YStack>
        </YStack>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white} justifyContent="flex-end">
          <BodyText style={styles.subheader}>
            The simplest way to verify identity for safety and trust wherever
            you are.
          </BodyText>
          <Caption style={styles.notice} size={'small'}>
            By continuing, you agree to the&nbsp;
            <Anchor
              style={styles.link}
              href={termsUrl}
            >
              User Terms and Conditions
            </Anchor>
            &nbsp;and acknowledge the&nbsp;
            <Anchor style={styles.link} href={privacyUrl}>
              Privacy notice
            </Anchor>
            &nbsp;of Self provided by Self Inc.
          </Caption>
          <PrimaryButton onPress={onStartPress}>
            Get Started
          </PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default LaunchScreen;

const styles = StyleSheet.create({
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
