// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Anchor, Text, YStack } from 'tamagui';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';

import {
  AbstractButton,
  BodyText,
  Caption,
} from '@selfxyz/mobile-sdk-alpha/components';
import { AppEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { privacyUrl, termsUrl } from '@/consts/links';
import useConnectionModal from '@/hooks/useConnectionModal';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { useModal } from '@/hooks/useModal';
import IDCardPlaceholder from '@/images/icons/id_card_placeholder.svg';
import {
  black,
  red500,
  slate300,
  slate400,
  white,
  zinc800,
} from '@/utils/colors';
import { advercase, dinot } from '@/utils/fonts';

const LaunchScreen: React.FC = () => {
  useConnectionModal();
  const { handleGoogleOauth, fetchWallets } = useTurnkey();
  const onPress = useHapticNavigation('CountryPicker');
  const createMock = useHapticNavigation('CreateMock');
  const { bottom } = useSafeAreaInsets();

  const { showModal: showNoWalletsModal } = useModal({
    titleText: 'No wallets found',
    bodyText: 'No wallets found. Please sign in with Turnkey to continue.',
    buttonText: 'OK',
    onButtonPress: () => {},
    onModalDismiss: () => {},
  });
  const onImportWalletPress = async () => {
    try {
      await handleGoogleOauth();
      const fetchedWallets = await fetchWallets();

      if (fetchedWallets.length === 0) {
        showNoWalletsModal();
        return;
      }

      onPress();
    } catch {
      console.error('handleGoogleOauth error');
    }
  };

  const devModeTap = Gesture.Tap()
    .numberOfTaps(5)
    .onStart(() => {
      createMock();
    });

  return (
    <YStack backgroundColor={black} flex={1} alignItems="center">
      <View style={styles.container}>
        <YStack flex={1} justifyContent="center" alignItems="center">
          <GestureDetector gesture={devModeTap}>
            <YStack
              backgroundColor={red500}
              borderRadius={14}
              overflow="hidden"
            >
              <IDCardPlaceholder width={300} height={180} />
            </YStack>
          </GestureDetector>
        </YStack>
        <Text
          color={white}
          fontSize={38}
          fontFamily={advercase}
          fontWeight="500"
          textAlign="center"
          marginBottom={16}
        >
          Take control of your digital identity
        </Text>
        <BodyText
          style={{
            color: slate300,
            fontSize: 16,
            textAlign: 'center',
            marginHorizontal: 40,
            marginBottom: 40,
          }}
        >
          Self is the easiest way to verify your identity safely wherever you
          are.
        </BodyText>
      </View>

      <YStack
        gap="$3"
        width="100%"
        alignItems="center"
        paddingHorizontal={20}
        paddingBottom={bottom}
        paddingTop={30}
        backgroundColor={zinc800}
      >
        <AbstractButton
          trackEvent={AppEvents.GET_STARTED}
          onPress={onPress}
          bgColor={white}
          color={black}
          testID="launch-get-started-button"
        >
          Get Started
        </AbstractButton>

        <Pressable onPress={onImportWalletPress}>
          <Text style={styles.disclaimer}>
            <Text style={styles.haveAnAccount}>{`Have an account? `}</Text>
            <Text style={styles.restore}>restore</Text>
          </Text>
        </Pressable>

        <Caption style={styles.notice}>
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
      </YStack>
    </YStack>
  );
};

export default LaunchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '102%',
    paddingTop: '30%',
  },
  card: {
    width: '100%',
    marginTop: '20%',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
  },
  logoSection: {
    width: 60,
    height: 60,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 40,
    height: 40,
  },
  disclaimer: {
    width: '100%',
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontWeight: '500',
    fontFamily: dinot,
    textAlign: 'center',
  },
  haveAnAccount: {
    color: '#6b7280',
  },
  restore: {
    color: '#fff',
  },
  notice: {
    fontFamily: dinot,
    marginVertical: 10,
    paddingBottom: 10,
    color: slate400,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
  },
  link: {
    fontFamily: dinot,
    color: slate400,
    lineHeight: 22,
    textDecorationLine: 'underline',
  },
});
