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

import { copySupportUuid, getSupportUuid } from '@/services/supportUuid';
import { useSettingStore } from '@/stores/settingStore';

interface SupportUuidRowProps {
  collapsedByDefault?: boolean;
  title?: string;
}

const SupportUuidRow: React.FC<SupportUuidRowProps> = ({
  collapsedByDefault = true,
  title = 'Diagnostic ID',
}) => {
  const [expanded, setExpanded] = useState(!collapsedByDefault);
  const supportUuid =
    useSettingStore(state => state.supportUuid) ?? getSupportUuid();

  const handleCopy = useCallback(() => {
    copySupportUuid();
    Alert.alert('Copied', 'Diagnostic ID copied to clipboard.');
  }, []);

  if (!expanded) {
    return (
      <Button
        unstyled
        onPress={() => setExpanded(true)}
        borderWidth={1}
        borderColor={slate200}
        borderRadius={12}
        paddingVertical={10}
        paddingHorizontal={12}
      >
        <BodyText style={{ color: slate500 }}>Show diagnostic info</BodyText>
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
      <BodyText style={{ color: black, fontSize: 14 }}>{title}</BodyText>
      <BodyText style={{ color: slate500, fontSize: 13 }}>
        {supportUuid}
      </BodyText>
      <XStack justifyContent="space-between" alignItems="center">
        {collapsedByDefault ? (
          <Button unstyled onPress={() => setExpanded(false)}>
            <BodyText style={{ color: slate500 }}>Hide</BodyText>
          </Button>
        ) : (
          <YStack />
        )}
        <Button unstyled onPress={handleCopy}>
          <BodyText style={{ color: black }}>Copy</BodyText>
        </Button>
      </XStack>
    </YStack>
  );
};

export default SupportUuidRow;
