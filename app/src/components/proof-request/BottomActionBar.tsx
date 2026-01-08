// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack } from 'tamagui';

import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { proofRequestColors } from '@/components/proof-request/designTokens';
import { ChevronUpDownIcon } from '@/components/proof-request/icons';

export interface BottomActionBarProps {
  selectedDocumentName: string;
  onDocumentSelectorPress: () => void;
  onApprovePress: () => void;
  approveDisabled?: boolean;
  approving?: boolean;
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
  testID = 'bottom-action-bar',
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      backgroundColor={proofRequestColors.white}
      paddingHorizontal={16}
      paddingTop={12}
      paddingBottom={Math.max(insets.bottom, 12) + 12}
      testID={testID}
    >
      <XStack gap={12}>
        {/* Document Selector Button */}
        <Pressable
          onPress={onDocumentSelectorPress}
          style={({ pressed }) => [
            styles.documentButton,
            pressed && styles.documentButtonPressed,
          ]}
          testID={`${testID}-document-selector`}
        >
          <XStack
            flex={1}
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={16}
            paddingVertical={16}
          >
            <Text
              fontFamily={dinot}
              fontSize={16}
              color={proofRequestColors.slate900}
              flex={1}
              numberOfLines={1}
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

        {/* Approve Button */}
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
            paddingHorizontal={24}
            paddingVertical={16}
          >
            {approving ? (
              <ActivityIndicator
                color={proofRequestColors.white}
                size="small"
              />
            ) : (
              <Text
                fontFamily={dinot}
                fontSize={16}
                color={proofRequestColors.white}
                textAlign="center"
              >
                Approve
              </Text>
            )}
          </View>
        </Pressable>
      </XStack>
    </View>
  );
};

const styles = StyleSheet.create({
  documentButton: {
    flex: 2,
    backgroundColor: proofRequestColors.white,
    borderWidth: 1,
    borderColor: proofRequestColors.slate200,
    borderRadius: 8,
  },
  documentButtonPressed: {
    backgroundColor: proofRequestColors.slate100,
  },
  approveButton: {
    flex: 1,
    backgroundColor: proofRequestColors.blue600,
    borderRadius: 8,
  },
  approveButtonDisabled: {
    opacity: 0.5,
  },
  approveButtonPressed: {
    backgroundColor: proofRequestColors.blue700,
  },
});
