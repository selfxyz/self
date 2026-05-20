// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { View } from 'tamagui';
import { CircleHelp } from '@tamagui/lucide-icons';

import { RoundFlag } from '@selfxyz/mobile-sdk-alpha/components';
import {
  slate200,
  slate400,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import DevCardLogo from '@/assets/images/dev_card_logo.svg';

export interface DocumentIdentityIconProps {
  nationalityCode?: string;
  isMock?: boolean;
  size?: number;
}

const DEV_LOGO_BG = '#1A1A2E';

export const DocumentIdentityIcon: React.FC<DocumentIdentityIconProps> = ({
  nationalityCode,
  isMock,
  size = 32,
}) => {
  if (isMock) {
    const logoSize = Math.round(size * 0.6);
    return (
      <View
        width={size}
        height={size}
        borderRadius={size / 2}
        backgroundColor={DEV_LOGO_BG}
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
      >
        <DevCardLogo width={logoSize} height={logoSize} />
      </View>
    );
  }

  if (nationalityCode) {
    return <RoundFlag countryCode={nationalityCode} size={size} />;
  }

  return (
    <View
      width={size}
      height={size}
      borderRadius={size / 2}
      borderWidth={1}
      borderColor={slate200}
      backgroundColor={white}
      alignItems="center"
      justifyContent="center"
    >
      <CircleHelp size={size * 0.62} color={slate400} />
    </View>
  );
};
