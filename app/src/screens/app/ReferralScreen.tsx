// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import {
  Alert,
  Clipboard,
  Image,
  Linking,
  Platform,
  Pressable,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, View, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ArrowLeft from '@/images/icons/arrow_left.svg';
import CopyToClipboard from '@/images/icons/copy_to_clipboard.svg';
import Message from '@/images/icons/message.svg';
import ShareBlue from '@/images/icons/share_blue.svg';
import WhatsApp from '@/images/icons/whatsapp.svg';
import Referral from '@/images/referral.png';
import type { RootStackParamList } from '@/navigation';
import {
  black,
  blue600,
  green500,
  slate50,
  slate200,
  slate500,
  slate800,
  white,
} from '@/utils/colors';

const ReferralScreen: React.FC = () => {
  const { top, bottom } = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [referralCode, setReferralCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const referralLink = referralCode
    ? `https://self.app/r/${referralCode}`
    : 'https://self.app/r/YOUR_REFERRAL_CODE';

  const handleCopyLink = async () => {
    try {
      await Clipboard.setString(referralLink);
      setIsCopied(true);

      // Reset after 5 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 1650);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleShareMessages = async () => {
    const message = `Join Self and use my referral link: ${referralLink}`;

    try {
      // iOS uses sms:&body=, Android uses sms:?body=
      const separator = Platform.OS === 'ios' ? '&' : '?';
      const url = `sms:${separator}body=${encodeURIComponent(message)}`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open Messages app');
      }
    } catch (error) {
      console.error('Error opening Messages:', error);
      Alert.alert('Error', 'Failed to open Messages app');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join Self and use my referral link: ${referralLink}`,
        title: 'Join Self',
        url: referralLink,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleShareWhatsApp = async () => {
    const message = `Join Self and use my referral link: ${referralLink}`;

    try {
      const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'WhatsApp Not Installed',
          'Please install WhatsApp to share via this method, or use the Share button instead.',
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert('Error', 'Failed to open WhatsApp');
    }
  };

  return (
    <YStack flex={1} backgroundColor={slate50}>
      {/* Header with referral image */}
      <View height={430} position="relative" overflow="hidden">
        <Image
          source={Referral}
          style={{
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
          }}
        />

        {/* Back button */}
        <View position="absolute" top={top + 16} left={20} zIndex={10}>
          <Pressable onPress={() => navigation.goBack()}>
            <View
              backgroundColor={white}
              width={46}
              height={46}
              borderRadius={60}
              alignItems="center"
              justifyContent="center"
            >
              <Text
                fontFamily="SF Pro"
                fontSize={24}
                lineHeight={29}
                color={black}
              >
                <ArrowLeft width={24} height={24} />
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Main content */}
      <YStack
        flex={1}
        paddingHorizontal={20}
        paddingTop={32}
        paddingBottom={21 + bottom}
        backgroundColor={slate50}
        justifyContent="space-between"
      >
        {/* Title and description */}
        <YStack gap={12} alignItems="center">
          <Text
            fontFamily="DIN OT"
            fontSize={24}
            fontWeight="500"
            color={black}
            textAlign="center"
          >
            Invite friends and earn points
          </Text>
          <YStack gap={0}>
            <Text
              fontFamily="DIN OT"
              fontSize={16}
              fontWeight="500"
              color={slate500}
              textAlign="center"
            >
              When friends install Self and use your referral link you'll both
              receive exclusive points.
            </Text>
            <Text
              fontFamily="DIN OT"
              fontSize={16}
              fontWeight="500"
              color={blue600}
              textAlign="center"
            >
              Learn more
            </Text>
          </YStack>
        </YStack>

        {/* Three circular buttons */}
        <XStack justifyContent="space-evenly" width="100%" marginTop={20}>
          {/* Messages */}
          <Pressable onPress={handleShareMessages}>
            <YStack gap={8} alignItems="center">
              <View
                backgroundColor={green500}
                width={64}
                height={64}
                borderRadius={60}
                alignItems="center"
                justifyContent="center"
              >
                <Message width={28} height={28} />
              </View>
              <Text
                fontFamily="DIN OT"
                fontSize={14}
                fontWeight="500"
                color={slate800}
              >
                Messages
              </Text>
            </YStack>
          </Pressable>

          {/* Share */}
          <Pressable onPress={handleShare}>
            <YStack gap={8} alignItems="center">
              <View
                backgroundColor={slate200}
                width={64}
                height={64}
                borderRadius={60}
                alignItems="center"
                justifyContent="center"
              >
                <ShareBlue width={28} height={28} />
              </View>
              <Text
                fontFamily="DIN OT"
                fontSize={14}
                fontWeight="500"
                color={slate800}
              >
                Share
              </Text>
            </YStack>
          </Pressable>

          {/* WhatsApp */}
          <Pressable onPress={handleShareWhatsApp}>
            <YStack gap={8} alignItems="center">
              <View
                backgroundColor={green500}
                width={64}
                height={64}
                borderRadius={60}
                alignItems="center"
                justifyContent="center"
              >
                <WhatsApp width={28} height={28} />
              </View>
              <Text
                fontFamily="DIN OT"
                fontSize={14}
                fontWeight="500"
                color={slate800}
              >
                WhatsApp
              </Text>
            </YStack>
          </Pressable>
        </XStack>

        {/* Copy referral link button */}
        <Button
          backgroundColor={isCopied ? green500 : black}
          paddingHorizontal={32}
          paddingVertical={18}
          borderRadius={40}
          height={60}
          onPress={handleCopyLink}
          pressStyle={{ opacity: 0.8 }}
          disabled={isCopied}
        >
          <XStack gap={10} alignItems="center" flex={1}>
            <Text
              fontFamily="DIN OT"
              fontSize={16}
              fontWeight="500"
              color={white}
              flex={1}
            >
              {isCopied
                ? 'Referral link copied to clipboard'
                : 'Copy referral link'}
            </Text>
            <CopyToClipboard width={24} height={24} />
          </XStack>
        </Button>
      </YStack>
    </YStack>
  );
};

export default ReferralScreen;
