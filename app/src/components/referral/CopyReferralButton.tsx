// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { Button, Text, XStack } from 'tamagui';
import Clipboard from '@react-native-clipboard/clipboard';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { PointEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  green500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import CopyToClipboard from '@/assets/icons/copy_to_clipboard.svg';

export interface CopyReferralButtonProps {
  referralLink: string;
  onCopy?: () => void;
}

export const CopyReferralButton: React.FC<CopyReferralButtonProps> = ({
  referralLink,
  onCopy,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const selfClient = useSelfClient();

  const handleCopyLink = async () => {
    try {
      selfClient.trackEvent(PointEvents.EARN_REFERRAL_COPY_LINK);
      await Clipboard.setString(referralLink);
      setIsCopied(true);

      // Reset after 1.65 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 1650);

      onCopy?.();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
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
          fontFamily={dinot}
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
  );
};
