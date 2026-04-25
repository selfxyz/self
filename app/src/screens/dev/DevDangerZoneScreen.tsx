// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { ScrollView } from 'react-native';
import { YStack } from 'tamagui';

import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import ErrorBoundary from '@/components/ErrorBoundary';
import { useDangerZoneActions } from '@/screens/dev/hooks/useDangerZoneActions';
import { DangerZoneSection } from '@/screens/dev/sections';

const DevDangerZoneScreen: React.FC = () => {
  const paddingBottom = useSafeBottomPadding(20);
  const {
    handleClearSecretsPress,
    handleClearDocumentCatalogPress,
    handleClearPointEventsPress,
    handleResetBackupStatePress,
    handleClearBackupEventsPress,
    handleClearPendingVerificationsPress,
    handleRemoveExpirationDateFlagPress,
  } = useDangerZoneActions();

  return (
    <ErrorBoundary>
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack
          gap="$3"
          alignItems="center"
          backgroundColor="white"
          flex={1}
          paddingHorizontal="$4"
          paddingTop="$4"
          paddingBottom={paddingBottom}
        >
          <DangerZoneSection
            onClearSecrets={handleClearSecretsPress}
            onClearDocumentCatalog={handleClearDocumentCatalogPress}
            onClearPointEvents={handleClearPointEventsPress}
            onResetBackupState={handleResetBackupStatePress}
            onClearBackupEvents={handleClearBackupEventsPress}
            onClearPendingKyc={handleClearPendingVerificationsPress}
            onRemoveExpirationDateFlag={handleRemoveExpirationDateFlagPress}
          />
        </YStack>
      </ScrollView>
    </ErrorBoundary>
  );
};

export default DevDangerZoneScreen;
