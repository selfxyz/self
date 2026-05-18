// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Alert, Platform } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';
import { v4 as uuidv4 } from 'uuid';

import { slate200, slate500 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import BugIcon from '@/assets/icons/bug_icon.svg';
import {
  captureException,
  logAuthEvent,
  logNFCEvent,
  logProofEvent,
} from '@/config/sentry';
import {
  clearOnboardingTags,
  setOnboardingTags,
} from '@/observability/onboardingContext';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const buildSyntheticCohort = () => ({
  attempt_id: `ana13-smoke-${uuidv4()}`,
  initial_branch: 'biometric_passport',
  current_branch: 'biometric_passport',
  document_country: 'DEU',
  document_type: 'passport',
  signature_algorithm: 'ECDSA-SHA256',
  csca_hash_algorithm: 'SHA-384',
});

const buildBaseContext = (sessionId: string) => ({
  sessionId,
  platform: Platform.OS as 'ios' | 'android',
  stage: 'ana13_smoke',
});

const emitSyntheticBreadcrumbTrail = async (sessionId: string) => {
  const proofCtx = {
    ...buildBaseContext(sessionId),
    circuitType: 'register' as const,
    currentState: 'init',
  };
  const nfcCtx = {
    ...buildBaseContext(sessionId),
    scanType: 'mrz' as const,
  };
  const authCtx = buildBaseContext(sessionId);

  logAuthEvent('info', 'biometric_login_attempt', authCtx);
  await wait(120);
  logAuthEvent('info', 'mnemonic_loaded', authCtx);
  await wait(120);
  logProofEvent('info', 'attempt_started', proofCtx);
  await wait(120);
  logNFCEvent('info', 'screen_mount', { ...nfcCtx, stage: 'mount' });
  await wait(120);
  logNFCEvent('info', 'nfc_handshake_started', {
    ...nfcCtx,
    stage: 'handshake',
  });
  await wait(120);
  logNFCEvent('info', 'nfc_chip_read_complete', {
    ...nfcCtx,
    stage: 'read_complete',
  });
  await wait(120);
  logProofEvent('info', 'document_parsed', {
    ...proofCtx,
    currentState: 'validating_document',
  });
  await wait(120);
  logProofEvent('info', 'proof_generation_started', {
    ...proofCtx,
    currentState: 'proving',
  });
};

export const SentryTestSection: React.FC = () => {
  const handleFailureSmoke = () => {
    Alert.alert(
      'ANA-13: simulate onboarding failure',
      'Stamps a synthetic cohort, emits an 8-step breadcrumb trail (auth / proof / nfc), then captures an exception. Tags stay set so you can verify they survive to the Sentry event.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run',
          onPress: async () => {
            const sessionId = uuidv4();
            const cohort = buildSyntheticCohort();
            setOnboardingTags(cohort);
            await emitSyntheticBreadcrumbTrail(sessionId);
            captureException(
              new Error(
                `ANA-13 smoke failure (attempt ${cohort.attempt_id}) @ ${new Date().toISOString()}`,
              ),
              {
                source: 'dev_settings_sentry_smoke',
                attempt_id: cohort.attempt_id,
                session_id: sessionId,
              },
            );
          },
        },
      ],
    );
  };

  const handleHappyPathSmoke = () => {
    Alert.alert(
      'ANA-13: simulate happy path',
      'Stamps a synthetic cohort, emits the breadcrumb trail, then clears the cohort tags (no error captured). Use to verify the terminal-event clear path.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run',
          onPress: async () => {
            const sessionId = uuidv4();
            setOnboardingTags(buildSyntheticCohort());
            await emitSyntheticBreadcrumbTrail(sessionId);
            clearOnboardingTags();
            Alert.alert(
              'ANA-13 happy path complete',
              'Cohort tags cleared. Any captured exception now would carry no onboarding tags.',
            );
          },
        },
      ],
    );
  };

  const handleCapture = () => {
    Alert.alert(
      'Send bare test error',
      'Fires captureException with no preceding breadcrumbs or cohort tags. Useful for "does Sentry receive anything?" not for verifying ANA-13 wiring.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            captureException(
              new Error(`ANA-13 bare test error @ ${new Date().toISOString()}`),
              { source: 'dev_settings_sentry_test' },
            );
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
          label="Simulate onboarding failure (with trail)"
          onPress={handleFailureSmoke}
        />
        <SentryTestRow
          label="Simulate happy path (clears cohort)"
          onPress={handleHappyPathSmoke}
        />
        <SentryTestRow label="Send bare test error" onPress={handleCapture} />
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
