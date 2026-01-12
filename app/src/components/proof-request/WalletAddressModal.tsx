// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';
import Clipboard from '@react-native-clipboard/clipboard';

import { dinot, plexMono } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { proofRequestColors } from '@/components/proof-request/designTokens';
import { CopyIcon, WalletIcon } from '@/components/proof-request/icons';

export interface WalletAddressModalProps {
  visible: boolean;
  onClose: () => void;
  address: string;
  userIdType?: string;
  testID?: string;
}

/**
 * Modal that displays the full wallet address with copy functionality.
 * Appears when user taps on the truncated wallet badge.
 */
export const WalletAddressModal: React.FC<WalletAddressModalProps> = ({
  visible,
  onClose,
  address,
  userIdType,
  testID = 'wallet-address-modal',
}) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const label = userIdType === 'hex' ? 'Connected Wallet' : 'Connected ID';

  // Reset copied state when modal closes
  useEffect(() => {
    if (!visible) {
      setCopied(false);
    }
  }, [visible]);

  // Clear timeout on unmount or when modal closes/address changes
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [visible, address, onClose]);

  const handleCopy = useCallback(() => {
    // Clear any existing timeout before setting a new one
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    Clipboard.setString(address);
    setCopied(true);

    // Reset copied state and close after a brief delay
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      onClose();
      timeoutRef.current = null;
    }, 800);
  }, [address, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.container}>
          <Pressable onPress={e => e.stopPropagation()}>
            <YStack
              backgroundColor={proofRequestColors.white}
              borderRadius={16}
              paddingHorizontal={24}
              paddingVertical={24}
              gap={20}
              minWidth={300}
              maxWidth="90%"
              elevation={8}
              shadowColor={proofRequestColors.black}
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.3}
              shadowRadius={8}
            >
              {/* Header */}
              <YStack gap={8}>
                <XStack alignItems="center" gap={8}>
                  <WalletIcon size={20} color={proofRequestColors.blue600} />
                  <Text
                    fontFamily={dinot}
                    fontSize={18}
                    color={proofRequestColors.slate900}
                    fontWeight="600"
                  >
                    {label}
                  </Text>
                </XStack>
              </YStack>

              {/* Full Address */}
              <View
                backgroundColor={proofRequestColors.slate100}
                padding={16}
                borderRadius={8}
                borderWidth={1}
                borderColor={proofRequestColors.slate200}
              >
                <Text
                  fontFamily={plexMono}
                  fontSize={14}
                  color={proofRequestColors.slate900}
                  numberOfLines={undefined}
                  ellipsizeMode="middle"
                  testID={`${testID}-full-address`}
                >
                  {address}
                </Text>
              </View>

              {/* Action Buttons */}
              <XStack gap={12}>
                <Pressable
                  onPress={handleCopy}
                  disabled={copied}
                  style={({ pressed }) => [
                    copied ? styles.copiedButton : styles.copyButton,
                    pressed && !copied && styles.copyButtonPressed,
                  ]}
                  testID={`${testID}-copy`}
                >
                  <XStack
                    alignItems="center"
                    justifyContent="center"
                    gap={8}
                    paddingVertical={14}
                  >
                    {copied ? (
                      <Text
                        fontSize={16}
                        fontWeight="600"
                        color={proofRequestColors.white}
                      >
                        ✓
                      </Text>
                    ) : (
                      <CopyIcon size={16} color={proofRequestColors.white} />
                    )}
                    <Text
                      fontFamily={dinot}
                      fontSize={16}
                      color={proofRequestColors.white}
                      fontWeight="600"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </Text>
                  </XStack>
                </Pressable>

                {!copied && (
                  <Pressable
                    onPress={onClose}
                    style={({ pressed }) => [
                      styles.closeButton,
                      pressed && styles.closeButtonPressed,
                    ]}
                    testID={`${testID}-close`}
                  >
                    <View
                      alignItems="center"
                      justifyContent="center"
                      paddingVertical={14}
                    >
                      <Text
                        fontFamily={dinot}
                        fontSize={16}
                        color={proofRequestColors.slate500}
                        fontWeight="600"
                      >
                        Close
                      </Text>
                    </View>
                  </Pressable>
                )}
              </XStack>
            </YStack>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  copyButton: {
    flex: 1,
    backgroundColor: proofRequestColors.blue600,
    borderRadius: 8,
  },
  copyButtonPressed: {
    backgroundColor: proofRequestColors.blue700,
  },
  copiedButton: {
    flex: 1,
    backgroundColor: proofRequestColors.emerald500,
    borderRadius: 8,
  },
  closeButton: {
    flex: 1,
    backgroundColor: proofRequestColors.slate100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: proofRequestColors.slate200,
  },
  closeButtonPressed: {
    backgroundColor: proofRequestColors.slate200,
  },
});
