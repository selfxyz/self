// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Text, View, XStack } from 'tamagui';

import {
  slate200,
  slate800,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import {
  getPerkRailLabel,
  type Perk,
} from '@selfxyz/mobile-sdk-alpha/onboarding/perks';

export type PerkEligibilityRowVariant = 'attached' | 'inline';

export interface PerkEligibilityRowProps {
  perks: Perk[];
  variant?: PerkEligibilityRowVariant;
  testID?: string;
}

export const PerkEligibilityRow: React.FC<PerkEligibilityRowProps> = ({
  perks,
  variant = 'inline',
  testID = 'perk-eligibility-row',
}) => {
  if (perks.length === 0) {
    return null;
  }

  const logos = perks.flatMap(perk => perk.renderLogos?.() ?? []);
  if (logos.length === 0) {
    return null;
  }

  const attached = variant === 'attached';

  return (
    <XStack
      paddingHorizontal={10}
      paddingVertical={8}
      alignItems="center"
      justifyContent="space-between"
      backgroundColor="transparent"
      borderBottomLeftRadius={attached ? 16 : 0}
      borderBottomRightRadius={attached ? 16 : 0}
      testID={testID}
    >
      <View
        width={32}
        height={32}
        borderRadius={50}
        borderWidth={1}
        borderColor={slate200}
        backgroundColor={white}
        overflow="hidden"
        alignItems="center"
        justifyContent="center"
      >
        {logos}
      </View>
      <XStack
        backgroundColor={slate200}
        borderRadius={30}
        paddingHorizontal={8}
        paddingVertical={4}
        alignItems="center"
      >
        <Text
          fontFamily={dinot}
          fontSize={10}
          fontWeight="500"
          color={slate800}
          letterSpacing={0.6}
          textTransform="uppercase"
          allowFontScaling={false}
          testID={`${testID}-label`}
        >
          {getPerkRailLabel(perks)}
        </Text>
      </XStack>
    </XStack>
  );
};
