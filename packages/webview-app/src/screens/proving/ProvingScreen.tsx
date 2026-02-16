// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ScrollView, Spinner, Text, View, XStack, YStack } from 'tamagui';

import { useSelfClient } from '../../providers/SelfClientProvider';

export const ProvingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic, lifecycle } = useSelfClient();
  const [proving, setProving] = useState(false);

  const onVerify = useCallback(async () => {
    haptic.trigger('selection');
    analytics.trackEvent('prove_verify_pressed');
    setProving(true);

    try {
      await lifecycle.setResult({
        type: 'proofRequested',
      });

      navigate('/proving/result', { state: { success: true } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Proving failed';
      analytics.trackEvent('prove_verify_failed', { error: message });
      navigate('/proving/result', { state: { success: false, error: message } });
    } finally {
      setProving(false);
    }
  }, [navigate, analytics, haptic, lifecycle]);

  const onCancel = useCallback(() => {
    haptic.trigger('selection');
    navigate('/');
  }, [navigate, haptic]);

  return (
    <YStack flex={1} backgroundColor="#ffffff">
      <ScrollView flex={1}>
        {/* Header */}
        <XStack
          paddingHorizontal={20}
          paddingTop={20}
          paddingBottom={12}
          alignItems="center"
        >
          <Button
            unstyled
            onPress={onCancel}
            pressStyle={{ opacity: 0.7 }}
            cursor="pointer"
          >
            <Text fontSize={24} color="#000000">←</Text>
          </Button>
        </XStack>

        <YStack paddingHorizontal={20} gap={24}>
          {/* Proof request info */}
          <YStack
            backgroundColor="#F8FAFC"
            borderRadius={16}
            padding={20}
            borderWidth={1}
            borderColor="#E2E8F0"
            gap={12}
          >
            <Text fontFamily="Advercase-Regular" fontSize={24} color="#000000">
              Proof Request
            </Text>
            <Text fontFamily="DINOT-Medium" fontSize={14} color="#64748B">
              A verification request has been received. Review the disclosure items below
              and confirm to generate a proof.
            </Text>
          </YStack>

          {/* Disclosure items placeholder */}
          <YStack gap={12}>
            <Text fontFamily="DINOT-Medium" fontSize={12} color="#94A3B8" textTransform="uppercase" letterSpacing={1}>
              Disclosure Items
            </Text>

            {['Age verification', 'Nationality', 'Document validity'].map((item) => (
              <XStack
                key={item}
                backgroundColor="#ffffff"
                borderRadius={12}
                padding={16}
                borderWidth={1}
                borderColor="#E2E8F0"
                alignItems="center"
                gap={12}
              >
                <View
                  width={8}
                  height={8}
                  borderRadius={4}
                  backgroundColor="#22C55E"
                />
                <Text fontFamily="DINOT-Medium" fontSize={16} color="#000000">
                  {item}
                </Text>
              </XStack>
            ))}
          </YStack>

          <Text
            fontFamily="DINOT-Medium"
            fontSize={11}
            color="#94A3B8"
            textAlign="center"
            textTransform="uppercase"
            letterSpacing={0.44}
          >
            Self does not share your raw data.
          </Text>
        </YStack>
      </ScrollView>

      {/* Bottom verify bar */}
      <YStack
        paddingHorizontal={20}
        paddingVertical={20}
        gap={12}
        borderTopWidth={1}
        borderTopColor="#E2E8F0"
        backgroundColor="#ffffff"
      >
        <Button
          backgroundColor="#000000"
          color="#ffffff"
          fontFamily="DINOT-Medium"
          borderRadius={12}
          height={52}
          onPress={onVerify}
          disabled={proving}
          pressStyle={{ opacity: 0.7 }}
        >
          {proving ? <Spinner size="small" color="#ffffff" /> : 'Verify'}
        </Button>
      </YStack>
    </YStack>
  );
};
