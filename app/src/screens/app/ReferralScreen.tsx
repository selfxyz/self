// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { PointEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  blue600,
  green500,
  slate50,
  slate200,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import Message from '@/assets/icons/message.svg';
import ShareBlue from '@/assets/icons/share_blue.svg';
import WhatsApp from '@/assets/icons/whatsapp.svg';
import Referral from '@/assets/images/referral.png';
import { CopyReferralButton } from '@/components/referral/CopyReferralButton';
import { ReferralHeader } from '@/components/referral/ReferralHeader';
import { ReferralInfo } from '@/components/referral/ReferralInfo';
import { ShareButton } from '@/components/referral/ShareButton';
import { useReferralMessage } from '@/hooks/useReferralMessage';
import {
  shareViaNative,
  shareViaSMS,
  shareViaWhatsApp,
} from '@/integrations/sharing';
import type { RootStackParamList } from '@/navigation';

const ReferralScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const { bottom } = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { message, referralLink } = useReferralMessage();

  // Android Messages uses blue, iOS Messages uses green
  const messagesButtonColor = Platform.OS === 'android' ? blue600 : green500;

  const handleShareMessages = async () => {
    selfClient.trackEvent(PointEvents.EARN_REFERRAL_MESSAGES);
    await shareViaSMS(message);
  };

  const handleShare = async () => {
    selfClient.trackEvent(PointEvents.EARN_REFERRAL_SHARE);
    await shareViaNative(message, referralLink, 'Join Self');
  };

  const handleShareWhatsApp = async () => {
    selfClient.trackEvent(PointEvents.EARN_REFERRAL_WHATSAPP);
    await shareViaWhatsApp(message);
  };

  return (
    <YStack flex={1} backgroundColor={slate50}>
      <ReferralHeader
        imageSource={Referral}
        onBackPress={() => navigation.goBack()}
      />

      <YStack
        flex={1}
        paddingHorizontal={20}
        paddingTop={32}
        paddingBottom={21 + bottom}
        backgroundColor={slate50}
        gap={42}
      >
        <ReferralInfo
          title="Invite friends and earn points"
          description="When friends install Self and use your referral link you'll both receive exclusive points."
          learnMoreText="Learn more"
        />

        <XStack justifyContent="space-evenly" width="100%">
          <ShareButton
            icon={<Message width={28} height={28} />}
            label="Messages"
            backgroundColor={messagesButtonColor}
            onPress={handleShareMessages}
          />
          <ShareButton
            icon={<ShareBlue width={28} height={28} />}
            label="Share"
            backgroundColor={slate200}
            onPress={handleShare}
          />
          <ShareButton
            icon={<WhatsApp width={28} height={28} />}
            label="WhatsApp"
            backgroundColor={green500}
            onPress={handleShareWhatsApp}
          />
        </XStack>

        <CopyReferralButton referralLink={referralLink} />
      </YStack>
    </YStack>
  );
};

export default ReferralScreen;
