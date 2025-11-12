// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Input,
  ScrollView,
  Switch,
  Text,
  XStack,
  YStack,
} from 'tamagui';

import { textBlack } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import {
  clearAllLocalOverrides,
  getAllFeatureFlags,
  refreshRemoteConfig,
  setLocalOverride,
} from '@/config/remoteConfig';
import type { FeatureFlagValue } from '@/config/remoteConfig.shared';

interface FeatureFlag {
  key: string;
  value: FeatureFlagValue;
  source: string;
  type: 'boolean' | 'string' | 'number';
  remoteValue?: FeatureFlagValue;
  overrideValue?: FeatureFlagValue;
}

const DevFeatureFlagsScreen: React.FC = () => {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTogglingFlag, setIsTogglingFlag] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [textInputValues, setTextInputValues] = useState<
    Record<string, string>
  >({});
  const [errorState, setErrorState] = useState<string | null>(null);
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});
  const [debounceTimers, setDebounceTimers] = useState<
    Record<string, NodeJS.Timeout>
  >({});
  const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const loadFeatureFlags = useCallback(async () => {
    try {
      setErrorState(null);
      const flags = await getAllFeatureFlags();
      setFeatureFlags(flags);
      setLastRefresh(new Date());

      // Initialize text input values for non-boolean flags
      const initialTextValues: Record<string, string> = {};
      flags.forEach(flag => {
        if (flag.type !== 'boolean') {
          initialTextValues[flag.key] = String(flag.value);
        }
      });
      setTextInputValues(initialTextValues);
    } catch (error) {
      console.error('Failed to load feature flags:', error);
      setErrorState('Failed to load feature flags. Please try refreshing.');
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

  const handleSaveTextFlag = useCallback(
    async (flagKey: string, type: 'string' | 'number') => {
      setIsTogglingFlag(flagKey);
      try {
        const rawValue = textInputValues[flagKey] || '';
        let value: FeatureFlagValue;

        if (type === 'number') {
          value = Number(rawValue);
          if (Number.isNaN(value)) {
            setInputErrors(prev => ({
              ...prev,
              [flagKey]: 'Please enter a valid number',
            }));
            return;
          }
        } else {
          value = rawValue;
        }

        // Clear any previous error for this field
        setInputErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[flagKey];
          return newErrors;
        });

        await setLocalOverride(flagKey, value);
        await loadFeatureFlags();
      } catch (error) {
        console.error('Failed to save flag:', error);
        setInputErrors(prev => ({
          ...prev,
          [flagKey]: 'Failed to save value',
        }));
      } finally {
        setIsTogglingFlag(null);
      }
    },
    [textInputValues, loadFeatureFlags],
  );

  const handleTextInputChange = useCallback(
    (flagKey: string, value: string) => {
      setTextInputValues(prev => ({
        ...prev,
        [flagKey]: value,
      }));
    },
    [],
  );

  const debouncedSave = useCallback(
    (flagKey: string, type: 'string' | 'number') => {
      // Clear existing timer for this flag if it exists
      if (debounceTimers[flagKey]) {
        clearTimeout(debounceTimers[flagKey]);
      }

      // Set a new timer
      const timer = setTimeout(() => {
        handleSaveTextFlag(flagKey, type);
        setDebounceTimers(prev => {
          const newTimers = { ...prev };
          delete newTimers[flagKey];
          return newTimers;
        });
      }, 500); // 500ms debounce delay

      setDebounceTimers(prev => ({
        ...prev,
        [flagKey]: timer,
      }));
    },
    [debounceTimers, handleSaveTextFlag],
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

  useEffect(() => {
    debounceTimersRef.current = debounceTimers;
  }, [debounceTimers]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimersRef.current).forEach(timer => {
        if (timer) {
          clearTimeout(timer);
        }
      });
    };
  }, []);

  const hasLocalOverrides = featureFlags.some(
    flag => flag.source === 'Local Override',
  );

  const formatDisplayValue = (
    value: FeatureFlagValue,
    type: string,
  ): string => {
    if (type === 'boolean') {
      return value ? 'Enabled' : 'Disabled';
    }
    return String(value);
  };

  const renderFlagInput = (flag: FeatureFlag) => {
    switch (flag.type) {
      case 'boolean':
        return (
          <Switch
            size="$4"
            checked={flag.value as boolean}
            onCheckedChange={() =>
              handleToggleFlag(flag.key, flag.value as boolean)
            }
            disabled={isTogglingFlag === flag.key}
            backgroundColor={flag.value ? '$green7Light' : '$gray4'}
            style={{ minWidth: 48, minHeight: 36, alignSelf: 'flex-end' }}
          >
            <Switch.Thumb animation="quick" backgroundColor="$white" />
          </Switch>
        );
      case 'string':
      case 'number':
        return (
          <YStack flex={1} gap="$1">
            <Input
              value={textInputValues[flag.key] || ''}
              onChangeText={value => {
                handleTextInputChange(flag.key, value);
                // Debounced autosave
                debouncedSave(flag.key, flag.type as 'string' | 'number');
              }}
              placeholder={
                flag.type === 'number'
                  ? 'Enter number value'
                  : 'Enter text value'
              }
              keyboardType={flag.type === 'number' ? 'numeric' : 'default'}
              disabled={isTogglingFlag === flag.key}
              borderRadius={12}
              borderWidth={1}
              borderColor={inputErrors[flag.key] ? '$red6' : '$gray6'}
              backgroundColor="$gray2"
              paddingHorizontal="$3"
              paddingVertical="$2"
              fontSize="$4"
              style={{ minHeight: 36 }}
            />
            {inputErrors[flag.key] && (
              <Text color="$red11" fontSize="$2" paddingLeft="$2">
                {inputErrors[flag.key]}
              </Text>
            )}
          </YStack>
        );
      default:
        return null;
    }
  };

  return (
    <YStack
      flex={1}
      backgroundColor="white"
      paddingHorizontal="$4"
      paddingTop="$4"
    >
      <YStack marginBottom="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <XStack alignItems="center" gap="$2">
            <Button size="$3" onPress={handleRefresh} disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            {hasLocalOverrides && (
              <Button
                size="$3"
                onPress={handleClearAllOverrides}
                disabled={isLoading}
              >
                Reset
              </Button>
            )}
          </XStack>
          {lastRefresh && (
            <Text fontSize="$2" color="$gray9">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Text>
          )}
        </XStack>
      </YStack>

      <ScrollView showsVerticalScrollIndicator={false} marginTop="$4">
        <YStack gap="$3" paddingBottom="$8">
          {errorState && (
            <YStack
              padding="$4"
              borderWidth={1}
              borderColor="$red6"
              borderRadius="$4"
              backgroundColor="$red2"
              alignItems="center"
              gap="$2"
            >
              <Text color="$red11" fontSize="$4" textAlign="center">
                {errorState}
              </Text>
            </YStack>
          )}
          {featureFlags.length === 0 ? (
            <YStack
              padding="$4"
              borderWidth={1}
              borderColor="$gray6"
              borderRadius="$4"
              backgroundColor="$gray2"
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
                padding="$3"
                borderWidth={1}
                borderColor="$gray6"
                borderRadius="$4"
                marginBottom="$2"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack flex={1} marginRight="$4">
                    <Text fontSize="$4" fontWeight="500">
                      {flag.key}
                    </Text>
                    {flag.remoteValue !== undefined && (
                      <Text fontSize="$2" color="$gray9" marginTop="$1">
                        Default:{' '}
                        {formatDisplayValue(flag.remoteValue, flag.type)}
                      </Text>
                    )}
                  </YStack>
                  <XStack
                    alignItems="center"
                    gap="$3"
                    flex={1}
                    justifyContent="flex-end"
                  >
                    {renderFlagInput(flag)}
                  </XStack>
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
