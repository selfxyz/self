// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { Button, XStack, YStack } from 'tamagui';

import { BodyText } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate200,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { useSupportUuid } from '@/hooks/useSupportUuid';

interface SupportUuidRowProps {
  collapsedByDefault?: boolean;
  title?: string;
}

const SupportUuidRow: React.FC<SupportUuidRowProps> = ({
  collapsedByDefault = true,
  title = 'Diagnostic ID',
}) => {
  const [expanded, setExpanded] = useState(!collapsedByDefault);
  const { isEnabled, supportUuid, copy } = useSupportUuid();
  const diagnosticIdText = supportUuid ?? 'Loading diagnostic ID...';

  const handleCopy = useCallback(() => {
    copy();
    Alert.alert('Copied', 'Diagnostic ID copied to clipboard.');
  }, [copy]);

  const toggle = useCallback(() => setExpanded(prev => !prev), []);

  if (!isEnabled) {
    return null;
  }

  if (!expanded) {
    return (
      <Button
        unstyled
        onPress={toggle}
        borderWidth={1}
        borderColor={slate200}
        borderRadius={12}
        paddingVertical={10}
        paddingHorizontal={12}
      >
        <BodyText style={{ color: slate500 }}>Show diagnostic ID</BodyText>
      </Button>
    );
  }

  return (
    <YStack
      borderWidth={1}
      borderColor={slate200}
      borderRadius={12}
      padding={12}
      gap={8}
      backgroundColor={white}
    >
      <Button unstyled onPress={toggle} hitSlop={6}>
        <BodyText style={{ color: black, fontSize: 14 }}>{title}</BodyText>
      </Button>
      <BodyText style={{ color: slate500, fontSize: 13 }}>
        {diagnosticIdText}
      </BodyText>
      <XStack justifyContent="flex-end" alignItems="center">
        <Button unstyled onPress={handleCopy}>
          <BodyText style={{ color: black }}>Copy</BodyText>
        </Button>
      </XStack>
    </YStack>
  );
};

export default SupportUuidRow;
