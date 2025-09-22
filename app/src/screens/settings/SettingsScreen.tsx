// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React, { useCallback, useMemo } from 'react';
import { Linking, Platform, Share, View as RNView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';
import { Button, ScrollView, View, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bug, FileText } from '@tamagui/lucide-icons';

import { pressedStyle } from '@/components/buttons/pressedStyle';
import { BodyText } from '@/components/typography/BodyText';
import {
  appStoreUrl,
  gitHubUrl,
  playStoreUrl,
  selfUrl,
  telegramUrl,
  xUrl,
} from '@/consts/links';
import Github from '@/images/icons/github.svg';
import Cloud from '@/images/icons/settings_cloud_backup.svg';
import Data from '@/images/icons/settings_data.svg';
import Feedback from '@/images/icons/settings_feedback.svg';
import Lock from '@/images/icons/settings_lock.svg';
import ShareIcon from '@/images/icons/share.svg';
import Star from '@/images/icons/star.svg';
import Telegram from '@/images/icons/telegram.svg';
import Web from '@/images/icons/webpage.svg';
import X from '@/images/icons/x.svg';
import type { RootStackParamList } from '@/navigation';
import { useSettingStore } from '@/stores/settingStore';
import { amber500, black, neutral700, slate800, white } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';
import { impactLight } from '@/utils/haptic';
import { getCountry, getLocales, getTimeZone } from '@/utils/locale';

import { version } from '../../../package.json';

interface MenuButtonProps extends PropsWithChildren {
  Icon: React.FC<SvgProps>;
  onPress: () => void;
}
interface SocialButtonProps {
  Icon: React.FC<SvgProps>;
  href: string;
}

const emailFeedback = 'feedback@self.xyz';
type RouteOption =
  | keyof RootStackParamList
  | 'share'
  | 'email_feedback'
  | 'ManageDocuments';

const storeURL = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;

const goToStore = () => {
  impactLight();
  Linking.openURL(storeURL);
};

const routes =
  Platform.OS !== 'web'
    ? ([
        [Data, 'View document info', 'DocumentDataInfo'],
        [Lock, 'Reveal recovery phrase', 'ShowRecoveryPhrase'],
        [Cloud, 'Cloud backup', 'CloudBackupSettings'],
        [Feedback, 'Send feedback', 'email_feedback'],
        [ShareIcon, 'Share Self app', 'share'],
        [
          FileText as React.FC<SvgProps>,
          'Manage ID documents',
          'ManageDocuments',
        ],
      ] satisfies [React.FC<SvgProps>, string, RouteOption][])
    : ([
        [Data, 'View document info', 'DocumentDataInfo'],
        [Feedback, 'Send feeback', 'email_feedback'],
        [
          FileText as React.FC<SvgProps>,
          'Manage ID documents',
          'ManageDocuments',
        ],
      ] satisfies [React.FC<SvgProps>, string, RouteOption][]);

// get the actual type of the routes so we can use in the onMenuPress function so it
// doesnt worry about us linking to screens with required props which we dont want to go to anyway
type RouteLinks = (typeof routes)[number][2] | (typeof DEBUG_MENU)[number][2];

const DEBUG_MENU: [React.FC<SvgProps>, string, RouteOption][] = [
  [Bug as React.FC<SvgProps>, 'Debug menu', 'DevSettings'],
];

const social = [
  [X, xUrl],
  [Github, gitHubUrl],
  [Web, selfUrl],
  [Telegram, telegramUrl],
] as [React.FC<SvgProps>, string][];

const MenuButton: React.FC<MenuButtonProps> = ({ children, Icon, onPress }) => (
  <Button
    unstyled
    onPress={onPress}
    pressStyle={pressedStyle}
    width="100%"
    flexDirection="row"
    gap={6}
    paddingVertical={20}
    paddingHorizontal={10}
    borderBottomColor={neutral700}
    borderBottomWidth={1}
    hitSlop={4}
  >
    <Icon height={24} width={21} color={white} />
    <BodyText color={white} fontSize={18} lineHeight={23}>
      {children}
    </BodyText>
  </Button>
);

const SocialButton: React.FC<SocialButtonProps> = ({ Icon, href }) => {
  const onPress = useCallback(() => {
    impactLight();
    Linking.openURL(href);
  }, [href]);

  return (
    <Button
      unstyled
      hitSlop={8}
      onPress={onPress}
      icon={<Icon height={32} width={32} color={amber500} />}
    />
  );
};

const SettingsScreen: React.FC = () => {
  const { isDevMode, setDevModeOn } = useSettingStore();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const screenRoutes = useMemo(() => {
    return isDevMode ? [...routes, ...DEBUG_MENU] : routes;
  }, [isDevMode]);

  const devModeTap = Gesture.Tap()
    .numberOfTaps(5)
    .onStart(() => {
      setDevModeOn();
    });

  const onMenuPress = useCallback(
    (menuRoute: RouteLinks) => {
      return async () => {
        impactLight();
        switch (menuRoute) {
          case 'share':
            await Share.share(
              Platform.OS === 'android'
                ? { message: `Install Self App ${storeURL}` }
                : { url: storeURL, message: 'Install Self App' },
            );
            break;

          case 'email_feedback':
            const subject = 'SELF App Feedback';
            const deviceInfo = [
              ['device', `${Platform.OS}@${Platform.Version}`],
              ['app', `v${version}`],
              [
                'locales',
                getLocales()
                  .map(locale => `${locale.languageCode}-${locale.countryCode}`)
                  .join(','),
              ],
              ['country', getCountry()],
              ['tz', getTimeZone()],
              ['ts', new Date()],
              ['origin', 'settings/feedback'],
            ] as [string, string][];

            const body = `
---
${deviceInfo.map(([k, v]) => `${k}=${v}`).join('; ')}
---`;
            await Linking.openURL(
              `mailto:${emailFeedback}?subject=${encodeURIComponent(
                subject,
              )}&body=${encodeURIComponent(body)}`,
            );
            break;

          case 'ManageDocuments':
            navigation.navigate('ManageDocuments');
            break;

          default:
            navigation.navigate(menuRoute as never);
            break;
        }
      };
    },
    [navigation],
  );
  const { bottom } = useSafeAreaInsets();
  return (
    <GestureDetector gesture={devModeTap}>
      <RNView collapsable={false}>
        <View backgroundColor={white}>
          <YStack
            backgroundColor={black}
            gap={20}
            justifyContent="space-between"
            height={'100%'}
            paddingHorizontal={20}
            paddingBottom={bottom + extraYPadding}
            borderTopLeftRadius={30}
            borderTopRightRadius={30}
          >
            <ScrollView>
              <YStack
                alignItems="flex-start"
                justifyContent="flex-start"
                width="100%"
              >
                {screenRoutes.map(([Icon, menuText, menuRoute]) => (
                  <MenuButton
                    key={menuRoute}
                    Icon={Icon}
                    onPress={onMenuPress(menuRoute)}
                  >
                    {menuText}
                  </MenuButton>
                ))}
              </YStack>
            </ScrollView>
            <YStack
              alignItems="center"
              gap={20}
              justifyContent="center"
              paddingBottom={50}
            >
              <Button
                unstyled
                icon={<Star color={white} height={24} width={21} />}
                width="100%"
                padding={20}
                backgroundColor={slate800}
                color={white}
                flexDirection="row"
                justifyContent="center"
                alignItems="center"
                gap={6}
                borderRadius={4}
                pressStyle={pressedStyle}
                onPress={goToStore}
              >
                <BodyText color={white}>Leave an app store review</BodyText>
              </Button>
              <XStack gap={32}>
                {social.map(([Icon, href], i) => (
                  <SocialButton key={i} Icon={Icon} href={href} />
                ))}
              </XStack>
              <BodyText color={amber500} fontSize={15}>
                SELF
              </BodyText>
              {/* Dont remove if not viewing on ios */}
              <View marginBottom={bottom} />
            </YStack>
          </YStack>
        </View>
      </RNView>
    </GestureDetector>
  );
};

export default SettingsScreen;
