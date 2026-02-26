// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Button, Text } from 'tamagui';

import {
  slate200,
  slate400,
  slate600,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

export interface TopicToggleButtonProps {
  label: string;
  isSubscribed: boolean;
  onToggle: () => void;
}

export const TopicToggleButton: React.FC<TopicToggleButtonProps> = ({
  label,
  isSubscribed,
  onToggle,
}) => {
  return (
    <Button
      backgroundColor={isSubscribed ? '$green9' : slate200}
      borderRadius="$2"
      height="$5"
      onPress={onToggle}
      flexDirection="row"
      justifyContent="space-between"
      paddingHorizontal="$4"
      pressStyle={{
        opacity: 0.8,
        scale: 0.98,
      }}
    >
      <Text
        color={isSubscribed ? white : slate600}
        fontSize="$5"
        fontFamily={dinot}
        fontWeight="600"
      >
        {label}
      </Text>
      <Text
        color={isSubscribed ? white : slate400}
        fontSize="$3"
        fontFamily={dinot}
      >
        {isSubscribed ? 'Enabled' : 'Disabled'}
      </Text>
    </Button>
  );
};
