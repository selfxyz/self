// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Pressable } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { RoundFlag } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  green600,
  slate400,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import DevCardLogo from '@/assets/images/dev_card_logo.svg';

export interface IDSelectorItemProps {
  documentName: string;
  state: IDSelectorState;
  onPress?: () => void;
  onIneligiblePress?: () => void;
  ineligible?: boolean;
  disabled?: boolean;
  isLastItem?: boolean;
  perkSlot?: React.ReactNode;
  /** ISO 3166-1 alpha-3 nationality code used to render the flag icon. */
  nationalityCode?: string;
  /** Renders the dev placeholder logo instead of a country flag. */
  isMock?: boolean;
  /** Right-aligned security label, e.g. "HI-SECURITY". */
  securityLabel?: string;
  testID?: string;
}

export type IDSelectorState = 'active' | 'verified' | 'expired' | 'mock';

const DEV_LOGO_BG = '#1A1A2E';
const ICON_SIZE = 32;

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
  }
}

function getSubtitleColor(state: IDSelectorState): string {
  switch (state) {
    case 'active':
      return green600;
    case 'verified':
    case 'expired':
    case 'mock':
      return slate400;
  }
}

export const IDSelectorItem: React.FC<IDSelectorItemProps> = ({
  documentName,
  state,
  onPress,
  onIneligiblePress,
  ineligible = false,
  disabled,
  isLastItem,
  perkSlot,
  nationalityCode,
  isMock,
  securityLabel,
  testID,
}) => {
  const isDisabled = disabled || isDisabledState(state) || ineligible;
  const isActive = state === 'active' && !ineligible;
  const subtitleText = getSubtitleText(state);
  const subtitleColor = getSubtitleColor(state);
  const textColor = isDisabled ? slate400 : black;

  // Ineligible rows must still receive presses so we can fire analytics.
  // Other disabled states (`expired`) stay un-pressable.
  const handlePress = ineligible
    ? onIneligiblePress
    : isDisabled
      ? undefined
      : onPress;
  const pressableDisabled = ineligible ? false : isDisabled;

  return (
    <Pressable
      onPress={handlePress}
      disabled={pressableDisabled}
      testID={testID}
    >
      <XStack
        paddingHorizontal={10}
        paddingVertical={6}
        alignItems="center"
        gap={13}
        opacity={isDisabled ? 0.6 : 1}
        borderBottomWidth={!isActive && !isLastItem ? 0.5 : 0}
        borderBottomColor="rgba(60,60,67,0.36)"
      >
        {/* Document icon — flag for real docs, DevCardLogo for mocks */}
        <View
          width={ICON_SIZE}
          height={ICON_SIZE}
          alignItems="center"
          justifyContent="center"
        >
          {isMock ? (
            <View
              width={ICON_SIZE}
              height={ICON_SIZE}
              borderRadius={ICON_SIZE / 2}
              backgroundColor={DEV_LOGO_BG}
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
            >
              <DevCardLogo width={ICON_SIZE} height={ICON_SIZE} />
            </View>
          ) : (
            <RoundFlag countryCode={nationalityCode ?? ''} size={ICON_SIZE} />
          )}
        </View>

        {/* Document info */}
        <YStack flex={1} gap={2} paddingVertical={8} paddingBottom={9}>
          <Text
            fontFamily={dinot}
            fontSize={18}
            fontWeight="500"
            color={textColor}
            allowFontScaling={false}
            numberOfLines={1}
            testID={testID ? `${testID}-name` : undefined}
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

        {/* Security pill */}
        {securityLabel ? (
          <View
            backgroundColor="rgba(0,0,0,0.5)"
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={30}
            alignItems="center"
            justifyContent="center"
          >
            <Text
              fontFamily={dinot}
              fontSize={10}
              fontWeight="500"
              color={white}
              letterSpacing={0.6}
              textTransform="uppercase"
              allowFontScaling={false}
              testID={testID ? `${testID}-security-label` : undefined}
            >
              {securityLabel}
            </Text>
          </View>
        ) : null}
      </XStack>
    </Pressable>
  );
};

export function isDisabledState(state: IDSelectorState): boolean {
  return state === 'expired';
}
