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
import { Text, View, XStack } from 'tamagui';

import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';
import type { Perk } from '@selfxyz/mobile-sdk-alpha/onboarding/perks';

import { proofRequestColors } from '@/components/proof-request/designTokens';
import { ChevronUpDownIcon } from '@/components/proof-request/icons';
import { PerkEligibilityRow } from '@/components/proof-request/PerkEligibilityRow';

export interface BottomActionBarProps {
  selectedDocumentName: string;
  onDocumentSelectorPress: () => void;
  onApprovePress: () => void;
  approveDisabled?: boolean;
  approving?: boolean;
  perks?: Perk[];
  testID?: string;
}

/**
 * Bottom action bar with document selector and approve button.
 * Matches Figma design 15234:9322.
 */
export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  selectedDocumentName,
  onDocumentSelectorPress,
  onApprovePress,
  approveDisabled = false,
  approving = false,
  perks,
  testID = 'bottom-action-bar',
}) => {
  const hasPerks = !!perks && perks.length > 0;
  // Reduce top padding to balance with safe area bottom padding
  // The safe area hook adds significant padding on small screens for system UI
  const topPadding = 8;

  // Calculate dynamic bottom padding based on screen height
  // Scales proportionally to better center the select box beneath the disclosure list
  const { height: screenHeight } = Dimensions.get('window');
  const basePadding = 12;

  // Get safe area padding (handles small screens < 900px with extra padding)
  const safeAreaPadding = useSafeBottomPadding(basePadding);

  // Dynamic padding calculation:
  // - Start with safe area padding (includes base + small screen adjustment)
  // - Add additional padding that scales with screen height
  // - Formula: safeAreaPadding + (screenHeight - 800) * 0.12
  // - This provides base padding, safe area handling, plus 0-50px extra on larger screens
  // - The multiplier (0.12) ensures smooth scaling across different screen sizes
  const dynamicPadding = useMemo(() => {
    const heightMultiplier = Math.max(0, (screenHeight - 800) * 0.12);
    return Math.round(safeAreaPadding + heightMultiplier);
  }, [screenHeight, safeAreaPadding]);

  const bottomPadding = dynamicPadding;

  return (
    <View
      backgroundColor={proofRequestColors.white}
      paddingHorizontal={16}
      paddingTop={topPadding}
      paddingBottom={bottomPadding}
      testID={testID}
    >
      <XStack gap={12} alignItems="flex-start">
        {/* Document Selector + (optional) Perk Eligibility row */}
        <View
          flex={1}
          borderWidth={1}
          borderColor={proofRequestColors.slate200}
          borderRadius={hasPerks ? 16 : 4}
          overflow="hidden"
          backgroundColor={proofRequestColors.white}
        >
          <Pressable
            onPress={onDocumentSelectorPress}
            style={({ pressed }) => [
              styles.documentButtonInner,
              pressed && styles.documentButtonPressed,
            ]}
            testID={`${testID}-document-selector`}
          >
            <XStack
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal={12}
              paddingVertical={12}
            >
              <Text
                fontFamily={dinot}
                fontSize={18}
                color={proofRequestColors.slate900}
                numberOfLines={1}
                allowFontScaling={false}
              >
                {selectedDocumentName}
              </Text>
              <View marginLeft={8}>
                <ChevronUpDownIcon
                  size={20}
                  color={proofRequestColors.slate400}
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

        {/* Select Button */}
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
          <View
            alignItems="center"
            justifyContent="center"
            paddingHorizontal={12}
            paddingVertical={12}
          >
            {approving ? (
              <ActivityIndicator
                color={proofRequestColors.white}
                size="small"
              />
            ) : (
              <Text
                fontFamily={dinot}
                fontSize={18}
                color={proofRequestColors.white}
                textAlign="center"
                allowFontScaling={false}
              >
                Select
              </Text>
            )}
          </View>
        </Pressable>
      </XStack>
    </View>
  );
};

const styles = StyleSheet.create({
  documentButtonInner: {
    backgroundColor: proofRequestColors.white,
  },
  documentButtonPressed: {
    backgroundColor: proofRequestColors.slate100,
  },
  approveButton: {
    flex: 1,
    backgroundColor: proofRequestColors.blue600,
    borderRadius: 4,
  },
  approveButtonDisabled: {
    opacity: 0.5,
  },
  approveButtonPressed: {
    backgroundColor: proofRequestColors.blue700,
  },
});
