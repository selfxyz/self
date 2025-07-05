// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { RefreshCw } from '@tamagui/lucide-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Button, ScrollView, Text, XStack, YStack } from 'tamagui';

import { getAllFeatureFlags, refreshRemoteConfig } from '../../RemoteConfig';
import { textBlack } from '../../utils/colors';

interface FeatureFlag {
  key: string;
  value: boolean;
  source: string;
}

const DevFeatureFlagsScreen: React.FC = () => {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadFeatureFlags = useCallback(async () => {
    try {
      const flags = await getAllFeatureFlags();
      setFeatureFlags(flags);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load feature flags:', error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await refreshRemoteConfig();
      await loadFeatureFlags();
    } catch (error) {
      console.error('Failed to refresh feature flags:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadFeatureFlags]);

  useEffect(() => {
    loadFeatureFlags();
  }, [loadFeatureFlags]);

  return (
    <YStack bg="white" f={1} px="$4" pt="$4">
      <YStack
        p="$4"
        borderWidth={2}
        borderColor="$blue8"
        borderRadius="$4"
        bg="$blue1"
        w="100%"
        gap="$3"
      >
        <XStack justifyContent="space-between" alignItems="center">
          <Text
            color="$blue10"
            fontWeight="bold"
            fontSize="$5"
            textAlign="center"
          >
            🏴 Feature Flags
          </Text>
          <Button
            size="$3"
            onPress={handleRefresh}
            bg="$blue8"
            color="white"
            disabled={isLoading}
            icon={RefreshCw}
            scaleIcon={1.5}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </XStack>

        {lastRefresh && (
          <Text color="$blue9" fontSize="$2" textAlign="center" opacity={0.8}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Text>
        )}
      </YStack>

      <ScrollView showsVerticalScrollIndicator={false} mt="$4">
        <YStack gap="$3" pb="$8">
          {featureFlags.length === 0 ? (
            <YStack
              p="$4"
              borderWidth={1}
              borderColor="$gray6"
              borderRadius="$4"
              bg="$gray2"
              alignItems="center"
              gap="$2"
            >
              <Text color={textBlack} fontSize="$4" textAlign="center">
                No feature flags found
              </Text>
              <Text
                color={textBlack}
                fontSize="$3"
                textAlign="center"
                opacity={0.7}
              >
                Feature flags will appear here once they are configured in
                Firebase Remote Config
              </Text>
            </YStack>
          ) : (
            featureFlags.map(flag => (
              <YStack
                key={flag.key}
                p="$4"
                borderWidth={1}
                borderColor={flag.value ? '$green8' : '$gray6'}
                borderRadius="$4"
                bg={flag.value ? '$green1' : '$gray2'}
                gap="$2"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <Text
                    color={textBlack}
                    fontSize="$4"
                    fontWeight="bold"
                    flex={1}
                  >
                    {flag.key}
                  </Text>
                  <YStack alignItems="flex-end" gap="$1">
                    <Text
                      color={flag.value ? '$green10' : '$gray10'}
                      fontSize="$3"
                      fontWeight="bold"
                    >
                      {flag.value ? 'ENABLED' : 'DISABLED'}
                    </Text>
                    <Text color={textBlack} fontSize="$2" opacity={0.6}>
                      {flag.source}
                    </Text>
                  </YStack>
                </XStack>
              </YStack>
            ))
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
};

export default DevFeatureFlagsScreen;
