// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { RoundFlag } from '@selfxyz/mobile-sdk-alpha/components';
import { slate500 as trueSlate500 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';
import type { Perk } from '@selfxyz/mobile-sdk-alpha/onboarding/perks';

import DevCardLogo from '@/assets/images/dev_card_logo.svg';
import { proofRequestColors } from '@/components/proof-request/designTokens';
import { ChevronUpDownIcon } from '@/components/proof-request/icons';
import { PerkEligibilityRow } from '@/components/proof-request/PerkEligibilityRow';

export interface BottomActionBarProps {
  selectedDocumentName: string;
  selectedDocumentNationalityCode?: string;
  selectedDocumentIsMock?: boolean;
  selectedDocumentSecurityLabel?: string;
  onDocumentSelectorPress: () => void;
  onApprovePress: () => void;
  approveDisabled?: boolean;
  approving?: boolean;
  perks?: Perk[];
  testID?: string;
}

const ICON_SIZE = 32;
const DEV_LOGO_BG = '#1A1A2E';

/**
 * Bottom action bar with stacked pill-shaped document selector and approve
 * button. Matches Figma nodes 26164:20557 (selector) and 26164:20577 (approve).
 */
export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  selectedDocumentName,
  selectedDocumentNationalityCode,
  selectedDocumentIsMock,
  selectedDocumentSecurityLabel,
  onDocumentSelectorPress,
  onApprovePress,
  approveDisabled = false,
  approving = false,
  perks,
  testID = 'bottom-action-bar',
}) => {
  const hasPerks = !!perks && perks.length > 0;
  const topPadding = 8;

  const { height: screenHeight } = Dimensions.get('window');
  const basePadding = 12;
  const safeAreaPadding = useSafeBottomPadding(basePadding);

  const dynamicPadding = useMemo(() => {
    const heightMultiplier = Math.max(0, (screenHeight - 800) * 0.12);
    return Math.round(safeAreaPadding + heightMultiplier);
  }, [screenHeight, safeAreaPadding]);

  // Selector chrome: pill (rounded-60) when no perks; rounded-16 card when a
  // perk rail is attached underneath (so the joined element reads as one card).
  const selectorRadius = hasPerks ? 16 : 60;
  const wrapperRadius = selectorRadius;

  return (
    <View
      backgroundColor={proofRequestColors.white}
      paddingHorizontal={16}
      paddingTop={topPadding}
      paddingBottom={dynamicPadding}
      testID={testID}
    >
      <YStack gap={10}>
        {/* Document selector + optional perk rail (one visual card) */}
        <View
          borderWidth={1}
          borderColor={proofRequestColors.slate300}
          borderRadius={wrapperRadius}
          overflow="hidden"
          backgroundColor={proofRequestColors.white}
          style={styles.selectorShadow}
        >
          <Pressable
            onPress={onDocumentSelectorPress}
            style={({ pressed }) => [
              styles.selectorPressable,
              pressed && styles.selectorPressed,
            ]}
            testID={`${testID}-document-selector`}
          >
            <XStack
              alignItems="center"
              gap={10}
              paddingLeft={8}
              paddingRight={14}
              paddingVertical={8}
            >
              {/* Flag / dev icon */}
              <View
                width={ICON_SIZE}
                height={ICON_SIZE}
                alignItems="center"
                justifyContent="center"
              >
                {selectedDocumentIsMock ? (
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
                  <RoundFlag
                    countryCode={selectedDocumentNationalityCode ?? ''}
                    size={ICON_SIZE}
                  />
                )}
              </View>

              {/* Name + HI-SECURITY label */}
              <YStack flex={1}>
                <Text
                  fontFamily={dinot}
                  fontSize={14}
                  fontWeight="500"
                  color={proofRequestColors.slate900}
                  numberOfLines={1}
                  allowFontScaling={false}
                  testID={`${testID}-document-selector-name`}
                >
                  {selectedDocumentName}
                </Text>
                {selectedDocumentSecurityLabel ? (
                  <Text
                    fontFamily={dinot}
                    fontSize={10}
                    fontWeight="500"
                    color={trueSlate500}
                    letterSpacing={0.6}
                    textTransform="uppercase"
                    allowFontScaling={false}
                    testID={`${testID}-document-selector-security`}
                  >
                    {selectedDocumentSecurityLabel}
                  </Text>
                ) : null}
              </YStack>

              {/* Chevron */}
              <View
                width={29}
                height={29}
                alignItems="center"
                justifyContent="center"
              >
                <ChevronUpDownIcon
                  size={20}
                  color={proofRequestColors.slate900}
                />
              </View>
            </XStack>
          </Pressable>
          {hasPerks ? (
            <PerkEligibilityRow
              perks={perks ?? []}
              variant="attached"
              testID={`${testID}-perks`}
            />
          ) : null}
        </View>

        {/* Approve button (full-width pill) */}
        <Pressable
          onPress={onApprovePress}
          disabled={approveDisabled || approving}
          style={({ pressed }) => [
            styles.approveButton,
            (approveDisabled || approving) && styles.approveButtonDisabled,
            pressed &&
              !approveDisabled &&
              !approving &&
              styles.approveButtonPressed,
          ]}
          testID={`${testID}-approve`}
        >
          {approving ? (
            <ActivityIndicator color={proofRequestColors.white} size="small" />
          ) : (
            <Text
              fontFamily={dinot}
              fontSize={16}
              fontWeight="500"
              color={proofRequestColors.white}
              textAlign="center"
              allowFontScaling={false}
            >
              Approve
            </Text>
          )}
        </Pressable>
      </YStack>
    </View>
  );
};

const styles = StyleSheet.create({
  selectorShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  selectorPressable: {
    backgroundColor: proofRequestColors.white,
  },
  selectorPressed: {
    backgroundColor: proofRequestColors.slate100,
  },
  approveButton: {
    backgroundColor: '#000000',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 60,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButtonDisabled: {
    opacity: 0.5,
  },
  approveButtonPressed: {
    opacity: 0.85,
  },
});
