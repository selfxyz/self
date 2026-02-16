// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Button, Sheet, Text, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { ChevronDown } from '@tamagui/lucide-icons/icons/ChevronDown';

import {
  slate200,
  slate500,
  slate600,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { navigationScreens } from '@/navigation';

export const ScreenSelector = () => {
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);

  const screenList = useMemo(
    () =>
      (
        Object.keys(navigationScreens) as (keyof typeof navigationScreens)[]
      ).sort(),
    [],
  );

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
            Select screen
          </Text>
          <ChevronDown color={slate500} strokeWidth={2.5} />
        </XStack>
      </Button>

      <Sheet
        modal
        open={open}
        onOpenChange={setOpen}
        snapPoints={[85]}
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
                Select screen
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
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
              {screenList.map(item => (
                <TouchableOpacity
                  key={item}
                  onPress={() => {
                    setOpen(false);
                    navigation.navigate(item as never);
                  }}
                >
                  <XStack
                    paddingVertical="$3"
                    paddingHorizontal="$2"
                    borderBottomWidth={1}
                    borderBottomColor={slate200}
                  >
                    <Text fontSize="$5" color={slate600} fontFamily={dinot}>
                      {item}
                    </Text>
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
