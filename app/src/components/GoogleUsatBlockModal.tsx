// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import AlertModal, { type AlertModalParams } from '@/components/AlertModal';
import type { RootStackParamList } from '@/navigation';
import { useGoogleUsatBlockStore } from '@/stores/googleUsatBlockStore';

const GoogleUsatBlockModal: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selfClient = useSelfClient();
  const { isOpen, close } = useGoogleUsatBlockStore();

  const modalParams = useMemo<AlertModalParams>(
    () => ({
      titleText: 'High-security ID required',
      bodyText:
        "This verification needs a passport or NFC-verified ID. Your current ID can't be used here. Register a high-security ID to continue.",
      buttonText: 'Register a high-security ID',
      secondaryButtonText: 'Not now',
      onButtonPress: () => {
        selfClient.trackEvent(ProofEvents.GOOGLE_USAT_RECOVER_CLICKED);
        navigation.navigate('CountryPicker');
      },
      onSecondaryButtonPress: () => {
        selfClient.trackEvent(ProofEvents.GOOGLE_USAT_BLOCK_DISMISSED);
      },
      onModalDismiss: () => {
        selfClient.trackEvent(ProofEvents.GOOGLE_USAT_BLOCK_DISMISSED);
      },
    }),
    [navigation, selfClient],
  );

  return <AlertModal visible={isOpen} modalParams={modalParams} onHideModal={close} />;
};

export default GoogleUsatBlockModal;
