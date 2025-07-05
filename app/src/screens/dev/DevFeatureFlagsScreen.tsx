// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { useCallback, useEffect, useState } from 'react';
import { Button, ScrollView, Switch, Text, XStack, YStack } from 'tamagui';

import {
  clearAllLocalOverrides,
  getAllFeatureFlags,
  refreshRemoteConfig,
  setLocalOverride,
} from '../../RemoteConfig';
import { textBlack } from '../../utils/colors';

interface FeatureFlag {
  key: string;
  value: boolean;
  source: string;
  remoteValue?: boolean;
  overrideValue?: boolean;
}

const DevFeatureFlagsScreen: React.FC = () => {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTogglingFlag, setIsTogglingFlag] = useState<string | null>(null);
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

  const handleToggleFlag = useCallback(
    async (flagKey: string, currentValue: boolean) => {
      setIsTogglingFlag(flagKey);
      try {
        await setLocalOverride(flagKey, !currentValue);
        await loadFeatureFlags();
      } catch (error) {
        console.error('Failed to toggle flag:', error);
      } finally {
        setIsTogglingFlag(null);
      }
    },
    [loadFeatureFlags],
  );

  const handleClearAllOverrides = useCallback(async () => {
    setIsLoading(true);
    try {
      await clearAllLocalOverrides();
      await loadFeatureFlags();
    } catch (error) {
      console.error('Failed to clear all overrides:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadFeatureFlags]);

  useEffect(() => {
    loadFeatureFlags();
  }, [loadFeatureFlags]);

  const hasLocalOverrides = featureFlags.some(
    flag => flag.source === 'Local Override',
  );

  return (
    <YStack f={1} bg="white" px="$4" pt="$4">
      <YStack p="$4" mb="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <XStack alignItems="center" gap="$2">
            {hasLocalOverrides && (
              <Button
                size="$3"
                onPress={handleClearAllOverrides}
                disabled={isLoading}
              >
                Reset
              </Button>
            )}
            <Button size="$3" onPress={handleRefresh} disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </XStack>
          {lastRefresh && (
            <Text fontSize="$2" color="$gray9">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Text>
          )}
        </XStack>
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
                p="$3"
                borderWidth={1}
                borderColor="$gray6"
                borderRadius="$4"
                mb="$2"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$4" fontWeight="500">
                    {flag.key}
                  </Text>
                  <Switch
                    size="$4"
                    checked={flag.value}
                    onCheckedChange={() =>
                      handleToggleFlag(flag.key, flag.value)
                    }
                    disabled={isTogglingFlag === flag.key}
                    bg={flag.value ? '$green7Light' : '$gray4'}
                  >
                    <Switch.Thumb animation="quick" bc="$white" />
                  </Switch>
                </XStack>
                {flag.remoteValue !== undefined && (
                  <Text fontSize="$2" color="$gray9" mt="$2">
                    Default: {flag.remoteValue ? 'Enabled' : 'Disabled'}
                  </Text>
                )}
              </YStack>
            ))
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
};

export default DevFeatureFlagsScreen;
