// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Text, View, YStack } from 'tamagui';

import { useSelfClient } from '../../providers/SelfClientProvider';

export const VerificationResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useSelfClient();

  const { success = true, error } =
    (location.state as {
      success?: boolean;
      error?: string;
    }) || {};

  const onContinue = useCallback(() => {
    haptic.trigger('selection');
    navigate('/');
  }, [navigate, haptic]);

  return (
    <YStack flex={1} backgroundColor="#ffffff">
      {/* Top: result animation area */}
      <View
        flex={1}
        backgroundColor={success ? '#000000' : '#ffffff'}
        borderBottomLeftRadius={24}
        borderBottomRightRadius={24}
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize={96}>{success ? '✅' : '❌'}</Text>
      </View>

      {/* Bottom: result text + action */}
      <YStack
        paddingHorizontal={24}
        paddingTop={40}
        paddingBottom={40}
        gap={16}
        alignItems="center"
        backgroundColor="#ffffff"
      >
        <Text
          fontFamily="Advercase-Regular"
          fontSize={29}
          color="#000000"
          textAlign="center"
        >
          {success ? 'ID Verified' : 'Verification Failed'}
        </Text>

        <Text
          fontFamily="DINOT-Medium"
          fontSize={14}
          color="#64748B"
          textAlign="center"
          lineHeight={22}
          paddingHorizontal={16}
        >
          {success
            ? "Your document's information is now protected by Self ID. Just scan a participating partner's QR code to prove your identity."
            : (error ??
              'Something went wrong during verification. Please try again.')}
        </Text>

        <Button
          backgroundColor="#000000"
          color="#ffffff"
          fontFamily="DINOT-Medium"
          fontSize={16}
          borderRadius={12}
          height={52}
          width="100%"
          onPress={onContinue}
          pressStyle={{ opacity: 0.7 }}
        >
          Continue
        </Button>
      </YStack>
    </YStack>
  );
};
