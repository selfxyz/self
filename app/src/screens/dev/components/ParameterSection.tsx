// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React, { cloneElement, isValidElement, useState } from 'react';
import { Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { ChevronDown } from '@tamagui/lucide-icons';

import {
  slate100,
  slate200,
  slate400,
  slate600,
  slate800,
  slate900,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

interface ParameterSectionProps extends PropsWithChildren {
  icon: React.ReactNode;
  title: string;
  description: string;
  darkMode?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function ParameterSection({
  icon,
  title,
  description,
  darkMode,
  collapsible = false,
  defaultCollapsed = false,
  children,
}: ParameterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(
    collapsible ? !defaultCollapsed : true,
  );

  const renderIcon = () => {
    const iconElement =
      typeof icon === 'function'
        ? (icon as () => React.ReactNode)()
        : isValidElement(icon)
          ? icon
          : null;

    if (!isValidElement(iconElement)) {
      return null;
    }

    return cloneElement(
      iconElement as React.ReactElement<{
        width?: string | number;
        height?: string | number;
      }>,
      {
        width: '100%',
        height: '100%',
      },
    );
  };

  return (
    <YStack
      width="100%"
      backgroundColor={darkMode ? slate900 : slate100}
      borderRadius="$4"
      borderWidth={1}
      borderColor={darkMode ? slate800 : slate200}
      padding="$4"
      flexDirection="column"
      gap="$3"
    >
      <Pressable
        disabled={!collapsible}
        onPress={() => setIsExpanded(current => !current)}
        accessibilityRole={collapsible ? 'button' : undefined}
        accessibilityState={collapsible ? { expanded: isExpanded } : undefined}
      >
        <XStack
          width="100%"
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          gap="$3"
        >
          <XStack
            flex={1}
            flexDirection="row"
            justifyContent="flex-start"
            gap="$4"
          >
            <YStack
              backgroundColor="gray"
              borderRadius={5}
              width={46}
              height={46}
              justifyContent="center"
              alignItems="center"
              padding="$2"
            >
              {renderIcon()}
            </YStack>
            <YStack flex={1} flexDirection="column" gap="$1">
              <Text
                fontSize="$5"
                color={darkMode ? white : slate600}
                fontFamily={dinot}
              >
                {title}
              </Text>
              <Text fontSize="$3" color={slate400} fontFamily={dinot}>
                {description}
              </Text>
            </YStack>
          </XStack>
          {collapsible && (
            <ChevronDown
              color={darkMode ? white : slate600}
              strokeWidth={2.5}
              style={{
                transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
              }}
            />
          )}
        </XStack>
      </Pressable>
      {isExpanded ? children : null}
    </YStack>
  );
}
