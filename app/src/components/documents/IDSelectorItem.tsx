// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Pressable } from 'react-native';
import { Separator, Text, View, XStack, YStack } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';

import {
  black,
  green500,
  green600,
  iosSeparator,
  slate200,
  slate300,
  slate400,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

export interface IDSelectorItemProps {
  documentName: string;
  state: IDSelectorState;
  onPress?: () => void;
  onIneligiblePress?: () => void;
  disabled?: boolean;
  isLastItem?: boolean;
  perkSlot?: React.ReactNode;
  testID?: string;
}

export type IDSelectorState =
  | 'active'
  | 'verified'
  | 'expired'
  | 'mock'
  | 'ineligible';

// TODO(SELF-2855): designer review whether ineligible rows need their own
// subtitle. For now we keep the underlying doc's subtitle and rely on dimming.
function getSubtitleText(state: IDSelectorState): string {
  switch (state) {
    case 'active':
      return 'Currently active';
    case 'verified':
      return 'Verified ID';
    case 'expired':
      return 'Expired';
    case 'mock':
      return 'Testing document';
    case 'ineligible':
      return 'Verified ID';
  }
}

function getSubtitleColor(state: IDSelectorState): string {
  switch (state) {
    case 'active':
      return green600;
    case 'verified':
      return slate400;
    case 'expired':
      return slate400;
    case 'mock':
      return slate400;
    case 'ineligible':
      return slate400;
  }
}

export const IDSelectorItem: React.FC<IDSelectorItemProps> = ({
  documentName,
  state,
  onPress,
  onIneligiblePress,
  disabled,
  isLastItem,
  perkSlot,
  testID,
}) => {
  const isIneligible = state === 'ineligible';
  const isDisabled = disabled || isDisabledState(state);
  const isActive = state === 'active';
  const subtitleText = getSubtitleText(state);
  const subtitleColor = getSubtitleColor(state);
  const textColor = isDisabled ? slate400 : black;

  // Determine circle color based on state
  const circleColor = isDisabled ? slate200 : slate300;

  // Ineligible rows must still receive presses so we can fire analytics.
  // Other disabled states (`expired`) stay un-pressable.
  const handlePress = isIneligible
    ? onIneligiblePress
    : isDisabled
      ? undefined
      : onPress;
  const pressableDisabled = isIneligible ? false : isDisabled;

  return (
    <>
      <Pressable
        onPress={handlePress}
        disabled={pressableDisabled}
        testID={testID}
      >
        <XStack
          paddingVertical={6}
          paddingHorizontal={0}
          alignItems="center"
          gap={13}
          opacity={isDisabled ? 0.6 : 1}
        >
          {/* Radio button indicator */}
          <View
            width={29}
            height={24}
            alignItems="center"
            justifyContent="center"
          >
            <View
              width={24}
              height={24}
              borderRadius={12}
              borderWidth={isActive ? 0 : 2}
              borderColor={circleColor}
              backgroundColor={isActive ? green500 : 'transparent'}
              alignItems="center"
              justifyContent="center"
            >
              {isActive && <Check size={16} color="white" strokeWidth={3} />}
            </View>
          </View>

          {/* Document info */}
          <YStack flex={1} gap={2} paddingVertical={8} paddingBottom={9}>
            <Text
              fontFamily={dinot}
              fontSize={18}
              fontWeight="500"
              color={textColor}
              allowFontScaling={false}
            >
              {documentName}
            </Text>
            <Text
              fontFamily={dinot}
              fontSize={14}
              color={subtitleColor}
              allowFontScaling={false}
            >
              {subtitleText}
            </Text>
            {perkSlot ? <View marginTop={6}>{perkSlot}</View> : null}
          </YStack>
        </XStack>
      </Pressable>
      {!isLastItem && <Separator borderColor={iosSeparator} />}
    </>
  );
};

export function isDisabledState(state: IDSelectorState): boolean {
  return state === 'expired' || state === 'ineligible';
}
