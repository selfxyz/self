// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { XStack, YStack } from 'tamagui';

import type { SelfAppDisclosureConfig } from '@selfxyz/common/utils';
import { BodyText } from '@selfxyz/mobile-sdk-alpha/components';
import { slate200, slate500 } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import CheckMark from '@/assets/icons/checkmark.svg';
import {
  getDisclosureText,
  ORDERED_DISCLOSURE_KEYS,
} from '@/utils/disclosureUtils';

interface DisclosureProps {
  disclosures: SelfAppDisclosureConfig;
}

export default function Disclosures({ disclosures }: DisclosureProps) {
  return (
    <YStack>
      {ORDERED_DISCLOSURE_KEYS.map(key => {
        const isEnabled = disclosures[key];
        if (
          !isEnabled ||
          (Array.isArray(isEnabled) && isEnabled.length === 0)
        ) {
          return null;
        }

        const text = getDisclosureText(key, disclosures);
        if (!text) {
          return null;
        }

        return <DisclosureItem key={key} text={text} />;
      })}
    </YStack>
  );
}

interface DisclosureItemProps {
  text: string;
}

const DisclosureItem: React.FC<DisclosureItemProps> = ({
  text,
}: DisclosureItemProps) => {
  return (
    <XStack
      gap={10}
      borderBottomColor={slate200}
      borderBottomWidth={1}
      paddingVertical={22}
      paddingHorizontal={10}
    >
      <CheckMark width={22} />
      <BodyText textBreakStrategy="balanced" style={{ color: slate500 }}>
        {text}
      </BodyText>
    </XStack>
  );
};

// interface DiscloseAddressProps {
//   text: string;
//   address: string;
// }

// const DiscloseAddress: React.FC<DiscloseAddressProps> = ({
//   text,
//   address,
// }: DiscloseAddressProps) => {
//   return (
//     <YStack gap={10} paddingVertical={22} paddingHorizontal={10}>
//       <XStack gap={10}>
//         <CheckMark width={22} />
//         <BodyText color={slate500}>{text}</BodyText>
//       </XStack>
//       <YStack
//         gap={8}
//         borderRadius={10}
//         borderColor={slate200}
//         borderWidth={1}
//         padding={8}
//         marginStart={34}
//       >
//         <BodyText color={slate400}>Address</BodyText>
//         <Numerical>{address}</Numerical>
//       </YStack>
//     </YStack>
//   );
// };
