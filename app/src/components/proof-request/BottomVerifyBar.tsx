// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'tamagui';

import { HeldPrimaryButtonProveScreen } from '@selfxyz/mobile-sdk-alpha/components';

import { proofRequestColors } from '@/components/proof-request/designTokens';

export interface BottomVerifyBarProps {
  onVerify: () => void;
  selectedAppSessionId: string | undefined | null;
  hasScrolledToBottom: boolean;
  isScrollable: boolean;
  isReadyToProve: boolean;
  isDocumentExpired: boolean;
  testID?: string;
}

export const BottomVerifyBar: React.FC<BottomVerifyBarProps> = ({
  onVerify,
  selectedAppSessionId,
  hasScrolledToBottom,
  isScrollable,
  isReadyToProve,
  isDocumentExpired,
  testID = 'bottom-verify-bar',
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      backgroundColor={proofRequestColors.white}
      paddingHorizontal={16}
      paddingTop={12}
      paddingBottom={Math.max(insets.bottom, 12) + 20}
      testID={testID}
    >
      <HeldPrimaryButtonProveScreen
        onVerify={onVerify}
        selectedAppSessionId={selectedAppSessionId}
        hasScrolledToBottom={hasScrolledToBottom}
        isScrollable={isScrollable}
        isReadyToProve={isReadyToProve}
        isDocumentExpired={isDocumentExpired}
      />
    </View>
  );
};
