// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { FC } from 'react';
import React from 'react';
import { Dimensions } from 'react-native';
import { Text, YStack } from 'tamagui';

import { slate400, slate500 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

interface IdAttributeProps {
  name: string;
  value: string;
}

const IdAttribute: FC<IdAttributeProps> = ({ name, value }) => {
  const { width: screenWidth } = Dimensions.get('window');
  const attrFontSize = {
    label: screenWidth * 0.024,
    value: screenWidth * 0.02,
  };

  return (
    <YStack>
      <Text
        fontWeight="bold"
        fontSize={attrFontSize.label}
        color={slate500}
        fontFamily={dinot}
      >
        {name}
      </Text>
      <Text fontSize={attrFontSize.value} color={slate400} fontFamily={dinot}>
        {value}
      </Text>
    </YStack>
  );
};

export default IdAttribute;
