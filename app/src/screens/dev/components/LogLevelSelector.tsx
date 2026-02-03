// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
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

interface LogLevelSelectorProps {
  currentLevel: string;
  onSelect: (level: 'debug' | 'info' | 'warn' | 'error') => void;
}

export const LogLevelSelector: React.FC<LogLevelSelectorProps> = ({
  currentLevel,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);

  const logLevels = ['debug', 'info', 'warn', 'error'] as const;

  return (
    <>
      <Button
        style={{ backgroundColor: 'white' }}
        borderColor={slate200}
        borderRadius="$2"
        height="$5"
        padding={0}
        onPress={() => setOpen(true)}
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
        onOpenChange={setOpen}
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
                onPress={() => setOpen(false)}
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
                  onPress={() => {
                    setOpen(false);
                    onSelect(level);
                  }}
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
