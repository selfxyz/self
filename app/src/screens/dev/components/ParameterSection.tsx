// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React, { cloneElement, isValidElement } from 'react';
import { Text, XStack, YStack } from 'tamagui';

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
}

export function ParameterSection({
  icon,
  title,
  description,
  darkMode,
  children,
}: ParameterSectionProps) {
  const renderIcon = () => {
    const iconElement =
      typeof icon === 'function'
        ? (icon as () => React.ReactNode)()
        : isValidElement(icon)
          ? icon
          : null;

    return iconElement
      ? cloneElement(iconElement as React.ReactElement, {
          width: '100%',
          height: '100%',
        })
      : null;
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
      <XStack
        width="100%"
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
        <YStack flexDirection="column" gap="$1">
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
      {children}
    </YStack>
  );
}
