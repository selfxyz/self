// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Text, View, YStack } from 'tamagui';

import { useSelfClient } from '../providers/SelfClientProvider';

export const ComingSoonScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();

  const { countryCode, documentCategory } = (location.state as {
    countryCode?: string;
    documentCategory?: string;
  }) || {};

  const documentTypeText = documentCategory === 'id_card'
    ? 'ID Cards'
    : documentCategory === 'passport'
      ? 'Passports'
      : '';

  const onDismiss = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('coming_soon_dismissed');
    navigate('/');
  }, [navigate, haptic, analytics]);

  const onNotifyMe = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('coming_soon_notify_me');
    // In the WebView context, notify-me could trigger a bridge call
    // For now, just navigate home
    navigate('/');
  }, [navigate, haptic, analytics]);

  return (
    <YStack flex={1} backgroundColor="#ffffff">
      {/* Content */}
      <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal={24}>
        {countryCode && (
          <View
            width={60}
            height={60}
            borderRadius={30}
            backgroundColor="#E2E8F0"
            alignItems="center"
            justifyContent="center"
            marginBottom={20}
          >
            <Text fontSize={28}>{countryCode.slice(0, 2)}</Text>
          </View>
        )}

        <Text
          fontFamily="Advercase-Regular"
          fontSize={32}
          color="#000000"
          textAlign="center"
          marginBottom={16}
        >
          Coming Soon
        </Text>

        <Text
          fontFamily="DINOT-Medium"
          fontSize={17}
          color="#000000"
          textAlign="center"
          marginBottom={10}
        >
          {documentTypeText
            ? `We're working to roll out support for ${documentTypeText}.`
            : "We're working to roll out support for this feature."}
        </Text>

        <Text
          fontFamily="DINOT-Medium"
          fontSize={17}
          color="#64748B"
          textAlign="center"
          marginBottom={40}
        >
          If you&apos;d like to be notified when this becomes available, let us know.
        </Text>
      </YStack>

      {/* Bottom buttons */}
      <YStack paddingHorizontal={20} paddingBottom={40} gap={16}>
        <Button
          backgroundColor="#000000"
          color="#ffffff"
          fontFamily="DINOT-Medium"
          borderRadius={12}
          height={52}
          onPress={onNotifyMe}
          pressStyle={{ opacity: 0.7 }}
        >
          Notify Me
        </Button>

        <Button
          backgroundColor="transparent"
          borderWidth={1}
          borderColor="#CBD5E1"
          borderRadius={12}
          height={52}
          fontFamily="DINOT-Medium"
          color="#000000"
          onPress={onDismiss}
          pressStyle={{ opacity: 0.7 }}
        >
          Dismiss
        </Button>
      </YStack>
    </YStack>
  );
};
