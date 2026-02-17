// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Button, Sheet, Text, XStack, YStack } from 'tamagui';
import { Check, ChevronDown } from '@tamagui/lucide-icons';

import {
  slate200,
  slate500,
  slate600,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import {
  registerModalCallbacks,
  unregisterModalCallbacks,
} from '@/utils/modalCallbackRegistry';

interface LogLevelSelectorProps {
  currentLevel: string;
  onSelect: (level: 'debug' | 'info' | 'warn' | 'error') => void;
}

export const LogLevelSelector: React.FC<LogLevelSelectorProps> = ({
  currentLevel,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const callbackIdRef = useRef<number>();

  const logLevels = ['debug', 'info', 'warn', 'error'] as const;

  // Cleanup effect to unregister callbacks on unmount
  useEffect(() => {
    return () => {
      if (callbackIdRef.current !== undefined) {
        unregisterModalCallbacks(callbackIdRef.current);
        callbackIdRef.current = undefined;
      }
    };
  }, []);

  const handleModalDismiss = useCallback(() => {
    setOpen(false);
    if (callbackIdRef.current !== undefined) {
      unregisterModalCallbacks(callbackIdRef.current);
      callbackIdRef.current = undefined;
    }
  }, []);

  const openSheet = useCallback(() => {
    setOpen(true);
    const id = registerModalCallbacks({
      onButtonPress: () => {},
      onModalDismiss: handleModalDismiss,
    });
    callbackIdRef.current = id;
  }, [handleModalDismiss]);

  const closeSheet = useCallback(() => {
    handleModalDismiss();
  }, [handleModalDismiss]);

  const handleSheetOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        handleModalDismiss();
      } else {
        setOpen(isOpen);
      }
    },
    [handleModalDismiss],
  );

  const handleLevelSelect = useCallback(
    (level: 'debug' | 'info' | 'warn' | 'error') => {
      closeSheet();
      onSelect(level);
    },
    [closeSheet, onSelect],
  );

  return (
    <>
      <Button
        style={{ backgroundColor: 'white' }}
        borderColor={slate200}
        borderRadius="$2"
        height="$5"
        padding={0}
        onPress={openSheet}
      >
        <XStack
          width="100%"
          justifyContent="space-between"
          paddingVertical="$3"
          paddingLeft="$4"
          paddingRight="$1.5"
        >
          <Text fontSize="$5" color={slate500} fontFamily={dinot}>
            {currentLevel.toUpperCase()}
          </Text>
          <ChevronDown color={slate500} strokeWidth={2.5} />
        </XStack>
      </Button>

      <Sheet
        modal
        open={open}
        onOpenChange={handleSheetOpenChange}
        snapPoints={[50]}
        animation="medium"
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame
          backgroundColor={white}
          borderTopLeftRadius="$9"
          borderTopRightRadius="$9"
        >
          <YStack padding="$4">
            <XStack
              alignItems="center"
              justifyContent="space-between"
              marginBottom="$4"
            >
              <Text fontSize="$8" fontFamily={dinot}>
                Select log level
              </Text>
              <Button
                onPress={closeSheet}
                padding="$2"
                backgroundColor="transparent"
              >
                <ChevronDown
                  color={slate500}
                  strokeWidth={2.5}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </Button>
            </XStack>
            <ScrollView showsVerticalScrollIndicator={false}>
              {logLevels.map(level => (
                <TouchableOpacity
                  key={level}
                  onPress={() => handleLevelSelect(level)}
                >
                  <XStack
                    paddingVertical="$3"
                    paddingHorizontal="$2"
                    borderBottomWidth={1}
                    borderBottomColor={slate200}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Text fontSize="$5" color={slate600} fontFamily={dinot}>
                      {level.toUpperCase()}
                    </Text>
                    {currentLevel === level && (
                      <Check color={slate600} size={20} />
                    )}
                  </XStack>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
};
