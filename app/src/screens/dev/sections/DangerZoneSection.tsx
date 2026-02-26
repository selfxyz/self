// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Button, Text } from 'tamagui';

import {
  red500,
  slate500,
  white,
  yellow500,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import WarningIcon from '@/assets/icons/warning.svg';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';

interface DangerZoneSectionProps {
  onClearSecrets: () => void;
  onClearDocumentCatalog: () => void;
  onClearPointEvents: () => void;
  onResetBackupState: () => void;
  onClearBackupEvents: () => void;
  onClearPendingKyc: () => void;
  onRemoveExpirationDateFlag: () => void;
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({
  onClearSecrets,
  onClearDocumentCatalog,
  onClearPointEvents,
  onResetBackupState,
  onClearBackupEvents,
  onClearPendingKyc,
  onRemoveExpirationDateFlag,
}) => {
  const dangerActions = [
    {
      label: 'Delete your private key',
      onPress: onClearSecrets,
      dangerTheme: true,
    },
    {
      label: 'Clear document catalog',
      onPress: onClearDocumentCatalog,
      dangerTheme: true,
    },
    {
      label: 'Clear point events',
      onPress: onClearPointEvents,
      dangerTheme: true,
    },
    {
      label: 'Reset backup state',
      onPress: onResetBackupState,
      dangerTheme: true,
    },
    {
      label: 'Clear backup events',
      onPress: onClearBackupEvents,
      dangerTheme: true,
    },
    {
      label: 'Clear Pending KYC verifications',
      onPress: onClearPendingKyc,
      dangerTheme: true,
    },
    {
      label: 'Remove expiration date flag',
      onPress: onRemoveExpirationDateFlag,
      dangerTheme: true,
    },
  ];

  return (
    <ParameterSection
      icon={<WarningIcon color={yellow500} />}
      title="Danger Zone"
      description="These actions are sensitive"
      darkMode={true}
    >
      {dangerActions.map(({ label, onPress, dangerTheme }) => (
        <Button
          key={label}
          style={{ backgroundColor: dangerTheme ? red500 : white }}
          borderRadius="$2"
          height="$5"
          onPress={onPress}
          flexDirection="row"
          justifyContent="flex-start"
        >
          <Text
            color={dangerTheme ? white : slate500}
            fontSize="$5"
            fontFamily={dinot}
          >
            {label}
          </Text>
        </Button>
      ))}
    </ParameterSection>
  );
};
