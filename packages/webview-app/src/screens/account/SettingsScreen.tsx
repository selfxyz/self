// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ScrollView, Text, View, XStack, YStack } from 'tamagui';

import { useSelfClient } from '../../providers/SelfClientProvider';

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress }) => (
  <XStack
    backgroundColor="#ffffff"
    borderRadius={12}
    padding={16}
    alignItems="center"
    gap={12}
    pressStyle={{ backgroundColor: '#F8FAFC' }}
    onPress={onPress}
    cursor="pointer"
  >
    <Text fontSize={20}>{icon}</Text>
    <Text fontFamily="DINOT-Medium" fontSize={16} color="#000000" flex={1}>
      {label}
    </Text>
    <Text fontSize={16} color="#94A3B8">
      ›
    </Text>
  </XStack>
);

export const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic, lifecycle } = useSelfClient();

  const onBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/');
  }, [navigate, haptic]);

  const onDismiss = useCallback(async () => {
    haptic.trigger('selection');
    analytics.trackEvent('settings_dismiss_pressed');
    lifecycle.dismiss();
  }, [haptic, analytics, lifecycle]);

  return (
    <YStack flex={1} backgroundColor="#F8FAFC">
      {/* Header */}
      <XStack
        paddingHorizontal={20}
        paddingTop={20}
        paddingBottom={16}
        alignItems="center"
        gap={12}
      >
        <Button
          unstyled
          onPress={onBack}
          pressStyle={{ opacity: 0.7 }}
          cursor="pointer"
        >
          <Text fontSize={24} color="#000000">
            ←
          </Text>
        </Button>
        <Text fontFamily="Advercase-Regular" fontSize={20} color="#000000">
          Settings
        </Text>
      </XStack>

      <ScrollView flex={1} paddingHorizontal={20}>
        <YStack gap={8}>
          <Text
            fontFamily="DINOT-Medium"
            fontSize={12}
            color="#94A3B8"
            textTransform="uppercase"
            letterSpacing={1}
            paddingBottom={8}
          >
            Account
          </Text>

          <MenuItem
            icon="📄"
            label="View document info"
            onPress={() => navigate('/coming-soon')}
          />
          <MenuItem
            icon="🔒"
            label="Recovery phrase"
            onPress={() => navigate('/coming-soon')}
          />
          <MenuItem
            icon="☁️"
            label="Cloud backup"
            onPress={() => navigate('/coming-soon')}
          />

          <View height={24} />

          <Text
            fontFamily="DINOT-Medium"
            fontSize={12}
            color="#94A3B8"
            textTransform="uppercase"
            letterSpacing={1}
            paddingBottom={8}
          >
            Support
          </Text>

          <MenuItem
            icon="💬"
            label="Get support"
            onPress={() => navigate('/coming-soon')}
          />
          <MenuItem
            icon="📤"
            label="Share Self"
            onPress={() => navigate('/coming-soon')}
          />

          <View height={24} />

          {/* Dismiss SDK button */}
          <Button
            backgroundColor="transparent"
            borderWidth={1}
            borderColor="#CBD5E1"
            borderRadius={12}
            height={52}
            fontFamily="DINOT-Medium"
            color="#EF4444"
            onPress={onDismiss}
            pressStyle={{ opacity: 0.7 }}
          >
            Close Self
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  );
};
