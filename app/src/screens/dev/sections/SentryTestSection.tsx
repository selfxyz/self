// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Alert } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { slate200, slate500 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import BugIcon from '@/assets/icons/bug_icon.svg';
import { captureException } from '@/config/sentry';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';

// ANA-13 verification helper. Triggers a captured exception so an engineer can
// confirm in Sentry that the cohort tags (attempt_id, initial_branch,
// document_country, signature_algorithm, ...) and the breadcrumb trail attached
// in Phase 1 actually land on the error event.
//
// The error is fired through `captureException` so it shows up as a Sentry
// issue without crashing the app — there's no `throw` here on purpose. To
// exercise the JS error path (uncaught exception) instead, use the second
// button which throws synchronously.
export const SentryTestSection: React.FC = () => {
  const handleCapture = () => {
    Alert.alert(
      'Send test error to Sentry',
      'Fires a captured Error with the current cohort tags and breadcrumb trail attached. Use this to verify the ANA-13 wiring against the dev Sentry project.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            const err = new Error(
              `ANA-13 dev test error @ ${new Date().toISOString()}`,
            );
            captureException(err, { source: 'dev_settings_sentry_test' });
          },
        },
      ],
    );
  };

  const handleThrow = () => {
    Alert.alert(
      'Throw uncaught error',
      'Throws synchronously from the next tick so the global handler captures it. The app may show a red box or restart on Android.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Throw',
          style: 'destructive',
          onPress: () => {
            // Defer one tick so the Alert closes before the error propagates.
            setTimeout(() => {
              throw new Error(
                `ANA-13 dev uncaught error @ ${new Date().toISOString()}`,
              );
            }, 0);
          },
        },
      ],
    );
  };

  return (
    <ParameterSection
      icon={<BugIcon />}
      title="Sentry Test"
      description="Verify ANA-13 breadcrumbs and cohort tags reach Sentry"
      collapsible
      defaultCollapsed
    >
      <YStack gap="$2">
        <SentryTestRow
          label="Send test error (captured)"
          onPress={handleCapture}
        />
        <SentryTestRow
          label="Throw uncaught error"
          onPress={handleThrow}
          destructive
        />
      </YStack>
    </ParameterSection>
  );
};

interface SentryTestRowProps {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

const SentryTestRow: React.FC<SentryTestRowProps> = ({
  label,
  onPress,
  destructive,
}) => (
  <Button
    style={{ backgroundColor: 'white' }}
    borderColor={slate200}
    borderRadius="$2"
    height="$5"
    padding={0}
    onPress={onPress}
  >
    <XStack
      width="100%"
      paddingVertical="$3"
      paddingLeft="$4"
      paddingRight="$3"
    >
      <Text
        fontSize="$5"
        color={destructive ? '#b91c1c' : slate500}
        fontFamily={dinot}
      >
        {label}
      </Text>
    </XStack>
  </Button>
);
