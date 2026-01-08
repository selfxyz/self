// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack } from 'tamagui';

import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import {
  proofRequestColors,
  sfSymbols,
} from '@/components/proof-request/designTokens';

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
      paddingHorizontal={10}
      paddingTop={10}
      paddingBottom={Math.max(insets.bottom, 20) + 10}
      testID={testID}
    >
      <XStack gap={10}>
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
            paddingHorizontal={10}
            paddingVertical={12}
          >
            <Text
              fontFamily={dinot}
              fontSize={18}
              color={proofRequestColors.black}
              flex={1}
              numberOfLines={1}
            >
              {selectedDocumentName}
            </Text>
            <Text
              fontSize={17}
              fontWeight="700"
              color={proofRequestColors.black}
              fontFamily={Platform.OS === 'ios' ? 'SF Pro' : undefined}
            >
              {sfSymbols.chevronUpDown}
            </Text>
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
            flex={1}
            alignItems="center"
            justifyContent="center"
            paddingHorizontal={10}
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
    flex: 1,
    backgroundColor: proofRequestColors.white,
    borderWidth: 1,
    borderColor: proofRequestColors.slate200,
    borderRadius: 4,
  },
  documentButtonPressed: {
    opacity: 0.7,
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
    opacity: 0.8,
  },
});
