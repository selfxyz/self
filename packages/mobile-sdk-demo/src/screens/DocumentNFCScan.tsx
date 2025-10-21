// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

import { DocumentNFCScreen } from '@selfxyz/mobile-sdk-alpha/onboarding/document-nfc-screen';
import { Alert } from 'react-native';

type Props = {
  onBack: () => void;
  onNavigate: (screen: string, params?: any) => void;
};

export default function DocumentNFCScan({ onBack }: Props) {
  return (
    <DocumentNFCScreen
      onBack={onBack}
      onError={(message: string) => {
        Alert.alert('Error', message);
      }}
    />
  );
}
