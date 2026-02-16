// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Text, View, YStack } from 'tamagui';

import { useSelfClient } from '../../providers/SelfClientProvider';

export const ConfirmIdentificationScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic, lifecycle } = useSelfClient();

  useEffect(() => {
    haptic.trigger('success');
  }, [haptic]);

  const onConfirm = useCallback(async () => {
    haptic.trigger('selection');
    analytics.trackEvent('ownership_confirmed');

    try {
      await lifecycle.setResult({
        type: 'documentOwnershipConfirmed',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      analytics.trackEvent('proving_process_error', { error: message });
    }

    navigate('/');
  }, [navigate, analytics, haptic, lifecycle]);

  return (
    <YStack flex={1} backgroundColor="#000000">
      {/* Top: success animation area */}
      <View
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="#000000"
      >
        <Text fontSize={96}>✅</Text>
      </View>

      {/* Bottom: confirmation */}
      <YStack
        backgroundColor="#ffffff"
        borderTopLeftRadius={24}
        borderTopRightRadius={24}
        paddingHorizontal={24}
        paddingTop={32}
        paddingBottom={40}
        gap={20}
      >
        <Text
          fontFamily="Advercase-Regular"
          fontSize={29}
          color="#000000"
          textAlign="center"
        >
          Confirm your identity
        </Text>

        <Text
          fontFamily="DINOT-Medium"
          fontSize={14}
          color="#64748B"
          textAlign="center"
          lineHeight={22}
        >
          By continuing, you certify that this passport, biometric ID or Aadhaar
          card belongs to you and is not stolen or forged. Once registered with
          Self, this document will be permanently linked to your identity and
          can&apos;t be linked to another one.
        </Text>

        <Button
          backgroundColor="#000000"
          color="#ffffff"
          fontFamily="DINOT-Medium"
          fontSize={16}
          borderRadius={12}
          height={52}
          onPress={onConfirm}
          pressStyle={{ opacity: 0.7 }}
        >
          Confirm
        </Button>
      </YStack>
    </YStack>
  );
};
