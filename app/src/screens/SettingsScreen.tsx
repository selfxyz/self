import React, { PropsWithChildren, useCallback } from 'react';
import { Linking, Platform, Share } from 'react-native';
import { getCountry, getLocales, getTimeZone } from 'react-native-localize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgProps } from 'react-native-svg';

import { useNavigation } from '@react-navigation/native';
import { Bug } from '@tamagui/lucide-icons';
import { Button, View, ScrollView, XStack, YStack } from 'tamagui';

import { version } from '../../package.json';
import { BodyText } from '../components/typography/BodyText';
import {
  appStoreUrl,
  gitHubUrl,
  playStoreUrl,
  selfUrl,
  telegramUrl,
} from '../consts/links';
import Github from '../images/icons/github.svg';
import Cloud from '../images/icons/settings_cloud_backup.svg';
import Data from '../images/icons/settings_data.svg';
import Feedback from '../images/icons/settings_feedback.svg';
import Lock from '../images/icons/settings_lock.svg';
import ShareIcon from '../images/icons/share.svg';
import Star from '../images/icons/star.svg';
import Telegram from '../images/icons/telegram.svg';
import Web from '../images/icons/webpage.svg';
import { amber500, black, neutral700, slate800, white } from '../utils/colors';

interface SettingsScreenProps {}
interface MenuButtonProps extends PropsWithChildren {
  Icon: React.FC<SvgProps>;
  onPress: () => void;
}
interface MenuButtonProps {
  Icon: React.FC<SvgProps>;
  onPress: () => void;
}
interface SocialButtonProps {
  Icon: React.FC<SvgProps>;
  href: string;
}

const emailFeedback = 'feedback@self.xyz';
type RouteOption =
  | keyof ReactNavigation.RootParamList
  | 'share'
  | 'email_feedback';

const storeURL = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;
const routes = [
  [Data, 'View passport info', 'PassportDataInfo'],
  [Lock, 'Reveal recovery phrase', 'ShowRecoveryPhrase'],
  [Cloud, 'Enable cloud back up', 'CloudBackupSettingsScreen'],
  [Feedback, 'Send feeback', 'email_feedback'],
  [ShareIcon, 'Share Self app', 'share'],
] as [React.FC<SvgProps>, string, RouteOption][];

// temporarily always show so we can release builds for testing
if (__DEV__ || true) {
  // @ts-expect-error
  routes.push([Bug, 'Debug menu', 'DevSettings']);
}

const social = [
  [Github, gitHubUrl],
  [Web, selfUrl],
  [Telegram, telegramUrl],
] as [React.FC<SvgProps>, string][];

const MenuButton: React.FC<MenuButtonProps> = ({ children, Icon, onPress }) => (
  <Button
    unstyled
    onPress={onPress}
    width="100%"
    flexDirection="row"
    gap={6}
    py={20}
    px={10}
    borderBottomColor={neutral700}
    borderBottomWidth={1}
  >
    <Icon height={24} width={21} color={white} />
    <BodyText color={white} fontSize={18} lineHeight={23}>
      {children}
    </BodyText>
  </Button>
);

const SocialButton: React.FC<SocialButtonProps> = ({ Icon, href }) => {
  const onPress = useCallback(() => {
    Linking.openURL(href);
  }, []);

  return (
    <Button
      unstyled
      icon={<Icon height={32} width={32} color={amber500} onPress={onPress} />}
    />
  );
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({}) => {
  const navigation = useNavigation();
  const onMenuPress = useCallback(
    (menuRoute: RouteOption) => {
      return async () => {
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

          default:
            navigation.navigate(menuRoute);
            break;
        }
      };
    },
    [navigation],
  );
  const { bottom } = useSafeAreaInsets();
  return (
    <View backgroundColor={white}>
    <YStack
      bg={black}
      gap={20}
      jc="space-between"
      height={'100%'}
      padding={20}
      borderTopLeftRadius={30}
      borderTopRightRadius={30}
    >
      <ScrollView>
        <YStack ai="flex-start" justifyContent="flex-start" width="100%">
          {routes.map(([Icon, menuText, menuRoute]) => (
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
        <YStack ai="center" gap={20} justifyContent="center" paddingBottom={50}>
          <Button
            unstyled
            icon={<Star color={white} height={24} width={21} />}
            width="100%"
            padding={20}
            backgroundColor={slate800}
            color={white}
            flexDirection="row"
            jc="center"
            ai="center"
            gap={6}
            borderRadius={4}
            onPress={() => Linking.openURL(storeURL)}
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
  );
};

export default SettingsScreen;
