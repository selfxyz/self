// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Pressable } from 'react-native';
import { Separator, Text, View, XStack, YStack } from 'tamagui';
import { Check, Circle } from '@tamagui/lucide-icons';

import {
  black,
  slate300,
  slate500,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

export interface IDSelectorItemProps {
  documentName: string;
  state: IDSelectorState;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}

export type IDSelectorState =
  | 'active'
  | 'verified'
  | 'not_accepted'
  | 'expired';

const green500 = '#22C55E';
const red500 = '#EF4444';

function getSubtitleText(state: IDSelectorState): string {
  switch (state) {
    case 'active':
      return 'Currently active';
    case 'verified':
      return 'Verified ID';
    case 'not_accepted':
      return 'Not accepted';
    case 'expired':
      return 'Expired';
  }
}

function getSubtitleColor(state: IDSelectorState): string {
  switch (state) {
    case 'active':
      return green500;
    case 'verified':
      return slate500;
    case 'not_accepted':
      return slate500;
    case 'expired':
      return red500;
  }
}

export const IDSelectorItem: React.FC<IDSelectorItemProps> = ({
  documentName,
  state,
  onPress,
  disabled,
  testID,
}) => {
  const isDisabled = disabled || isDisabledState(state);
  const isActive = state === 'active';
  const subtitleText = getSubtitleText(state);
  const subtitleColor = getSubtitleColor(state);
  const textColor = isDisabled ? slate500 : black;

  return (
    <>
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        disabled={isDisabled}
        testID={testID}
      >
        <XStack
          paddingVertical={16}
          paddingHorizontal={8}
          alignItems="center"
          gap={12}
          opacity={isDisabled ? 0.6 : 1}
        >
          {/* Radio button indicator */}
          <View
            width={24}
            height={24}
            borderRadius={12}
            borderWidth={isActive ? 0 : 2}
            borderColor={slate300}
            backgroundColor={isActive ? green500 : 'transparent'}
            alignItems="center"
            justifyContent="center"
          >
            {isActive && <Check size={16} color="white" strokeWidth={3} />}
            {!isActive && !isDisabled && (
              <Circle size={20} color={slate300} strokeWidth={0} />
            )}
          </View>

          {/* Document info */}
          <YStack flex={1} gap={2}>
            <Text
              fontFamily={dinot}
              fontSize={16}
              fontWeight="500"
              color={textColor}
            >
              {documentName}
            </Text>
            <Text fontFamily={dinot} fontSize={14} color={subtitleColor}>
              {subtitleText}
            </Text>
          </YStack>
        </XStack>
      </Pressable>
      <Separator borderColor={slate300} />
    </>
  );
};

export function isDisabledState(state: IDSelectorState): boolean {
  return state === 'not_accepted' || state === 'expired';
}
