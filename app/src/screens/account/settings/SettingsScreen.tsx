// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
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
import { Bug, FileText, Settings2 } from '@tamagui/lucide-icons';

import { BodyText, pressedStyle } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  neutral700,
  slate800,
  warmCream,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import Discord from '@/assets/icons/discord.svg';
import Github from '@/assets/icons/github.svg';
import Feedback from '@/assets/icons/settings_feedback.svg';
import Lock from '@/assets/icons/settings_lock.svg';
import ShareIcon from '@/assets/icons/share.svg';
import Star from '@/assets/icons/star.svg';
import Telegram from '@/assets/icons/telegram.svg';
import Web from '@/assets/icons/webpage.svg';
import X from '@/assets/icons/x.svg';
import {
  appStoreUrl,
  discordUrl,
  gitHubUrl,
  playStoreUrl,
  selfUrl,
  telegramUrl,
  xUrl,
} from '@/consts/links';
import useHasRealDocument from '@/hooks/useHasRealDocument';
import { impactLight } from '@/integrations/haptics';
import type {
  SettingsPlatform,
  SettingsRouteKey,
} from '@/screens/account/settings/settingsMenu';
import { buildSettingsMenu } from '@/screens/account/settings/settingsMenu';
import { useSettingStore } from '@/stores/settingStore';
import { extraYPadding } from '@/utils/styleUtils';

// Avoid importing RootStackParamList to prevent type cycles; use minimal typing
type MinimalRootStackParamList = Record<string, object | undefined>;

interface MenuButtonProps extends PropsWithChildren {
  Icon: React.FC<SvgProps>;
  onPress: () => void;
}
interface SocialButtonProps {
  Icon: React.FC<SvgProps>;
  href: string;
  onPress?: () => void;
}

const storeURL = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;

const goToStore = () => {
  impactLight();
  Linking.openURL(storeURL);
};

const CURRENT_PLATFORM: SettingsPlatform =
  Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

const ROUTE_ICONS: Record<SettingsRouteKey, React.FC<SvgProps>> = {
  ManageDocuments: FileText as React.FC<SvgProps>,
  SecurityAndBackup: Lock,
  ProofSettings: Settings2 as React.FC<SvgProps>,
  Support: Feedback,
  share: ShareIcon,
  DevSettings: Bug as React.FC<SvgProps>,
};

const social = [
  [X, xUrl],
  [Github, gitHubUrl],
  [Web, selfUrl],
  [Telegram, telegramUrl],
  [Discord, discordUrl],
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
    <BodyText style={{ color: white, fontSize: 18, lineHeight: 23 }}>
      {children}
    </BodyText>
  </Button>
);

const SocialButton: React.FC<SocialButtonProps> = ({
  Icon,
  href,
  onPress: customOnPress,
}) => {
  const defaultOnPress = useCallback(() => {
    impactLight();
    Linking.openURL(href);
  }, [href]);

  return (
    <Button
      unstyled
      hitSlop={8}
      onPress={customOnPress ?? defaultOnPress}
      icon={<Icon height={32} width={32} color={warmCream} />}
    />
  );
};

const SettingsScreen: React.FC = () => {
  const { isDevMode, setDevModeOn } = useSettingStore();
  const navigation =
    useNavigation<NativeStackNavigationProp<MinimalRootStackParamList>>();
  const { hasRealDocument } = useHasRealDocument('SettingsScreen');
  const openSelfWebsite = useCallback(() => {
    impactLight();
    navigation.navigate('WebView', { url: selfUrl, title: 'Self' });
  }, [navigation]);

  const screenRoutes = useMemo(
    () =>
      buildSettingsMenu({
        platform: CURRENT_PLATFORM,
        hasRealDocument: hasRealDocument === true,
        isDevMode,
      }),
    [hasRealDocument, isDevMode],
  );

  const devModeTap = Gesture.Tap()
    .numberOfTaps(5)
    .onStart(() => {
      setDevModeOn();
    });

  const onMenuPress = useCallback(
    (menuRoute: SettingsRouteKey) => {
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
                {screenRoutes.map(({ label, route }) => (
                  <MenuButton
                    key={route}
                    Icon={ROUTE_ICONS[route]}
                    onPress={onMenuPress(route)}
                  >
                    {label}
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
                <BodyText style={{ color: white }}>
                  Leave an app store review
                </BodyText>
              </Button>
              <XStack gap={32}>
                {social.map(([Icon, href], i) => (
                  <SocialButton
                    key={i}
                    Icon={Icon}
                    href={href}
                    onPress={href === selfUrl ? openSelfWebsite : undefined}
                  />
                ))}
              </XStack>
              <BodyText style={{ color: warmCream, fontSize: 15 }}>
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
